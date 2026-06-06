'use client';

import { useState, useEffect } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { SCENARIOS } from '@/lib/csi-simulator';

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  const hue = 240 - ratio * 240; // blue → red
  return (
    <div style={{
      width: '100%', paddingBottom: '100%', position: 'relative', borderRadius: 4,
      background: `hsla(${hue}, 80%, ${30 + ratio * 30}%, ${0.2 + ratio * 0.7})`,
      transition: 'all 0.5s ease',
    }} />
  );
}

export default function AnalyticsPage() {
  const { state, start, stop } = useSimulation();
  const [heatmap, setHeatmap] = useState<number[][]>(Array.from({ length: 6 }, () => Array(8).fill(0)));
  const [hourlyData, setHourlyData] = useState<number[]>(Array(24).fill(0).map((_, i) =>
    i >= 8 && i <= 18 ? Math.floor(Math.random() * 8) + 1 : Math.floor(Math.random() * 2)
  ));

  useEffect(() => {
    if (!state.isRunning || !state.location) return;
    const col = Math.floor((state.location.x / 100) * 8);
    const row = Math.floor((state.location.y / 100) * 6);
    if (col >= 0 && col < 8 && row >= 0 && row < 6) {
      setHeatmap(prev => {
        const next = prev.map(r => [...r]);
        next[row][col] = Math.min(20, next[row][col] + state.occupancy);
        return next;
      });
    }
  }, [state.location, state.occupancy, state.isRunning]);

  const heatmapMax = Math.max(...heatmap.flat(), 1);
  const totalDetections = state.detections.length;
  const avgOccupancy = totalDetections > 0
    ? (state.detections.reduce((a, d) => a + d.personCount, 0) / totalDetections).toFixed(1)
    : '0';
  const peakHour = hourlyData.indexOf(Math.max(...hourlyData));

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>📈 Analytics</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Mapa de calor, ocupação temporal e métricas de fluxo · Dados simulados</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="sim-mode-banner">⚡ SIMULADO</span>
          {state.isRunning
            ? <button onClick={stop} className="btn-danger" style={{ padding: '8px 16px', fontSize: 13 }}>⏹ Parar</button>
            : <button onClick={() => start()} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>▶ Iniciar</button>}
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total de Deteções', value: totalDetections, icon: '👁️', color: '#00d4ff' },
          { label: 'Média de Ocupação', value: avgOccupancy, icon: '👥', color: '#7c3aed' },
          { label: 'Pico de Hora', value: `${peakHour}:00`, icon: '🕐', color: '#10d98a' },
          { label: 'Frames Analisados', value: state.frames.length, icon: '📡', color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <span className="metric-label">{m.label}</span>
            </div>
            <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Heatmap */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>🔥 Mapa de Calor — Fluxo de Pessoas</h2>
            <span className="badge badge-sim">SIMULADO</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
            {heatmap.flat().map((v, i) => (
              <HeatmapCell key={i} value={v} max={heatmapMax} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Baixo</span>
            <div style={{
              flex: 1, height: 6, borderRadius: 9999,
              background: 'linear-gradient(to right, hsla(240,80%,40%,0.3), hsla(0,80%,50%,0.8))',
            }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Alto</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Inicia a simulação para ver o mapa de calor a ser construído em tempo real
          </p>
        </div>

        {/* Hourly occupancy chart */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>⏰ Ocupação por Hora</h2>
            <span className="badge badge-sim">SIMULADO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
            {hourlyData.map((v, i) => {
              const max = Math.max(...hourlyData, 1);
              const isNow = i === new Date().getHours();
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: '100%', borderRadius: '2px 2px 0 0',
                    height: `${(v / max) * 100}%`, minHeight: 2,
                    background: isNow ? '#00d4ff' : 'rgba(0,212,255,0.35)',
                    boxShadow: isNow ? '0 0 8px rgba(0,212,255,0.6)' : 'none',
                    transition: 'height 0.4s ease',
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['0h', '6h', '12h', '18h', '23h'].map(t => (
              <span key={t} style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Detection log table */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>📋 Log de Deteções</h2>
          <button
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => {
              const csv = 'timestamp,type,persons,x,y,confidence,simulated\n' +
                state.detections.map(d =>
                  `${new Date(d.timestamp).toISOString()},${d.type},${d.personCount},${d.locationX?.toFixed(1)},${d.locationY?.toFixed(1)},${d.confidenceScore.toFixed(2)},true`
                ).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'senseos_detections.csv'; a.click();
            }}>
            ⬇ Exportar CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Tipo</th>
                <th>Pessoas</th>
                <th>Localização</th>
                <th>Confiança</th>
                <th>Hash Privado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.detections.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                  Sem dados — inicia a simulação
                </td></tr>
              ) : [...state.detections].reverse().slice(0, 20).map(d => (
                <tr key={d.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{new Date(d.timestamp).toLocaleTimeString('pt-PT')}</td>
                  <td>
                    <span className={`badge ${d.type === 'fall' ? 'badge-red' : d.type === 'unknown_person' ? 'badge-yellow' : 'badge-cyan'}`}>
                      {d.type}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{d.personCount}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {d.locationX?.toFixed(0)}%, {d.locationY?.toFixed(0)}%
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ height: 4, width: 50, background: 'rgba(255,255,255,0.08)', borderRadius: 9999 }}>
                        <div style={{ height: '100%', width: `${d.confidenceScore * 100}%`, background: '#00d4ff', borderRadius: 9999 }} />
                      </div>
                      <span style={{ fontSize: 11 }}>{(d.confidenceScore * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    {d.privacyHash || '—'}
                  </td>
                  <td><span className="badge badge-sim">SIMULADO</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
