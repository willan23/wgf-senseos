'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, limit } from 'firebase/firestore';
import type { AuditLog } from '@uwsc/core/types';

export default function PrivacyPage() {
  const { senseUser, user } = useAuth();
  const organizationId = senseUser?.organizationId;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestType, setRequestType] = useState<'erasure' | 'portability'>('erasure');

  // Load audit logs from Firestore
  useEffect(() => {
    if (!db || !organizationId) return;

    const q = query(
      collection(db, 'auditLogs'),
      where('organizationId', '==', organizationId),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AuditLog);
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching audit logs:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organizationId]);

  // Log accesses to this page (GDPR audit trail)
  useEffect(() => {
    if (!db || !organizationId || !senseUser) return;

    const logAccess = async () => {
      try {
        await addDoc(collection(db, 'auditLogs'), {
          organizationId,
          userId: senseUser.uid,
          action: 'VIEW_PRIVACY_DASHBOARD',
          resource: 'privacySettings',
          timestamp: Date.now(),
          ipAddress: '127.0.0.1',
        });
      } catch (err) {
        console.error("Error recording audit log:", err);
      }
    };

    logAccess();
  }, [organizationId, senseUser]);

  const handleSubmitGDPRRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !organizationId || !senseUser) return;

    try {
      await addDoc(collection(db, 'dataSubjectRequests'), {
        organizationId,
        userId: senseUser.uid,
        type: requestType,
        status: 'pending',
        requestedAt: Date.now(),
        requestedBy: senseUser.email,
      });

      // Record in audit log
      await addDoc(collection(db, 'auditLogs'), {
        organizationId,
        userId: senseUser.uid,
        action: `SUBMIT_GDPR_${requestType.toUpperCase()}_REQUEST`,
        resource: 'dataSubjectRequests',
        timestamp: Date.now(),
      });

      setRequestSubmitted(true);
    } catch (err) {
      console.error("Error submitting GDPR request:", err);
    }
  };

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

      {/* GDPR Data Subject Requests Form */}
      <div className="glass-card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>✍️ Direitos do Titular (GDPR Art. 15-17)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Podes solicitar a exportação ou eliminação total de todos os teus dados biométricos e logs de presença.
        </p>

        {requestSubmitted ? (
          <div style={{ padding: 16, borderRadius: 8, background: 'rgba(16,217,138,0.1)', border: '1px solid rgba(16,217,138,0.3)', color: '#10d98a', fontSize: 13 }}>
            ✅ Pedido de direito GDPR enviado com sucesso. Será processado dentro do prazo regulamentar de 30 dias.
          </div>
        ) : (
          <form onSubmit={handleSubmitGDPRRequest} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select className="input-field" value={requestType} onChange={e => setRequestType(e.target.value as any)} style={{ width: 200 }}>
              <option value="erasure">Direito ao Esquecimento (Eliminar)</option>
              <option value="portability">Portabilidade (Exportar)</option>
            </select>
            <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Submeter Pedido</button>
          </form>
        )}
      </div>

      {/* Audit log section */}
      <div className="glass-card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Registo de Auditoria de Acesso (Audit Log Real)</h2>
        {loading ? (
          <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Nenhum registo de auditoria encontrado.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Ação</th>
                <th>Utilizador</th>
                <th>Recurso</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {new Date(row.timestamp).toLocaleString('pt-PT')}
                  </td>
                  <td>
                    <span className="badge badge-cyan" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                      {row.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{row.userId.slice(0, 10)}...</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.resource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
