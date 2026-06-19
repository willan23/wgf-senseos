/**
 * WGF SenseOS — ToF Estimator
 * Estimates Time of Flight from CSI subcarrier phase differences.
 */

const SPEED_OF_LIGHT = 3e8;
const WIFI_BANDWIDTH_80MHZ = 80e6;
const SUBCARRIER_SPACING_80MHZ = 312.5e3;

export interface ToFEstimate {
  timeOfFlight: number;
  distance: number;
  confidence: number;
}

/**
 * Estimates Time of Flight using phase slope across subcarriers.
 * The phase difference between adjacent subcarriers is proportional to ToF.
 */
export function estimateToF(
  csiAmplitudes: number[],
  csiPhases: number[],
  bandwidthHz: number = WIFI_BANDWIDTH_80MHZ,
): ToFEstimate | null {
  if (csiPhases.length < 8) {
    return null;
  }

  const phaseDiffs: number[] = [];

  for (let i = 1; i < csiPhases.length; i++) {
    let diff = csiPhases[i] - csiPhases[i - 1];

    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    phaseDiffs.push(diff);
  }

  if (phaseDiffs.length === 0) {
    return null;
  }

  const avgPhaseDiff = phaseDiffs.reduce((a, b) => a + b, 0) / phaseDiffs.length;

  const subcarrierSpacing = bandwidthHz / csiPhases.length;
  const timeOfFlight = avgPhaseDiff / (2 * Math.PI * subcarrierSpacing);

  const distance = timeOfFlight * SPEED_OF_LIGHT;

  const variance = phaseDiffs.reduce((sum, d) =>
    sum + (d - avgPhaseDiff) ** 2, 0) / phaseDiffs.length;
  const confidence = Math.max(0, Math.min(1, 1 - variance * 10));

  return {
    timeOfFlight: Math.abs(timeOfFlight),
    distance: Math.abs(distance),
    confidence,
  };
}

/**
 * Estimates distance using RSSI path loss model as fallback.
 */
export function estimateDistanceFromRssi(
  rssi: number,
  refPower: number = -30,
  pathLossExponent: number = 2.5,
): number {
  const ratio = (refPower - rssi) / (10 * pathLossExponent);
  return Math.max(0.5, Math.min(25, Math.pow(10, ratio)));
}
