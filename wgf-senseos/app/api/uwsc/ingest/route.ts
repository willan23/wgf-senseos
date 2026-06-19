// =============================================
// API Route: POST /api/uwsc/ingest
// =============================================
// Recebe lotes de frames CSI de edge agents externos (mock ou reais).
// Valida a mensagem, processa o pipeline UWSC e persiste os resultados.
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { isValidEnvelope, isCsiFrameBatchMessage } from '@uwsc/edge-protocol/index';
import { db } from '@/lib/firebase';
import type { HardwareFingerprint } from '@uwsc/core/ingestion';
import { checkAntiSpoofing } from '@uwsc/core/ingestion/antiSpoofing';
import { normalizeCsiMatrix, buildTemporalWindow, extractDynamicPerturbations } from '@uwsc/core/normalization';
import type { NormalizedCsiFrame } from '@uwsc/core/normalization';
import { processCsiTensor } from '@uwsc/core/signal-processing';
import type { CsiFrame } from '@uwsc/core/types';
import { runServerInferencePipeline } from '@/lib/server/xfi-runtime';

// Define global in-memory buffer type to hold sliding window frames
declare global {
  var sensorBuffers: Map<string, NormalizedCsiFrame[]> | undefined;
}

const getSensorBuffer = (sensorId: string): NormalizedCsiFrame[] => {
  if (!globalThis.sensorBuffers) {
    globalThis.sensorBuffers = new Map();
  }
  if (!globalThis.sensorBuffers.has(sensorId)) {
    globalThis.sensorBuffers.set(sensorId, []);
  }
  return globalThis.sensorBuffers.get(sensorId)!;
};

