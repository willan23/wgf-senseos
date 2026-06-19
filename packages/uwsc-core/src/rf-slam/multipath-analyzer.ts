/**
 * WGF SenseOS — Multipath Analyzer
 * Detects walls, doors, and obstacles from CSI multipath reflections.
 */

export interface MultipathComponent {
  delay: number;
  amplitude: number;
  phase: number;
  angle: number;
}

export interface WallCandidate {
  x: number;
  y: number;
  orientation: number;
  length: number;
  confidence: number;
}

/**
 * Analyzes multipath components to detect reflective surfaces.
 * Strong reflections indicate walls or large obstacles.
 */
export function analyzeMultipath(
  csiAmplitudes: number[][],
  csiPhases: number[][],
  sensorPositions: { x: number; y: number }[],
): WallCandidate[] {
  const candidates: WallCandidate[] = [];

  if (csiAmplitudes.length < 4 || sensorPositions.length < 2) {
    return candidates;
  }

  const energyProfile: number[] = [];
  for (let sc = 0; sc < csiAmplitudes.length; sc++) {
    let energy = 0;
    for (let ant = 0; ant < (csiAmplitudes[sc]?.length ?? 0); ant++) {
      const amp = csiAmplitudes[sc]?.[ant] ?? 0;
      energy += amp * amp;
    }
    energyProfile.push(energy);
  }

  const avgEnergy = energyProfile.reduce((a, b) => a + b, 0) / energyProfile.length;
  const threshold = avgEnergy * 2;

  for (let sc = 1; sc < energyProfile.length - 1; sc++) {
    if (energyProfile[sc] > threshold &&
        energyProfile[sc] > energyProfile[sc - 1] &&
        energyProfile[sc] > energyProfile[sc + 1]) {

      for (let i = 0; i < sensorPositions.length; i++) {
        for (let j = i + 1; j < sensorPositions.length; j++) {
          const s1 = sensorPositions[i];
          const s2 = sensorPositions[j];

          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2;
          const orientation = Math.atan2(s2.y - s1.y, s2.x - s1.x);

          candidates.push({
            x: midX,
            y: midY,
            orientation,
            length: 2.0,
            confidence: Math.min(1, energyProfile[sc] / (threshold * 2)),
          });
        }
      }
    }
  }

  return mergeWallCandidates(candidates);
}

/**
 * Merges nearby wall candidates into coherent walls.
 */
function mergeWallCandidates(candidates: WallCandidate[]): WallCandidate[] {
  if (candidates.length === 0) return [];

  const merged: WallCandidate[] = [];
  const used = new Set<number>();

  for (let i = 0; i < candidates.length; i++) {
    if (used.has(i)) continue;

    let cluster = [candidates[i]];
    used.add(i);

    for (let j = i + 1; j < candidates.length; j++) {
      if (used.has(j)) continue;

      const ci = candidates[i];
      const cj = candidates[j];

      const dist = Math.sqrt((ci.x - cj.x) ** 2 + (ci.y - cj.y) ** 2);
      const angleDiff = Math.abs(ci.orientation - cj.orientation);

      if (dist < 2.0 && angleDiff < Math.PI / 6) {
        cluster.push(cj);
        used.add(j);
      }
    }

    const avgX = cluster.reduce((s, c) => s + c.x, 0) / cluster.length;
    const avgY = cluster.reduce((s, c) => s + c.y, 0) / cluster.length;
    const avgConf = cluster.reduce((s, c) => s + c.confidence, 0) / cluster.length;

    merged.push({
      x: avgX,
      y: avgY,
      orientation: cluster[0].orientation,
      length: 2.0 + cluster.length * 0.5,
      confidence: Math.min(1, avgConf * (1 + cluster.length * 0.1)),
    });
  }

  return merged;
}
