'use client';

export default function SitesPage() {
  const DEMO_SITES = [
    { id: 'site_demo_01', name: 'Casa Principal', address: 'Rua das Flores 123, Lisboa', zones: 4, sensors: 3, mode: 'Residencial', status: 'active' },
    { id: 'site_demo_02', name: 'Loja Centro', address: 'Av. da Liberdade 500, Lisboa', zones: 6, sensors: 8, mode: 'Corporativo', status: 'active' },
  ];

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>🏢 Sites</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão de localizações e plantas de espaços monitorados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="sim-mode-banner">⚡ SIMULADO</span>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>+ Novo Site</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {DEMO_SITES.map(site => (
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
                { label: 'Zonas', value: site.zones, icon: '🗺️' },
                { label: 'Sensores', value: site.sensors, icon: '📡' },
                { label: 'Modo', value: site.mode, icon: site.mode === 'Residencial' ? '🏠' : '🏢' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}>Ver Mapa</button>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px' }}>Configurar</button>
            </div>
          </div>
        ))}

        {/* Add site CTA */}
        <div className="glass-card" style={{
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
    </div>
  );
}
