'use client';

const PLANS = [
  { id: 'free_demo', name: 'Free Demo', price: 0, orgs: 3, sensors: 2, events: 5000 },
  { id: 'residential', name: 'Residential', price: 29, orgs: 1, sensors: 10, events: 50000 },
  { id: 'business', name: 'Business', price: 99, orgs: 5, sensors: 50, events: 500000 },
  { id: 'enterprise', name: 'Enterprise', price: 0, orgs: 999, sensors: 9999, events: 9999999 },
];

const DEMO_ORGS = [
  { id: 'org_demo', name: 'Demo Organization', plan: 'free_demo', users: 1, sensors: 2, events: 127, status: 'active', createdAt: Date.now() - 86400000 },
  { id: 'org_acme', name: 'ACME Corp', plan: 'business', users: 5, sensors: 23, events: 48200, status: 'active', createdAt: Date.now() - 7 * 86400000 },
  { id: 'org_home', name: 'Family Home', plan: 'residential', users: 2, sensors: 4, events: 3100, status: 'active', createdAt: Date.now() - 3 * 86400000 },
];

export default function AdminPage() {
  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>📊 Painel Admin SaaS</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão global de organizações, utilizadores, planos e métricas</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Organizações', value: 3, icon: '🏢', color: '#00d4ff' },
          { label: 'Utilizadores', value: 8, icon: '👥', color: '#7c3aed' },
          { label: 'Sensores Ativos', value: 29, icon: '📡', color: '#10d98a' },
          { label: 'Eventos/mês', value: '51.4K', icon: '⚡', color: '#f59e0b' },
          { label: 'MRR (€)', value: '128', icon: '💰', color: '#00d4ff' },
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
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>🏢 Organizações</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Plano</th>
              <th>Utilizadores</th>
              <th>Sensores</th>
              <th>Eventos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_ORGS.map(org => (
              <tr key={org.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{org.id}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org.name}</td>
                <td><span className="badge badge-violet">{org.plan}</span></td>
                <td>{org.users}</td>
                <td>{org.sensors}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{org.events.toLocaleString()}</td>
                <td><span className="badge badge-green">Ativo</span></td>
              </tr>
            ))}
          </tbody>
        </table>
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
                { label: 'Eventos', value: plan.events === 9999999 ? '∞' : plan.events.toLocaleString() },
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
