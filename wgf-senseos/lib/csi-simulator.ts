/**
 * WGF SenseOS — CSI Simulator
 * Generates synthetic Channel State Information data for demo purposes.
 * All data is clearly labeled as simulated.
 * 
 * Architecture: Camada 1 stub — prepared for real CSI ingestion via Edge Agent.
 */

import { CsiFrame, SimulationScenario, Detection, Alert, AlertType, AlertSeverity, DetectionType } from '@/types';

const SUBCARRIER_COUNT = 52; // Wi-Fi 5 (802.11n/ac) usable subcarriers
const SAMPLE_RATE_MS = 500;  // 2 Hz — realistic for motion detection

// ---- Noise helpers ----

function gaussianNoise(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ---- Scenario parameters ----

interface ScenarioParams {
  baseAmplitude: number;
  amplitudeVariance: number;
  phaseVariance: number;
  movementFrequency: number;   // Hz — body movement
  breathingFrequency: number;  // Hz — respiration
  personCount: number;
  hasUnknown: boolean;
  hasFall: boolean;
  locationX: number;
  locationY: number;
  confidence: number;
}

const SCENARIOS: Record<SimulationScenario, ScenarioParams> = {
  empty_house: {
    baseAmplitude: 0.05, amplitudeVariance: 0.01, phaseVariance: 0.02,
    movementFrequency: 0, breathingFrequency: 0,
    personCount: 0, hasUnknown: false, hasFall: false,
    locationX: 50, locationY: 50, confidence: 0.95,
  },
  one_person_enters: {
    baseAmplitude: 0.45, amplitudeVariance: 0.12, phaseVariance: 0.18,
    movementFrequency: 1.2, breathingFrequency: 0.25,
    personCount: 1, hasUnknown: false, hasFall: false,
    locationX: 30, locationY: 60, confidence: 0.87,
  },
  two_people_walking: {
    baseAmplitude: 0.65, amplitudeVariance: 0.22, phaseVariance: 0.30,
    movementFrequency: 1.5, breathingFrequency: 0.28,
    personCount: 2, hasUnknown: false, hasFall: false,
    locationX: 55, locationY: 45, confidence: 0.81,
  },
  person_breathing: {
    baseAmplitude: 0.28, amplitudeVariance: 0.04, phaseVariance: 0.08,
    movementFrequency: 0.1, breathingFrequency: 0.22,
    personCount: 1, hasUnknown: false, hasFall: false,
    locationX: 70, locationY: 30, confidence: 0.91,
  },
  fall_event: {
    baseAmplitude: 0.80, amplitudeVariance: 0.35, phaseVariance: 0.45,
    movementFrequency: 4.0, breathingFrequency: 0.15,
    personCount: 1, hasUnknown: false, hasFall: true,
    locationX: 40, locationY: 70, confidence: 0.78,
  },
  unknown_intruder: {
    baseAmplitude: 0.50, amplitudeVariance: 0.15, phaseVariance: 0.22,
    movementFrequency: 0.8, breathingFrequency: 0.20,
    personCount: 1, hasUnknown: true, hasFall: false,
    locationX: 80, locationY: 20, confidence: 0.72,
  },
  store_customer_flow: {
    baseAmplitude: 0.75, amplitudeVariance: 0.28, phaseVariance: 0.38,
    movementFrequency: 2.0, breathingFrequency: 0.26,
    personCount: 4, hasUnknown: false, hasFall: false,
    locationX: 50, locationY: 50, confidence: 0.83,
  },
};

// ---- Frame generator ----

let frameCount = 0;

export function generateCsiFrame(
  sensorId: string,
  siteId: string,
  organizationId: string,
  scenario: SimulationScenario,
  t: number, // time in seconds
): CsiFrame {
  const params = SCENARIOS[scenario];
  frameCount++;

  const amplitude: number[] = [];
  const phase: number[] = [];

  for (let i = 0; i < SUBCARRIER_COUNT; i++) {
    // Base amplitude with movement modulation
    const moveMod = params.movementFrequency > 0
      ? Math.sin(2 * Math.PI * params.movementFrequency * t + i * 0.2) * 0.15
      : 0;
    const breathMod = params.breathingFrequency > 0
      ? Math.sin(2 * Math.PI * params.breathingFrequency * t + i * 0.05) * 0.06
      : 0;

    const amp = Math.max(0, params.baseAmplitude + moveMod + breathMod + gaussianNoise(0, params.amplitudeVariance));
    const ph = (Math.PI * i / SUBCARRIER_COUNT) + gaussianNoise(0, params.phaseVariance);

    amplitude.push(Math.round(amp * 1000) / 1000);
    phase.push(Math.round(ph * 1000) / 1000);
  }

  return {
    sensorId,
    siteId,
    organizationId,
    timestamp: Date.now(),
    amplitude,
    phase,
    subcarrierCount: SUBCARRIER_COUNT,
    noiseFloor: gaussianNoise(-85, 2),
    rssi: gaussianNoise(-55 + params.baseAmplitude * 20, 3),
    isSimulated: true,
    scenarioTag: scenario,
  };
}

// ---- Signal processing stubs ----
// These are the Camada 2/3 interfaces — replace with real algorithms when hardware is available.

export function normalizeCsiMatrix(frames: CsiFrame[]): number[][] {
  if (frames.length === 0) return [];
  const matrix = frames.map(f => f.amplitude);
  // Simple z-score normalization per column (subcarrier)
  const result = matrix.map(row => {
    const mean = row.reduce((a, b) => a + b, 0) / row.length;
    const std = Math.sqrt(row.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / row.length) || 1;
    return row.map(v => (v - mean) / std);
  });
  return result;
}

export function removeStaticNoise(matrix: number[][]): number[][] {
  // PCA stub — remove mean (static component)
  if (matrix.length === 0) return [];
  const colMeans = matrix[0].map((_, col) => {
    const vals = matrix.map(row => row[col]);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });
  return matrix.map(row => row.map((v, col) => v - colMeans[col]));
}

export function extractMotionFeatures(matrix: number[][]): {
  variance: number;
  maxAmplitudeShift: number;
  dominantFrequency: number;
} {
  if (matrix.length < 2) return { variance: 0, maxAmplitudeShift: 0, dominantFrequency: 0 };
  const flatVariances = matrix[0].map((_, col) => {
    const col_vals = matrix.map(row => row[col]);
    const mean = col_vals.reduce((a, b) => a + b, 0) / col_vals.length;
    return col_vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / col_vals.length;
  });
  const variance = flatVariances.reduce((a, b) => a + b, 0) / flatVariances.length;
  const maxAmplitudeShift = Math.max(...matrix.flatMap(r => r.map(Math.abs)));
  const dominantFrequency = variance > 0.1 ? 1.5 : variance > 0.02 ? 0.25 : 0;
  return { variance, maxAmplitudeShift, dominantFrequency };
}

export function estimateOccupancy(features: ReturnType<typeof extractMotionFeatures>, scenario: SimulationScenario): number {
  const params = SCENARIOS[scenario];
  return params.personCount;
}

export function estimateLocation(scenario: SimulationScenario): { x: number; y: number } {
  const params = SCENARIOS[scenario];
  return {
    x: params.locationX + gaussianNoise(0, 3),
    y: params.locationY + gaussianNoise(0, 3),
  };
}

export function detectFallEvent(frames: CsiFrame[], scenario: SimulationScenario): boolean {
  return SCENARIOS[scenario].hasFall && frames.length > 3;
}

export function generatePrivacyPreservingHash(personId: string): string {
  // ZKP stub — in production: use SHA-3 / Poseidon hash
  let hash = 0;
  for (let i = 0; i < personId.length; i++) {
    hash = ((hash << 5) - hash) + personId.charCodeAt(i);
    hash |= 0;
  }
  return `0x${Math.abs(hash).toString(16).padStart(8, '0').toUpperCase()}`;
}

// ---- Detection generator ----

export function generateDetection(
  sensorId: string,
  siteId: string,
  organizationId: string,
  scenario: SimulationScenario,
  t: number,
): Detection {
  const params = SCENARIOS[scenario];
  const loc = estimateLocation(scenario);
  const isFall = detectFallEvent([], scenario);

  let type: DetectionType = 'presence';
  if (isFall) type = 'fall';
  else if (params.hasUnknown) type = 'unknown_person';
  else if (params.personCount > 0 && params.movementFrequency > 0.5) type = 'movement';
  else if (params.breathingFrequency > 0) type = 'breathing';

  return {
    id: `det_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    organizationId,
    siteId,
    sensorId,
    type,
    timestamp: Date.now(),
    personCount: params.personCount,
    locationX: loc.x,
    locationY: loc.y,
    confidenceScore: params.confidence + gaussianNoise(0, 0.03),
    privacyHash: params.hasUnknown ? undefined : generatePrivacyPreservingHash(`person_${Math.floor(t / 10)}`),
    isSimulated: true,
    metadata: { scenario, t: Math.round(t) },
  };
}

// ---- Alert generator ----

export function generateAlerts(scenario: SimulationScenario, siteId: string, orgId: string): Alert[] {
  const alerts: Alert[] = [];
  const params = SCENARIOS[scenario];

  if (params.hasUnknown) {
    alerts.push({
      id: `alert_${Date.now()}_1`,
      organizationId: orgId,
      siteId,
      type: 'unknown_presence' as AlertType,
      severity: 'high' as AlertSeverity,
      status: 'open',
      title: 'Presença desconhecida detetada',
      description: 'Padrão de movimento não correspondente a nenhum perfil registado.',
      timestamp: Date.now() - 30000,
      isSimulated: true,
    });
  }

  if (params.hasFall) {
    alerts.push({
      id: `alert_${Date.now()}_2`,
      organizationId: orgId,
      siteId,
      type: 'fall_detected' as AlertType,
      severity: 'critical' as AlertSeverity,
      status: 'open',
      title: 'Possível queda detetada',
      description: 'Mudança abrupta de localização vertical e alteração do padrão respiratório.',
      timestamp: Date.now() - 5000,
      isSimulated: true,
    });
  }

  return alerts;
}

// ---- Simulation state ----

export interface SimulationState {
  isRunning: boolean;
  scenario: SimulationScenario;
  t: number; // elapsed time in seconds
  frames: CsiFrame[];
  detections: Detection[];
  alerts: Alert[];
  occupancy: number;
  location: { x: number; y: number };
}

export function initialSimulationState(scenario: SimulationScenario = 'one_person_enters'): SimulationState {
  return {
    isRunning: false,
    scenario,
    t: 0,
    frames: [],
    detections: [],
    alerts: [],
    occupancy: 0,
    location: { x: 50, y: 50 },
  };
}

export function tickSimulation(
  state: SimulationState,
  sensorId: string,
  siteId: string,
  orgId: string,
): SimulationState {
  if (!state.isRunning) return state;

  const newT = state.t + SAMPLE_RATE_MS / 1000;
  const frame = generateCsiFrame(sensorId, siteId, orgId, state.scenario, newT);
  const detection = generateDetection(sensorId, siteId, orgId, state.scenario, newT);
  const alerts = newT % 10 < 0.6 ? generateAlerts(state.scenario, siteId, orgId) : state.alerts;
  const loc = estimateLocation(state.scenario);
  const occ = SCENARIOS[state.scenario].personCount;

  const maxFrames = 100;
  const frames = [...state.frames.slice(-maxFrames + 1), frame];
  const maxDetections = 50;
  const detections = [...state.detections.slice(-maxDetections + 1), detection];

  return {
    ...state,
    t: newT,
    frames,
    detections,
    alerts,
    occupancy: occ,
    location: loc,
  };
}

export { SCENARIOS, SAMPLE_RATE_MS };
