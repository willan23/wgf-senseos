// =============================================
// UWSC Camada 2: Normalização Universal de CSI
// =============================================

import { CsiFrame } from '../types';

export interface RawCsiFrame {
  sensorId: string;
  timestamp: number;
  amplitude: number[];
  phase: number[];
  subcarrierCount: number;
  antennaIndex: number;
}

export interface NormalizedCsiFrame {
  sensorId: string;
  siteId: string;
  organizationId: string;
  timestamp: number;
  amplitude: number[]; // standardized length
  phase: number[];     // standardized length and aligned
  subcarrierCount: number;
  antennaIndex: number;
  rssi: number;
}

export interface CsiTensor {
  shape: [number, number, number]; // [T, S, A] (Time window, Normalized Subcarriers, Antennas)
  data: number[][][];              // 3D Matrix
  timestamps: number[];
  sensorIds: string[];
}

export interface NormalizationProfile {
  targetSubcarrierCount: number;
  alignPhaseEnabled: boolean;
  zScoreNormalize: boolean;
}

export interface SubcarrierMapping {
  sourceCount: number;
  targetCount: number;
  scaleFactor: number;
}

/**
 * Standardizes subcarrier arrays from any size (e.g. 52, 242, 484) to a fixed target size
 * using linear interpolation.
 */
export function standardizeSubcarriers(input: number[], targetSubcarrierCount: number): number[] {
  const sourceCount = input.length;
  if (sourceCount === targetSubcarrierCount) return [...input];
  if (sourceCount === 0) return new Array(targetSubcarrierCount).fill(0);

  const output: number[] = new Array(targetSubcarrierCount);
  for (let i = 0; i < targetSubcarrierCount; i++) {
    const srcIndexFloat = (i / (targetSubcarrierCount - 1)) * (sourceCount - 1);
    const low = Math.floor(srcIndexFloat);
    const high = Math.ceil(srcIndexFloat);
    const weight = srcIndexFloat - low;

    output[i] = input[low] * (1 - weight) + input[high] * weight;
  }
  return output;
}

/**
 * Aligns the phase array to remove linear phase offset caused by packet detection latency (sampling frequency offset).
 * Standard linear fitting and subtraction.
 */
export function alignPhase(phaseArray: number[]): number[] {
  const len = phaseArray.length;
  if (len < 2) return [...phaseArray];

  // 1. Calculate linear trend (y = m*x + c)
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < len; i++) {
    sumX += i;
    sumY += phaseArray[i];
    sumXY += i * phaseArray[i];
    sumXX += i * i;
  }

  const m = (len * sumXY - sumX * sumY) / (len * sumXX - sumX * sumX) || 0;
  const c = (sumY - m * sumX) / len;

  // 2. Subtract linear trend to align phases
  return phaseArray.map((ph, idx) => {
    const aligned = ph - (m * idx + c);
    // Wrap to [-PI, PI]
    return Math.atan2(Math.sin(aligned), Math.cos(aligned));
  });
}

/**
 * Normalizes the amplitude array using z-score normalization.
 */
export function normalizeAmplitude(amplitudeArray: number[]): number[] {
  const len = amplitudeArray.length;
  if (len === 0) return [];

  const mean = amplitudeArray.reduce((sum, v) => sum + v, 0) / len;
  const variance = amplitudeArray.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / len;
  const std = Math.sqrt(variance) || 1.0;

  return amplitudeArray.map(v => (v - mean) / std);
}

/**
 * Camada 2 Core: Converts raw CsiFrame to standard NormalizedCsiFrame.
 */
export function normalizeCsiMatrix(
  rawFrame: CsiFrame,
  profile: NormalizationProfile = { targetSubcarrierCount: 52, alignPhaseEnabled: true, zScoreNormalize: true }
): NormalizedCsiFrame {
  // 1. Standardize number of subcarriers
  let amplitude = standardizeSubcarriers(rawFrame.amplitude, profile.targetSubcarrierCount);
  let phase = standardizeSubcarriers(rawFrame.phase, profile.targetSubcarrierCount);

  // 2. Perform amplitude normalization
  if (profile.zScoreNormalize) {
    amplitude = normalizeAmplitude(amplitude);
  }

  // 3. Perform phase alignment
  if (profile.alignPhaseEnabled) {
    phase = alignPhase(phase);
  }

  return {
    sensorId: rawFrame.sensorId,
    siteId: rawFrame.siteId,
    organizationId: rawFrame.organizationId,
    timestamp: rawFrame.timestamp,
    amplitude,
    phase,
    subcarrierCount: profile.targetSubcarrierCount,
    antennaIndex: rawFrame.antennaIndex || 0,
    rssi: rawFrame.rssi,
  };
}

/**
 * Removes static environmental components (walls, furniture) from a series of frames
 * by calculating and subtracting the running mean.
 */
