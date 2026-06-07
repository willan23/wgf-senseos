// =============================================
// API Route: POST /api/billing/webhook
// =============================================
// Escuta eventos do Stripe (Checkout concluído, subscrição alterada ou cancelada)
// e sincroniza os limites e o plano do inquilino (organização) na base de dados.
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is unconfigured' }, { status: 500 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (constructErr) {
      const msg = constructErr instanceof Error ? constructErr.message : String(constructErr);
      console.error('[Stripe Webhook] Signature verification failed:', msg);
      return NextResponse.json({ error: `Webhook Signature verification failed: ${msg}` }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Processing event type: ${event.type}`);

    if (db) {
      const { doc, updateDoc } = await import('firebase/firestore');

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const organizationId = session.client_reference_id;
          const planId = session.metadata?.planId;

          if (organizationId && planId) {
            let maxSensors = 1;
            let maxSites = 1;

            if (planId === 'residential') {
              maxSensors = 5;
              maxSites = 2;
            } else if (planId === 'business') {
              maxSensors = 50;
              maxSites = 10;
            } else if (planId === 'enterprise') {
              maxSensors = 500;
              maxSites = 100;
            }

            await updateDoc(doc(db, 'organizations', organizationId), {
              plan: planId,
              maxSensors,
              maxSites,
              updatedAt: Date.now(),
            });
            console.log(`[Stripe Webhook] Checkout complete: org ${organizationId} configured with plan ${planId}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const organizationId = subscription.metadata?.organizationId;
          const planId = subscription.metadata?.planId;

          if (organizationId && planId) {
            let maxSensors = 1;
            let maxSites = 1;

            if (planId === 'residential') {
              maxSensors = 5;
              maxSites = 2;
            } else if (planId === 'business') {
              maxSensors = 50;
              maxSites = 10;
            } else if (planId === 'enterprise') {
              maxSensors = 500;
              maxSites = 100;
            }

            await updateDoc(doc(db, 'organizations', organizationId), {
              plan: planId,
              maxSensors,
              maxSites,
              updatedAt: Date.now(),
            });
            console.log(`[Stripe Webhook] Subscription updated: org ${organizationId} mapped to plan ${planId}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const organizationId = subscription.metadata?.organizationId;

          if (organizationId) {
            // Fall back to free demo boundaries on subscription cancellation
            await updateDoc(doc(db, 'organizations', organizationId), {
              plan: 'free_demo',
              maxSensors: 1,
              maxSites: 1,
              updatedAt: Date.now(),
            });
            console.log(`[Stripe Webhook] Subscription deleted: org ${organizationId} reset to free_demo plan`);
          }
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } else {
      console.warn('[Stripe Webhook] Database is offline, skipping Firestore updates.');
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webhook/route] Error:', msg);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
