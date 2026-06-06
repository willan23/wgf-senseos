// =============================================
// API Route: POST /api/uwsc/heartbeat
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { isValidEnvelope, isHeartbeatMessage } from '@uwsc/edge-protocol/index';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!isValidEnvelope(body) || !isHeartbeatMessage(body)) {
      return NextResponse.json({ error: 'Invalid heartbeat message' }, { status: 400 });
    }

    const { payload, agentId, organizationId, siteId } = body;

    console.log(`[uwsc/heartbeat] agent=${agentId} org=${organizationId} site=${siteId} cpu=${payload.cpuUsagePercent.toFixed(1)}% uptime=${payload.uptimeSeconds}s`);

    // In production: update sensor last-seen in Firestore
    // await updateSensorHeartbeat(agentId, organizationId, siteId, payload);

    return NextResponse.json({
      status: 'ok',
      serverTime: Date.now(),
      agentId,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
