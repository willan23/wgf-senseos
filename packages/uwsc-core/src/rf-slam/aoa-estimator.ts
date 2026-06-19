/**
 * WGF SenseOS — AoA Estimator (MUSIC-inspired)
 * Estimates Angle of Arrival from CSI data using beamforming.
 * Based on P2SLAM bearing estimation algorithm.
 */

const SPEED_OF_LIGHT = 3e8;
const WIFI_FREQ_5GHZ = 5.18e9;
const DEFAULT_ANTENNA_SPACING = 0.025;
const NUM_ANGLES = 360;

export interface AoAEstimate {
  angle: number;
  distance: number;
  confidence: number;
  spectrum: number[];
}

/**
 * Estimates Angle of Arrival using steerable beamforming.
 * Computes spatial spectrum across angles and finds dominant direction.
 */
export function estimateAoA(
  csiAmplitudes: number[][],
  csiPhases: number[][],
  numAntennas: number,
  antennaSpacing: number = DEFAULT_ANTENNA_SPACING,
): AoAEstimate | null {
  if (numAntennas < 2 || csiAmplitudes.length < 4) {
    return null;
  }

  const spectrum: number[] = new Array(NUM_ANGLES).fill(0);

  for (let angleIdx = 0; angleIdx < NUM_ANGLES; angleIdx++) {
    const angle = (angleIdx / NUM_ANGLES) * Math.PI - Math.PI / 2;
    let power = 0;

    const numSubcarriers = Math.min(csiAmplitudes.length, 20);

    for (let sc = 0; sc < numSubcarriers; sc++) {
      for (let m = 0; m < numAntennas; m++) {
        for (let n = m + 1; n < numAntennas; n++) {
          const phaseM = csiPhases[sc]?.[m] ?? 0;
          const phaseN = csiPhases[sc]?.[n] ?? 0;
          const ampM = csiAmplitudes[sc]?.[m] ?? 0;
          const ampN = csiAmplitudes[sc]?.[n] ?? 0;

          const steeringPhase = (2 * Math.PI * WIFI_FREQ_5GHZ *
            (n - m) * antennaSpacing * Math.sin(angle)) / SPEED_OF_LIGHT;

          const correlation = ampM * ampN * Math.cos(phaseM - phaseN - steeringPhase);
          power += correlation * correlation;
        }
      }
    }

    spectrum[angleIdx] = power;
  }

  let maxPower = -Infinity;
  let bestAngleIdx = 0;

  for (let i = 0; i < NUM_ANGLES; i++) {
    if (spectrum[i] > maxPower) {
      maxPower = spectrum[i];
      bestAngleIdx = i;
    }
  }

  const bestAngle = (bestAngleIdx / NUM_ANGLES) * Math.PI - Math.PI / 2;

  const maxSpectrum = Math.max(...spectrum);
  const avgSpectrum = spectrum.reduce((a, b) => a + b, 0) / spectrum.length;
  const confidence = Math.min(1, (maxSpectrum - avgSpectrum) / (maxSpectrum + 1e-10));

  return {
    angle: bestAngle,
    distance: 5.0,
    confidence,
    spectrum,
  };
}

/**
 * Estimates distance from RSSI using path loss model.
 */
export function estimateDistance(
  rssi: number,
  refPower: number = -30,
  pathLossExponent: number = 2.5,
  refDistance: number = 1.0,
): number {
  const ratio = (refPower - rssi) / (10 * pathLossExponent);
  return Math.max(0.5, Math.min(25, refDistance * Math.pow(10, ratio)));
}

/**
 * Converts polar coordinates to Cartesian.
 */
export function polarToCartesian(
  angle: number,
  distance: number,
): { x: number; y: number } {
  return {
    x: distance * Math.cos(angle),
    y: distance * Math.sin(angle),
  };
}
