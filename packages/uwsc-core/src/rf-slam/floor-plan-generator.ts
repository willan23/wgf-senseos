/**
 * WGF SenseOS — Floor Plan Generator
 * Generates geometric floor plans from RF SLAM data.
 */

import { FloorPlan, Wall, Obstacle, Zone, SensorPosition, WallCandidate } from './types';
import { FactorGraph } from './factor-graph';

export interface FloorPlanConfig {
  siteId: string;
  gridSize: number;
  mergeDistance: number;
  minConfidence: number;
}

const DEFAULT_CONFIG: FloorPlanConfig = {
  siteId: '',
  gridSize: 0.5,
  mergeDistance: 1.0,
  minConfidence: 0.3,
};

/**
 * Generates a floor plan from wall candidates and sensor positions.
 */
export function generateFloorPlan(
  wallCandidates: WallCandidate[],
  sensorPositions: SensorPosition[],
  config: Partial<FloorPlanConfig> = {},
): FloorPlan {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const walls = wallCandidates
    .filter(c => c.confidence >= cfg.minConfidence)
    .map((c, idx) => candidateToWall(c, idx));

  const mergedWalls = mergeWalls(walls, cfg.mergeDistance);
  const optimizedWalls = optimizeWallsWithFactorGraph(mergedWalls, sensorPositions);

  const obstacles = detectObstacles(optimizedWalls, sensorPositions);

  const zones = inferZones(optimizedWalls, sensorPositions);

  const bounds = calculateBounds(optimizedWalls, sensorPositions);

  return {
    type: 'floor_plan',
    siteId: cfg.siteId,
    version: 1,
    walls: optimizedWalls,
    obstacles,
    zones,
    sensors: sensorPositions,
    bounds,
    confidence: calculateOverallConfidence(optimizedWalls),
    generatedAt: Date.now(),
  };
}

function candidateToWall(candidate: WallCandidate, index: number): Wall {
  const halfLength = candidate.length / 2;
  const cos = Math.cos(candidate.orientation);
  const sin = Math.sin(candidate.orientation);

  return {
    id: `wall_${index}`,
    x1: candidate.x - halfLength * cos,
    y1: candidate.y - halfLength * sin,
    x2: candidate.x + halfLength * cos,
    y2: candidate.y + halfLength * sin,
    type: 'solid',
    confidence: candidate.confidence,
  };
}

function mergeWalls(walls: Wall[], mergeDistance: number): Wall[] {
  if (walls.length === 0) return [];

  const merged: Wall[] = [];
  const used = new Set<number>();

  for (let i = 0; i < walls.length; i++) {
    if (used.has(i)) continue;

    let cluster = [walls[i]];
    used.add(i);

    for (let j = i + 1; j < walls.length; j++) {
      if (used.has(j)) continue;

      if (areWallsCompatible(walls[i], walls[j], mergeDistance)) {
        cluster.push(walls[j]);
        used.add(j);
      }
    }

    if (cluster.length === 1) {
      merged.push(cluster[0]);
    } else {
      merged.push(mergeWallCluster(cluster));
    }
  }

  return merged;
}

function areWallsCompatible(a: Wall, b: Wall, maxDist: number): boolean {
  const midAx = (a.x1 + a.x2) / 2;
  const midAy = (a.y1 + a.y2) / 2;
  const midBx = (b.x1 + b.x2) / 2;
  const midBy = (b.y1 + b.y2) / 2;

  const dist = Math.sqrt((midAx - midBx) ** 2 + (midAy - midBy) ** 2);
  if (dist > maxDist) return false;

  const angleA = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
  const angleB = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
  let angleDiff = Math.abs(angleA - angleB);
  if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

  return angleDiff < Math.PI / 6;
}

function mergeWallCluster(cluster: Wall[]): Wall {
  const allX = cluster.flatMap(w => [w.x1, w.x2]);
  const allY = cluster.flatMap(w => [w.y1, w.y2]);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const x of allX) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  for (const y of allY) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const avgConf = cluster.reduce((s, w) => s + w.confidence, 0) / cluster.length;

  return {
    id: `wall_merged_${Date.now()}`,
    x1: minX,
    y1: minY,
    x2: maxX,
    y2: maxY,
    type: 'solid',
    confidence: Math.min(1, avgConf * 1.2),
  };
}

function detectObstacles(walls: Wall[], sensors: SensorPosition[]): Obstacle[] {
  const obstacles: Obstacle[] = [];

  const wallCenters = walls.map(w => ({
    x: (w.x1 + w.x2) / 2,
    y: (w.y1 + w.y2) / 2,
  }));

  for (let i = 0; i < wallCenters.length; i++) {
    for (let j = i + 1; j < wallCenters.length; j++) {
      const dist = Math.sqrt(
        (wallCenters[i].x - wallCenters[j].x) ** 2 +
        (wallCenters[i].y - wallCenters[j].y) ** 2
      );

      if (dist < 3.0 && dist > 0.5) {
        obstacles.push({
          id: `obstacle_${i}_${j}`,
          x: (wallCenters[i].x + wallCenters[j].x) / 2,
          y: (wallCenters[i].y + wallCenters[j].y) / 2,
          radius: dist / 3,
          type: 'furniture',
          confidence: 0.5,
        });
      }
    }
  }

  return obstacles;
}

