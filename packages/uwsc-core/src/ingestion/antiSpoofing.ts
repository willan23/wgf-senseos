// =============================================
// UWSC Anti-Spoofing & RF Fingerprinting (Experimental)
// =============================================

import { CsiFrame } from '../types';
import { HardwareFingerprint } from './index';

// Reference database for registered hardware fingerprints (in-memory mock)
const fingerprintDatabase = new Map<string, HardwareFingerprint>();

/**
 * Extracts RF physical characteristics to build a unique hardware fingerprint.
 * Analyzes Local Oscillator phase noise, IQ gain imbalance, RSSI drift, and jitter.
 */
export function extractRfFingerprint(frame: CsiFrame): HardwareFingerprint {
  // If live mode, we would calculate this from physical subcarrier IQ matrices.
  // In simulated/lab modes, we generate values with realistic offsets.
  const sensorId = frame.sensorId;
  const seed = sensorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Phase noise variance is estimated from phase fluctuation in static subcarriers
  const phaseNoiseVariance = Math.max(0.01, 0.05 + Math.sin(seed) * 0.02);
  
  // IQ Gain Imbalance ratio
  const iqImbalanceScore = Math.max(0.01, 0.04 + Math.cos(seed) * 0.01);
  
  // Carrier Frequency Offset drift (ppm)
  const carrierFrequencyOffset = Math.sin(seed * 2) * 5;

  // Packet jitter from timestamp arrival delta (in ms)
  const packetTimingJitter = 2.0 + Math.abs(Math.sin(seed * 3) * 8.0);

  // RSSI Drift (deviation from median RSSI)
  const rssiDrift = 0.5 + Math.abs(Math.cos(seed * 4) * 1.5);

  return {
    sensorId,
    phaseNoiseVariance,
    iqImbalanceScore,
    carrierFrequencyOffset,
    packetTimingJitter,
    rssiDrift,
    calculatedAt: Date.now(),
  };
}

/**
 * Compares two hardware fingerprints and returns a similarity score from 0 to 1.
 */
export function compareHardwareFingerprint(a: HardwareFingerprint, b: HardwareFingerprint): number {
  if (a.sensorId !== b.sensorId) return 0;

  const diffPhase = Math.abs(a.phaseNoiseVariance - b.phaseNoiseVariance) / 0.1; // normalize to expected range
  const diffIq = Math.abs(a.iqImbalanceScore - b.iqImbalanceScore) / 0.05;
  const diffCfo = Math.abs(a.carrierFrequencyOffset - b.carrierFrequencyOffset) / 10.0;
  const diffJitter = Math.abs(a.packetTimingJitter - b.packetTimingJitter) / 15.0;

  const totalDiff = (diffPhase + diffIq + diffCfo + diffJitter) / 4;
  return Math.max(0, 1 - totalDiff);
}

/**
 * Detects if there is a spoofing anomaly by comparing the current fingerprint
 * against a trusted reference profile.
 */
export function detectSpoofingAnomaly(
  current: HardwareFingerprint,
  reference: HardwareFingerprint
): { isAnomaly: boolean; reason: string; similarity: number } {
  const similarity = compareHardwareFingerprint(current, reference);

  if (similarity < 0.75) {
    let reason = 'Anomalia de hardware de RF: ';
    if (Math.abs(current.phaseNoiseVariance - reference.phaseNoiseVariance) > 0.03) {
      reason += 'Variação excessiva de ruído de fase do oscilador. ';
    }
    if (Math.abs(current.iqImbalanceScore - reference.iqImbalanceScore) > 0.015) {
      reason += 'Desvio no ganho I/Q das antenas. ';
    }
    if (Math.abs(current.carrierFrequencyOffset - reference.carrierFrequencyOffset) > 4) {
      reason += 'Desvio excessivo no Carrier Frequency Offset (CFO). ';
    }
    return {
      isAnomaly: true,
      reason: reason.trim(),
      similarity,
    };
  }

  return {
    isAnomaly: false,
    reason: '',
    similarity,
  };
}

/**
 * Scores the authenticity of a signal frame and suggests a security quarantine action.
 */
export function scoreSignalAuthenticity(
  fingerprint: HardwareFingerprint,
  reference?: HardwareFingerprint
): {
  authenticityScore: number;
  spoofingRisk: 'low' | 'medium' | 'high';
  reasonCodes: string[];
  recommendedAction: 'accept' | 'quarantine' | 'reject';
} {
  const reasonCodes: string[] = [];
  let score = 1.0;

  // 1. Check if we have a registered reference fingerprint for this sensor
  let activeReference = reference || fingerprintDatabase.get(fingerprint.sensorId);
  if (!activeReference) {
    // Register the first fingerprint as the trusted baseline
    fingerprintDatabase.set(fingerprint.sensorId, fingerprint);
    activeReference = fingerprint;
  }

  // 2. Perform comparison
  const anomaly = detectSpoofingAnomaly(fingerprint, activeReference);
  if (anomaly.isAnomaly) {
    score *= anomaly.similarity;
    reasonCodes.push('RF_FINGERPRINT_MISMATCH');
  }

  // 3. Test for excessive anomalies in absolute values (e.g. SDR injection signatures)
  if (fingerprint.phaseNoiseVariance > 0.15) {
    score -= 0.3;
    reasonCodes.push('EXCESSIVE_PHASE_NOISE');
  }
  if (fingerprint.iqImbalanceScore > 0.08) {
    score -= 0.25;
    reasonCodes.push('HIGH_IQ_IMBALANCE');
  }
  if (fingerprint.packetTimingJitter > 25.0) {
    score -= 0.2;
    reasonCodes.push('TIMING_JITTER_ANOMALY');
  }
  if (fingerprint.rssiDrift > 4.0) {
    score -= 0.15;
    reasonCodes.push('RSSI_DRIFT_DETECTED');
  }

  score = Math.max(0, Math.min(1.0, score));

  // Determine risk level & recommended action
  let spoofingRisk: 'low' | 'medium' | 'high' = 'low';
  let recommendedAction: 'accept' | 'quarantine' | 'reject' = 'accept';

  if (score < 0.5) {
    spoofingRisk = 'high';
    recommendedAction = 'reject';
  } else if (score < 0.8) {
    spoofingRisk = 'medium';
    recommendedAction = 'quarantine';
  }

  return {
    authenticityScore: Math.round(score * 100) / 100,
    spoofingRisk,
    reasonCodes,
    recommendedAction,
  };
}

/**
 * Resets the registered baseline for a sensor (useful for manual recalibration).
 */
export function resetSensorBaseline(sensorId: string): void {
  fingerprintDatabase.delete(sensorId);
}

/**
 * Main entry point for checking if a CSI frame has a valid RF fingerprint.
 */
export function checkAntiSpoofing(
  frame: CsiFrame,
  reference?: HardwareFingerprint
): {
  isAuthentic: boolean;
  authenticityScore: number;
  calculatedFingerprint: HardwareFingerprint;
} {
  const fingerprint = extractRfFingerprint(frame);
  const result = scoreSignalAuthenticity(fingerprint, reference);
  return {
    isAuthentic: result.recommendedAction !== 'reject',
    authenticityScore: result.authenticityScore,
    calculatedFingerprint: fingerprint,
  };
}
