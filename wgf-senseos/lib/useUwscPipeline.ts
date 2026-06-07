// =============================================
// UWSC Pipeline Hook (Fase 11)
// =============================================
// Hook React para gerir o pipeline completo UWSC:
// Ingestão → Normalização → Processamento → Inferência
// Integra com Firebase Firestore e o simulador local.
// =============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, serverTimestamp, onSnapshot, query,
  where, orderBy, limit, Timestamp,
} from 'firebase/firestore';

// UWSC Core imports via tsconfig paths
import type { CsiFrame, Detection, Alert, SimulationScenario } from '@uwsc/core/types';
import { normalizeCsiMatrix } from '@uwsc/core/normalization';
import { buildTemporalWindow, extractDynamicPerturbations } from '@uwsc/core/normalization';
import { processCsiTensor } from '@uwsc/core/signal-processing';
import { runInferencePipeline } from '@uwsc/core/inference';
import { checkAntiSpoofing } from '@uwsc/core/ingestion/antiSpoofing';
import type { NormalizedCsiFrame, CsiTensor } from '@uwsc/core/normalization';
import type { SignalProcessingResult } from '@uwsc/core/signal-processing';
import type { InferenceResult } from '@uwsc/core/inference';

// ============================================================
// Pipeline State Types
// ============================================================

export type PipelineStatus = 'idle' | 'running' | 'paused' | 'error';

export interface PipelineState {
  status: PipelineStatus;
  framesProcessed: number;
  lastFrameAt: number | null;
  // Layer outputs
  latestNormalizedFrame: NormalizedCsiFrame | null;
  latestTensor: CsiTensor | null;
  latestSignal: SignalProcessingResult | null;
  latestInference: InferenceResult | null;
  // Alerts
  activeAlerts: Alert[];
  recentDetections: Detection[];
  // Errors
  lastError: string | null;
  // Anti-spoofing
  spoofingAttemptCount: number;
  rfAuthenticityScore: number;
}

export interface UseUwscPipelineOptions {
  organizationId: string;
  siteId: string;
  sensorId: string;
  mode: 'simulation' | 'live';
  scenario?: SimulationScenario;
  sampleRateHz?: number;
  windowSizeMs?: number;
  /** Write detections and alerts to Firestore */
  persistToFirestore?: boolean;
}

// ============================================================
// Initial State
// ============================================================

const INITIAL_STATE: PipelineState = {
  status: 'idle',
  framesProcessed: 0,
  lastFrameAt: null,
  latestNormalizedFrame: null,
  latestTensor: null,
  latestSignal: null,
  latestInference: null,
  activeAlerts: [],
  recentDetections: [],
  lastError: null,
  spoofingAttemptCount: 0,
  rfAuthenticityScore: 1.0,
};

// ============================================================
// useUwscPipeline Hook
// ============================================================

