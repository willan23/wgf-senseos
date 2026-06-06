// =============================================
// UWSC Camada 1: Ingestão de Borda
// =============================================

import { CsiFrame, SensorStatus, SensorType } from '../types';

export type IngestionMode = 'simulation' | 'lab' | 'live';

export interface SensorNode {
  id: string;
  siteId: string;
  organizationId: string;
  name: string;
  status: SensorStatus;
  type: SensorType;
  macAddress: string;
  lastHeartbeatAt: number;
}

export interface EdgeAgent {
  id: string;
  organizationId: string;
  sensorId: string;
  name: string;
  version: string;
  status: 'active' | 'revoked';
  mode: IngestionMode;
  registeredAt: number;
  lastActiveAt: number;
}

export interface HardwareFingerprint {
  sensorId: string;
  phaseNoiseVariance: number;
  iqImbalanceScore: number;
  rssiDrift: number;
  carrierFrequencyOffset: number;
  packetTimingJitter: number;
  calculatedAt: number;
}

export interface SensorHeartbeat {
  sensorId: string;
  siteId: string;
  organizationId: string;
  status: SensorStatus;
  latencyMs: number;
  timestamp: number;
  agentVersion: string;
  mode: IngestionMode;
  sourceConfidence: number; // 0 to 1
}

export interface RawCsiInput {
  sensorId?: unknown;
  siteId?: unknown;
  organizationId?: unknown;
  timestamp?: unknown;
  amplitude?: unknown;
  phase?: unknown;
  subcarrierCount?: unknown;
  noiseFloor?: unknown;
  rssi?: unknown;
  antennaIndex?: unknown;
  firmwareVersion?: unknown;
  ingestionMode?: unknown;
  signature?: unknown;
}

export interface ValidatedCsiFrame extends CsiFrame {
  signature: string;
  ingestionMode: IngestionMode;
  antennaIndex: number;
  firmwareVersion: string;
}

// Ingestion Source Interface
export interface IngestionSource {
  mode: IngestionMode;
  ingest(input: RawCsiInput): Promise<ValidatedCsiFrame>;
  heartbeat(sensorId: string): Promise<SensorHeartbeat>;
}

// =============================================
// Validation function
// =============================================
export async function ingestCsiFrame(input: RawCsiInput): Promise<ValidatedCsiFrame> {
  const {
    sensorId,
    siteId,
    organizationId,
    timestamp,
    amplitude,
    phase,
    subcarrierCount,
    noiseFloor,
    rssi,
    antennaIndex,
    firmwareVersion,
    ingestionMode,
    signature,
  } = input;

  // 1. Mandatory String Fields
  if (!sensorId || typeof sensorId !== 'string') {
    throw new Error('CSI Ingestion Error: sensorId is required and must be a string');
  }
  if (!siteId || typeof siteId !== 'string') {
    throw new Error('CSI Ingestion Error: siteId is required and must be a string');
  }
  if (!organizationId || typeof organizationId !== 'string') {
    throw new Error('CSI Ingestion Error: organizationId is required and must be a string');
  }

  // 2. Ingestion Mode validation
  if (!ingestionMode || (ingestionMode !== 'simulation' && ingestionMode !== 'lab' && ingestionMode !== 'live')) {
    throw new Error('CSI Ingestion Error: ingestionMode is required and must be simulation, lab, or live');
  }

  // 3. Timestamp validation
  const t = Number(timestamp);
  if (isNaN(t) || t <= 0) {
    throw new Error('CSI Ingestion Error: timestamp is required and must be a valid number');
  }

  // 4. Arrays validation
  if (!Array.isArray(amplitude) || amplitude.some(v => typeof v !== 'number')) {
    throw new Error('CSI Ingestion Error: amplitude is required and must be an array of numbers');
  }
  if (!Array.isArray(phase) || phase.some(v => typeof v !== 'number')) {
    throw new Error('CSI Ingestion Error: phase is required and must be an array of numbers');
  }

  // 5. Subcarriers validation
  const count = Number(subcarrierCount);
  if (isNaN(count) || count <= 0) {
    throw new Error('CSI Ingestion Error: subcarrierCount must be a positive number');
  }
  if (amplitude.length !== count || phase.length !== count) {
    throw new Error(`CSI Ingestion Error: amplitude/phase array sizes do not match subcarrierCount of ${count}`);
  }

  // 6. Signature validation (even mock)
  if (!signature || typeof signature !== 'string') {
    throw new Error('CSI Ingestion Error: cryptographic signature is required');
  }

  // 7. Assemble Validated Frame
  return {
    sensorId,
    siteId,
    organizationId,
    timestamp: t,
    amplitude,
    phase,
    subcarrierCount: count,
    noiseFloor: typeof noiseFloor === 'number' ? noiseFloor : -85,
    rssi: typeof rssi === 'number' ? rssi : -50,
    isSimulated: ingestionMode !== 'live',
    antennaIndex: typeof antennaIndex === 'number' ? antennaIndex : 0,
    firmwareVersion: typeof firmwareVersion === 'string' ? firmwareVersion : '1.0.0',
    ingestionMode: ingestionMode as IngestionMode,
    signature,
  };
}

