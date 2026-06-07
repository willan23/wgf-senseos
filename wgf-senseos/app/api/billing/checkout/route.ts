// =============================================
// API Route: POST /api/billing/checkout
// =============================================
// Cria uma sessão de checkout do Stripe para subscrição de planos.
// Em ambientes de desenvolvimento/sem chaves Stripe, redireciona para a rota de simulação.
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : null;

export async function POST(req: NextRequest) {
  try {
    const { organizationId, planId } = await req.json();

    if (!organizationId || !planId) {
      return NextResponse.json({ error: 'organizationId and planId are required' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    
    // Construct return URLs using standard App Hosting or Vercel routing
    const successUrl = `${protocol}://${host}/dashboard/settings?billing_status=success`;
    const cancelUrl = `${protocol}://${host}/dashboard/settings?billing_status=cancelled`;

    if (!stripe) {
      console.warn('[Stripe Checkout] STRIPE_SECRET_KEY is missing. Redirecting to simulated checkout.');
      const simulatedUrl = `${protocol}://${host}/api/billing/checkout/simulate?orgId=${encodeURIComponent(organizationId)}&planId=${encodeURIComponent(planId)}&successUrl=${encodeURIComponent(successUrl)}`;
      return NextResponse.json({ url: simulatedUrl, isSimulated: true });
    }

    // Determine Stripe price ID based on planId from environment variables
    let priceId = '';
    if (planId === 'residential') {
      priceId = process.env.STRIPE_PRICE_RESIDENTIAL || 'price_mock_residential_29';
    } else if (planId === 'business') {
      priceId = process.env.STRIPE_PRICE_BUSINESS || 'price_mock_business_99';
    } else {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: organizationId,
      metadata: {
        organizationId,
        planId,
      },
    });

    return NextResponse.json({ url: session.url, isSimulated: false });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[checkout/route] Error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
