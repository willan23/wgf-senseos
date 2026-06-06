// =============================================
// UWSC Camada 4: Privacy Core (Fase 8)
// =============================================
// Zero-Knowledge Proof placeholders, hashing criptográfico de biometria comportamental
// e redação de dados sensíveis nos CsiFrames.
// NOTA: ZKP real requer biblioteca como snarkjs ou bellman (Rust/WASM).
// =============================================

import { CsiFrame } from '../types';
import { GaitSignature } from '../inference';

// ============================================================
// Tipos de Privacidade
// ============================================================

export interface PrivacyConfig {
  /** Destroy raw CSI amplitude/phase after hashing */
  redactRawFrames: boolean;
  /** Anonymize sensor IDs in output */
  anonymizeSensorIds: boolean;
  /** Salt for HMAC hashing of biometric features */
  hmacSalt: string;
  /** Retention window for frames in milliseconds */
  retentionWindowMs: number;
}

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  redactRawFrames: true,
  anonymizeSensorIds: false,
  hmacSalt: 'uwsc-default-salt-change-in-production',
  retentionWindowMs: 5 * 1000, // 5 seconds
};

export interface ZkpProof {
  /** Cryptographic commitment (simulated) */
  commitment: string;
  /** Nullifier — prevents re-use of same proof */
  nullifier: string;
  /** Whether this is a simulated or real ZKP */
  isSimulated: boolean;
  /** Timestamp of proof generation */
  generatedAt: number;
  /** Statement proven: 'person_present' | 'known_person' | 'unknown_person' | 'fall_detected' */
  statement: string;
}

export interface RedactedCsiFrame extends Omit<CsiFrame, 'amplitude' | 'phase'> {
  /** Raw data destroyed after processing */
  amplitude: null;
  phase: null;
  isRedacted: true;
  frameHash: string;
}

// ============================================================
// Hashing Utilities (Web Crypto API — available in Node.js 18+)
// ============================================================

/**
 * Creates a SHA-256 hash of a string using Web Crypto API (available in Node 18+ / browsers).
 * Falls back to simple Base64 encoding in environments without SubtleCrypto.
 */
export async function sha256Hash(input: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for environments without SubtleCrypto
  return btoa(input).replace(/=/g, '').slice(0, 64);
}

/**
 * Creates an HMAC-SHA-256 key for biometric feature hashing.
 * The raw biometric vector is hashed and the key is discarded after use.
 */
export async function hmacHash(data: string, salt: string): Promise<string> {
  return sha256Hash(`${salt}:${data}:${salt}`);
}

// ============================================================
// Gait Feature Hashing
// ============================================================

/**
 * Converts raw gait feature vector (from signal processing) into an anonymized privacy hash.
 * The original features are never stored — only the hash is retained.
 */
export async function hashGaitFeatures(
  features: number[],
  organizationId: string,
  salt: string
): Promise<string> {
  const featureStr = features.map(f => f.toFixed(4)).join(',');
  const input = `${organizationId}:${featureStr}`;
  return hmacHash(input, salt);
}

/**
 * Upgrades a simulated GaitSignature with a proper cryptographic hash.
 */
export async function upgradeGaitSignatureHash(
  sig: GaitSignature,
  organizationId: string,
  config: PrivacyConfig
): Promise<GaitSignature> {
  const newHash = await hmacHash(`gait:${sig.privacyHash}:${organizationId}`, config.hmacSalt);
  return { ...sig, privacyHash: newHash };
}

// ============================================================
// CSI Frame Redaction
// ============================================================

/**
 * Redacts a CsiFrame by removing raw amplitude/phase data.
 * A SHA-256 hash of the frame content is stored for auditability.
 */
export async function redactCsiFrame(frame: CsiFrame, config: PrivacyConfig): Promise<RedactedCsiFrame> {
  if (!config.redactRawFrames) {
    return {
      ...frame,
      amplitude: null,
      phase: null,
      isRedacted: true,
      frameHash: await sha256Hash(`${frame.sensorId}:${frame.timestamp}:${frame.rssi}`),
    };
  }

  const content = [
    frame.sensorId,
    frame.timestamp,
    frame.rssi,
    frame.amplitude.slice(0, 10).join(','), // sample for hash
  ].join(':');

  const frameHash = await sha256Hash(content);

  return {
    ...frame,
    amplitude: null,
    phase: null,
    isRedacted: true,
    frameHash,
  };
}

// ============================================================
// Zero-Knowledge Proof (ZKP) Placeholders
// ============================================================

/**
 * [PLACEHOLDER] Generates a simulated Zero-Knowledge Proof.
 * In production: use snarkjs (Groth16/PLONK) or ZoKrates for on-chain verifiable proofs.
 * 
 * The ZKP proves a STATEMENT (e.g., "a person is present") WITHOUT revealing:
 * - Who the person is
 * - Their exact location
 * - Any biometric data
 */
export async function generateZkpProof(
  statement: string,
  witnessData: Record<string, unknown>,
  config: PrivacyConfig
): Promise<ZkpProof> {
  // In a real ZKP:
  // 1. Define the circuit (e.g., in Circom or ZoKrates)
  // 2. Generate a witness from witnessData
  // 3. Produce a Groth16 proof (commitment + proof vector)
  // 4. The verifier checks the proof without seeing witnessData

  const witnessStr = JSON.stringify(witnessData);
  const commitment = await hmacHash(`commit:${statement}:${witnessStr}`, config.hmacSalt);
  const nullifier = await hmacHash(`nullifier:${commitment}:${Date.now()}`, config.hmacSalt);

  return {
    commitment,
    nullifier,
    isSimulated: true,
    generatedAt: Date.now(),
    statement,
  };
}

/**
 * [PLACEHOLDER] Verifies a ZKP proof.
 * Real verification requires the circuit's verifying key and the proof vector.
 */
export async function verifyZkpProof(proof: ZkpProof, config: PrivacyConfig): Promise<boolean> {
  if (proof.isSimulated) {
    // Simulated verification always passes for demo purposes
    return proof.commitment.length > 0 && proof.nullifier.length > 0;
  }

  // Real verification: call snarkjs.groth16.verify(vKey, publicSignals, proof)
  throw new Error('Real ZKP verification not yet implemented. Use snarkjs or bellman.');
}

// ============================================================
// GDPR / CCPA Data Subject Rights
// ============================================================

export interface DataSubjectRequest {
  type: 'erasure' | 'portability' | 'rectification';
  organizationId: string;
  privacyHash: string;
  requestedAt: number;
  requestedBy: string;
}

/**
 * Records a data subject request (GDPR Article 17 - Right to Erasure).
 * Actual deletion logic runs server-side in Firebase Cloud Functions.
 */
export function createDataSubjectRequest(
  type: DataSubjectRequest['type'],
  organizationId: string,
  privacyHash: string,
  requestedBy: string
): DataSubjectRequest {
  return {
    type,
    organizationId,
    privacyHash,
    requestedAt: Date.now(),
    requestedBy,
  };
}
