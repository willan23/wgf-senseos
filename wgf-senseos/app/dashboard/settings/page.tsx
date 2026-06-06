'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, senseUser } = useAuth();

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>⚙️ Definições</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Configurações da conta e do sistema</p>
      </div>

      {/* Profile */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👤 Perfil</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#020817', flexShrink: 0,
          }}>
            {(senseUser?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{senseUser?.displayName || 'Utilizador'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email}</div>
            <span className="badge badge-violet" style={{ marginTop: 4 }}>{senseUser?.role || 'owner'}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">Nome</label>
            <input className="input-field" defaultValue={senseUser?.displayName || ''} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input-field" defaultValue={user?.email || ''} disabled style={{ opacity: 0.5 }} />
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: 16, padding: '9px 20px', fontSize: 13 }}>Guardar Alterações</button>
      </div>

      {/* Organization */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏢 Organização</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Nome da Organização</label>
            <input className="input-field" defaultValue="Demo Organization" />
          </div>
          <div>
            <label className="label">Modo Padrão</label>
            <select className="input-field" style={{ cursor: 'pointer' }}>
              <option>Residencial</option>
              <option>Corporativo</option>
            </select>
          </div>
          <div>
            <label className="label">Plano Atual</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8,
            }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-primary)' }}>Free Demo</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dados simulados · 2 sensores · 1 site</div>
              </div>
              <button className="btn-primary" style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 12 }}>Fazer Upgrade</button>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy settings */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔒 Privacidade</h2>
        {[
          { label: 'Guardar CSI bruto (modo laboratório)', desc: 'Armazena dados brutos de subportadoras para análise avançada. Requer justificação técnica.', enabled: false },
          { label: 'Identificação individual', desc: 'Permite identificar pessoas conhecidas com base em perfis de consentimento.', enabled: false },
          { label: 'Logs de auditoria detalhados', desc: 'Regista todas as ações de acesso a dados sensíveis.', enabled: true },
          { label: 'Notificações de alertas', desc: 'Recebe notificações em tempo real de alertas críticos.', enabled: true },
        ].map(setting => (
          <div key={setting.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '14px 0', borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{setting.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{setting.desc}</div>
            </div>
            <div style={{
              width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
              background: setting.enabled ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
              position: 'relative', flexShrink: 0, transition: 'background 0.2s',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: setting.enabled ? 21 : 3,
                transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="glass-card" style={{ padding: 24, borderColor: 'rgba(239,68,68,0.2)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#ef4444' }}>⚠️ Zona de Perigo</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Ações irreversíveis que afetam permanentemente a tua conta.</p>
        <button className="btn-danger" style={{ padding: '9px 18px', fontSize: 13 }}>
          🗑 Eliminar Conta
        </button>
      </div>
    </div>
  );
}
