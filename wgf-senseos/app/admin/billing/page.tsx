'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import type { Organization } from '@uwsc/core/types';

const PLANS = [
  { id: 'free_demo', name: 'Free Demo', price: 0 },
  { id: 'residential', name: 'Residential', price: 29 },
  { id: 'business', name: 'Business', price: 99 },
  { id: 'enterprise', name: 'Enterprise', price: 0 },
];

export default function AdminBillingPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'organizations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Organization[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Organization);
      });
      setOrgs(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalMRR = orgs.reduce((acc, o) => {
    const p = PLANS.find(pl => pl.id === o.plan);
    return acc + (p?.price || 0);
  }, 0);

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>💳 Gestão de Faturação (Billing)</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Faturação global, subscrições ativas e receita MRR</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'MRR Ativo', value: `€${totalMRR}`, color: '#00d4ff' },
          { label: 'Subscrições Pagas', value: orgs.filter(o => o.plan === 'residential' || o.plan === 'business').length, color: '#10d98a' },
          { label: 'Subscrições Demo', value: orgs.filter(o => o.plan === 'free_demo').length, color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: 28 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>💳 Histórico de Transações e Planos</h2>
        </div>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Org</th>
                <th>Nome</th>
                <th>Plano Ativo</th>
                <th>Valor Mensal</th>
                <th>Estado de Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map(org => {
                const planDetails = PLANS.find(p => p.id === org.plan);
                const price = planDetails ? planDetails.price : 0;
                return (
                  <tr key={org.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{org.id}</td>
                    <td style={{ fontWeight: 600 }}>{org.name}</td>
                    <td><span className="badge badge-cyan">{org.plan}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>€{price}/mês</td>
                    <td>
                      <span className={`badge ${price > 0 ? 'badge-green' : 'badge-yellow'}`}>
                        {price > 0 ? 'Pago' : 'Demo / Isento'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
