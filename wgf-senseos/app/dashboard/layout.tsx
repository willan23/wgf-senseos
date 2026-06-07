'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/map', label: 'Mapa Indoor', icon: '🗺️' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/alerts', label: 'Alertas', icon: '🚨' },
  { href: '/dashboard/sensors', label: 'Sensores', icon: '📡' },
  { href: '/dashboard/sites', label: 'Sites', icon: '🏢' },
  { href: '/dashboard/lab/datasets', label: 'Lab Datasets', icon: '🔬' },
  { href: '/dashboard/privacy', label: 'Privacidade', icon: '🔒' },
  { href: '/dashboard/settings', label: 'Definições', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, senseUser, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ========== SIDEBAR ========== */}
      <aside style={{
        width: 220, minWidth: 220, background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} 
            />
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              WGF <span style={{ color: 'var(--accent-primary)' }}>SenseOS</span>
            </span>
          </Link>
          <div style={{ marginTop: 10 }}>
            <span className="sim-mode-banner" style={{ fontSize: 10 }}>⚡ Modo Simulado</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div className={`sidebar-item ${isActive ? 'active' : ''}`}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.href === '/dashboard/alerts' && (
                    <span style={{
                      marginLeft: 'auto', background: '#ef4444', color: '#fff',
                      borderRadius: 9999, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                    }}>3</span>
                  )}
                </div>
              </Link>
            );
          })}

          <div className="divider" />

          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <div className={`sidebar-item ${pathname.startsWith('/admin') ? 'active' : ''}`}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span>Admin</span>
            </div>
          </Link>
        </nav>

        {/* User info */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#020817', flexShrink: 0,
            }}>
              {(senseUser?.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {senseUser?.displayName || 'Utilizador'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {senseUser?.role || 'owner'}
              </div>
            </div>
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 14, padding: 4,
              borderRadius: 4, flexShrink: 0,
            }} title="Sair">
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
