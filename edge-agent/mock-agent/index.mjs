#!/usr/bin/env node
// =============================================
// WGF SenseOS — Mock Edge Agent (Fase 13)
// =============================================
// Script Node.js standalone que simula um edge agent OpenWrt/Raspberry Pi.
// Gera frames CSI, processa localmente e envia mensagens para o servidor.
//
// Uso:
//   node edge-agent/mock-agent/index.mjs --org ORG_ID --site SITE_ID
//
// Variáveis de ambiente:
//   UWSC_AGENT_ID   — ID único do agente (default: mock-agent-001)
//   UWSC_SERVER_URL — URL do servidor (default: http://localhost:3000)
//   UWSC_ORG_ID     — ID da organização
//   UWSC_SITE_ID    — ID do site
// =============================================

import { randomUUID } from 'crypto';

// ============================================================
// Configuração
// ============================================================

const CONFIG = {
  agentId:   process.env.UWSC_AGENT_ID   || 'mock-agent-001',
  serverUrl: process.env.UWSC_SERVER_URL || 'http://localhost:3000',
  orgId:     process.env.UWSC_ORG_ID     || 'demo-org',
  siteId:    process.env.UWSC_SITE_ID    || 'demo-site',
  sensorId:  process.env.UWSC_SENSOR_ID  || 'mock-sensor-001',
  intervalMs: parseInt(process.env.UWSC_INTERVAL_MS || '100', 10),
  batchSize:  parseInt(process.env.UWSC_BATCH_SIZE  || '10',  10),
  scenario:   process.env.UWSC_SCENARIO  || 'two_people_walking',
  subcarriers: 52,
  antennas: 3,
};

// ============================================================
// CSI Simulator (inline — não depende de módulos externos)
// ============================================================

function gaussianNoise(mean = 0, std = 1) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function generateCsiFrame(sensorId, scenario, t) {
  const amplitude = [];
  const phase = [];

  for (let i = 0; i < CONFIG.subcarriers; i++) {
    let amp = 50 + gaussianNoise(0, 3);
    let ph  = (i * 0.1 + t * 0.01) % (2 * Math.PI);

    // Scenario modulation
    switch (scenario) {
      case 'two_people_walking':
        amp += 15 * Math.sin(2 * Math.PI * 2.0 * t / 1000);
        ph  += 0.3 * Math.sin(2 * Math.PI * 1.5 * t / 1000);
        break;
      case 'fall_event':
        if (t > 3000 && t < 3200) amp += 80; // spike
        if (t > 3200) amp -= 20; // drop to floor level
        break;
      case 'person_breathing':
        amp += 5 * Math.sin(2 * Math.PI * 0.3 * t / 1000);
        break;
      case 'empty_house':
        amp += gaussianNoise(0, 0.5);
        break;
      case 'unknown_intruder':
        if (t > 2000) {
          amp += 20 * Math.sin(2 * Math.PI * 1.8 * t / 1000);
        }
        break;
    }

    amplitude.push(Math.max(0, amp));
    phase.push(ph);
  }

  return {
    messageId: randomUUID(),
    sensorId,
    organizationId: CONFIG.orgId,
    siteId: CONFIG.siteId,
    timestamp: Date.now(),
    amplitude,
    phase,
    subcarrierCount: CONFIG.subcarriers,
    antennaIndex: 0,
    rssi: -65 + gaussianNoise(0, 2),
    noiseFloor: -95 + gaussianNoise(0, 1),
    isSimulated: true,
    scenarioTag: scenario,
    firmwareVersion: 'mock-v1.0.0',
    rfAuthenticityScore: 0.95 + Math.random() * 0.05,
  };
}

// ============================================================
// HTTP Transport (fetch API — Node 18+)
// ============================================================

async function sendBatch(frames) {
  const message = {
    protocol: 'v1',
    type: 'csi_frame_batch',
    messageId: randomUUID(),
    agentId: CONFIG.agentId,
    organizationId: CONFIG.orgId,
    siteId: CONFIG.siteId,
    sentAt: Date.now(),
    payload: {
      frames,
      batchSize: frames.length,
      periodMs: frames.length > 1 ? frames[frames.length - 1].timestamp - frames[0].timestamp : 0,
    },
  };

  try {
    const resp = await fetch(`${CONFIG.serverUrl}/api/uwsc/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Agent-Id': CONFIG.agentId },
      body: JSON.stringify(message),
    });
    if (!resp.ok) {
      console.warn(`[agent] Ingest response: ${resp.status} ${resp.statusText}`);
    }
  } catch (err) {
    // Server may not be running — continue silently in demo mode
    // console.debug(`[agent] Server not reachable: ${err.message}`);
  }
}

async function sendHeartbeat() {
  const message = {
    protocol: 'v1',
    type: 'heartbeat',
    messageId: randomUUID(),
    agentId: CONFIG.agentId,
    organizationId: CONFIG.orgId,
    siteId: CONFIG.siteId,
    sentAt: Date.now(),
    payload: {
      agentId: CONFIG.agentId,
      sensorIds: [CONFIG.sensorId],
      cpuUsagePercent: 2 + Math.random() * 5,
      memoryUsageMb: 48 + Math.random() * 10,
      wifiChannel: 6,
      firmwareVersion: 'mock-v1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      signalQualityScore: 0.92,
    },
  };

  try {
    await fetch(`${CONFIG.serverUrl}/api/uwsc/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Agent-Id': CONFIG.agentId },
      body: JSON.stringify(message),
    });
  } catch (_) { /* server may not be available */ }
}

// ============================================================
// Main Loop
// ============================================================

let t = 0;
let frameBuffer = [];

console.log(`\n🛜 WGF SenseOS Mock Edge Agent`);
console.log(`   Agent ID    : ${CONFIG.agentId}`);
console.log(`   Organization: ${CONFIG.orgId}`);
console.log(`   Site        : ${CONFIG.siteId}`);
console.log(`   Scenario    : ${CONFIG.scenario}`);
console.log(`   Server      : ${CONFIG.serverUrl}`);
console.log(`   Interval    : ${CONFIG.intervalMs}ms | Batch: ${CONFIG.batchSize} frames`);
console.log(`\n   Press Ctrl+C to stop.\n`);

// Send heartbeat every 30 seconds
setInterval(sendHeartbeat, 30_000);
sendHeartbeat(); // immediate on start

// Frame generation loop
const frameInterval = setInterval(async () => {
  t += CONFIG.intervalMs;

  const frame = generateCsiFrame(CONFIG.sensorId, CONFIG.scenario, t);
  frameBuffer.push(frame);

  if (frameBuffer.length >= CONFIG.batchSize) {
    const batch = frameBuffer.splice(0, CONFIG.batchSize);
    await sendBatch(batch);
    process.stdout.write(`\r   📡 Sent batch | t=${t}ms | frames=${batch.length} | scenario=${CONFIG.scenario}   `);
  }

  // Loop scenario after 10 seconds
  if (t > 10_000) t = 0;
}, CONFIG.intervalMs);

process.on('SIGINT', () => {
  clearInterval(frameInterval);
  console.log('\n\n   ✅ Agent stopped gracefully.\n');
  process.exit(0);
});
