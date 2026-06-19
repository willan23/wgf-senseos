/**
 * WGF SenseOS — Real Fall Classifier (Camada 3)
 * Real-time fall detection using CSI signal characteristics.
 * Replaces simulated runFallClassifier with real signal processing.
 */

import type { CsiTensor } from '../normalization';
import type { SignalProcessingResult } from '../signal-processing';
import type { FallResult } from './types';

const IMPACT_THRESHOLD = 80.0;
const POST_IMPACT_RATIO = 0.10;
const IMPACT_WINDOW_MS = 500;
const MIN_CONFIDENCE = 0.75;

/**
 * Detects falls using multi-stage analysis:
 * 1. Impact detection: sudden spike in CSI amplitude variance
 * 2. Post-impact analysis: reduced motion after impact (person lying down)
 * 3. Temporal correlation: impact followed by near-zero activity
 */
export function runRealFallClassifier(
  tensor: CsiTensor,
  signal: SignalProcessingResult,
): FallResult {
  const [timeSteps, subcarriers, antennas] = tensor.shape;

  if (timeSteps < 5) {
    return { detected: false, confidence: 0.9, isSimulated: false };
  }

  const frameEnergies: number[] = [];
  const frameVariances: number[] = [];

  for (let t = 0; t < timeSteps; t++) {
    let energy = 0;
    let mean = 0;
    let count = 0;

    for (let sc = 0; sc < subcarriers; sc++) {
      for (let a = 0; a < antennas; a++) {
        const val = tensor.data[t][sc]?.[a] ?? 0;
        mean += val;
        count++;
      }
    }
    mean /= count;

    let variance = 0;
    for (let sc = 0; sc < subcarriers; sc++) {
      for (let a = 0; a < antennas; a++) {
        const val = tensor.data[t][sc]?.[a] ?? 0;
        energy += val * val;
        const diff = val - mean;
        variance += diff * diff;
      }
    }

    frameEnergies.push(energy / count);
    frameVariances.push(variance / count);
  }

  const maxEnergy = Math.max(...frameEnergies);
  const avgEnergy = frameEnergies.reduce((a, b) => a + b, 0) / frameEnergies.length;

  let impactFrame = -1;
  let impactMagnitude = 0;

  for (let t = 1; t < timeSteps; t++) {
    const energyDelta = frameEnergies[t] - frameEnergies[t - 1];
    if (energyDelta > IMPACT_THRESHOLD && frameEnergies[t] > avgEnergy * 3) {
      if (energyDelta > impactMagnitude) {
        impactMagnitude = energyDelta;
        impactFrame = t;
      }
    }
  }

  if (impactFrame === -1) {
    return { detected: false, confidence: 0.92, isSimulated: false };
  }

  const postImpactStart = impactFrame + 1;
  const postImpactEnd = Math.min(timeSteps, postImpactStart + Math.floor(timeSteps * 0.4));

  if (postImpactStart >= timeSteps) {
    return { detected: false, confidence: 0.85, isSimulated: false };
  }

  let postImpactEnergy = 0;
  let preImpactEnergy = 0;
  const preImpactEnd = Math.max(0, impactFrame - Math.floor(timeSteps * 0.3));

  for (let t = preImpactEnd; t < impactFrame; t++) {
    preImpactEnergy += frameEnergies[t];
  }
  preImpactEnergy /= Math.max(impactFrame - preImpactEnd, 1);

  for (let t = postImpactStart; t < postImpactEnd; t++) {
    postImpactEnergy += frameEnergies[t];
  }
  postImpactEnergy /= Math.max(postImpactEnd - postImpactStart, 1);

  const energyRatio = postImpactEnergy / Math.max(preImpactEnergy, 1);
  const motionReduction = energyRatio < POST_IMPACT_RATIO;

  const impactDetected = impactMagnitude > IMPACT_THRESHOLD;
  const significantSpike = maxEnergy > avgEnergy * 5;

  const detected = impactDetected && motionReduction;

  let confidence = MIN_CONFIDENCE;

  if (detected) {
    if (energyRatio < 0.05) {
      confidence = Math.min(0.95, MIN_CONFIDENCE + 0.15);
    } else if (energyRatio < POST_IMPACT_RATIO) {
      confidence = MIN_CONFIDENCE + 0.08;
    }

    if (significantSpike) {
      confidence = Math.min(confidence + 0.05, 0.98);
    }
  }

  return {
    detected,
    confidence,
    eventTimestamp: detected ? tensor.timestamps[impactFrame] : undefined,
    isSimulated: false,
  };
}
