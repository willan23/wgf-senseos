/**
 * WGF SenseOS — Analytics RAG Prompt Builder
 * Constructs prompts with retrieved context for the LLM.
 */

import { RetrievedContext } from './retriever';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAlertsSummary(alerts: RetrievedContext['alerts']): string {
  if (alerts.length === 0) return 'Nenhum alerta encontrado no período.';

  const bySeverity: Record<string, number> = {};
  for (const a of alerts) {
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
  }

  const summary = Object.entries(bySeverity)
    .map(([sev, count]) => `${count} ${sev}`)
    .join(', ');

  const recentAlerts = alerts.slice(0, 5).map(a =>
    `- [${formatTimestamp(a.timestamp)}] ${a.severity.toUpperCase()}: ${a.message} (sensor: ${a.sensorId})`
  ).join('\n');

  return `Total: ${alerts.length} alertas (${summary}).\nAlertas mais recentes:\n${recentAlerts}`;
}

function formatDetectionsSummary(detections: RetrievedContext['detections']): string {
  if (detections.length === 0) return 'Nenhuma deteção encontrada no período.';

  const byType: Record<string, { count: number; avgConfidence: number }> = {};
  for (const d of detections) {
    if (!byType[d.type]) {
      byType[d.type] = { count: 0, avgConfidence: 0 };
    }
    byType[d.type].count++;
    byType[d.type].avgConfidence += d.confidence;
  }

  const summary = Object.entries(byType)
    .map(([type, data]) => {
      const avgConf = (data.avgConfidence / data.count * 100).toFixed(0);
      return `${type}: ${data.count}x (confiança média: ${avgConf}%)`;
    })
    .join('\n  ');

  const recentDetections = detections.slice(0, 5).map(d =>
    `- [${formatTimestamp(d.timestamp)}] ${d.type} (confiança: ${(d.confidence * 100).toFixed(0)}%, sensor: ${d.sensorId})`
  ).join('\n');

  return `Deteções agregadas:\n  ${summary}\n\nDeteções mais recentes:\n${recentDetections}`;
}

export function buildPrompt(
  query: string,
  context: RetrievedContext,
  conversationHistory?: ConversationMessage[],
): string {
  const systemPrompt = `You are an AI assistant for WGF SenseOS, a WiFi-based security and spatial intelligence platform.
You help users understand occupancy patterns, security alerts, and detection history.
Always respond in Portuguese unless the user writes in another language.
Be concise, factual, and helpful. Use the provided data context to answer questions.
If you don't have enough data to answer, say so honestly.`;

  const contextBlock = `
## Dados do Sistema

### Estatísticas do Período
- Total de alertas: ${context.stats.totalAlerts}
- Total de deteções: ${context.stats.totalDetections}
- Sensores ativos: ${context.stats.uniqueSensors}

### Sites
${context.sites.map(s => `- ${s.name} (${s.sensors} sensores)`).join('\n') || 'Nenhum site configurado.'}

### Alertas
${formatAlertsSummary(context.alerts)}

### Deteções
${formatDetectionsSummary(context.detections)}
`;

  const historyBlock = conversationHistory && conversationHistory.length > 0
    ? `\n## Histórico da Conversa\n${conversationHistory.map(m => `${m.role === 'user' ? 'Utilizador' : 'Assistente'}: ${m.content}`).join('\n')}`
    : '';

  return `${systemPrompt}
${contextBlock}
${historyBlock}

## Pergunta do Utilizador
${query}

## Resposta`;
}
