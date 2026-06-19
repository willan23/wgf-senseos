import { spawn } from 'node:child_process';
import path from 'node:path';

import type { GaitSignature, InferenceInput, InferenceResult } from '@uwsc/core/inference';
import { runInferencePipeline } from '@uwsc/core/inference';
import {
  buildXFiBridgeRequest,
  validateXFiBridgeResponse,
  type XFiBridgeRequest,
  type XFiBridgeResponse,
} from '@uwsc/core/inference/xfiAdapter';
import {
  DEFAULT_PRIVACY_CONFIG,
  generateZkpProof,
  hashGaitFeatures,
  type PrivacyConfig,
} from '@uwsc/privacy-core/index';

export interface ServerInferenceInput extends InferenceInput {
  organizationId: string;
}

interface BridgeExecutionOptions {
  pythonBin: string;
  bridgeScript: string;
  repoDir: string;
  weightsPath: string;
  device: string;
  timeoutMs: number;
}

function resolveBridgeOptions(): BridgeExecutionOptions {
  const workspaceRoot = path.resolve(process.cwd(), '..');
  const repoDir = process.env.XFI_REPO_DIR || path.join(workspaceRoot, 'X-Fi-main', 'X-Fi-main');
  const bridgeScript =
    process.env.XFI_BRIDGE_SCRIPT ||
    path.join(workspaceRoot, 'edge-agent', 'xfi_bridge', 'xfi_infer.py');

  return {
    pythonBin: process.env.XFI_PYTHON || 'python',
    bridgeScript,
    repoDir,
    weightsPath:
      process.env.XFI_WEIGHTS_PATH ||
      path.join(repoDir, 'XRF55_HAR', 'pre-trained_weights', 'xrf55_har_checkpoint.pt'),
    device: process.env.XFI_DEVICE || 'cpu',
    timeoutMs: Number.parseInt(process.env.XFI_TIMEOUT_MS || '30000', 10),
  };
}

function privacyConfigFromEnv(): PrivacyConfig {
  const hmacSalt = process.env.WGF_PRIVACY_HMAC_SALT || DEFAULT_PRIVACY_CONFIG.hmacSalt;
  if (process.env.NODE_ENV === 'production' && hmacSalt === DEFAULT_PRIVACY_CONFIG.hmacSalt) {
    throw new Error('WGF_PRIVACY_HMAC_SALT must be configured in production before X-Fi gait hashing runs');
  }

  return {
    ...DEFAULT_PRIVACY_CONFIG,
    hmacSalt,
  };
}

function runBridge(request: XFiBridgeRequest, options: BridgeExecutionOptions): Promise<XFiBridgeResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.pythonBin, [options.bridgeScript], {
      cwd: path.dirname(options.bridgeScript),
      env: {
        ...process.env,
        XFI_REPO_DIR: options.repoDir,
        XFI_WEIGHTS_PATH: options.weightsPath,
        XFI_DEVICE: options.device,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on('close', code => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`X-Fi bridge timed out after ${options.timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`X-Fi bridge failed with code ${code}: ${stderr.trim() || stdout.trim()}`));
        return;
      }

      try {
        resolve(validateXFiBridgeResponse(JSON.parse(stdout)));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        reject(new Error(`Invalid X-Fi bridge output: ${message}; stderr=${stderr.trim()}`));
      }
    });

    child.stdin.end(JSON.stringify(request));
  });
}

function zkpWitnessFromEmbedding(embedding: number[], privacyHash: string): Record<string, number> {
  const quantized = embedding.slice(0, 4).map(value => {
    const shifted = Math.round((value + 128) * 1000);
    return Math.max(0, Math.min(2_147_483_647, shifted));
  });

  while (quantized.length < 4) quantized.push(0);

  return {
    gaitFeature1: quantized[0],
    gaitFeature2: quantized[1],
    gaitFeature3: quantized[2],
    gaitFeature4: quantized[3],
    organizationSalt: 1,
    publicGaitHash: Number.parseInt(privacyHash.slice(0, 12), 16),
  };
}

async function inferXFiGaitSignatures(input: ServerInferenceInput): Promise<GaitSignature[]> {
  if (input.signal.estimatedPersonCount <= 0) return [];

  const options = resolveBridgeOptions();
  const request = buildXFiBridgeRequest(input.tensor);
  const response = await runBridge(request, options);
  const config = privacyConfigFromEnv();
  const privacyHash = await hashGaitFeatures(response.embedding, input.organizationId, config.hmacSalt);
  const zkpProof = await generateZkpProof(
    'known_person',
    zkpWitnessFromEmbedding(response.embedding, privacyHash),
    config
  );

  return [
    {
      privacyHash,
      profileId: null,
      confidence: response.prediction.confidence,
      label: 'unknown',
      isSimulated: false,
      sourceModel: 'xfi:xrf55_har:wifi',
      featureHashVersion: 'xfi-embedding-hmac-sha256-v1',
      modelTask: 'xrf55_har',
      modelClassIndex: response.prediction.classIndex,
      zkpProof,
    },
  ];
}

export async function runServerInferencePipeline(input: ServerInferenceInput): Promise<InferenceResult> {
  const gaitSignatures = await inferXFiGaitSignatures(input);
  return runInferencePipeline({
    ...input,
    gaitSignatures,
  });
}