function inferZones(walls: Wall[], sensors: SensorPosition[]): Zone[] {
  const zones: Zone[] = [];

  if (walls.length === 0 && sensors.length === 0) {
    zones.push({
      id: 'zone_default',
      name: 'Área Principal',
      polygon: [[0, 0], [10, 0], [10, 10], [0, 10]],
      type: 'room',
    });
    return zones;
  }

  const allX = [...walls.flatMap(w => [w.x1, w.x2]), ...sensors.map(s => s.x)];
  const allY = [...walls.flatMap(w => [w.y1, w.y2]), ...sensors.map(s => s.y)];

  const minX = Math.min(...allX) - 1;
  const maxX = Math.max(...allX) + 1;
  const minY = Math.min(...allY) - 1;
  const maxY = Math.max(...allY) + 1;

  zones.push({
    id: 'zone_main',
    name: 'Área Principal',
    polygon: [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]],
    type: 'room',
  });

  return zones;
}

function calculateBounds(walls: Wall[], sensors: SensorPosition[]): { width: number; height: number } {
  const allX = [...walls.flatMap(w => [w.x1, w.x2]), ...sensors.map(s => s.x)];
  const allY = [...walls.flatMap(w => [w.y1, w.y2]), ...sensors.map(s => s.y)];

  if (allX.length === 0 || allY.length === 0) {
    return { width: 10, height: 10 };
  }

  return {
    width: Math.max(...allX) - Math.min(...allX) + 2,
    height: Math.max(...allY) - Math.min(...allY) + 2,
  };
}

function calculateOverallConfidence(walls: Wall[]): number {
  if (walls.length === 0) return 0;
  return walls.reduce((s, w) => s + w.confidence, 0) / walls.length;
}

/**
 * Refines the wall positions and orientations using non-linear least squares optimization (Factor Graph).
 */
export function optimizeWallsWithFactorGraph(walls: Wall[], sensors: SensorPosition[]): Wall[] {
  if (walls.length === 0) return [];

  const graph = new FactorGraph();

  // 1. Add wall variables and prior factors
  walls.forEach((w) => {
    const xc = (w.x1 + w.x2) / 2;
    const yc = (w.y1 + w.y2) / 2;
    const theta = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
    const len = Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2);

    graph.addVariable(w.id, {
      id: w.id,
      x: xc,
      y: yc,
      theta,
      length: len,
    });

    // High confidence prior factor to avoid wall drifting randomly
    graph.addPriorFactor(w.id, xc, yc, theta, w.confidence * 2.0);
  });

  // 2. Add junction factors (perpendicular or parallel alignments)
  for (let i = 0; i < walls.length; i++) {
    const w1 = walls[i];
    const theta1 = Math.atan2(w1.y2 - w1.y1, w1.x2 - w1.x1);

    for (let j = i + 1; j < walls.length; j++) {
      const w2 = walls[j];
      const theta2 = Math.atan2(w2.y2 - w2.y1, w2.x2 - w2.x1);

      let diff = Math.abs(theta1 - theta2);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;

      // Check distance between wall centers
      const c1x = (w1.x1 + w1.x2) / 2;
      const c1y = (w1.y1 + w1.y2) / 2;
      const c2x = (w2.x1 + w2.x2) / 2;
      const c2y = (w2.y1 + w2.y2) / 2;
      const dist = Math.sqrt((c1x - c2x) ** 2 + (c1y - c2y) ** 2);

      if (dist < 4.0) {
        // If angle difference is around 90 degrees (pi/2)
        if (Math.abs(diff - Math.PI / 2) < Math.PI / 12) {
          graph.addJunctionFactor(w1.id, w2.id, 'perpendicular', 1.5);
        }
        // If angle difference is around 0 or 180 degrees (parallel)
        else if (diff < Math.PI / 12 || Math.abs(diff - Math.PI) < Math.PI / 12) {
          graph.addJunctionFactor(w1.id, w2.id, 'parallel', 1.5);
        }
      }
    }
  }

  // 3. Add sensor range observations constraints
  sensors.forEach(sensor => {
    walls.forEach(w => {
      const xc = (w.x1 + w.x2) / 2;
      const yc = (w.y1 + w.y2) / 2;
      const theta = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);

      // Distance from sensor to wall line
      const d = Math.abs((sensor.x - xc) * Math.sin(theta) - (sensor.y - yc) * Math.cos(theta));

      // Constraint if sensor is relatively close to the wall (within 5m)
      if (d < 5.0) {
        graph.addRangeFactor(w.id, sensor.x, sensor.y, d, 0.5);
      }
    });
  });

  // 4. Optimize the factor graph
  const optimizedStates = graph.optimize(20);

  // 5. Convert optimized states back to Wall endpoints
  return walls.map(w => {
    const opt = optimizedStates.get(w.id);
    if (!opt) return w;

    const cos = Math.cos(opt.theta);
    const sin = Math.sin(opt.theta);
    const halfL = opt.length / 2;

    return {
      ...w,
      x1: opt.x - halfL * cos,
      y1: opt.y - halfL * sin,
      x2: opt.x + halfL * cos,
      y2: opt.y + halfL * sin,
      confidence: Math.min(1.0, w.confidence * 1.1), // slightly boost confidence
    };
  });
}
