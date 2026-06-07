'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import type { SenseUser } from '@uwsc/core/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SenseUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SenseUser[] = [];
      snapshot.forEach((doc) => {
        list.push({ uid: doc.id, ...doc.data() } as SenseUser);
      });
      setUsers(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>👥 Utilizadores</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gestão global de utilizadores registados na plataforma</p>
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
                <th>UID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Role</th>
                <th>ID Organização</th>
                <th>Criado Em</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{u.uid}</td>
                  <td style={{ fontWeight: 600 }}>{u.displayName}</td>
                  <td>{u.email}</td>
                  <td><span className="badge badge-cyan">{u.role}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{u.organizationId}</td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-PT') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
