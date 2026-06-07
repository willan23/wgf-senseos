// =============================================
// API Route: GET /api/billing/checkout/simulate
// =============================================
// Simula a confirmação de checkout e ativa os limites de plano no Firestore.
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const planId = searchParams.get('planId');
    const successUrl = searchParams.get('successUrl');

    if (!orgId || !planId) {
      return NextResponse.json({ error: 'Missing parameters orgId or planId' }, { status: 400 });
    }

    if (db) {
      const { doc, updateDoc } = await import('firebase/firestore');

      // Set plan boundaries matching check limits
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

      await updateDoc(doc(db, 'organizations', orgId), {
        plan: planId,
        maxSensors,
        maxSites,
        updatedAt: Date.now(),
      });
      
      console.log(`[Stripe Simulate] Updated organization ${orgId} limits | plan=${planId} maxSensors=${maxSensors} maxSites=${maxSites}`);
    } else {
      console.warn('[Stripe Simulate] Database client is offline. Simulation skipped DB write.');
    }

    return NextResponse.redirect(successUrl || '/dashboard/settings');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[checkout/simulate] Error:', msg);
    return NextResponse.json({ error: 'Simulation failed', detail: msg }, { status: 500 });
  }
}
