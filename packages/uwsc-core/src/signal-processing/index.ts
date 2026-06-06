// =============================================
// UWSC Camada 2: Processamento de Sinal (Fase 5)
// =============================================
// Filtros Butterworth, Energia de Movimento, Deteção de Queda e Respiração
// NOTA: Implementação TypeScript pura para Edge/SSR. Versão C++/WASM futura.
// =============================================

import { CsiTensor } from '../normalization';

export interface SignalBand {
  name: 'breathing' | 'gait' | 'motion';
  minHz: number;
  maxHz: number;
}

export const SIGNAL_BANDS: SignalBand[] = [
  { name: 'breathing', minHz: 0.1, maxHz: 0.5 },
  { name: 'gait',      minHz: 1.0, maxHz: 5.0 },
  { name: 'motion',    minHz: 0.5, maxHz: 10.0 },
];

export interface ProcessedSignal {
  band: SignalBand['name'];
  /** Filtered amplitudes per subcarrier (averaged across antennas), shape [T] */
  timeSeries: number[];
  /** Dominant frequency estimate (Hz), via FFT peak detection */
  dominantFreqHz: number;
  /** Energy of the signal in the band (RMS) */
  energyRms: number;
}

export interface SignalProcessingResult {
  breathing: ProcessedSignal;
  gait: ProcessedSignal;
  motion: ProcessedSignal;
  /** Estimated number of people based on motion energy clusters */
  estimatedPersonCount: number;
  /** Fall heuristic: true if abrupt drop in Z-axis motion energy is detected */
  fallDetected: boolean;
  /** Breathing rate (breaths per minute) */
  breathingRateBpm: number;
  /** Raw motion energy scalar across all subcarriers/antennas */
  totalMotionEnergy: number;
}

// ============================================================
// Digital Butterworth Bandpass Filter (2nd order, bilinear transform)
// ============================================================

interface BiquadCoeffs {
  b: [number, number, number];
  a: [number, number, number];
}

/**
 * Computes biquad coefficients for a 2nd-order Butterworth bandpass filter.
 * Uses bilinear transform. fs = sampling frequency (Hz).
 */
export function butterworthBandpassCoeffs(lowHz: number, highHz: number, fsHz: number): BiquadCoeffs {
  const nyq = fsHz / 2;
  const low = Math.max(lowHz / nyq, 0.001);
  const high = Math.min(highHz / nyq, 0.999);

  // Pre-warp
  const wl = Math.tan((Math.PI * low) / 2);
  const wh = Math.tan((Math.PI * high) / 2);
  const bw = wh - wl;
  const wc2 = wl * wh;

  const a0 = 1 + bw + wc2;
  const b: [number, number, number] = [bw / a0, 0, -bw / a0];
  const a: [number, number, number] = [1, (2 * (wc2 - 1)) / a0, (1 - bw + wc2) / a0];

  return { b, a };
}

/**
 * Applies a biquad IIR filter to a signal in-place (direct form II transposed).
 */
export function applyBiquadFilter(signal: number[], coeffs: BiquadCoeffs): number[] {
  const { b, a } = coeffs;
  const out: number[] = new Array(signal.length).fill(0);
  let s1 = 0, s2 = 0;

  for (let n = 0; n < signal.length; n++) {
    const x = signal[n];
    out[n] = b[0] * x + s1;
    s1 = b[1] * x - a[1] * out[n] + s2;
    s2 = b[2] * x - a[2] * out[n];
  }
  return out;
}

// ============================================================
// FFT (Cooley-Tukey, in-place, power-of-2)
// ============================================================

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Simple DFT-based peak frequency detector for short signals.
 * Returns dominant frequency in Hz given sample rate fs.
 */
export function estimateDominantFrequency(signal: number[], fsHz: number): number {
  const N = signal.length;
  if (N < 4) return 0;

  let maxPower = 0;
  let peakBin = 0;

  // Compute power spectrum via DFT (O(N²) – acceptable for short N ≤ 512)
  for (let k = 1; k < Math.floor(N / 2); k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }
    const power = re * re + im * im;
    if (power > maxPower) {
      maxPower = power;
      peakBin = k;
    }
  }

  return (peakBin * fsHz) / N;
}

/**
 * Root-mean-square energy of a signal.
 */
export function computeRmsEnergy(signal: number[]): number {
  if (signal.length === 0) return 0;
  const sumSq = signal.reduce((s, v) => s + v * v, 0);
  return Math.sqrt(sumSq / signal.length);
}

// ============================================================
// Tensor → Time Series Projection
// ============================================================

/**
 * Projects a CsiTensor [T, S, A] into a scalar time series by averaging
 * across all subcarriers and antennas. Shape: [T].
 */
