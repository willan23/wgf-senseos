'use client';

import { useState } from 'react';

const DEMO_SENSORS = [
  { id: 'sensor_a', name: 'Sensor A — Sala', zone: 'Sala de Estar', status: 'online', type: 'Wi-Fi CSI (simulado)', mac: 'B4:E6:2D:AA:11:22', firmware: 'v0.1-sim', rssi: -52, lastSeen: Date.now() - 1000, x: 20, y: 20, isSimulated: true },
  { id: 'sensor_b', name: 'Sensor B — Quarto', zone: 'Quarto', status: 'online', type: 'Wi-Fi CSI (simulado)', mac: 'B4:E6:2D:AA:33:44', firmware: 'v0.1-sim', rssi: -61, lastSeen: Date.now() - 2000, x: 75, y: 65, isSimulated: true },
  { id: 'sensor_c', name: 'Sensor C — Corredor', zone: 'Corredor', status: 'offline', type: 'Wi-Fi CSI (simulado)', mac: 'B4:E6:2D:AA:55:66', firmware: 'v0.1-sim', rssi: null, lastSeen: Date.now() - 320000, x: 15, y: 65, isSimulated: true },
];

export default function SensorsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const sensor = DEMO_SENSORS.find(s => s.id === selected);

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>📡 Sensores</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão e monitorização dos sensores Wi-Fi do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="sim-mode-banner">⚡ SIMULADO</span>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>+ Adicionar Sensor</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Online', value: DEMO_SENSORS.filter(s => s.status === 'online').length, color: '#10d98a' },
          { label: 'Offline', value: DEMO_SENSORS.filter(s => s.status === 'offline').length, color: '#ef4444' },
          { label: 'Total', value: DEMO_SENSORS.length, color: '#00d4ff' },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div className="metric-label">{s.label}</div>
            <div className="metric-value" style={{ color: s.color, fontSize: 28 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 20 }}>

        {/* Table */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Nome</th>
                <th>Zona</th>
                <th>RSSI</th>
                <th>Último Heartbeat</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_SENSORS.map(s => (
                <tr key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)}
                  style={{ cursor: 'pointer', background: selected === s.id ? 'rgba(0,212,255,0.05)' : undefined }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`status-dot ${s.status}`} />
                      <span style={{ fontSize: 12, color: s.status === 'online' ? 'var(--status-online)' : 'var(--status-offline)', fontWeight: 600 }}>
                        {s.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                  <td>{s.zone}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {s.rssi !== null ? `${s.rssi} dBm` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {s.status === 'online'
                      ? new Date(s.lastSeen).toLocaleTimeString('pt-PT')
                      : `há ${Math.round((Date.now() - s.lastSeen) / 60000)}m`}
                  </td>
                  <td><span className="badge badge-sim">Simulado</span></td>
                  <td>
                    <button onClick={e => { e.stopPropagation(); setSelected(selected === s.id ? null : s.id); }}
                      className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>
                      {selected === s.id ? 'Fechar' : 'Ver detalhes'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {sensor && (
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>{sensor.name}</h2>
              <span className={`status-dot ${sensor.status}`} />
            </div>
            <div className="divider" />
            {[
              { label: 'ID', value: sensor.id },
              { label: 'MAC Address', value: sensor.mac },
              { label: 'Firmware', value: sensor.firmware },
              { label: 'Tipo', value: sensor.type },
              { label: 'Zona', value: sensor.zone },
              { label: 'Posição', value: `X:${sensor.x}% Y:${sensor.y}%` },
              { label: 'RSSI', value: sensor.rssi !== null ? `${sensor.rssi} dBm` : 'Sem sinal' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{item.value}</div>
              </div>
            ))}
            <div className="divider" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}>
                🔄 Reiniciar
              </button>
              <button className="btn-danger" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}>
                🗑 Remover
              </button>
            </div>
            <div style={{
              padding: 10, borderRadius: 8,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: 11, color: '#f59e0b', lineHeight: 1.5,
            }}>
              ⚡ <strong>Modo Simulado:</strong> Este sensor gera dados sintéticos de CSI. Para integrar hardware real, instala o Edge Agent num router OpenWrt compatível.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
