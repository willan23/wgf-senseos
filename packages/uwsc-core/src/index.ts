// WGF SenseOS — UWSC Core Package Entrypoint
// Camada 1: Tipos base
export * from './types';
// Camada 1: Ingestão e Anti-Spoofing
export * from './ingestion';
export * from './ingestion/antiSpoofing';
// Camada 2: Normalização Universal
export * from './normalization';
// Fase 5: Processamento de Sinal
export * from './signal-processing';
// Camada 3: Inferência TinyML
export * from './inference';
