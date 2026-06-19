/**
 * WGF SenseOS — Model Manager (Camada 3)
 * Manages model lifecycle: load, unload, health check, hot-swap.
 */

import { ModelMetadata, ModelType, ModelStatus } from './index';

export interface ModelHealth {
  id: string;
  status: ModelStatus;
  lastUsedAt?: number;
  averageLatencyMs: number;
  totalInferences: number;
  errorCount: number;
  memoryUsageKb: number;
}

export class ModelManager {
  private health: Map<string, ModelHealth> = new Map();
  private loadTimes: Map<string, number> = new Map();

  initialize(registry: ModelMetadata[]): void {
    for (const model of registry) {
      this.health.set(model.id, {
        id: model.id,
        status: model.status,
        averageLatencyMs: 0,
        totalInferences: 0,
        errorCount: 0,
        memoryUsageKb: model.sizeKb,
      });
    }
  }

  recordInference(modelId: string, latencyMs: number, success: boolean): void {
    const h = this.health.get(modelId);
    if (!h) return;

    h.totalInferences++;
    h.lastUsedAt = Date.now();

    if (success) {
      h.averageLatencyMs = (h.averageLatencyMs * (h.totalInferences - 1) + latencyMs) / h.totalInferences;
    } else {
      h.errorCount++;
    }
  }

  getHealth(modelId: string): ModelHealth | undefined {
    return this.health.get(modelId);
  }

  getAllHealth(): ModelHealth[] {
    return Array.from(this.health.values());
  }

  updateStatus(modelId: string, status: ModelStatus): void {
    const h = this.health.get(modelId);
    if (h) h.status = status;
  }

  getOverallHealthScore(): number {
    const models = Array.from(this.health.values());
    if (models.length === 0) return 0;

    let score = 0;
    for (const m of models) {
      if (m.status === 'active') score += 1;
      else if (m.status === 'loading') score += 0.5;
    }

    return score / models.length;
  }
}

export const modelManager = new ModelManager();