// =============================================
// Ingestion Adapters
// =============================================

export class SimulationIngestionAdapter implements IngestionSource {
  readonly mode = 'simulation';

  async ingest(input: RawCsiInput): Promise<ValidatedCsiFrame> {
    return ingestCsiFrame({
      ...input,
      ingestionMode: 'simulation',
      signature: input.signature || 'sig_mock_simulation_12345',
    });
  }

  async heartbeat(sensorId: string): Promise<SensorHeartbeat> {
    return {
      sensorId,
      siteId: 'site_demo_01',
      organizationId: 'org_demo',
      status: 'simulated',
      latencyMs: 5 + Math.floor(Math.random() * 10),
      timestamp: Date.now(),
      agentVersion: 'v0.9.0-sim',
      mode: 'simulation',
      sourceConfidence: 0.99,
    };
  }
}

export class FileDatasetIngestionAdapter implements IngestionSource {
  readonly mode = 'lab';

  async ingest(input: RawCsiInput): Promise<ValidatedCsiFrame> {
    return ingestCsiFrame({
      ...input,
      ingestionMode: 'lab',
      signature: input.signature || 'sig_mock_lab_67890',
    });
  }

  async heartbeat(sensorId: string): Promise<SensorHeartbeat> {
    return {
      sensorId,
      siteId: 'site_lab_01',
      organizationId: 'org_lab',
      status: 'online',
      latencyMs: 0, // offline files have no network latency
      timestamp: Date.now(),
      agentVersion: 'v1.0.0-lab',
      mode: 'lab',
      sourceConfidence: 1.0,
    };
  }
}

export class MockEdgeAgentAdapter implements IngestionSource {
  readonly mode = 'live';

  async ingest(input: RawCsiInput): Promise<ValidatedCsiFrame> {
    return ingestCsiFrame({
      ...input,
      ingestionMode: 'live',
      signature: input.signature || 'sig_mock_live_agent_abcde',
    });
  }

  async heartbeat(sensorId: string): Promise<SensorHeartbeat> {
    return {
      sensorId,
      siteId: 'site_live_demo',
      organizationId: 'org_live',
      status: 'online',
      latencyMs: 15 + Math.floor(Math.random() * 30),
      timestamp: Date.now(),
      agentVersion: 'v1.2.0-mock-agent',
      mode: 'live',
      sourceConfidence: 0.85,
    };
  }
}

export class FutureOpenWrtAdapter implements IngestionSource {
  readonly mode = 'live';

  async ingest(input: RawCsiInput): Promise<ValidatedCsiFrame> {
    // OpenWrt payload will have a real SHA256 signature signed by router key
    return ingestCsiFrame({
      ...input,
      ingestionMode: 'live',
    });
  }

  async heartbeat(sensorId: string): Promise<SensorHeartbeat> {
    return {
      sensorId,
      siteId: 'unknown',
      organizationId: 'unknown',
      status: 'online',
      latencyMs: 40,
      timestamp: Date.now(),
      agentVersion: 'openwrt-nexmon-v2.1',
      mode: 'live',
      sourceConfidence: 0.95,
    };
  }
}

export class FutureNexmonAdapter extends FutureOpenWrtAdapter {
  // Inherits and extends OpenWrt implementation for specialized BCM chipsets
}
