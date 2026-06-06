'use client';

import { useState, useEffect } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { SimulationScenario } from '@/types';
import { SCENARIOS } from '@/lib/csi-simulator';

interface MapPerson {
  id: string;
  x: number;
  y: number;
  type: 'known' | 'unknown' | 'fall';
  label: string;
  trail: { x: number; y: number }[];
}

interface MapSensor {
  id: string;
  name: string;
  x: number;
  y: number;
  status: 'online' | 'offline';
}

interface MapZone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  color: string;
}

const DEMO_ZONES: MapZone[] = [
  { id: 'z1', name: 'Sala', x: 5, y: 5, w: 40, h: 50, type: 'room', color: 'rgba(0,212,255,0.08)' },
  { id: 'z2', name: 'Cozinha', x: 50, y: 5, w: 45, h: 30, type: 'room', color: 'rgba(16,217,138,0.08)' },
  { id: 'z3', name: 'Corredor', x: 5, y: 60, w: 30, h: 20, type: 'corridor', color: 'rgba(124,58,237,0.08)' },
  { id: 'z4', name: 'Quarto', x: 50, y: 40, w: 45, h: 55, type: 'bedroom', color: 'rgba(245,158,11,0.08)' },
];

const DEMO_SENSORS: MapSensor[] = [
  { id: 's1', name: 'Sensor A', x: 20, y: 20, status: 'online' },
  { id: 's2', name: 'Sensor B', x: 75, y: 65, status: 'online' },
];

