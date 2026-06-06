'use client';

import { useState } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { Alert, AlertSeverity, AlertType } from '@/types';

const DEMO_BASE_ALERTS: Alert[] = [
  {
    id: 'a_demo_1',
    organizationId: 'org_demo',
    siteId: 'site_demo_01',
    type: 'sensor_offline' as AlertType,
    severity: 'medium' as AlertSeverity,
    status: 'open',
    title: 'Sensor C offline',
    description: 'O sensor Wi-Fi na zona do corredor não responde há mais de 5 minutos.',
    timestamp: Date.now() - 300000,
    isSimulated: true,
  },
  {
    id: 'a_demo_2',
    organizationId: 'org_demo',
    siteId: 'site_demo_01',
    type: 'occupancy_exceeded' as AlertType,
    severity: 'low' as AlertSeverity,
    status: 'acknowledged',
    title: 'Ocupação máxima atingida na Sala de Reuniões',
    description: 'Foram detetadas 8 pessoas. O limite configurado é 6.',
    timestamp: Date.now() - 1800000,
    acknowledgedAt: Date.now() - 1500000,
    isSimulated: true,
  },
  {
    id: 'a_demo_3',
    organizationId: 'org_demo',
    siteId: 'site_demo_01',
    type: 'signal_anomaly' as AlertType,
    severity: 'low' as AlertSeverity,
    status: 'resolved',
    title: 'Anomalia de sinal detetada',
    description: 'Interferência incomum no espectro de subportadoras. Possível dispositivo Bluetooth próximo.',
    timestamp: Date.now() - 7200000,
    resolvedAt: Date.now() - 6900000,
    isSimulated: true,
  },
];

const severityColor = (s: AlertSeverity) => ({
  low: '#3b82f6', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
}[s]);

const typeIcon = (t: AlertType) => ({
  unknown_presence: '❓',
  fall_detected: '🫸',
  sensor_offline: '📡',
  occupancy_exceeded: '👥',
  restricted_zone: '🚫',
  signal_anomaly: '📶',
  rf_spoofing_attempt: '🛡️',
}[t] || '⚠️');

const statusLabel = { open: 'Aberto', acknowledged: 'Reconhecido', resolved: 'Resolvido' };

export default function AlertsPage() {
  const { state, start, stop } = useSimulation();
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const allAlerts: Alert[] = [
    ...DEMO_BASE_ALERTS,
    ...state.alerts,
  ];

  const displayed = allAlerts
    .map(a => {
      if (resolved.has(a.id)) return { ...a, status: 'resolved' as const };
      if (acknowledged.has(a.id)) return { ...a, status: 'acknowledged' as const };
      return a;
    })
    .filter(a => filter === 'all' || a.status === filter)
    .sort((a, b) => b.timestamp - a.timestamp);

  const openCount = allAlerts.filter(a => !resolved.has(a.id) && !acknowledged.has(a.id) && a.status === 'open').length;
  const criticalCount = displayed.filter(a => a.severity === 'critical').length;

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
            🚨 Alertas
            {openCount > 0 && (
              <span style={{
                marginLeft: 10, background: '#ef4444', color: '#fff',
                borderRadius: 9999, padding: '2px 10px', fontSize: 13, fontWeight: 700,
              }}>{openCount}</span>
            )}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão de alertas de segurança e sistema</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="sim-mode-banner">⚡ SIMULADO</span>
          {state.isRunning
            ? <button onClick={stop} className="btn-danger" style={{ padding: '8px 16px', fontSize: 13 }}>⏹ Parar</button>
            : <button onClick={() => start()} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>▶ Iniciar</button>}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Abertos', value: openCount, color: '#ef4444' },
          { label: 'Críticos', value: criticalCount, color: '#ef4444' },
          { label: 'Reconhecidos', value: allAlerts.filter(a => a.status === 'acknowledged' || acknowledged.has(a.id)).length, color: '#f59e0b' },
          { label: 'Resolvidos', value: allAlerts.filter(a => a.status === 'resolved' || resolved.has(a.id)).length, color: '#10d98a' },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div className="metric-label">{s.label}</div>
            <div className="metric-value" style={{ color: s.color, fontSize: 28 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 8, padding: 4, alignSelf: 'flex-start', border: '1px solid var(--border-card)' }}>
        {(['all', 'open', 'acknowledged', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: filter === f ? 'rgba(0,212,255,0.15)' : 'transparent',
            color: filter === f ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s ease',
          }}>
            {f === 'all' ? 'Todos' : statusLabel[f]}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayed.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 14 }}>Nenhum alerta nesta categoria</div>
          </div>
        ) : displayed.map(alert => {
          const isResolved = alert.status === 'resolved';
          const isAcknowledged = alert.status === 'acknowledged';
          const border = isResolved ? 'rgba(16,217,138,0.2)' :
            isAcknowledged ? 'rgba(245,158,11,0.2)' :
              severityColor(alert.severity) + '44';

          return (
            <div key={alert.id} className="glass-card" style={{ padding: 20, borderColor: border, opacity: isResolved ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', gap: 14, flex: 1 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: severityColor(alert.severity) + '18',
                    border: `1px solid ${severityColor(alert.severity)}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{typeIcon(alert.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{alert.title}</h3>
                      <span className={`badge ${alert.severity === 'critical' ? 'badge-red' : alert.severity === 'high' ? 'badge-red' : alert.severity === 'medium' ? 'badge-yellow' : 'badge-cyan'}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      {alert.isSimulated && <span className="badge badge-sim">SIMULADO</span>}
                      <span className={`badge ${isResolved ? 'badge-green' : isAcknowledged ? 'badge-yellow' : 'badge-red'}`}>
                        {statusLabel[alert.status]}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{alert.description}</p>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                      <span>🕐 {new Date(alert.timestamp).toLocaleString('pt-PT')}</span>
                      {alert.acknowledgedAt && <span>✔ Reconhecido: {new Date(alert.acknowledgedAt).toLocaleTimeString('pt-PT')}</span>}
                      {alert.resolvedAt && <span>✅ Resolvido: {new Date(alert.resolvedAt).toLocaleTimeString('pt-PT')}</span>}
                    </div>
                  </div>
                </div>

                {!isResolved && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!isAcknowledged && (
                      <button onClick={() => setAcknowledged(prev => new Set([...prev, alert.id]))}
                        className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                        ✔ Reconhecer
                      </button>
                    )}
                    <button onClick={() => setResolved(prev => new Set([...prev, alert.id]))}
                      className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      ✅ Resolver
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
