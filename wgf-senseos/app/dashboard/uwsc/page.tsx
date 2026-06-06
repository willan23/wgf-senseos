'use client';

import { useState, useEffect } from 'react';
import { useUwscPipeline } from '../../../lib/useUwscPipeline';
import { getModelRegistry } from '@uwsc/core/inference';
import type { ModelMetadata } from '@uwsc/core/inference';
import type { SimulationScenario } from '@uwsc/core/types';

const SCENARIOS: { value: SimulationScenario; label: string; icon: string }[] = [
  { value: 'empty_house',          label: 'Casa Vazia',           icon: '🏠' },
  { value: 'one_person_enters',    label: 'Uma Pessoa Entra',     icon: '🚶' },
  { value: 'two_people_walking',   label: 'Duas Pessoas',         icon: '👥' },
  { value: 'person_breathing',     label: 'Respiração Estática',  icon: '🫁' },
  { value: 'fall_event',           label: 'Queda Detectada',      icon: '⚠️' },
  { value: 'unknown_intruder',     label: 'Intruso Desconhecido', icon: '🔴' },
  { value: 'store_customer_flow',  label: 'Fluxo de Clientes',    icon: '🏪' },
];

export default function UwscPipelinePage() {
  const [scenario, setScenario] = useState<SimulationScenario>('two_people_walking');
  const [models, setModels] = useState<ModelMetadata[]>([]);

  useEffect(() => {
    setModels(getModelRegistry());
  }, []);

  const { state, start, stop, pause } = useUwscPipeline({
    organizationId: 'demo-org',
    siteId: 'demo-site',
    sensorId: 'mock-sensor-001',
    mode: 'simulation',
    scenario,
    persistToFirestore: false,
  });

  const { status, framesProcessed, latestSignal, latestInference, rfAuthenticityScore, spoofingAttemptCount } = state;

  return (
    <div className="uwsc-page">
      {/* Header */}
      <div className="uwsc-header">
        <div>
          <h1 className="uwsc-title">
            <span className="uwsc-icon">⚡</span>
            UWSC Pipeline Inspector
          </h1>
          <p className="uwsc-subtitle">Universal Wi-Fi Sensing Core — Inspetor de Pipeline em Tempo Real</p>
        </div>
        <div className="uwsc-controls">
          <select
            className="uwsc-select"
            value={scenario}
            onChange={e => { stop(); setScenario(e.target.value as SimulationScenario); }}
          >
            {SCENARIOS.map(s => (
              <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
            ))}
          </select>
          {status === 'idle' || status === 'paused'
            ? <button id="uwsc-start-btn" className="uwsc-btn uwsc-btn-start" onClick={start}>▶ Iniciar</button>
            : <>
                <button id="uwsc-pause-btn" className="uwsc-btn uwsc-btn-pause" onClick={pause}>⏸ Pausar</button>
                <button id="uwsc-stop-btn"  className="uwsc-btn uwsc-btn-stop"  onClick={stop}>⏹ Parar</button>
              </>
          }
        </div>
      </div>

      {/* Status Bar */}
      <div className="uwsc-status-bar">
        <span className={`uwsc-status-dot ${status === 'running' ? 'running' : status === 'error' ? 'error' : ''}`} />
        <span className="uwsc-status-text">
          {status === 'running' ? 'Pipeline Ativo' : status === 'paused' ? 'Pausado' : status === 'error' ? 'Erro' : 'Inativo'}
        </span>
        <span className="uwsc-stat">📦 {framesProcessed.toLocaleString()} frames processados</span>
        <span className="uwsc-stat">🔐 RF Score: {(rfAuthenticityScore * 100).toFixed(1)}%</span>
        {spoofingAttemptCount > 0 && (
          <span className="uwsc-stat uwsc-alert-stat">⚠️ {spoofingAttemptCount} tentativas de spoofing bloqueadas</span>
        )}
      </div>

      {/* Pipeline Layers */}
      <div className="uwsc-layers-grid">

        {/* Layer 1: Ingestão */}
        <div className="uwsc-layer-card">
          <div className="uwsc-layer-header layer-1">
            <span>📡 Camada 1 — Ingestão & Anti-Spoofing</span>
            <span className="uwsc-badge simulated">SIMULADO</span>
          </div>
          <div className="uwsc-layer-body">
            <div className="uwsc-metric-row">
              <span>Autenticidade RF</span>
              <span className="uwsc-metric-value">{(rfAuthenticityScore * 100).toFixed(2)}%</span>
            </div>
            <div className="uwsc-bar-wrap">
              <div className="uwsc-bar" style={{ width: `${rfAuthenticityScore * 100}%`, background: rfAuthenticityScore > 0.8 ? 'var(--color-success)' : 'var(--color-danger)' }} />
            </div>
            <div className="uwsc-metric-row">
              <span>Modo</span>
              <span className="uwsc-metric-value uwsc-chip">Simulação CSI</span>
            </div>
            <div className="uwsc-metric-row">
              <span>Cenário Ativo</span>
              <span className="uwsc-metric-value">{SCENARIOS.find(s => s.value === scenario)?.icon} {SCENARIOS.find(s => s.value === scenario)?.label}</span>
            </div>
          </div>
        </div>

        {/* Layer 2: Normalização */}
        <div className="uwsc-layer-card">
          <div className="uwsc-layer-header layer-2">
            <span>🔢 Camada 2 — Normalização & PCA</span>
            <span className="uwsc-badge active">ATIVO</span>
          </div>
          <div className="uwsc-layer-body">
            <div className="uwsc-metric-row">
              <span>Subportadoras Alvo</span>
              <span className="uwsc-metric-value">52 (padrão Wi-Fi 5)</span>
            </div>
            <div className="uwsc-metric-row">
              <span>Alinhamento de Fase</span>
              <span className="uwsc-metric-value">✅ Ativo</span>
            </div>
            <div className="uwsc-metric-row">
              <span>Normalização Z-Score</span>
              <span className="uwsc-metric-value">✅ Ativo</span>
            </div>
            <div className="uwsc-metric-row">
              <span>PCA Denoising</span>
              <span className="uwsc-metric-value">✅ Ativo</span>
            </div>
            <div className="uwsc-metric-row">
              <span>Janela Temporal</span>
              <span className="uwsc-metric-value">5s (T×S×A)</span>
            </div>
          </div>
        </div>

        {/* Phase 5: Processamento de Sinal */}
        <div className="uwsc-layer-card">
          <div className="uwsc-layer-header layer-signal">
            <span>〰️ Filtros & Energia de Movimento</span>
            <span className="uwsc-badge active">ATIVO</span>
          </div>
          <div className="uwsc-layer-body">
            {latestSignal ? (
              <>
                <div className="uwsc-metric-row">
                  <span>🫁 Freq. Respiratória</span>
                  <span className="uwsc-metric-value">{latestSignal.breathingRateBpm.toFixed(1)} bpm</span>
                </div>
                <div className="uwsc-metric-row">
                  <span>🚶 Energia Gait</span>
                  <span className="uwsc-metric-value">{latestSignal.gait.energyRms.toFixed(4)}</span>
                </div>
                <div className="uwsc-metric-row">
                  <span>⚡ Energia Total</span>
                  <span className="uwsc-metric-value">{latestSignal.totalMotionEnergy.toFixed(4)}</span>
                </div>
                <div className="uwsc-metric-row">
                  <span>⚠️ Queda Heurística</span>
                  <span className={`uwsc-metric-value ${latestSignal.fallDetected ? 'uwsc-danger' : 'uwsc-ok'}`}>
                    {latestSignal.fallDetected ? '🚨 DETECTADA' : '✅ Normal'}
                  </span>
                </div>
              </>
            ) : (
              <p className="uwsc-placeholder">Inicie o pipeline para ver os dados de sinal.</p>
            )}
          </div>
        </div>

        {/* Layer 3: Inferência */}
        <div className="uwsc-layer-card uwsc-layer-wide">
          <div className="uwsc-layer-header layer-3">
            <span>🧠 Camada 3 — Motor TinyML & Inferência</span>
            <span className="uwsc-badge simulated">SIMULADO</span>
          </div>
          <div className="uwsc-layer-body uwsc-inference-grid">
            {latestInference ? (
              <>
                <div className="uwsc-inference-block">
                  <div className="uwsc-inference-label">👥 Contagem</div>
                  <div className="uwsc-inference-big">{latestInference.occupancy.count}</div>
                  <div className="uwsc-inference-sub">confiança: {(latestInference.occupancy.confidence * 100).toFixed(0)}%</div>
                </div>
                <div className="uwsc-inference-block">
                  <div className="uwsc-inference-label">📍 Localização</div>
                  {latestInference.locations.length > 0 ? (
                    latestInference.locations.map((loc, i) => (
                      <div key={i} className="uwsc-inference-sub">
                        #{i+1}: X={loc.x.toFixed(2)}m Y={loc.y.toFixed(2)}m Z={loc.z.toFixed(2)}m
                      </div>
                    ))
                  ) : (
                    <div className="uwsc-inference-sub">Nenhuma presença</div>
                  )}
                </div>
                <div className="uwsc-inference-block">
                  <div className="uwsc-inference-label">🆔 Identificação</div>
                  {latestInference.gaitSignatures.map((sig, i) => (
                    <div key={i} className="uwsc-inference-sub">
                      #{i+1}: {sig.label === 'known' ? '✅ Conhecido' : '🔴 Desconhecido'}
                      <br />
                      <span className="uwsc-hash">{sig.privacyHash}</span>
                    </div>
                  ))}
                  {latestInference.gaitSignatures.length === 0 && <div className="uwsc-inference-sub">—</div>}
                </div>
                <div className="uwsc-inference-block">
                  <div className="uwsc-inference-label">⚠️ Queda</div>
                  <div className={`uwsc-inference-big uwsc-inference-small ${latestInference.fall.detected ? 'uwsc-danger' : 'uwsc-ok'}`}>
                    {latestInference.fall.detected ? '🚨 SIM' : '✅ NÃO'}
                  </div>
                  <div className="uwsc-inference-sub">{(latestInference.fall.confidence * 100).toFixed(0)}% confiança</div>
                </div>
                <div className="uwsc-inference-block">
                  <div className="uwsc-inference-label">⚡ Latência</div>
                  <div className="uwsc-inference-big uwsc-inference-small">{latestInference.processingTimeMs}ms</div>
                  <div className="uwsc-inference-sub">modelos: {latestInference.modelsUsed.length}</div>
                </div>
              </>
            ) : (
              <p className="uwsc-placeholder">Inicie o pipeline para ver os resultados de inferência.</p>
            )}
          </div>
        </div>

      </div>

      {/* Model Registry */}
      <div className="uwsc-section">
        <h2 className="uwsc-section-title">📋 Registo de Modelos TinyML</h2>
        <div className="uwsc-model-grid">
          {models.map(m => (
            <div key={m.id} className="uwsc-model-card">
              <div className="uwsc-model-name">{m.id}</div>
              <div className="uwsc-model-desc">{m.description}</div>
              <div className="uwsc-model-tags">
                <span className={`uwsc-tag ${m.status === 'simulated' ? 'tag-sim' : 'tag-active'}`}>{m.status}</span>
                <span className="uwsc-tag tag-quant">{m.quantization}</span>
                <span className="uwsc-tag tag-backend">{m.backend}</span>
                {m.isEdge && <span className="uwsc-tag tag-edge">edge</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .uwsc-page { padding: 2rem; max-width: 1400px; margin: 0 auto; }
        .uwsc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .uwsc-title { font-size: 1.75rem; font-weight: 700; color: var(--color-text-primary, #fff); display: flex; align-items: center; gap: 0.5rem; }
        .uwsc-icon { font-size: 1.5rem; }
        .uwsc-subtitle { color: var(--color-text-secondary, #9ca3af); font-size: 0.9rem; margin-top: 0.25rem; }
        .uwsc-controls { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
        .uwsc-select { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
        .uwsc-btn { padding: 0.5rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; border: none; cursor: pointer; transition: all 0.2s; }
        .uwsc-btn-start { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
        .uwsc-btn-pause { background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid #fbbf24; }
        .uwsc-btn-stop  { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; }
        .uwsc-btn:hover { opacity: 0.85; transform: translateY(-1px); }

        .uwsc-status-bar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.04); border-radius: 10px; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .uwsc-status-dot { width: 10px; height: 10px; border-radius: 50%; background: #6b7280; flex-shrink: 0; }
        .uwsc-status-dot.running { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse-dot 1.5s infinite; }
        .uwsc-status-dot.error { background: #ef4444; }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .uwsc-status-text { font-weight: 600; color: #fff; }
        .uwsc-stat { font-size: 0.85rem; color: #9ca3af; }
        .uwsc-alert-stat { color: #fbbf24; font-weight: 600; }

        .uwsc-layers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .uwsc-layer-wide { grid-column: 1 / -1; }

        .uwsc-layer-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; overflow: hidden; }
        .uwsc-layer-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; font-weight: 600; font-size: 0.9rem; }
        .layer-1 { background: linear-gradient(90deg, rgba(59,130,246,0.3), rgba(99,102,241,0.15)); color: #93c5fd; }
        .layer-2 { background: linear-gradient(90deg, rgba(16,185,129,0.3), rgba(5,150,105,0.15)); color: #6ee7b7; }
        .layer-signal { background: linear-gradient(90deg, rgba(245,158,11,0.3), rgba(217,119,6,0.15)); color: #fcd34d; }
        .layer-3 { background: linear-gradient(90deg, rgba(139,92,246,0.3), rgba(109,40,217,0.15)); color: #c4b5fd; }

        .uwsc-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; letter-spacing: 0.05em; text-transform: uppercase; }
        .uwsc-badge.simulated { background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid #fbbf2466; }
        .uwsc-badge.active { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid #10b98166; }

        .uwsc-layer-body { padding: 1rem; }
        .uwsc-metric-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: #9ca3af; }
        .uwsc-metric-row:last-child { border-bottom: none; }
        .uwsc-metric-value { color: #fff; font-weight: 500; }
        .uwsc-chip { background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 1px 8px; border-radius: 999px; font-size: 0.75rem; }
        .uwsc-bar-wrap { height: 6px; background: rgba(255,255,255,0.1); border-radius: 999px; margin: 0.4rem 0; }
        .uwsc-bar { height: 100%; border-radius: 999px; transition: width 0.5s; }

        .uwsc-placeholder { color: #4b5563; font-size: 0.85rem; font-style: italic; padding: 1rem 0; }

        .uwsc-inference-grid { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .uwsc-inference-block { flex: 1; min-width: 120px; }
        .uwsc-inference-label { font-size: 0.75rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
        .uwsc-inference-big { font-size: 2.5rem; font-weight: 800; color: #fff; line-height: 1; }
        .uwsc-inference-small { font-size: 1.5rem; }
        .uwsc-inference-sub { font-size: 0.78rem; color: #6b7280; margin-top: 0.25rem; }
        .uwsc-danger { color: #ef4444 !important; }
        .uwsc-ok { color: #10b981 !important; }
        .uwsc-hash { font-family: monospace; font-size: 0.7rem; color: #6b7280; word-break: break-all; }

        .uwsc-section { margin-top: 2rem; }
        .uwsc-section-title { font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 1rem; }
        .uwsc-model-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .uwsc-model-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 1rem; }
        .uwsc-model-name { font-family: monospace; font-size: 0.85rem; color: #a5b4fc; font-weight: 700; margin-bottom: 0.4rem; }
        .uwsc-model-desc { font-size: 0.78rem; color: #6b7280; margin-bottom: 0.75rem; line-height: 1.4; }
        .uwsc-model-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .uwsc-tag { font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; }
        .tag-sim { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .tag-active { background: rgba(16,185,129,0.15); color: #10b981; }
        .tag-quant { background: rgba(99,102,241,0.15); color: #a5b4fc; }
        .tag-backend { background: rgba(59,130,246,0.15); color: #93c5fd; }
        .tag-edge { background: rgba(16,185,129,0.15); color: #6ee7b7; }
      `}</style>
    </div>
  );
}
