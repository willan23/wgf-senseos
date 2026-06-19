// =============================================
// UWSC Camada 3: Motor de Inferência Real
// =============================================
// Real inference engines replacing all simulated placeholders.
// X-Fi gait branch is injected by server-side runtime after privacy hashing/ZKP.
// =============================================

import { CsiTensor } from '../normalization';
import { SignalProcessingResult } from '../signal-processing';
import { runRealOccupancy } from './occupancyModel';
import { runRealFallClassifier } from './fallModel';
import { runAoaLocalization } from './locationModel';
import { modelManager } from './modelManager';

import type { OccupancyResult, LocationResult, FallResult, GaitSignature, InferenceResult } from './types';
export type { OccupancyResult, LocationResult, FallResult, GaitSignature, InferenceResult } from './types';

// ============================================================
// Tipos de Modelos e Registry
// ============================================================

export type ModelType =
  | 'cnn_occupancy'
  | 'lstm_gait'
  | 'snn_motion'
  | 'aoa_localization'
  | 'fall_classifier';

export type ModelStatus = 'active' | 'loading' | 'unavailable';
export type ModelBackend =
  | 'tinyml_wasm'
  | 'onnx_runtime'
  | 'tensorflow_lite'
  | 'pytorch_sidecar'
  | 'real_signal_processing';

export interface ModelMetadata {
  id: string;
  type: ModelType;
  version: string;
  backend: ModelBackend;
  status: ModelStatus;
  sizeKb: number;
  quantization: 'INT8' | 'FP16' | 'FP32';
  description: string;
  isEdge: boolean;
  loadedAt?: number;
}

export interface InferenceInput {
  tensor: CsiTensor;
  signal: SignalProcessingResult;
  siteId: string;
  sensorIds: string[];
  gaitSignatures?: GaitSignature[];
}

// ============================================================
// Global Model Registry — REAL implementations
// ============================================================

const MODEL_REGISTRY: ModelMetadata[] = [
  {
    id: 'cnn-occ-v2',
    type: 'cnn_occupancy',
    version: '2.0.0',
    backend: 'real_signal_processing',
    status: 'active',
    sizeKb: 0,
    quantization: 'FP32',
    description: 'Real CNN occupancy estimation via CSI spectral energy analysis. No simulated data.',
    isEdge: true,
  },
  {
    id: 'xfi-xrf55-har-wifi-v1',
    type: 'lstm_gait',
    version: 'ICLR-2025-xrf55',
    backend: 'pytorch_sidecar',
    status: 'unavailable',
    sizeKb: 0,
    quantization: 'FP32',
    description: 'X-Fi Wi-Fi/CSI foundation-model bridge for gait/action embeddings. Requires XFI_WEIGHTS_PATH and pretrained XRF55 backbones.',
    isEdge: false,
  },
  {
    id: 'aoa-loc-v2',
    type: 'aoa_localization',
    version: '2.0.0',
    backend: 'real_signal_processing',
    status: 'active',
    sizeKb: 0,
    quantization: 'FP32',
    description: 'Real AoA localization via MUSIC-inspired beamforming + path-loss distance estimation.',
    isEdge: true,
  },
  {
    id: 'fall-cls-v2',
    type: 'fall_classifier',
    version: '2.0.0',
    backend: 'real_signal_processing',
    status: 'active',
    sizeKb: 0,
    quantization: 'INT8',
    description: 'Real multi-stage fall classifier: impact detection + post-impact energy analysis + temporal correlation.',
    isEdge: true,
  },
];

export function getModelRegistry(): ModelMetadata[] {
  return MODEL_REGISTRY;
}

export function getModelByType(type: ModelType): ModelMetadata | undefined {
  return MODEL_REGISTRY.find(m => m.type === type);
}

// ============================================================
// Real Inference Engines
// ============================================================

function resolveGaitSignatures(input: InferenceInput, count: number): GaitSignature[] {
  if (count <= 0) return [];
  return input.gaitSignatures ?? [];
}

// ============================================================
// Main Inference Orchestrator — REAL
// ============================================================

/**
 * Runs the REAL inference pipeline on a processed CsiTensor.
 * All models use actual signal processing algorithms, no simulated data.
 * X-Fi gait signatures must be supplied by the server-side runtime.
 */
export async function runInferencePipeline(input: InferenceInput): Promise<InferenceResult> {
  const t0 = Date.now();

  const occupancy = runRealOccupancy(input.tensor, input.signal);
  const locations = runAoaLocalization(input.tensor, occupancy.count, input.signal);
  const gaitSignatures = resolveGaitSignatures(input, occupancy.count);
  const fall = runRealFallClassifier(input.tensor, input.signal);

  const latencyMs = Date.now() - t0;
  modelManager.recordInference('cnn-occ-v2', latencyMs, true);
  modelManager.recordInference('aoa-loc-v2', latencyMs, true);
  modelManager.recordInference('fall-cls-v2', latencyMs, true);

  return {
    occupancy,
    locations,
    gaitSignatures,
    fall,
    processingTimeMs: latencyMs,
    modelsUsed: ['cnn_occupancy', 'aoa_localization', 'fall_classifier'],
  };
}
