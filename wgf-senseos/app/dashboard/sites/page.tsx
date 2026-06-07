'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import type { Site } from '@uwsc/core/types';

export default function SitesPage() {
  const { senseUser } = useAuth();
  const organizationId = senseUser?.organizationId || 'org_demo';

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteWidth, setSiteWidth] = useState(10);
  const [siteHeight, setSiteHeight] = useState(10);

  // Fetch sites from Firestore
  useEffect(() => {
    if (!db || !organizationId) return;

    const q = query(collection(db, 'sites'), where('organizationId', '==', organizationId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Site[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Site);
      });
      setSites(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching sites:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organizationId]);

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !organizationId || !siteName) return;

    try {
      const { getDoc } = await import('firebase/firestore');
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      let maxSites = 1;
      if (orgDoc.exists()) {
        maxSites = orgDoc.data().maxSites ?? 1;
      }

      if (sites.length >= maxSites) {
        const { toast } = await import('react-hot-toast');
        toast.error(`Limite do plano atingido! O seu plano atual permite no máximo ${maxSites} site(s). Por favor, efetue o upgrade no painel de Faturação.`);
        return;
      }

      const siteId = `site_${Math.random().toString(36).substring(2, 9)}`;
      const newSite: Site = {
        id: siteId,
        organizationId,
        name: siteName,
        address: siteAddress || 'Sem morada',
        widthMeters: Number(siteWidth),
        heightMeters: Number(siteHeight),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, 'sites', siteId), newSite);
      setShowAddModal(false);
      setSiteName('');
      setSiteAddress('');
      setSiteWidth(10);
      setSiteHeight(10);
      const { toast } = await import('react-hot-toast');
      toast.success('Site criado com sucesso!');
    } catch (err) {
      console.error("Error saving site:", err);
      const { toast } = await import('react-hot-toast');
      toast.error('Erro ao criar o site.');
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!db) return;
    if (!confirm('Tens a certeza que desejas remover este site? Todos os sensores associados perderão o vínculo.')) return;
    try {
      await deleteDoc(doc(db, 'sites', siteId));
    } catch (err) {
      console.error("Error deleting site:", err);
    }
  };

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>🏢 Sites</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão de localizações e plantas de espaços monitorados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>+ Novo Site</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {sites.map(site => (
            <div key={site.id} className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{site.name}</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{site.address}</div>
                </div>
                <span className="badge badge-green">Ativo</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Largura', value: `${site.widthMeters}m`, icon: '↔️' },
                  { label: 'Comprimento', value: `${site.heightMeters}m`, icon: '↕️' },
                  { label: 'Área', value: `${site.widthMeters * site.heightMeters}m²`, icon: '📐' },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => window.location.href = '/dashboard/map'} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}>Ver Mapa</button>
                <button onClick={() => handleDeleteSite(site.id)} className="btn-danger" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}>Remover</button>
              </div>
            </div>
          ))}

          {/* Add site CTA */}
          <div onClick={() => setShowAddModal(true)} className="glass-card" style={{
            padding: 24, border: '2px dashed var(--border-card)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12, minHeight: 200, cursor: 'pointer', opacity: 0.6,
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.6'}>
            <div style={{ fontSize: 36 }}>+</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>Adicionar Novo Site</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Configura um novo espaço com zonas, sensores e mapa 2D
            </div>
          </div>
        </div>
      )}

      {/* Add Site Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: 400, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>🏢 Criar Novo Site</h2>
            <form onSubmit={handleAddSite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nome do Espaço</label>
                <input required type="text" className="input-field" value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="ex: Escritório Principal" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Morada / Endereço</label>
                <input type="text" className="input-field" value={siteAddress} onChange={e => setSiteAddress(e.target.value)} placeholder="Rua das Flores 123" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Largura (metros)</label>
                  <input required type="number" min="1" className="input-field" value={siteWidth} onChange={e => setSiteWidth(Number(e.target.value))} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Comprimento (m)</label>
                  <input required type="number" min="1" className="input-field" value={siteHeight} onChange={e => setSiteHeight(Number(e.target.value))} />
                </div>
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
