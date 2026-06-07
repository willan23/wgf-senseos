// =============================================
// Protobuf Serialization Validation Script
// =============================================

import { encodeCsiFrameBatch, decodeCsiFrameBatch } from './proto';
import { MessageEnvelope, CsiFrameBatchPayload } from './index';

const mockMessage: MessageEnvelope<CsiFrameBatchPayload> = {
  protocol: 'v1',
  type: 'csi_frame_batch',
  messageId: 'msg-test-1234',
  agentId: 'agent-007',
  organizationId: 'org-test',
  siteId: 'site-test',
  sentAt: Date.now(),
  payload: {
    frames: [
      {
        sensorId: 'sensor-001',
        timestamp: Date.now(),
        amplitude: [1.2, 3.4, 5.6],
        phase: [-0.5, 0.2, 1.1],
        subcarrierCount: 3,
        antennaIndex: 0,
        rssi: -45,
        noiseFloor: -80,
        isSimulated: true,
        scenarioTag: 'test-scenario',
        firmwareVersion: '1.2.0',
        rfAuthenticityScore: 0.98,
      }
    ],
    batchSize: 1,
    periodMs: 0,
  }
};

try {
  console.log('--- TEST START: Protobuf Serialization ---');

  // 1. Encode
  const encoded = encodeCsiFrameBatch(mockMessage);
  console.log(`Encoded binary size: ${encoded.length} bytes (JSON string size was: ${JSON.stringify(mockMessage).length} bytes)`);

  // 2. Decode
  const decoded = decodeCsiFrameBatch(encoded);
  console.log('Decoded message successfully!');

  // 3. Assert values
  if (decoded.messageId !== mockMessage.messageId) throw new Error('messageId mismatch');
  if (decoded.agentId !== mockMessage.agentId) throw new Error('agentId mismatch');
  if (decoded.payload.frames.length !== 1) throw new Error('frames length mismatch');
  if (decoded.payload.frames[0].sensorId !== mockMessage.payload.frames[0].sensorId) throw new Error('sensorId mismatch');
  if (Math.abs(decoded.payload.frames[0].amplitude[0] - 1.2) > 0.001) throw new Error('amplitude value mismatch');
  if (Math.abs((decoded.payload.frames[0].rfAuthenticityScore || 0) - 0.98) > 0.001) throw new Error('rfAuthenticityScore mismatch');

  console.log('All assertions PASSED! ✅');
} catch (err) {
  console.error('Test failed ❌', err);
  process.exit(1);
}
