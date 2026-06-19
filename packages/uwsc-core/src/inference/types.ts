/**
 * WGF SenseOS — Inference Types
 * Shared types for all inference models.
 */

export interface OccupancyResult {
  count: number;
  confidence: number;
  isSimulated: boolean;
}

export interface LocationResult {
  x: number;
  y: number;
  z: number;
  confidence: number;
  personIndex: number;
  isSimulated: boolean;
}

export interface FallResult {
  detected: boolean;
  confidence: number;
  eventTimestamp?: number;
  isSimulated: boolean;
}

export interface GaitSignature {
  privacyHash: string;
  profileId: string | null;
  confidence: number;
  label: 'known' | 'unknown';
  isSimulated: boolean;
  sourceModel?: string;
  featureHashVersion?: string;
  modelTask?: 'xrf55_har';
  modelClassIndex?: number;
  zkpProof?: {
    commitment: string;
    nullifier: string;
    isRealZkp: boolean;
    generatedAt: number;
    statement: string;
  };
}

export interface InferenceResult {
  occupancy: OccupancyResult;
  locations: LocationResult[];
  gaitSignatures: GaitSignature[];
  fall: FallResult;
  processingTimeMs: number;
  modelsUsed: string[];
}