export default function MapPage() {
  const { state, start, stop, changeScenario, SCENARIO_LABELS } = useSimulation();
  const [persons, setPersons] = useState<MapPerson[]>([]);
  const [hoverZone, setHoverZone] = useState<string | null>(null);

  useEffect(() => {
    if (!state.isRunning || state.occupancy === 0) {
      setPersons([]);
      return;
    }

    const params = SCENARIOS[state.scenario];
    const newPersons: MapPerson[] = [];
    const baseX = state.location.x;
    const baseY = state.location.y;

    for (let i = 0; i < state.occupancy; i++) {
      const offset = i * 8;
      const x = Math.max(5, Math.min(95, baseX + offset));
      const y = Math.max(5, Math.min(95, baseY + (i % 2 === 0 ? 0 : 5)));
      const type: 'known' | 'unknown' | 'fall' = params.hasUnknown && i === 0 ? 'unknown' : params.hasFall && i === 0 ? 'fall' : 'known';

      setPersons(prev => {
        const existing = prev.find(p => p.id === `p${i}`);
        const trail = existing ? [...existing.trail.slice(-8), { x: existing.x, y: existing.y }] : [];
        return [
          ...prev.filter(p => p.id !== `p${i}`),
          {
            id: `p${i}`,
            x, y, type,
            label: type === 'unknown' ? 'Desconhecido' : type === 'fall' ? '⚠️ Queda' : `Pessoa ${i + 1}`,
            trail,
          }
        ].filter(p => parseInt(p.id.slice(1)) < state.occupancy);
      });
    }
  }, [state.location, state.occupancy, state.isRunning, state.scenario]);

  useEffect(() => {
    if (!state.isRunning) setPersons([]);
  }, [state.isRunning]);

  const personColor = (type: MapPerson['type']) =>
    type === 'unknown' ? '#ef4444' : type === 'fall' ? '#f59e0b' : '#00d4ff';

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>🗺️ Mapa Indoor</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Localização em tempo real das pessoas detetadas · Planta 2D simulada</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="sim-mode-banner">⚡ SIMULADO</span>
          {state.isRunning ? (
            <button onClick={stop} className="btn-danger" style={{ padding: '8px 16px', fontSize: 13 }}>⏹ Parar</button>
          ) : (
            <button onClick={() => start()} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>▶ Iniciar</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, alignItems: 'start' }}>

        {/* Map canvas */}
        <div className="glass-card" style={{ padding: 16, aspectRatio: '16/10', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>

            {/* Grid */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <g key={i}>
                  <line x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" stroke="#00d4ff" strokeWidth="0.5" />
                  <line x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`} stroke="#00d4ff" strokeWidth="0.5" />
                </g>
              ))}
            </svg>

            {/* Zones */}
            {DEMO_ZONES.map(zone => (
              <div
                key={zone.id}
                onMouseEnter={() => setHoverZone(zone.id)}
                onMouseLeave={() => setHoverZone(null)}
                style={{
                  position: 'absolute',
                  left: `${zone.x}%`, top: `${zone.y}%`,
                  width: `${zone.w}%`, height: `${zone.h}%`,
                  background: hoverZone === zone.id ? zone.color.replace('0.08', '0.15') : zone.color,
                  border: `1px solid ${zone.color.replace('0.08', '0.4')}`,
                  borderRadius: 4, transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'flex-start', padding: 6,
                }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                  {zone.name}
                </span>
              </div>
            ))}

            {/* Sensor beams (animated) */}
            {state.isRunning && DEMO_SENSORS.map(sensor => (
              <div key={sensor.id}>
                <div style={{
                  position: 'absolute',
                  left: `${sensor.x}%`, top: `${sensor.y}%`,
                  width: 80, height: 80,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
                  animation: 'sim-pulse 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              </div>
            ))}

            {/* Sensors */}
            {DEMO_SENSORS.map(sensor => (
              <div key={sensor.id} style={{
                position: 'absolute',
                left: `${sensor.x}%`, top: `${sensor.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: state.isRunning ? 'var(--status-online)' : 'var(--status-offline)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, boxShadow: state.isRunning ? '0 0 12px var(--status-online)' : 'none',
                }} title={sensor.name}>📡</div>
              </div>
            ))}

            {/* Trails */}
            {persons.map(person => person.trail.length > 1 && (
              <svg key={`trail-${person.id}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <polyline
                  points={person.trail.map(p => `${p.x}%,${p.y}%`).join(' ')}
                  fill="none"
                  stroke={personColor(person.type)}
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                  strokeDasharray="3,3"
                />
              </svg>
            ))}

            {/* Persons */}
            {persons.map(person => (
              <div key={person.id} style={{
                position: 'absolute',
                left: `${person.x}%`, top: `${person.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20, transition: 'left 0.5s ease, top 0.5s ease',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: personColor(person.type) + '22',
                  border: `2px solid ${personColor(person.type)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, boxShadow: `0 0 12px ${personColor(person.type)}66`,
                  animation: 'sim-pulse 2s ease-in-out infinite',
                }}>
                  {person.type === 'unknown' ? '❓' : person.type === 'fall' ? '⚠️' : '👤'}
                </div>
                <div style={{
                  position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(2,8,23,0.9)', padding: '2px 6px', borderRadius: 4,
                  fontSize: 9, color: personColor(person.type), whiteSpace: 'nowrap',
                  border: `1px solid ${personColor(person.type)}44`,
                }}>
                  {person.label}
                </div>
              </div>
            ))}

            {/* Empty state */}
            {!state.isRunning && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
                color: 'var(--text-muted)',
              }}>
                <span style={{ fontSize: 32 }}>🗺️</span>
                <span style={{ fontSize: 13 }}>Inicia a simulação para ver localização em tempo real</span>
              </div>
            )}
          </div>
        </div>

        {/* Legend & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Legenda</h3>
            {[
              { icon: '👤', color: '#00d4ff', label: 'Pessoa Conhecida' },
              { icon: '❓', color: '#ef4444', label: 'Desconhecido / Intruso' },
              { icon: '⚠️', color: '#f59e0b', label: 'Possível Queda' },
              { icon: '📡', color: '#10d98a', label: 'Sensor Wi-Fi' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: item.color + '22', border: `1px solid ${item.color}66`, fontSize: 11,
                }}>{item.icon}</div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Cenário Ativo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.entries(SCENARIO_LABELS) as [SimulationScenario, string][]).map(([key, label]) => (
                <button key={key} onClick={() => { changeScenario(key); if (!state.isRunning) start(key); }}
                  style={{
                    padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: state.scenario === key ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.02)',
                    color: state.scenario === key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 600, textAlign: 'left',
                    borderLeft: state.scenario === key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {state.isRunning && persons.length > 0 && (
            <div className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Posições</h3>
              {persons.map(p => (
                <div key={p.id} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span style={{ color: personColor(p.type) }}>{p.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 6, color: 'var(--text-muted)' }}>
                    X:{p.x.toFixed(0)}% Y:{p.y.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