export function removeStaticComponents(frames: NormalizedCsiFrame[]): NormalizedCsiFrame[] {
  if (frames.length === 0) return [];
  const subcarriers = frames[0].subcarrierCount;

  // 1. Compute mean amplitude and phase per subcarrier
  const meanAmp = new Array(subcarriers).fill(0);
  const meanPhase = new Array(subcarriers).fill(0);

  for (const f of frames) {
    for (let i = 0; i < subcarriers; i++) {
      meanAmp[i] += f.amplitude[i];
      meanPhase[i] += f.phase[i];
    }
  }

  for (let i = 0; i < subcarriers; i++) {
    meanAmp[i] /= frames.length;
    meanPhase[i] /= frames.length;
  }

  // 2. Subtract means (leaving only dynamic components)
  return frames.map(f => ({
    ...f,
    amplitude: f.amplitude.map((v, i) => v - meanAmp[i]),
    phase: f.phase.map((v, i) => {
      const diff = v - meanPhase[i];
      return Math.atan2(Math.sin(diff), Math.cos(diff));
    }),
  }));
}

/**
 * Builds a 3D CsiTensor [T, S, A] from a buffer of normalized frames.
 */
export function buildTemporalWindow(
  frames: NormalizedCsiFrame[],
  windowSizeMs: number = 5000 // 5 seconds temporal window
): CsiTensor {
  if (frames.length === 0) {
    return { shape: [0, 0, 0], data: [], timestamps: [], sensorIds: [] };
  }

  const latestTime = Math.max(...frames.map(f => f.timestamp));
  const startTime = latestTime - windowSizeMs;

  // Filter frames inside window
  const windowFrames = frames.filter(f => f.timestamp >= startTime).sort((a, b) => a.timestamp - b.timestamp);

  // Group unique sensors (A) and subcarriers (S)
  const sensorIds = Array.from(new Set(windowFrames.map(f => f.sensorId)));
  const subcarrierCount = windowFrames[0].subcarrierCount;

  // Gather unique timestamps (T)
  const timestamps = Array.from(new Set(windowFrames.map(f => f.timestamp)));
  const T = timestamps.length;
  const S = subcarrierCount;
  const A = sensorIds.length;

  // Initialize 3D array: T x S x A
  const data: number[][][] = [];
  for (let t = 0; t < T; t++) {
    data[t] = [];
    for (let s = 0; s < S; s++) {
      data[t][s] = new Array(A).fill(0);
    }
  }

  // Populate tensor with amplitude values
  for (const f of windowFrames) {
    const tIdx = timestamps.indexOf(f.timestamp);
    const aIdx = sensorIds.indexOf(f.sensorId);
    if (tIdx !== -1 && aIdx !== -1) {
      for (let s = 0; s < S; s++) {
        data[tIdx][s][aIdx] = f.amplitude[s];
      }
    }
  }

  return {
    shape: [T, S, A],
    data,
    timestamps,
    sensorIds,
  };
}

/**
 * Simple PCA-style denoising stub. Removes minor singular values (noise components).
 */
export function applyPcaDenoising(tensor: CsiTensor): CsiTensor {
  // Principal Component Analysis Denoising
  // In a real C++ engine, we would compute SVD (Singular Value Decomposition) 
  // and keep top K components. Here we zero out values below a threshold.
  const threshold = 0.05;
  const denoiseData = tensor.data.map(tRow =>
    tRow.map(sRow =>
      sRow.map(v => (Math.abs(v) < threshold ? 0 : v))
    )
  );

  return {
    ...tensor,
    data: denoiseData,
  };
}

/**
 * Extracts dynamic human perturbation signals from a spatial-temporal tensor.
 */
export function extractDynamicPerturbations(tensor: CsiTensor): CsiTensor {
  // Removes static offsets and PCA denoises the tensor
  const threshold = 0.1;
  const shape = tensor.shape;
  const T = shape[0];
  const S = shape[1];
  const A = shape[2];

  if (T < 2) return tensor;

  // 1. Calculate mean along the time axis (T)
  const mean: number[][] = [];
  for (let s = 0; s < S; s++) {
    mean[s] = new Array(A).fill(0);
    for (let a = 0; a < A; a++) {
      let sum = 0;
      for (let t = 0; t < T; t++) {
        sum += tensor.data[t][s][a];
      }
      mean[s][a] = sum / T;
    }
  }

  // 2. Subtract time-mean and apply thresholding
  const dynamicData: number[][][] = [];
  for (let t = 0; t < T; t++) {
    dynamicData[t] = [];
    for (let s = 0; s < S; s++) {
      dynamicData[t][s] = [];
      for (let a = 0; a < A; a++) {
        const diff = tensor.data[t][s][a] - mean[s][a];
        dynamicData[t][s][a] = Math.abs(diff) > threshold ? diff : 0;
      }
    }
  }

  return {
    ...tensor,
    data: dynamicData,
  };
}
