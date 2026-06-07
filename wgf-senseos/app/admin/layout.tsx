'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const adminNav = [
  { href: '/admin', label: 'Visão Geral', icon: '📊' },
  { href: '/admin/organizations', label: 'Organizações', icon: '🏢' },
  { href: '/admin/users', label: 'Utilizadores', icon: '👥' },
  { href: '/admin/billing', label: 'Billing', icon: '💳' },
  { href: '/admin/logs', label: 'Logs', icon: '📋' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, senseUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (senseUser && !senseUser.isSuperAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, senseUser, loading, router]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <aside style={{
        width: 200, minWidth: 200, background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🛡️</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Admin Panel</span>
          </div>
          <span className="badge badge-red" style={{ fontSize: 10 }}>SUPER ADMIN</span>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {adminNav.map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
          <div className="divider" />
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div className="sidebar-item">
              <span>↩</span>
              <span>Voltar ao Dashboard</span>
            </div>
          </Link>
        </nav>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
