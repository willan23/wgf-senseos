'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import type { AuditLog } from '@uwsc/core/types';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'auditLogs'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AuditLog);
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching logs:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>📋 Registos Globais de Auditoria (Logs)</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Log em tempo real de acessos, chamadas de API e atividades administrativas</p>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>📋 Logs do Sistema (Firestore Real)</h2>
        </div>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum registo de auditoria global encontrado.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Organização</th>
                <th>Utilizador</th>
                <th>Ação</th>
                <th>Recurso</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {new Date(log.timestamp).toLocaleString('pt-PT')}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    {log.organizationId}
                  </td>
                  <td style={{ fontSize: 12 }}>{log.userId.slice(0, 10)}...</td>
                  <td>
                    <span className="badge badge-violet" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.resource}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