const setSensorBuffer = (sensorId: string, buffer: NormalizedCsiFrame[]) => {
  if (!globalThis.sensorBuffers) {
    globalThis.sensorBuffers = new Map();
  }
  globalThis.sensorBuffers.set(sensorId, buffer);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate envelope structure
    if (!isValidEnvelope(body)) {
      return NextResponse.json({ error: 'Invalid message envelope' }, { status: 400 });
    }

    if (!isCsiFrameBatchMessage(body)) {
      return NextResponse.json({ error: 'Expected csi_frame_batch message type' }, { status: 400 });
    }

    const { payload, organizationId, siteId, agentId, sentAt } = body;
    const { frames, batchSize } = payload;

    // Basic validation
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json({ error: 'Empty frame batch' }, { status: 400 });
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    console.log(`[uwsc/ingest] batch received | ip=${clientIp} | org=${organizationId} site=${siteId} agent=${agentId} frames=${batchSize} latency=${Date.now() - sentAt}ms`);

    // Process frames in this batch
    let authenticFramesCount = 0;
    const sensorId = frames[0].sensorId || agentId;
    const buffer = getSensorBuffer(sensorId);

    // Fetch reference fingerprint and registered IP from Firestore once per batch
    let refFingerprint: HardwareFingerprint | undefined;
    let registeredIp: string | null = null;
    const isFirebaseEnabled = db && process.env.NEXT_PUBLIC_SIMULATION_ONLY === 'false';
    if (isFirebaseEnabled) {
      const { doc, getDoc } = await import('firebase/firestore');
      const sensorDoc = await getDoc(doc(db, 'sensors', sensorId));
      if (sensorDoc.exists()) {
        const sensorData = sensorDoc.data();
        refFingerprint = sensorData?.rfFingerprint as HardwareFingerprint | undefined;
        registeredIp = sensorData?.ipAddress || null;
      }
    }

    // IP Access Control Validation
    if (isFirebaseEnabled && registeredIp && registeredIp !== clientIp) {
      console.warn(`[uwsc/ingest] Security violation: telemetry IP ${clientIp} does not match registered sensor IP ${registeredIp} for sensor ${sensorId}`);
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'alerts'), {
        organizationId,
        siteId,
        sensorId,
        type: 'rf_spoofing_attempt',
        title: '🚨 Violação de Segurança IP',
        description: `Ingestão de dados bloqueada: O IP de origem (${clientIp}) diverge do IP de heartbeat registado (${registeredIp}) para o sensor.`,
        severity: 'critical',
        status: 'open',
        timestamp: Date.now(),
        isSimulated: false,
        createdAt: serverTimestamp(),
      });

      return NextResponse.json({ error: 'Forbidden: Network IP mismatch' }, { status: 403 });
    }

    // Auto-register initial IP if not set yet
    if (isFirebaseEnabled && !registeredIp) {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'sensors', sensorId), {
        ipAddress: clientIp,
        updatedAt: Date.now(),
      }).catch(err => console.error('Error saving initial sensor IP:', err));
      registeredIp = clientIp;
    }

    let isBaselineSaved = !!refFingerprint;

    for (const frame of frames) {
      // Map CsiFramePayload to CsiFrame
      const csiFrame: CsiFrame = {
        ...frame,
        siteId,
        organizationId,
      };

      // 1. Anti-Spoofing check
      const spoofCheck = checkAntiSpoofing(csiFrame, refFingerprint);
      if (!spoofCheck.isAuthentic) {
        if (isFirebaseEnabled) {
          const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
          await addDoc(collection(db, 'alerts'), {
            organizationId,
            siteId,
            sensorId,
            type: 'rf_spoofing_attempt',
            title: '🚨 Tentativa de RF Spoofing',
            description: `Um frame com assinatura inválida foi detectado do sensor ${sensorId}.`,
            severity: 'critical',
            status: 'open',
            timestamp: Date.now(),
            isSimulated: false,
            createdAt: serverTimestamp(),
          });
        }
        continue; // Skip spoofed frame
      }

      // Save baseline if not already saved in DB
      if (isFirebaseEnabled && !isBaselineSaved && spoofCheck.calculatedFingerprint) {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'sensors', sensorId), {
          rfFingerprint: spoofCheck.calculatedFingerprint,
          updatedAt: Date.now(),
        }).catch(err => console.error('Error saving rfFingerprint baseline:', err));
        refFingerprint = spoofCheck.calculatedFingerprint;
        isBaselineSaved = true;
      }

      // 2. Normalization
      const normalized = normalizeCsiMatrix(csiFrame, {
        targetSubcarrierCount: 52,
        alignPhaseEnabled: true,
        zScoreNormalize: true,
      });

      buffer.push(normalized);
      authenticFramesCount++;
    }

    // Retain only the last 5 seconds (500 frames at 100Hz)
    const maxFrames = 500;
    if (buffer.length > maxFrames) {
      setSensorBuffer(sensorId, buffer.slice(-maxFrames));
    } else {
      setSensorBuffer(sensorId, buffer);
    }

    // In-memory global state initialization & update (Fase 6)
    if (!globalThis.latestSystemState) {
      globalThis.latestSystemState = {
        isRunning: true,
        scenario: 'two_people_walking',
        t: 0,
        frames: [],
        detections: [],
        alerts: [],
        occupancy: 0,
        location: { x: 50, y: 50 },
        sensors: {},
      };
    }
    if (!globalThis.latestSystemState.sensors) {
      globalThis.latestSystemState.sensors = {};
    }

    // Camada 1.5: IP Access Control Validation in memory
    const activeSensor = globalThis.latestSystemState.sensors[sensorId];
    if (activeSensor && activeSensor.ipAddress && activeSensor.ipAddress !== clientIp) {
      console.warn(`[uwsc/ingest] Security violation (in-memory): telemetry IP ${clientIp} does not match registered sensor IP ${activeSensor.ipAddress} for sensor ${sensorId}`);

      const ipViolationAlert = {
        id: `alert_${Date.now()}_ip_violation`,
        organizationId,
        siteId,
        sensorId,
        type: 'rf_spoofing_attempt',
        title: '🚨 Violação de Segurança IP',
        description: `Ingestão de dados bloqueada: O IP de origem (${clientIp}) diverge do IP de heartbeat registado (${activeSensor.ipAddress}) para o sensor.`,
        severity: 'critical',
        status: 'open',
        timestamp: Date.now(),
        isSimulated: false,
      };

      globalThis.latestSystemState.alerts = [
        ...(globalThis.latestSystemState.alerts || []).filter((a: { type?: string }) => a.type !== 'rf_spoofing_attempt'),
        ipViolationAlert
      ];

      return NextResponse.json({ error: 'Forbidden: Network IP mismatch (in-memory)' }, { status: 403 });
    }

    // Register/update sensor online state in global memory
    if (!globalThis.latestSystemState.sensors[sensorId]) {
      globalThis.latestSystemState.sensors[sensorId] = {
        id: sensorId,
        name: `Sensor ${sensorId.replace('mock-agent-', '').replace('sensor_', '').toUpperCase()}`,
        type: 'wifi_csi',
        status: 'online',
        ipAddress: clientIp,
        macAddress: 'B4:E6:2D:AA:11:' + (sensorId === 'sensor_a' ? '22' : '44'),
        firmwareVersion: 'mock-v1.0.0',
        cpuUsage: 2.5 + Math.random() * 3,
        memoryUsage: 48 + Math.random() * 10,
        uptimeSeconds: 100,
        lastHeartbeatAt: Date.now(),
        isSimulated: sensorId.includes('mock') || sensorId.includes('demo') || sensorId.startsWith('sensor_'),
      };
    } else {
      globalThis.latestSystemState.sensors[sensorId].status = 'online';
      globalThis.latestSystemState.sensors[sensorId].lastHeartbeatAt = Date.now();
      globalThis.latestSystemState.sensors[sensorId].ipAddress = clientIp;
    }

    // Append the last frame to state.frames
    const lastFrameObj = frames[frames.length - 1];
    if (lastFrameObj) {
      const maxStateFrames = 50;
      globalThis.latestSystemState.frames = [
        ...(globalThis.latestSystemState.frames || []).slice(-maxStateFrames + 1),
        {
          sensorId,
          timestamp: lastFrameObj.timestamp || Date.now(),
          amplitude: lastFrameObj.amplitude || [],
          phase: lastFrameObj.phase || [],
          subcarrierCount: lastFrameObj.subcarrierCount || 52,
          rssi: lastFrameObj.rssi || -55,
          noiseFloor: lastFrameObj.noiseFloor || -95,
          isSimulated: lastFrameObj.isSimulated || false,
        }
      ];
    }

    // Run inference if we have enough frames (at least 20 frames)
    const updatedBuffer = getSensorBuffer(sensorId);
    if (updatedBuffer.length >= 20) {
      const rawTensor = buildTemporalWindow(updatedBuffer, 5000);
      const tensor = extractDynamicPerturbations(rawTensor);
      const signal = processCsiTensor(tensor, { sampleRateHz: 100 });
      const inference = await runServerInferencePipeline({
        tensor,
        signal,
        siteId,
        organizationId,
        sensorIds: [sensorId],
      });

      // Update global latest system state
      globalThis.latestSystemState.occupancy = inference.occupancy.count;
      if (inference.locations && inference.locations.length > 0) {
        globalThis.latestSystemState.location = {
          x: inference.locations[0].x,
          y: inference.locations[0].y,
        };
      }

      // Add to latestSystemState detections list
      const newDet = {
        id: `det_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        organizationId,
        siteId,
        sensorId,
        type: inference.occupancy.count === 0 ? 'presence' : 'movement',
        timestamp: Date.now(),
        personCount: inference.occupancy.count,
        locationX: inference.locations[0]?.x ?? 50,
        locationY: inference.locations[0]?.y ?? 50,
        confidenceScore: inference.occupancy.confidence,
        privacyHash: inference.gaitSignatures[0]?.privacyHash ?? null,
        isSimulated: false,
      };

      const maxDetections = 50;
      globalThis.latestSystemState.detections = [
        ...(globalThis.latestSystemState.detections || []).slice(-maxDetections + 1),
        newDet,
      ];

      // Add to latestSystemState alerts list
      if (inference.fall.detected) {
        const fallAlert = {
          id: `alert_${Date.now()}_fall`,
          organizationId,
          siteId,
          sensorId,
          type: 'fall_detected',
          title: '⚠️ Queda Detectada',
          description: 'O sistema detectou uma possível queda real. Verificar imediatamente.',
          severity: 'critical',
          status: 'open',
          timestamp: Date.now(),
          isSimulated: false,
        };
        globalThis.latestSystemState.alerts = [
          ...(globalThis.latestSystemState.alerts || []).filter((a: { type?: string }) => a.type !== 'fall_detected'),
          fallAlert,
        ];
      }

      if (inference.occupancy.count > 0 && inference.gaitSignatures.some(g => g.label === 'unknown')) {
        const unknownAlert = {
          id: `alert_${Date.now()}_unknown`,
          organizationId,
          siteId,
          sensorId,
          type: 'unknown_presence',
          title: '🔴 Presença Desconhecida',
          description: 'Uma pessoa não identificada foi detectada no espaço monitorizado.',
          severity: 'high',
          status: 'open',
          timestamp: Date.now(),
          isSimulated: false,
        };
        globalThis.latestSystemState.alerts = [
          ...(globalThis.latestSystemState.alerts || []).filter((a: { type?: string }) => a.type !== 'unknown_presence'),
          unknownAlert,
        ];
      }

      // Persist results in Firestore
      if (isFirebaseEnabled) {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
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
          isSimulated: false,
          type: inference.occupancy.count === 0 ? 'presence' : 'movement',
          createdAt: serverTimestamp(),
        });

        if (inference.fall.detected) {
          await addDoc(collection(db, 'alerts'), {
            organizationId,
            siteId,
            sensorId,
            type: 'fall_detected',
            title: '⚠️ Queda Detectada',
            description: 'O sistema detectou uma possível queda real. Verificar imediatamente.',
            severity: 'critical',
            status: 'open',
            timestamp: Date.now(),
            isSimulated: false,
            createdAt: serverTimestamp(),
          });
        }

        if (inference.occupancy.count > 0 && inference.gaitSignatures.some(g => g.label === 'unknown')) {
          await addDoc(collection(db, 'alerts'), {
            organizationId,
            siteId,
            sensorId,
            type: 'unknown_presence',
            title: '🔴 Presença Desconhecida',
            description: 'Uma pessoa não identificada foi detectada no espaço monitorizado.',
            severity: 'high',
            status: 'open',
            timestamp: Date.now(),
            isSimulated: false,
            createdAt: serverTimestamp(),
          });
        }
      }
    }

    return NextResponse.json({
      status: 'accepted',
      framesReceived: frames.length,
      authenticProcessed: authenticFramesCount,
      processedAt: Date.now(),
      scenario: globalThis.latestSystemState?.scenario || 'two_people_walking',
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[uwsc/ingest] Error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/uwsc/ingest',
    description: 'WGF SenseOS UWSC Ingest API',
    version: 'v1',
    accepts: 'POST application/json — MessageEnvelope<CsiFrameBatchPayload>',
  });
}
