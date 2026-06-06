// =============================================
// API Route: POST /api/uwsc/ingest
// =============================================
// Recebe lotes de frames CSI de edge agents externos (mock ou reais).
// Valida a mensagem, processa o pipeline UWSC e persiste os resultados.
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { isValidEnvelope, isCsiFrameBatchMessage } from '@uwsc/edge-protocol/index';

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

    // Log reception (in production: write to structured logs / Cloud Logging)
    console.log(`[uwsc/ingest] batch received | org=${organizationId} site=${siteId} agent=${agentId} frames=${batchSize} latency=${Date.now() - sentAt}ms`);

    // In production: forward to Cloud Pub/Sub or process via Cloud Function
    // For now: acknowledge receipt
    return NextResponse.json({
      status: 'accepted',
      framesReceived: frames.length,
      processedAt: Date.now(),
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
