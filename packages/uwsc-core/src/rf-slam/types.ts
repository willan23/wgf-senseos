/**
 * WGF SenseOS — RF SLAM Types
 * Type definitions for RF-based spatial mapping.
 */

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'solid' | 'glass' | 'door' | 'window';
  confidence: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'furniture' | 'appliance' | 'person' | 'unknown';
  confidence: number;
}

export interface Zone {
  id: string;
  name: string;
  polygon: [number, number][];
  type: 'room' | 'corridor' | 'entrance' | 'custom';
}

export interface SensorPosition {
  id: string;
  x: number;
  y: number;
  z: number;
  antennas: number;
  orientation: number;
}

export interface WallCandidate {
  x: number;
  y: number;
  orientation: number;
  length: number;
  confidence: number;
}

export interface FloorPlan {
  type: 'floor_plan';
  siteId: string;
  version: number;
  walls: Wall[];
  obstacles: Obstacle[];
  zones: Zone[];
  sensors: SensorPosition[];
  bounds: {
    width: number;
    height: number;
  };
  confidence: number;
  generatedAt: number;
}

export interface BearingMeasurement {
  sensorId: string;
  angle: number;
  distance: number;
  confidence: number;
  timestamp: number;
}

export interface SlamNode {
  id: string;
  x: number;
  y: number;
  theta: number;
  timestamp: number;
}

export interface SlamEdge {
  from: string;
  to: string;
  dx: number;
  dy: number;
  dtheta: number;
  covariance: number;
}

export interface SlamGraph {
  nodes: SlamNode[];
  edges: SlamEdge[];
  landmarks: SensorPosition[];
}
