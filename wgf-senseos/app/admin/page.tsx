'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import type { Organization, Sensor } from '@uwsc/core/types';

const PLANS = [
  { id: 'free_demo', name: 'Free Demo', price: 0, orgs: 3, sensors: 2, events: 5000 },
  { id: 'residential', name: 'Residential', price: 29, orgs: 1, sensors: 10, events: 50000 },
  { id: 'business', name: 'Business', price: 99, orgs: 5, sensors: 50, events: 500000 },
  { id: 'enterprise', name: 'Enterprise', price: 0, orgs: 999, sensors: 9999, events: 9999999 },
];

export default function AdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sensorsCount, setSensorsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    // Load real organizations
    const qOrg = query(collection(db, 'organizations'));
    const unsubscribeOrg = onSnapshot(qOrg, (snapshot) => {
      const list: Organization[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Organization);
      });
      setOrganizations(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading organizations:", err);
      setLoading(false);
    });

    // Load total sensors count
    const qSensors = query(collection(db, 'sensors'));
    const unsubscribeSensors = onSnapshot(qSensors, (snapshot) => {
      setSensorsCount(snapshot.size);
    });

    return () => {
      unsubscribeOrg();
      unsubscribeSensors();
    };
  }, []);

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>📊 Painel Admin SaaS</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão global de organizações, utilizadores, planos e métricas em produção</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Organizações', value: organizations.length, icon: '🏢', color: '#00d4ff' },
          { label: 'Sensores Ativos', value: sensorsCount, icon: '📡', color: '#10d98a' },
          { label: 'MRR (€)', value: organizations.reduce((acc, o) => {
            const p = PLANS.find(pl => pl.id === o.plan);
            return acc + (p?.price || 0);
          }, 0), icon: '💰', color: '#00d4ff' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span className="metric-label">{m.label}</span>
            </div>
            <div className="metric-value" style={{ color: m.color, fontSize: 26 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Organizations table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>🏢 Organizações Registadas (Firestore Real)</h2>
        </div>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Plano</th>
                <th>Sensores Máx</th>
                <th>Sites Máx</th>
                <th>Criado Em</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map(org => (
                <tr key={org.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{org.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org.name}</td>
                  <td><span className="badge badge-violet">{org.plan}</span></td>
                  <td>{org.maxSensors}</td>
                  <td>{org.maxSites}</td>
                  <td style={{ fontSize: 11 }}>{new Date(org.createdAt).toLocaleDateString('pt-PT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Plans */}
      <div className="glass-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>💳 Planos de Billing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              padding: 16, borderRadius: 8, background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-primary)', marginBottom: 8 }}>
                {plan.price === 0 ? 'Grátis' : `€${plan.price}/mês`}
              </div>
              {[
                { label: 'Sensores', value: plan.sensors === 9999 ? '∞' : plan.sensors },
                { label: 'Eventos/mês', value: plan.events === 9999999 ? '∞' : plan.events.toLocaleString() },
              ].map(m => (
                <div key={m.label} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  {m.label}: <strong style={{ color: 'var(--text-primary)' }}>{m.value}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
