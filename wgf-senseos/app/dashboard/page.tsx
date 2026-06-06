'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/hooks/useSimulation';
import { SimulationScenario } from '@/types';
import { SCENARIOS } from '@/lib/csi-simulator';

// ---- Mini chart component ----
function SparkLine({ data, color = '#00d4ff', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#sg-${color.replace('#', '')})`}
      />
    </svg>
  );
}

// ---- CSI Amplitude visualizer ----
function CsiVisualizer({ amplitudes }: { amplitudes: number[] }) {
  if (!amplitudes.length) return (
    <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
      Aguardando dados...
    </div>
  );
  const max = Math.max(...amplitudes, 0.001);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 60, padding: '4px 0' }}>
      {amplitudes.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            minHeight: 2,
            borderRadius: '2px 2px 0 0',
            background: `hsl(${190 + v * 80}, 90%, ${40 + v * 30}%)`,
            transition: 'height 0.4s ease',
          }}
        />
      ))}
    </div>
  );
}

// ---- Metric card ----
function MetricCard({
  label, value, unit, icon, color, trend, sparkData,
}: {
  label: string; value: number | string; unit?: string; icon: string; color: string;
  trend?: number; sparkData?: number[];
}) {
  return (
    <div className="metric-card animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ color }}>
            {value}
            {unit && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>}
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: color + '18', border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{icon}</div>
      </div>
      {sparkData && sparkData.length > 1 && (
        <SparkLine data={sparkData} color={color} height={36} />
      )}
      {trend !== undefined && (
        <div style={{ marginTop: 6, fontSize: 12, color: trend >= 0 ? 'var(--status-online)' : 'var(--status-offline)' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs. última hora
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, senseUser } = useAuth();
  const { state, start, stop, changeScenario, SCENARIO_LABELS } = useSimulation();
  const [mode, setMode] = useState<'residential' | 'corporate'>('residential');
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);

  // Derived data for sparklines
  const [peopleHistory, setPeopleHistory] = useState<number[]>([0]);
  const [ampHistory, setAmpHistory] = useState<number[]>([0]);

  useEffect(() => {
    if (state.isRunning) {
      setPeopleHistory(prev => [...prev.slice(-30), state.occupancy]);
      const lastFrame = state.frames[state.frames.length - 1];
      if (lastFrame) {
        const avgAmp = lastFrame.amplitude.reduce((a, b) => a + b, 0) / lastFrame.amplitude.length;
        setAmpHistory(prev => [...prev.slice(-30), avgAmp]);
      }
    }
  }, [state.occupancy, state.frames, state.isRunning]);

  const latestFrame = state.frames[state.frames.length - 1];
  const latestDetection = state.detections[state.detections.length - 1];
  const openAlerts = state.alerts.filter(a => a.status === 'open');
  const sensorsOnline = state.isRunning ? 2 : 0;
  const params = SCENARIOS[state.scenario];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ---- Header ---- */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
            {greeting}, {senseUser?.displayName?.split(' ')[0] || 'Utilizador'} 👋
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sim-mode-banner">⚡ MODO SIMULADO</span>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-card)',
            borderRadius: 8, padding: 3, gap: 2,
          }}>
            {(['residential', 'corporate'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: mode === m ? 'rgba(0,212,255,0.15)' : 'transparent',
                color: mode === m ? 'var(--accent-primary)' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}>
                {m === 'residential' ? '🏠 Residencial' : '🏢 Corporativo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Simulation Control ---- */}
      <div className="glass-card" style={{
        padding: '16px 20px',
        borderColor: state.isRunning ? 'rgba(0,212,255,0.3)' : 'var(--border-card)',
        background: state.isRunning ? 'rgba(0,212,255,0.04)' : 'var(--bg-glass)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {state.isRunning && <div className="status-dot online" />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                Motor de Simulação CSI
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {state.isRunning
                  ? `Cenário ativo: ${SCENARIO_LABELS[state.scenario]} · ${state.frames.length} frames · t=${state.t.toFixed(1)}s`
                  : 'Clica em Iniciar para simular dados CSI em tempo real'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, position: 'relative', alignItems: 'center' }}>
            {/* Scenario selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowScenarioMenu(!showScenarioMenu)}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                {SCENARIO_LABELS[state.scenario]} ▾
              </button>
              {showScenarioMenu && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 50,
                  background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                  borderRadius: 10, padding: 6, minWidth: 220,
                  boxShadow: 'var(--shadow-elevated)',
                }}>
                  {(Object.entries(SCENARIO_LABELS) as [SimulationScenario, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => {
                      changeScenario(key);
                      setShowScenarioMenu(false);
                    }} style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', background: state.scenario === key ? 'rgba(0,212,255,0.1)' : 'transparent',
                      color: state.scenario === key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    }}>{label}</button>
                  ))}
                </div>
              )}
            </div>

            {state.isRunning ? (
              <button onClick={stop} className="btn-danger" style={{ padding: '8px 16px', fontSize: 13 }}>
                ⏹ Parar
              </button>
            ) : (
              <button onClick={() => start()} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                ▶ Iniciar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---- Metrics ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }} className="stagger">
        <MetricCard
          label="Pessoas Presentes"
          value={state.isRunning ? state.occupancy : '—'}
          icon="👥"
          color="#00d4ff"
          sparkData={peopleHistory}
          trend={state.isRunning ? 0 : undefined}
        />
        <MetricCard
          label="Sensores Online"
          value={sensorsOnline}
          unit={`/ 2`}
          icon="📡"
          color="#10d98a"
        />
        <MetricCard
          label="Alertas Ativos"
          value={openAlerts.length}
          icon="🚨"
          color={openAlerts.length > 0 ? '#ef4444' : '#10d98a'}
        />
        <MetricCard
          label="Confiança IA"
          value={state.isRunning ? `${(params.confidence * 100).toFixed(0)}%` : '—'}
          icon="🤖"
          color="#7c3aed"
        />
      </div>

      {/* ---- CSI Signal + Zone Occupancy ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* CSI Signal */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>📶 Sinal CSI — Amplitude por Subportadora</h2>
            <span className="badge badge-sim">SIMULADO</span>
          </div>
          <CsiVisualizer amplitudes={latestFrame?.amplitude || []} />
          {latestFrame && (
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[
                { label: 'RSSI', value: `${latestFrame.rssi.toFixed(1)} dBm`, color: '#00d4ff' },
                { label: 'Ruído', value: `${latestFrame.noiseFloor.toFixed(1)} dBm`, color: '#f59e0b' },
                { label: 'Subportadoras', value: latestFrame.subcarrierCount, color: '#7c3aed' },
              ].map(item => (
                <div key={item.label} style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</span>
                  <div style={{ color: item.color, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone occupancy */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>🏠 Ocupação por Zona</h2>
            <span className="badge badge-sim">SIMULADO</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'Sala de Estar', count: state.isRunning && state.occupancy > 0 ? Math.ceil(state.occupancy * 0.5) : 0, max: 6, color: '#00d4ff' },
              { name: 'Cozinha', count: state.isRunning && state.occupancy > 1 ? 1 : 0, max: 4, color: '#10d98a' },
              { name: 'Corredor', count: state.isRunning && state.scenario === 'one_person_enters' ? 1 : 0, max: 2, color: '#7c3aed' },
              { name: 'Quarto', count: 0, max: 3, color: '#f59e0b' },
            ].map(zone => (
              <div key={zone.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{zone.name}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: zone.count > 0 ? zone.color : 'var(--text-muted)' }}>
                    {zone.count}/{zone.max}
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999 }}>
                  <div style={{
                    height: '100%', borderRadius: 9999,
                    width: `${(zone.count / zone.max) * 100}%`,
                    background: zone.color,
                    transition: 'width 0.5s ease',
                    boxShadow: zone.count > 0 ? `0 0 8px ${zone.color}` : 'none',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Recent Events + Alerts ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent Detections */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>⚡ Eventos Recentes</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {state.detections.length} eventos
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
            {state.detections.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                Inicia a simulação para ver eventos
              </div>
            ) : [...state.detections].reverse().slice(0, 10).map(d => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontSize: 16 }}>
                  {d.type === 'fall' ? '🫸' : d.type === 'unknown_person' ? '❓' : d.type === 'movement' ? '🚶' : d.type === 'breathing' ? '💨' : '👤'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {d.type === 'fall' ? 'Queda detetada' : d.type === 'unknown_person' ? 'Pessoa desconhecida' : d.type === 'movement' ? 'Movimento' : d.type === 'breathing' ? 'Respiração' : 'Presença'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {d.personCount} pessoa(s) · {(d.confidenceScore * 100).toFixed(0)}% confiança · X:{d.locationX?.toFixed(0)}% Y:{d.locationY?.toFixed(0)}%
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(d.timestamp).toLocaleTimeString('pt-PT')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>🚨 Alertas Ativos</h2>
            {openAlerts.length > 0 && (
              <span className="badge badge-red">{openAlerts.length} abertos</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openAlerts.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '24px 0',
                color: 'var(--status-online)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
              }}>
                <span style={{ fontSize: 28 }}>✅</span>
                <span>Sistema normal — sem alertas ativos</span>
              </div>
            ) : openAlerts.map(alert => (
              <div key={alert.id} style={{
                padding: '12px 14px', borderRadius: 10,
                background: alert.severity === 'critical' ? 'rgba(239,68,68,0.08)' :
                  alert.severity === 'high' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)',
                border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.3)' :
                  alert.severity === 'high' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{alert.title}</span>
                  <span className={`badge ${alert.severity === 'critical' ? 'badge-red' : 'badge-yellow'}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alert.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {new Date(alert.timestamp).toLocaleTimeString('pt-PT')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Mode-specific section ---- */}
      {mode === 'residential' ? (
        <div className="glass-card" style={{ padding: 20, borderColor: 'rgba(0,212,255,0.2)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🏠 Modo Residencial — Estado da Casa</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Familiares', value: state.isRunning && !SCENARIOS[state.scenario].hasUnknown ? state.occupancy : 0, icon: '👨‍👩‍👧', color: '#10d98a' },
              { label: 'Desconhecidos', value: state.isRunning && SCENARIOS[state.scenario].hasUnknown ? 1 : 0, icon: '❓', color: '#ef4444' },
              { label: 'Queda Detetada', value: SCENARIOS[state.scenario].hasFall && state.isRunning ? 'SIM' : 'NÃO', icon: '🫸', color: SCENARIOS[state.scenario].hasFall && state.isRunning ? '#ef4444' : '#10d98a' },
              { label: 'Casa Vazia', value: state.occupancy === 0 ? 'SIM' : 'NÃO', icon: '🏠', color: state.occupancy === 0 ? '#f59e0b' : '#10d98a' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: item.color, marginBottom: 4 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 20, borderColor: 'rgba(124,58,237,0.2)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🏢 Modo Corporativo — Analytics em Tempo Real</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Presentes', value: state.isRunning ? state.occupancy : 0, icon: '👥', color: '#00d4ff' },
              { label: 'Taxa Ocupação', value: state.isRunning ? `${Math.round((state.occupancy / 10) * 100)}%` : '0%', icon: '📊', color: '#7c3aed' },
              { label: 'Fluxo (hora)', value: state.isRunning ? state.detections.length : 0, icon: '🚶', color: '#10d98a' },
              { label: 'Zonas Ativas', value: state.isRunning && state.occupancy > 0 ? 2 : 0, icon: '🗺️', color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: item.color, marginBottom: 4 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
