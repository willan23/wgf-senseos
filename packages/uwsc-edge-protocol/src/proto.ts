// =============================================
// UWSC Edge Protocol — Binary Protobuf Engine
// =============================================

import protobuf from 'protobufjs';
import { MessageEnvelope as TSMessageEnvelope, CsiFrameBatchPayload as TSCsiFrameBatchPayload } from './index';

const PROTO_DEFINITION = `
syntax = "proto3";
package uwsc.v1;

message CsiFramePayload {
  string sensorId = 1;
  int64 timestamp = 2;
  repeated float amplitude = 3 [packed=true];
  repeated float phase = 4 [packed=true];
  int32 subcarrierCount = 5;
  int32 antennaIndex = 6;
  float rssi = 7;
  float noiseFloor = 8;
  bool isSimulated = 9;
  string scenarioTag = 10;
  string firmwareVersion = 11;
  float rfAuthenticityScore = 12;
}

message CsiFrameBatchPayload {
  repeated CsiFramePayload frames = 1;
  int32 batchSize = 2;
  int64 periodMs = 3;
}

message MessageEnvelope {
  string protocol = 1;
  string type = 2;
  string messageId = 3;
  string agentId = 4;
  string organizationId = 5;
  string siteId = 6;
  int64 sentAt = 7;
  CsiFrameBatchPayload payload = 8;
  string checksum = 9;
}
`;

// Initialize Protobuf types lazily to work in both ESM/CJS and Serverless environments
let root: protobuf.Root | null = null;
let MessageEnvelopeType: protobuf.Type | null = null;

function initProto() {
  if (!root) {
    root = protobuf.parse(PROTO_DEFINITION).root;
    MessageEnvelopeType = root.lookupType("uwsc.v1.MessageEnvelope");
  }
}

/**
 * Encodes a TypeScript MessageEnvelope<CsiFrameBatchPayload> to a binary Uint8Array.
 */
export function encodeCsiFrameBatch(message: TSMessageEnvelope<TSCsiFrameBatchPayload>): Uint8Array {
  initProto();
  if (!MessageEnvelopeType) {
    throw new Error('Protobuf type compilation failed');
  }

  // Verify payload matches type expectations
  const errMsg = MessageEnvelopeType.verify(message);
  if (errMsg) {
    throw new Error(`Protobuf verification failed: ${errMsg}`);
  }

  const msgObj = MessageEnvelopeType.create(message);
  return MessageEnvelopeType.encode(msgObj).finish();
}

/**
 * Decodes a binary buffer into a TypeScript MessageEnvelope<CsiFrameBatchPayload>.
 */
export function decodeCsiFrameBatch(buffer: Uint8Array): TSMessageEnvelope<TSCsiFrameBatchPayload> {
  initProto();
  if (!MessageEnvelopeType) {
    throw new Error('Protobuf type compilation failed');
  }

  const decoded = MessageEnvelopeType.decode(buffer);

  // Convert to dynamic object with defaults, mapping Longs to JavaScript numbers
  return MessageEnvelopeType.toObject(decoded, {
    longs: Number,
    enums: String,
    bytes: String,
    defaults: true,
    arrays: true,
    objects: true
  }) as TSMessageEnvelope<TSCsiFrameBatchPayload>;
}
