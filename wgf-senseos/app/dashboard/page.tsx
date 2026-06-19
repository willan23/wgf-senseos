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
    <svg width={w} height={h} style={{ overflow: 'visible', filter: 'drop-shadow(0px 1px 4px ' + color + '66)' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
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
    <div style={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
      Aguardando telemetria em tempo real...
    </div>
  );
  const max = Math.max(...amplitudes, 0.001);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 2,
      height: 70,
      background: 'rgba(2, 8, 23, 0.5)',
      borderRadius: 10,
      padding: '6px 16px',
      border: '1px solid rgba(255, 255, 255, 0.04)'
    }}>
      {amplitudes.map((v, i) => {
        const hPercent = (v / max) * 100;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${hPercent}%`,
              minHeight: 3,
              borderRadius: '4px 4px 0 0',
              background: `linear-gradient(to top, rgba(0, 212, 255, 0.3), hsl(${190 + (v / max) * 80}, 90%, 55%))`,
              boxShadow: hPercent > 60 ? `0 0 6px hsl(${190 + (v / max) * 80}, 90%, 55%)` : 'none',
              transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        );
      })}
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
    <div className="metric-card animate-fade-in" style={{
      position: 'relative',
      overflow: 'hidden',
      border: `1px solid ${color}22`,
      background: `linear-gradient(135deg, rgba(15, 29, 53, 0.75), rgba(21, 34, 64, 0.45))`,
      boxShadow: `0 4px 24px rgba(0, 0, 0, 0.3), inset 0 0 12px ${color}08`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div className="metric-label" style={{ color: 'var(--text-secondary)' }}>{label}</div>
          <div className="metric-value" style={{ color, fontSize: 34, textShadow: `0 0 20px ${color}33`, marginTop: 4 }}>
            {value}
            {unit && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>}
          </div>
        </div>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: color + '12', border: `1.5px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          boxShadow: `0 0 15px ${color}1a`,
        }}>{icon}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
        {sparkData && sparkData.length > 1 ? (
          <SparkLine data={sparkData} color={color} height={36} />
        ) : <div style={{ height: 36 }} />}
        {trend !== undefined && (
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: trend >= 0 ? 'var(--status-online)' : 'var(--status-offline)',
            background: trend >= 0 ? 'rgba(16,217,138,0.08)' : 'rgba(239,68,68,0.08)',
            padding: '2px 8px',
            borderRadius: 6,
            border: `1px solid ${trend >= 0 ? 'rgba(16,217,138,0.2)' : 'rgba(239,68,68,0.2)'}`
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
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
  const sensorsOnline = state.sensorList?.filter((s: any) => s.status === 'online').length || 0;
  const params = SCENARIOS[state.scenario];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <div className="bg-grid bg-radial-glow animate-fade-in" style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100vh', position: 'relative' }}>

      {/* ---- Header ---- */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4, background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {greeting}, {senseUser?.displayName?.split(' ')[0] || 'Utilizador'} 👋
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {sensorsOnline > 0 ? (
            <span className="sim-mode-banner" style={{ background: 'rgba(16, 217, 138, 0.1)', border: '1px solid rgba(16, 217, 138, 0.4)', color: '#10d98a', boxShadow: '0 0 12px rgba(16, 217, 138, 0.15)' }}>
              🟢 REDE MESH ATIVA ({sensorsOnline} nós)
            </span>
          ) : (
            <span className="sim-mode-banner" style={{ border: '1px solid rgba(0, 212, 255, 0.4)', boxShadow: '0 0 12px rgba(0, 212, 255, 0.15)' }}>
              ⚡ AGUARDANDO BORDAS
            </span>
          )}

          {/* Mode toggle */}
          <div style={{
            display: 'flex', background: 'rgba(15, 29, 53, 0.65)', border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 10, padding: 3, gap: 2, backdropFilter: 'blur(8px)'
          }}>
            {(['residential', 'corporate'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: mode === m ? 'rgba(0,212,255,0.12)' : 'transparent',
                color: mode === m ? 'var(--accent-primary)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}>
                {m === 'residential' ? '🏠 Residencial' : '🏢 Corporativo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Simulation Control ---- */}
      <div className="glass-card" style={{
        padding: '20px 24px',
        borderColor: state.isRunning ? 'var(--accent-primary)' : 'var(--border-card)',
        boxShadow: state.isRunning ? '0 0 24px rgba(0, 212, 255, 0.12)' : 'var(--shadow-card)',
        background: 'linear-gradient(135deg, rgba(15, 29, 53, 0.8), rgba(2, 8, 23, 0.8))',
        borderWidth: state.isRunning ? '1.5px' : '1px',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {state.isRunning && <div className="status-dot online" />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                Consola de Controle de Cenários (UWSC)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {sensorsOnline > 0
                  ? `Cenário ativo: ${SCENARIO_LABELS[state.scenario]} · Monitorizando ${sensorsOnline} agente(s) real(ais) de rede.`
                  : 'Aguardando que os Edge Agents se conectem. Execute o script de borda no terminal.'}
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
          value={state.isRunning ? `${(params?.confidence * 100 || 90).toFixed(0)}%` : '—'}
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

      {/* ---- Active Mesh Devices & IP Proximity Localization ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Connected Sensors Panel */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>🛜 Dispositivos Conectados (Mesh Network)</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sensorsOnline} ativos</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {state.sensorList && state.sensorList.length > 0 ? (
              state.sensorList.map((sensor: any) => (
                <div key={sensor.id} style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(2, 8, 23, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>📡</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{sensor.name}</div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{sensor.id}</div>
                      </div>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: 9 }}>ONLINE</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Endereço IP:</span>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: 2 }}>{sensor.ipAddress}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Uptime:</span>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: 2 }}>{sensor.uptimeSeconds}s</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>CPU:</span>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{sensor.cpuUsage?.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Memória:</span>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{sensor.memoryUsage?.toFixed(0)} MB</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Sem conexões de borda reais. Corra o mock-agent no terminal para conectar a telemetria.
              </div>
            )}
          </div>
        </div>

        {/* IP Proximity Card */}
        <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(0, 212, 255, 0.15)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📍 Localização IP (Proximidade)</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
            Como os endereços IP (Camada 3) não possuem coordenadas físicas nativas, o WGF SenseOS mapeia a subrede/IP de cada roteador/sensor a uma **Zona Física** específica (ex: Sala, Quarto).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>127.0.0.1 (Local)</span>
              <span style={{ fontWeight: 600 }}>Zona A (Sala)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>192.168.1.15</span>
              <span style={{ fontWeight: 600 }}>Zona B (Quarto)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>10.0.0.0/24</span>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Área Corporativa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
