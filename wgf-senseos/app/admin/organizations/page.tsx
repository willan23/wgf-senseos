'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, setDoc, doc } from 'firebase/firestore';
import type { Organization } from '@uwsc/core/types';

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgPlan, setOrgPlan] = useState<'free_demo' | 'residential' | 'business' | 'enterprise'>('free_demo');

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

  const handleAddOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !orgName) return;

    const orgId = `org_${Math.random().toString(36).substring(2, 9)}`;
    const newOrg: Organization = {
      id: orgId,
      name: orgName,
      plan: orgPlan,
      mode: orgPlan === 'residential' ? 'residential' : 'corporate',
      ownerId: 'superadmin',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maxSensors: orgPlan === 'free_demo' ? 2 : orgPlan === 'residential' ? 10 : orgPlan === 'business' ? 50 : 9999,
      maxSites: orgPlan === 'free_demo' ? 1 : orgPlan === 'residential' ? 2 : orgPlan === 'business' ? 10 : 999,
      monthlyEventsProcessed: 0,
      isSimulationMode: false,
      timezone: 'UTC',
      country: 'PT',
    };

    try {
      await setDoc(doc(db, 'organizations', orgId), newOrg);
      setShowAddModal(false);
      setOrgName('');
    } catch (err) {
      console.error("Error creating organization:", err);
    }
  };

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>🏢 Organizações</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão e licenciamento de organizações multi-tenant</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>+ Nova Organização</button>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
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
                <th>Sensores Limite</th>
                <th>Sites Limite</th>
                <th>Criado Em</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map(org => (
                <tr key={org.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{org.id}</td>
                  <td style={{ fontWeight: 600 }}>{org.name}</td>
                  <td><span className="badge badge-cyan">{org.plan}</span></td>
                  <td>{org.maxSensors}</td>
                  <td>{org.maxSites}</td>
                  <td>{new Date(org.createdAt).toLocaleDateString('pt-PT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: 400, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>🏢 Criar Organização</h2>
            <form onSubmit={handleAddOrg} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nome da Organização</label>
                <input required type="text" className="input-field" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="ex: ACME Corp" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Plano</label>
                <select className="input-field" value={orgPlan} onChange={e => setOrgPlan(e.target.value as any)}>
                  <option value="free_demo">Free Demo</option>
                  <option value="residential">Residential</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, padding: 8 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: 8 }}>Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