export function projectTensorToTimeSeries(tensor: CsiTensor): number[] {
  const [T, S, A] = tensor.shape;
  if (T === 0) return [];

  return tensor.data.map(tFrame => {
    let sum = 0;
    for (let s = 0; s < S; s++) {
      for (let a = 0; a < A; a++) {
        sum += tFrame[s][a];
      }
    }
    return sum / Math.max(S * A, 1);
  });
}

// ============================================================
// Fall Detection Heuristic
// ============================================================

/**
 * Detects a fall event based on abrupt energy spike followed by near-zero activity.
 * Typical signature: brief high-energy burst (impact) → sustained low-energy (person on ground).
 */
export function detectFall(motionTimeSeries: number[]): boolean {
  const len = motionTimeSeries.length;
  if (len < 10) return false;

  // Find peak energy and its location
  let peak = 0;
  let peakIdx = 0;
  for (let i = 0; i < len; i++) {
    if (motionTimeSeries[i] > peak) {
      peak = motionTimeSeries[i];
      peakIdx = i;
    }
  }

  // After peak, energy should drop to near-zero (person on floor, minimal movement)
  if (peakIdx < len - 3) {
    const postPeak = motionTimeSeries.slice(peakIdx + 1);
    const postPeakMean = postPeak.reduce((s, v) => s + v, 0) / postPeak.length;
    const prePeakMean = motionTimeSeries.slice(0, peakIdx).reduce((s, v) => s + v, 0) / Math.max(peakIdx, 1);

    // Fall: peak is ≥3x pre-peak, and post-peak is <30% of pre-peak
    if (peak >= 3 * (prePeakMean || 0.001) && postPeakMean < 0.3 * prePeakMean) {
      return true;
    }
  }
  return false;
}

// ============================================================
// Person Count Estimator
// ============================================================

/**
 * Estimates number of people from motion energy.
 * Simple heuristic: energy quantiles map to person count tiers.
 * [PLACEHOLDER] — replace with CNN inference in Phase 6.
 */
export function estimatePersonCount(totalMotionEnergy: number): number {
  if (totalMotionEnergy < 0.05) return 0;
  if (totalMotionEnergy < 0.3)  return 1;
  if (totalMotionEnergy < 0.7)  return 2;
  if (totalMotionEnergy < 1.2)  return 3;
  return Math.min(Math.round(totalMotionEnergy * 3), 10);
}

// ============================================================
// Main Processing Pipeline
// ============================================================

export interface SignalProcessingOptions {
  sampleRateHz: number;
}

/**
 * Full signal processing pipeline for a CsiTensor.
 * Returns structured detection results for breathing, gait, and motion.
 */
export function processCsiTensor(
  tensor: CsiTensor,
  opts: SignalProcessingOptions = { sampleRateHz: 100 }
): SignalProcessingResult {
  const { sampleRateHz } = opts;
  const timeSeries = projectTensorToTimeSeries(tensor);

  if (timeSeries.length === 0) {
    return {
      breathing: { band: 'breathing', timeSeries: [], dominantFreqHz: 0, energyRms: 0 },
      gait:      { band: 'gait',      timeSeries: [], dominantFreqHz: 0, energyRms: 0 },
      motion:    { band: 'motion',    timeSeries: [], dominantFreqHz: 0, energyRms: 0 },
      estimatedPersonCount: 0,
      fallDetected: false,
      breathingRateBpm: 0,
      totalMotionEnergy: 0,
    };
  }

  // Apply Butterworth filters for each band
  const processedBands: Record<SignalBand['name'], ProcessedSignal> = {} as never;

  for (const band of SIGNAL_BANDS) {
    const coeffs = butterworthBandpassCoeffs(band.minHz, band.maxHz, sampleRateHz);
    const filtered = applyBiquadFilter(timeSeries, coeffs);
    const dominantFreqHz = estimateDominantFrequency(filtered, sampleRateHz);
    const energyRms = computeRmsEnergy(filtered);

    processedBands[band.name] = {
      band: band.name,
      timeSeries: filtered,
      dominantFreqHz,
      energyRms,
    };
  }

  const totalMotionEnergy = computeRmsEnergy(timeSeries);
  const fallDetected = detectFall(processedBands.motion.timeSeries);
  const breathingRateBpm = processedBands.breathing.dominantFreqHz * 60;
  const estimatedPersonCount = estimatePersonCount(totalMotionEnergy);

  return {
    breathing: processedBands.breathing,
    gait: processedBands.gait,
    motion: processedBands.motion,
    estimatedPersonCount,
    fallDetected,
    breathingRateBpm,
    totalMotionEnergy,
  };
}
