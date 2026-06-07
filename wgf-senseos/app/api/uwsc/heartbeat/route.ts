// =============================================
// API Route: POST /api/uwsc/heartbeat
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { isValidEnvelope, isHeartbeatMessage } from '@uwsc/edge-protocol/index';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!isValidEnvelope(body) || !isHeartbeatMessage(body)) {
      return NextResponse.json({ error: 'Invalid heartbeat message' }, { status: 400 });
    }

    const { payload, agentId, organizationId, siteId } = body;

    console.log(`[uwsc/heartbeat] agent=${agentId} org=${organizationId} site=${siteId} cpu=${payload.cpuUsagePercent.toFixed(1)}% uptime=${payload.uptimeSeconds}s`);

    // Update sensor last-seen in Firestore
    if (db) {
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
