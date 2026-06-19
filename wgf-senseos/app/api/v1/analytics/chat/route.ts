/**
 * WGF SenseOS — Analytics RAG API Route
 * /api/v1/analytics/chat
 * 
 * Conversational analytics endpoint using RAG pipeline.
 * Allows users to query occupancy, security, and detection history
 * in natural language.
 */

import { NextRequest, NextResponse } from 'next/server';
import { retrieveContext } from '@/lib/analytics/retriever';
import { buildPrompt } from '@/lib/analytics/prompt-builder';
import { generateResponse } from '@/lib/analytics/response-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, orgId, conversationHistory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 },
      );
    }

    if (!orgId || typeof orgId !== 'string') {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 },
      );
    }

    const context = await retrieveContext(message, orgId);
    const prompt = buildPrompt(message, context, conversationHistory);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = generateResponse(prompt);
          for await (const chunk of generator) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`),
            );
          }
          controller.enqueue(
            new TextEncoder().encode('data: [DONE]\n\n'),
          );
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[analytics/chat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
