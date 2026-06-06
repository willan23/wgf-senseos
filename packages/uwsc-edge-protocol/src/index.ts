// =============================================
// UWSC Edge Protocol — Schemas de Transporte (Fase 9)
// =============================================
// Definições JSON/Zod para mensagens entre edge agents e o servidor.
// Preparado para migração futura para Protocol Buffers (gRPC).
// =============================================

// Nota: Não usamos 'zod' aqui para evitar dependências desnecessárias no edge.
// Validação runtime via funções de guard.

// ============================================================
// Tipos de Mensagem do Protocolo
// ============================================================

export type MessageType =
  | 'csi_frame_batch'     // Lote de frames CSI brutos
  | 'heartbeat'           // Keep-alive do edge agent
  | 'inference_event'     // Resultado de inferência processado
  | 'alert_event'         // Alerta crítico
  | 'sensor_registration' // Registo inicial de sensor
  | 'config_sync';        // Sincronização de configuração

export type ProtocolVersion = 'v1' | 'v2';

// ============================================================
// Envelope Comum de Mensagem
// ============================================================

export interface MessageEnvelope<T = unknown> {
  /** Protocolo de versão */
  protocol: ProtocolVersion;
  /** Tipo de mensagem */
  type: MessageType;
  /** ID único da mensagem (UUID v4) */
  messageId: string;
  /** ID do edge agent que envia */
  agentId: string;
  /** ID da organização */
  organizationId: string;
  /** ID do site */
  siteId: string;
  /** Timestamp de envio (Unix ms) */
  sentAt: number;
  /** Payload da mensagem */
  payload: T;
  /** Checksum simples para integridade */
  checksum?: string;
}

// ============================================================
// Payloads de Mensagem
// ============================================================

export interface CsiFramePayload {
  sensorId: string;
  timestamp: number;
  amplitude: number[];
  phase: number[];
  subcarrierCount: number;
  antennaIndex: number;
  rssi: number;
  noiseFloor: number;
  isSimulated: boolean;
  scenarioTag?: string;
  firmwareVersion?: string;
  /** RF Fingerprint score (anti-spoofing) */
  rfAuthenticityScore?: number;
}

export interface CsiFrameBatchPayload {
  frames: CsiFramePayload[];
  batchSize: number;
  periodMs: number;
}

export interface HeartbeatPayload {
  agentId: string;
  sensorIds: string[];
  cpuUsagePercent: number;
  memoryUsageMb: number;
  wifiChannel: number;
  firmwareVersion: string;
  uptimeSeconds: number;
  signalQualityScore: number;
}

export interface InferenceEventPayload {
  /** Unix ms of the event */
  eventTimestamp: number;
  personCount: number;
  locations: Array<{ x: number; y: number; z: number; confidence: number }>;
  /** Anonymized privacy hashes only — no raw biometrics */
  identifiedHashes: string[];
  fallDetected: boolean;
  breathingRateBpm: number;
  totalMotionEnergy: number;
  modelsUsed: string[];
  processingTimeMs: number;
  isSimulated: boolean;
}

export interface AlertEventPayload {
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sensorId?: string;
  zoneId?: string;
  relatedEventTimestamp?: number;
  isSimulated: boolean;
}

export interface SensorRegistrationPayload {
  sensorId: string;
  macAddress: string;
  chipset: string;
  firmwareVersion: string;
  antennaCount: number;
  supportedStandards: ('wifi5' | 'wifi6' | 'wifi6e' | 'wifi7')[];
  maxSubcarriers: number;
  xPosition: number;
  yPosition: number;
  capabilities: string[];
}

export interface ConfigSyncPayload {
  sampleRateHz: number;
  targetSubcarrierCount: number;
  batchSizeFrames: number;
  enableAntiSpoofing: boolean;
  enablePrivacyRedaction: boolean;
  operatingMode: 'residential' | 'corporate';
  scenarioOverride?: string;
}

// ============================================================
// Type Aliases for Specific Envelope Types
// ============================================================

export type CsiFrameBatchMessage = MessageEnvelope<CsiFrameBatchPayload>;
export type HeartbeatMessage = MessageEnvelope<HeartbeatPayload>;
export type InferenceEventMessage = MessageEnvelope<InferenceEventPayload>;
export type AlertEventMessage = MessageEnvelope<AlertEventPayload>;
export type SensorRegistrationMessage = MessageEnvelope<SensorRegistrationPayload>;
export type ConfigSyncMessage = MessageEnvelope<ConfigSyncPayload>;

// ============================================================
// Message Factory Functions
// ============================================================

let _msgCounter = 0;

function generateMessageId(type: MessageType): string {
  return `${type}-${Date.now()}-${++_msgCounter}`;
}

export function createCsiFrameBatchMessage(
  agentId: string,
  organizationId: string,
  siteId: string,
  frames: CsiFramePayload[]
): CsiFrameBatchMessage {
  return {
    protocol: 'v1',
    type: 'csi_frame_batch',
    messageId: generateMessageId('csi_frame_batch'),
    agentId,
    organizationId,
    siteId,
    sentAt: Date.now(),
    payload: {
      frames,
      batchSize: frames.length,
      periodMs: frames.length > 1 ? frames[frames.length - 1].timestamp - frames[0].timestamp : 0,
    },
  };
}

export function createHeartbeatMessage(
  agentId: string,
  organizationId: string,
  siteId: string,
  data: Omit<HeartbeatPayload, 'agentId'>
): HeartbeatMessage {
  return {
    protocol: 'v1',
    type: 'heartbeat',
    messageId: generateMessageId('heartbeat'),
    agentId,
    organizationId,
    siteId,
    sentAt: Date.now(),
    payload: { ...data, agentId },
  };
}

export function createInferenceEventMessage(
  agentId: string,
  organizationId: string,
  siteId: string,
  event: InferenceEventPayload
): InferenceEventMessage {
  return {
    protocol: 'v1',
    type: 'inference_event',
    messageId: generateMessageId('inference_event'),
    agentId,
    organizationId,
    siteId,
    sentAt: Date.now(),
    payload: event,
  };
}

export function createAlertEventMessage(
  agentId: string,
  organizationId: string,
  siteId: string,
  alert: AlertEventPayload
): AlertEventMessage {
  return {
    protocol: 'v1',
    type: 'alert_event',
    messageId: generateMessageId('alert_event'),
    agentId,
    organizationId,
    siteId,
    sentAt: Date.now(),
    payload: alert,
  };
}

// ============================================================
// Runtime Validators (type guards)
// ============================================================

export function isValidEnvelope(msg: unknown): msg is MessageEnvelope {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.protocol === 'string' &&
    typeof m.type === 'string' &&
    typeof m.messageId === 'string' &&
    typeof m.agentId === 'string' &&
    typeof m.organizationId === 'string' &&
    typeof m.siteId === 'string' &&
    typeof m.sentAt === 'number' &&
    m.payload !== undefined
  );
}

export function isHeartbeatMessage(msg: MessageEnvelope): msg is HeartbeatMessage {
  return msg.type === 'heartbeat';
}

export function isCsiFrameBatchMessage(msg: MessageEnvelope): msg is CsiFrameBatchMessage {
  return msg.type === 'csi_frame_batch';
}

export function isInferenceEventMessage(msg: MessageEnvelope): msg is InferenceEventMessage {
  return msg.type === 'inference_event';
}

export function isAlertEventMessage(msg: MessageEnvelope): msg is AlertEventMessage {
  return msg.type === 'alert_event';
}