export function useUwscPipeline(opts: UseUwscPipelineOptions) {
  const {
    organizationId,
    siteId,
    sensorId,
    mode,
    scenario = 'two_people_walking',
    sampleRateHz = 100,
    windowSizeMs = 5000,
    persistToFirestore = false,
  } = opts;

  const [state, setState] = useState<PipelineState>(INITIAL_STATE);
  const frameBufferRef = useRef<NormalizedCsiFrame[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCounterRef = useRef(0);

  // --------------------------------------------------------
  // Process a single CsiFrame through the full pipeline
  // --------------------------------------------------------
  const processFrame = useCallback(async (rawFrame: CsiFrame) => {
    try {
      // === Anti-Spoofing Check ===
      const spoofCheck = checkAntiSpoofing(rawFrame);
      if (!spoofCheck.isAuthentic) {
        setState(s => ({
          ...s,
          spoofingAttemptCount: s.spoofingAttemptCount + 1,
          rfAuthenticityScore: spoofCheck.authenticityScore,
        }));
        return; // Drop spoofed frame
      }

      // === Layer 2: Normalize ===
      const normalized = normalizeCsiMatrix(rawFrame, {
        targetSubcarrierCount: 52,
        alignPhaseEnabled: true,
        zScoreNormalize: true,
      });

      // === Accumulate frame buffer ===
      frameBufferRef.current.push(normalized);
      // Keep last 2 windows worth of frames
      const maxFrames = Math.ceil((windowSizeMs * 2 / 1000) * sampleRateHz);
      if (frameBufferRef.current.length > maxFrames) {
        frameBufferRef.current = frameBufferRef.current.slice(-maxFrames);
      }

      // === Layer 2: Build tensor + PCA denoising ===
      const rawTensor = buildTemporalWindow(frameBufferRef.current, windowSizeMs);
      const tensor = extractDynamicPerturbations(rawTensor);

      // === Phase 5: Signal Processing ===
      const signal = processCsiTensor(tensor, { sampleRateHz });

      // === Layer 3: Inference ===
      const inference = await runInferencePipeline({
        tensor,
        signal,
        siteId,
        sensorIds: [sensorId],
      });

      frameCounterRef.current++;

      // === Persist to Firestore if enabled ===
      if (persistToFirestore && db) {
        await persistDetection(inference, organizationId, siteId, sensorId);
        if (inference.fall.detected) {
          await persistAlert('fall_detected', organizationId, siteId, sensorId);
        }
        if (inference.occupancy.count > 0 && inference.gaitSignatures.some(g => g.label === 'unknown')) {
          await persistAlert('unknown_presence', organizationId, siteId, sensorId);
        }
      }

      // === Update state ===
      setState(s => ({
        ...s,
        framesProcessed: frameCounterRef.current,
        lastFrameAt: Date.now(),
        latestNormalizedFrame: normalized,
        latestTensor: tensor,
        latestSignal: signal,
        latestInference: inference,
        rfAuthenticityScore: spoofCheck.authenticityScore,
        lastError: null,
      }));

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState(s => ({ ...s, lastError: msg }));
    }
  }, [organizationId, siteId, sensorId, windowSizeMs, sampleRateHz, persistToFirestore]);

  // --------------------------------------------------------
  // Simulation loop (imports CSI simulator dynamically)
  // --------------------------------------------------------
  const startSimulation = useCallback(() => {
    if (intervalRef.current) return;

    // Dynamic import to avoid bundling simulator in production edge builds
    import('./csi-simulator').then(({ generateCsiFrame }) => {
      let t = 0;
      intervalRef.current = setInterval(() => {
        t += 10;
        const frame = generateCsiFrame(sensorId, siteId, organizationId, scenario, t);
        processFrame(frame);
        if (t > 10000) t = 0; // loop scenario
      }, 10); // 100fps simulation
    }).catch(err => {
      setState(s => ({ ...s, lastError: `Failed to load simulator: ${err.message}`, status: 'error' }));
    });
  }, [sensorId, siteId, organizationId, scenario, processFrame]);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // --------------------------------------------------------
  // Firestore real-time alerts subscription
  // --------------------------------------------------------
  useEffect(() => {
    if (!db || !organizationId) return;
    const q = query(
      collection(db, 'alerts'),
      where('organizationId', '==', organizationId),
      where('status', '==', 'open'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, snap => {
      const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert));
      setState(s => ({ ...s, activeAlerts: alerts }));
    });
    return unsub;
  }, [organizationId]);

  // --------------------------------------------------------
  // Firestore recent detections subscription
  // --------------------------------------------------------
  useEffect(() => {
    if (!db || !organizationId) return;
    const since = Date.now() - 60_000; // last minute
    const q = query(
      collection(db, 'detections'),
      where('organizationId', '==', organizationId),
      where('timestamp', '>=', since),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      const detections = snap.docs.map(d => ({ id: d.id, ...d.data() } as Detection));
      setState(s => ({ ...s, recentDetections: detections }));
    });
    return unsub;
  }, [organizationId]);

  // --------------------------------------------------------
  // Public API
  // --------------------------------------------------------
  const start = useCallback(() => {
    setState(s => ({ ...s, status: 'running', lastError: null }));
    frameBufferRef.current = [];
    frameCounterRef.current = 0;
    if (mode === 'simulation') {
      startSimulation();
    }
  }, [mode, startSimulation]);

  const stop = useCallback(() => {
    stopSimulation();
    setState(s => ({ ...s, status: 'idle' }));
  }, [stopSimulation]);

  const pause = useCallback(() => {
    stopSimulation();
    setState(s => ({ ...s, status: 'paused' }));
  }, [stopSimulation]);

  // Cleanup on unmount
  useEffect(() => () => stopSimulation(), [stopSimulation]);

  return { state, start, stop, pause, processFrame };
}

// ============================================================
// Firestore Persistence Helpers
// ============================================================

async function persistDetection(
  inference: InferenceResult,
  organizationId: string,
  siteId: string,
  sensorId: string
) {
  if (!db) return;
  await addDoc(collection(db, 'detections'), {
    organizationId,
    siteId,
    sensorId,
    timestamp: Date.now(),
    personCount: inference.occupancy.count,
    locationX: inference.locations[0]?.x ?? null,
    locationY: inference.locations[0]?.y ?? null,
    confidenceScore: inference.occupancy.confidence,
    privacyHash: inference.gaitSignatures[0]?.privacyHash ?? null,
    isSimulated: inference.occupancy.isSimulated,
    type: inference.occupancy.count === 0 ? 'presence' : 'movement',
    createdAt: serverTimestamp(),
  });
}

async function persistAlert(
  alertType: string,
  organizationId: string,
  siteId: string,
  sensorId: string
) {
  if (!db) return;
  const templates: Record<string, { title: string; description: string; severity: string }> = {
    fall_detected: {
      title: '⚠️ Queda Detectada',
      description: 'O sistema detectou uma possível queda. Verificar imediatamente.',
      severity: 'critical',
    },
    unknown_presence: {
      title: '🔴 Presença Desconhecida',
      description: 'Uma pessoa não identificada foi detectada no espaço monitorizado.',
      severity: 'high',
    },
  };
  const t = templates[alertType] || { title: alertType, description: '', severity: 'medium' };
  await addDoc(collection(db, 'alerts'), {
    organizationId,
    siteId,
    sensorId,
    type: alertType,
    ...t,
    status: 'open',
    timestamp: Date.now(),
    isSimulated: true,
    createdAt: serverTimestamp(),
  });
}
