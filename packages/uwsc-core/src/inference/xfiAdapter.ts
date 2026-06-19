// =============================================
// UWSC Camada 3: X-Fi Input Adapter
// =============================================
// Converts the normalized CSI tensor [T, S, A] into the Wi-Fi branch shape
// expected by the X-Fi/XRF55 HAR implementation: [270, 1000].
// =============================================

import type { CsiTensor } from '../normalization';

export const XFI_XRF55_WIFI_CHANNELS = 270;
export const XFI_XRF55_WIFI_TIMESTEPS = 1000;

export interface XFiWifiAdapterOptions {
  channelCount?: number;
  timeSteps?: number;
  zScoreNormalize?: boolean;
}

export interface XFiBridgeRequest {
  schemaVersion: 'wgf-xfi-v1';
  task: 'xrf55_har';
  modality: 'wifi';
  sourceShape: [number, number, number];
  timestamps: number[];
  sensorIds: string[];
  wifiCsi: number[][];
}

export interface XFiBridgeResponse {
  schemaVersion: 'wgf-xfi-v1';
  task: 'xrf55_har';
  modality: 'wifi';
  model: {
    repoDir: string;
    weightsPath: string;
    modelDepth: number;
    numClasses: number;
    device: string;
  };
  prediction: {
    classIndex: number;
    confidence: number;
    logits: number[];
  };
  embedding: number[];
  timingMs: number;
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid X-Fi adapter input: ${label} is not finite`);
  }
}

function resampleSeries(values: number[], targetLength: number): number[] {
  if (!Number.isInteger(targetLength) || targetLength <= 0) {
    throw new Error(`Invalid X-Fi adapter target length: ${targetLength}`);
  }
  if (values.length === 0) {
    throw new Error('Cannot resample an empty CSI series for X-Fi');
  }
  if (values.length === targetLength) return [...values];
  if (values.length === 1) return new Array(targetLength).fill(values[0]);

  const out = new Array<number>(targetLength);
  const scale = (values.length - 1) / Math.max(targetLength - 1, 1);

  for (let i = 0; i < targetLength; i++) {
    const source = i * scale;
    const left = Math.floor(source);
    const right = Math.min(Math.ceil(source), values.length - 1);
    const w = source - left;
    out[i] = values[left] * (1 - w) + values[right] * w;
  }

  return out;
}

function flattenTensorFrame(tensor: CsiTensor, timeIndex: number): number[] {
  const [, subcarriers, antennas] = tensor.shape;
  const frame = tensor.data[timeIndex];
  const flattened = new Array<number>(subcarriers * antennas);
  let idx = 0;

  for (let antenna = 0; antenna < antennas; antenna++) {
    for (let subcarrier = 0; subcarrier < subcarriers; subcarrier++) {
      const value = frame[subcarrier]?.[antenna] ?? 0;
      assertFiniteNumber(value, `tensor.data[${timeIndex}][${subcarrier}][${antenna}]`);
      flattened[idx++] = value;
    }
  }

  return flattened;
}

function zScoreMatrix(matrix: number[][]): number[][] {
  let n = 0;
  let sum = 0;
  let sumSq = 0;

  for (const row of matrix) {
    for (const value of row) {
      n++;
      sum += value;
      sumSq += value * value;
    }
  }

  if (n === 0) return matrix;

  const mean = sum / n;
  const variance = Math.max(sumSq / n - mean * mean, 0);
  const std = Math.sqrt(variance) || 1;

  return matrix.map(row => row.map(value => (value - mean) / std));
}

export function tensorToXFiWifiMatrix(
  tensor: CsiTensor,
  opts: XFiWifiAdapterOptions = {}
): number[][] {
  const channelCount = opts.channelCount ?? XFI_XRF55_WIFI_CHANNELS;
  const timeSteps = opts.timeSteps ?? XFI_XRF55_WIFI_TIMESTEPS;
  const zScoreNormalize = opts.zScoreNormalize ?? true;
  const [time, subcarriers, antennas] = tensor.shape;

  if (time <= 0 || subcarriers <= 0 || antennas <= 0 || tensor.data.length === 0) {
    throw new Error(`Cannot adapt empty CSI tensor to X-Fi: shape=${tensor.shape.join('x')}`);
  }

  const channelFrames = new Array<number[]>(time);
  for (let t = 0; t < time; t++) {
    channelFrames[t] = resampleSeries(flattenTensorFrame(tensor, t), channelCount);
  }

  const channelMajor = new Array<number[]>(channelCount);
  for (let channel = 0; channel < channelCount; channel++) {
    const sourceSeries = channelFrames.map(frame => frame[channel]);
    channelMajor[channel] = resampleSeries(sourceSeries, timeSteps);
  }

  return zScoreNormalize ? zScoreMatrix(channelMajor) : channelMajor;
}

export function buildXFiBridgeRequest(tensor: CsiTensor): XFiBridgeRequest {
  return {
    schemaVersion: 'wgf-xfi-v1',
    task: 'xrf55_har',
    modality: 'wifi',
    sourceShape: tensor.shape,
    timestamps: tensor.timestamps,
    sensorIds: tensor.sensorIds,
    wifiCsi: tensorToXFiWifiMatrix(tensor),
  };
}

export function validateXFiBridgeResponse(response: unknown): XFiBridgeResponse {
  if (typeof response !== 'object' || response === null) {
    throw new Error('X-Fi bridge returned a non-object response');
  }

  const value = response as Partial<XFiBridgeResponse>;
  if (value.schemaVersion !== 'wgf-xfi-v1' || value.task !== 'xrf55_har' || value.modality !== 'wifi') {
    throw new Error('X-Fi bridge response schema/task/modality mismatch');
  }

  if (!value.prediction || !Array.isArray(value.prediction.logits)) {
    throw new Error('X-Fi bridge response is missing prediction logits');
  }

  if (!Array.isArray(value.embedding) || value.embedding.length === 0) {
    throw new Error('X-Fi bridge response is missing the penultimate embedding');
  }

  for (const [idx, score] of value.prediction.logits.entries()) {
    assertFiniteNumber(score, `prediction.logits[${idx}]`);
  }

  for (const [idx, feature] of value.embedding.entries()) {
    assertFiniteNumber(feature, `embedding[${idx}]`);
  }

  return value as XFiBridgeResponse;
}
