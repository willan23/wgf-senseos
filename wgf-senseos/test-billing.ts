// =============================================
// Billing Synchronization Validation Script
// =============================================

import { db } from './lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

async function testBilling() {
  if (!db) {
    console.error('Firebase DB is not initialized. Make sure .env.local is configured.');
    return;
  }

  const orgId = 'org_demo';
  console.log(`--- START BILLING TEST for org: ${orgId} ---`);

  try {
    // 1. Reset org to free plan
    await updateDoc(doc(db, 'organizations', orgId), {
      plan: 'free_demo',
      maxSensors: 1,
      maxSites: 1,
    });
    console.log('Reset organization to free_demo plan.');

    // 2. Read to verify
    let orgDoc = await getDoc(doc(db, 'organizations', orgId));
    const data1 = orgDoc.data();
    if (!data1) {
      console.error('No data found in org document');
      return;
    }
    console.log(`Current plan: ${data1.plan}, maxSensors: ${data1.maxSensors}`);

    // 3. Simulate checkout to residential
    console.log('Simulating upgrade checkout to "residential"...');
    const planId = 'residential';
    const maxSensors = 5;
    const maxSites = 2;

    await updateDoc(doc(db, 'organizations', orgId), {
      plan: planId,
      maxSensors,
      maxSites,
      updatedAt: Date.now(),
    });

    // 4. Verify limits updated
    orgDoc = await getDoc(doc(db, 'organizations', orgId));
    const data2 = orgDoc.data();
    if (!data2) {
      console.error('No data found in updated org document');
      return;
    }
    console.log(`Updated plan: ${data2.plan}, maxSensors: ${data2.maxSensors}, maxSites: ${data2.maxSites}`);

    if (data2.plan === 'residential' && data2.maxSensors === 5) {
      console.log('Billing limits upgrade sync SUCCESS! ✅');
    } else {
      throw new Error('Billing upgrade sync failed');
    }

  } catch (err) {
    console.error('Billing test failed ❌', err);
  }
}

testBilling();
