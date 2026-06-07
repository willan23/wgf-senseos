'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import type { Alert, AlertSeverity, AlertType } from '@uwsc/core/types';

const severityColor = (s: AlertSeverity) => ({
  low: '#3b82f6', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
}[s] || '#3b82f6');

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
  const { senseUser } = useAuth();
  const organizationId = senseUser?.organizationId || 'org_demo';

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');

  // Fetch alerts from Firestore
  useEffect(() => {
    if (!db || !organizationId) return;

    // Use ordering by timestamp descending
    const q = query(
      collection(db, 'alerts'),
      where('organizationId', '==', organizationId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Alert[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Alert);
      });
      // Sort in memory to avoid index requirements initially
      list.sort((a, b) => b.timestamp - a.timestamp);
      setAlerts(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching alerts:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organizationId]);

  const handleAcknowledge = async (alertId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'alerts', alertId), {
        status: 'acknowledged',
        acknowledgedAt: Date.now(),
      });
    } catch (err) {
      console.error("Error acknowledging alert:", err);
    }
  };

  const handleResolve = async (alertId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'alerts', alertId), {
        status: 'resolved',
        resolvedAt: Date.now(),
      });
    } catch (err) {
      console.error("Error resolving alert:", err);
    }
  };

  const displayed = alerts
    .filter(a => filter === 'all' || a.status === filter);

  const openCount = alerts.filter(a => a.status === 'open').length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;

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
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Abertos', value: openCount, color: '#ef4444' },
          { label: 'Críticos', value: criticalCount, color: '#ef4444' },
          { label: 'Reconhecidos', value: alerts.filter(a => a.status === 'acknowledged').length, color: '#f59e0b' },
          { label: 'Resolvidos', value: alerts.filter(a => a.status === 'resolved').length, color: '#10d98a' },
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
      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : (
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
                        <button onClick={() => handleAcknowledge(alert.id)}
                          className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                          ✔ Reconhecer
                        </button>
                      )}
                      <button onClick={() => handleResolve(alert.id)}
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
      )}
    </div>
  );
}
