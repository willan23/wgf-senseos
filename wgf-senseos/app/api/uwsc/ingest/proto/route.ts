// =============================================
// API Route: POST /api/uwsc/ingest/proto
// =============================================
// Recebe lotes de frames CSI binários via Protocol Buffers.
// Descodifica o envelope binário e orquestra o processamento do pipeline UWSC.
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { decodeCsiFrameBatch } from '@uwsc/edge-protocol/index';
import { db } from '@/lib/firebase';
import { checkAntiSpoofing } from '@uwsc/core/ingestion/antiSpoofing';
import { normalizeCsiMatrix, buildTemporalWindow, extractDynamicPerturbations } from '@uwsc/core/normalization';
import { processCsiTensor } from '@uwsc/core/signal-processing';
import { runInferencePipeline } from '@uwsc/core/inference';

// Define global in-memory buffer type to hold sliding window frames
declare global {
  var sensorBuffers: Map<string, any[]> | undefined;
}

const getSensorBuffer = (sensorId: string): any[] => {
  if (!globalThis.sensorBuffers) {
    globalThis.sensorBuffers = new Map();
  }
  if (!globalThis.sensorBuffers.has(sensorId)) {
    globalThis.sensorBuffers.set(sensorId, []);
  }
  return globalThis.sensorBuffers.get(sensorId)!;
};

const setSensorBuffer = (sensorId: string, buffer: any[]) => {
  if (!globalThis.sensorBuffers) {
    globalThis.sensorBuffers = new Map();
  }
  globalThis.sensorBuffers.set(sensorId, buffer);
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (
      !contentType.includes('application/x-protobuf') &&
      !contentType.includes('application/octet-stream')
    ) {
      return NextResponse.json(
        { error: 'Expected content-type application/x-protobuf or application/octet-stream' },
        { status: 400 }
      );
    }

    // Read body as ArrayBuffer
    const arrayBuffer = await req.arrayBuffer();
    const rawBuffer = new Uint8Array(arrayBuffer);

    // Decode message using protobufjs wrapper
    const message = decodeCsiFrameBatch(rawBuffer);

    const { payload, organizationId, siteId, agentId, sentAt } = message;
    const { frames, batchSize } = payload;

    // Basic validation
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: 'Empty frame batch in protobuf payload' },
        { status: 400 }
      );
    }

    console.log(
      `[uwsc/ingest/proto] batch received via protobuf | org=${organizationId} site=${siteId} agent=${agentId} frames=${batchSize} latency=${Date.now() - sentAt}ms`
    );

    // Process frames in this batch
    let authenticFramesCount = 0;
    const sensorId = frames[0].sensorId || agentId;
    const sensorBuffer = getSensorBuffer(sensorId);

    // Fetch reference fingerprint from Firestore once per batch
    let refFingerprint: any = null;
    if (db) {
      const { doc, getDoc } = await import('firebase/firestore');
      const sensorDoc = await getDoc(doc(db, 'sensors', sensorId));
      if (sensorDoc.exists()) {
        refFingerprint = sensorDoc.data()?.rfFingerprint || null;
      }
    }

    let isBaselineSaved = !!refFingerprint;

    for (const frame of frames) {
      // Map CsiFramePayload to CsiFrame
      const csiFrame = {
        ...frame,
        siteId,
        organizationId,
      } as any;

      // 1. Anti-Spoofing check
      const spoofCheck = checkAntiSpoofing(csiFrame, refFingerprint);
      if (!spoofCheck.isAuthentic) {
        if (db) {
          const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
          await addDoc(collection(db, 'alerts'), {
            organizationId,
            siteId,
            sensorId,
            type: 'rf_spoofing_attempt',
            title: '🚨 Tentativa de RF Spoofing (Proto)',
            description: `Um frame com assinatura inválida foi detectado via Protobuf do sensor ${sensorId}.`,
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
      if (db && !isBaselineSaved && spoofCheck.calculatedFingerprint) {
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

      sensorBuffer.push(normalized);
      authenticFramesCount++;
    }

    // Retain only the last 5 seconds (500 frames at 100Hz)
    const maxFrames = 500;
    if (sensorBuffer.length > maxFrames) {
      setSensorBuffer(sensorId, sensorBuffer.slice(-maxFrames));
    } else {
      setSensorBuffer(sensorId, sensorBuffer);
    }

    // Run inference if we have enough frames (at least 20 frames)
    const updatedBuffer = getSensorBuffer(sensorId);
    if (updatedBuffer.length >= 20) {
      const rawTensor = buildTemporalWindow(updatedBuffer, 5000);
      const tensor = extractDynamicPerturbations(rawTensor);
      const signal = processCsiTensor(tensor, { sampleRateHz: 100 });
      const inference = await runInferencePipeline({
        tensor,
        signal,
        siteId,
        sensorIds: [sensorId],
      });

      // Persist results in Firestore
      if (db) {
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
            title: '⚠️ Queda Detectada (Proto)',
            description: 'O sistema detectou uma possível queda real via fluxo Protobuf. Verificar imediatamente.',
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
            title: '🔴 Presença Desconhecida (Proto)',
            description: 'Uma pessoa não identificada foi detectada no espaço monitorizado via Protobuf.',
            severity: 'high',
            status: 'open',
            timestamp: Date.now(),
            isSimulated: false,
            createdAt: serverTimestamp(),
          });
        }
      }
    }

    return new NextResponse(null, {
      status: 202,
      headers: {
        'x-processed-frames': String(frames.length),
        'x-authentic-processed': String(authenticFramesCount),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[uwsc/ingest/proto] Error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/uwsc/ingest/proto',
    description: 'WGF SenseOS UWSC Protobuf Ingest API',
    version: 'v1',
    accepts: 'POST application/x-protobuf — Binary payload serialized from MessageEnvelope<CsiFrameBatchPayload>',
  });
}
