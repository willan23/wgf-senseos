// =============================================
// API Route: POST /api/uwsc/heartbeat
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { isValidEnvelope, isHeartbeatMessage } from '@uwsc/edge-protocol/index';
import { db } from '@/lib/firebase';

declare global {
  var latestSystemState: any | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!isValidEnvelope(body) || !isHeartbeatMessage(body)) {
      return NextResponse.json({ error: 'Invalid heartbeat message' }, { status: 400 });
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const { payload, agentId, organizationId, siteId } = body;

    console.log(`[uwsc/heartbeat] agent=${agentId} ip=${clientIp} org=${organizationId} site=${siteId} cpu=${payload.cpuUsagePercent.toFixed(1)}% uptime=${payload.uptimeSeconds}s`);

    // In-memory global state update
    if (!globalThis.latestSystemState) {
      globalThis.latestSystemState = {
        isRunning: true,
        scenario: 'empty_house',
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
    globalThis.latestSystemState.sensors[agentId] = {
      id: agentId,
      name: `Sensor ${agentId.replace('mock-agent-', '')}`,
      type: 'wifi_csi',
      status: 'online',
      ipAddress: clientIp,
      macAddress: 'B4:E6:2D:AA:11:00',
      firmwareVersion: payload.firmwareVersion || 'v1.0.0',
      cpuUsage: payload.cpuUsagePercent,
      memoryUsage: payload.memoryUsageMb,
      uptimeSeconds: payload.uptimeSeconds,
      lastHeartbeatAt: Date.now(),
      isSimulated: agentId.includes('mock') || agentId.includes('demo'),
    };

    // Update sensor last-seen in Firestore
    const isFirebaseEnabled = db && process.env.NEXT_PUBLIC_SIMULATION_ONLY === 'false';
    if (isFirebaseEnabled) {
      const { doc, setDoc } = await import('firebase/firestore');
      const sensorRef = doc(db, 'sensors', agentId);
      await setDoc(sensorRef, {
        id: agentId,
        status: 'online',
        lastHeartbeatAt: Date.now(),
        updatedAt: Date.now(),
        organizationId,
        siteId,
        firmwareVersion: payload.firmwareVersion || 'v1.0.0',
        cpuUsage: payload.cpuUsagePercent,
        memoryUsage: payload.memoryUsageMb,
        uptimeSeconds: payload.uptimeSeconds,
        ipAddress: clientIp,
      }, { merge: true });
    }

    return NextResponse.json({
      status: 'ok',
      serverTime: Date.now(),
      agentId,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
