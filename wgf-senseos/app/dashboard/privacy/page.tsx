'use client';

export default function PrivacyPage() {
  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 800 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>🔒 Privacidade e Conformidade</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>O SenseOS foi construído com privacidade como princípio fundamental, não como funcionalidade opcional.</p>
      </div>

      <div className="glass-card" style={{ padding: 24, borderColor: 'rgba(16,217,138,0.25)' }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>🚫</span>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Este Sistema NÃO Usa Câmeras</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              O WGF SenseOS utiliza exclusivamente sinais de rádio Wi-Fi (CSI — Channel State Information)
              para detetar presença, movimento e padrões biométricos. Não existe captura de imagem, vídeo,
              ou qualquer dado visual em nenhuma etapa do processamento.
            </p>
          </div>
        </div>
      </div>

      {[
        {
          icon: '🔐', title: 'Criptografia Zero-Knowledge (ZKP)',
          desc: 'As características biométricas (caminhada, respiração) são transformadas num hash criptográfico irreversível imediatamente após a deteção. Os dados brutos de CSI são destruídos e nunca armazenados por padrão. O sistema sabe que "o utilizador X entrou", mas não tem acesso às suas características físicas.',
          color: '#7c3aed',
        },
        {
          icon: '🏗️', title: 'Privacidade por Design (Privacy by Design)',
          desc: 'A arquitetura foi desenhada desde o início para minimizar a recolha de dados. O modo padrão armazena apenas dados agregados e anonimizados. A identificação individual requer consentimento explícito e está desativada por padrão.',
          color: '#00d4ff',
        },
        {
          icon: '📋', title: 'Conformidade GDPR',
          desc: 'Toda a recolha de dados biométricos (padrões de caminhada identificáveis) é classificada como "dado sensível" conforme o GDPR Art. 9. O sistema implementa minimização de dados, limitação de finalidade e registo de auditoria de acesso a dados sensíveis.',
          color: '#10d98a',
        },
        {
          icon: '✍️', title: 'Consentimento Explícito',
          desc: 'Perfis de identificação de pessoas conhecidas (Consent Profiles) só podem ser criados com consentimento explícito documentado. O titular dos dados pode revogar o consentimento e eliminar o seu perfil a qualquer momento.',
          color: '#f59e0b',
        },
        {
          icon: '📊', title: 'Dados Agregados para Empresas',
          desc: 'No modo Corporativo, os colaboradores são representados como "presença anónima" por padrão. Os gestores veem apenas contagens, fluxos e mapas de calor — nunca dados que identifiquem indivíduos sem autorização explícita.',
          color: '#00d4ff',
        },
      ].map(item => (
        <div key={item.title} className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: item.color + '18', border: `1px solid ${item.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>{item.icon}</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Audit log section */}
      <div className="glass-card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Registo de Auditoria (Audit Log)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Ação</th>
              <th>Utilizador</th>
              <th>Recurso</th>
            </tr>
          </thead>
          <tbody>
            {[
              { time: new Date(Date.now() - 5000).toLocaleTimeString('pt-PT'), action: 'VIEW_DETECTIONS', user: 'utilizador@demo.com', resource: 'detections' },
              { time: new Date(Date.now() - 60000).toLocaleTimeString('pt-PT'), action: 'LOGIN', user: 'utilizador@demo.com', resource: 'auth' },
              { time: new Date(Date.now() - 3600000).toLocaleTimeString('pt-PT'), action: 'SIMULATION_START', user: 'utilizador@demo.com', resource: 'simulationRuns' },
            ].map((row, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{row.time}</td>
                <td><span className="badge badge-cyan" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{row.action}</span></td>
                <td style={{ fontSize: 12 }}>{row.user}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.resource}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        padding: '16px 20px', borderRadius: 10,
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        fontSize: 12, color: '#f59e0b', lineHeight: 1.6,
      }}>
        <strong>⚡ Modo Demo:</strong> Todos os dados neste dashboard são simulados. Nenhum dado real de utilizadores foi recolhido ou processado.
        O sistema está em modo de demonstração técnica.
      </div>
    </div>
  );
}
