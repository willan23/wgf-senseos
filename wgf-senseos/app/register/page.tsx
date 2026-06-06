'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][passwordStrength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10d98a', '#00d4ff'][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As passwords não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName);
      router.push('/dashboard');
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      if (firebaseErr.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso. Tenta entrar em vez disso.');
      } else if (firebaseErr.code === 'auth/weak-password') {
        setError('Password demasiado fraca. Usa pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta. Tenta novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '10%', right: '15%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', left: '15%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>📡</div>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              WGF <span style={{ color: 'var(--accent-primary)' }}>SenseOS</span>
            </span>
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 6 }}>
            Criar conta grátis
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Começa a monitorizar com dados simulados em segundos
          </p>
        </div>

        <div className="glass-card-elevated" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: 13,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="label">Nome completo</label>
              <input
                id="register-name"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="O teu nome"
                className="input-field"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="o.teu@email.com"
                className="input-field"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-field"
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)',
                }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${(passwordStrength / 4) * 100}%`, height: '100%', background: strengthColor, transition: 'all 0.3s ease', borderRadius: 9999 }} />
                  </div>
                  <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600, width: 56 }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirmar Password</label>
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repete a password"
                className="input-field"
                required
                autoComplete="new-password"
                style={{ borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' : undefined }}
              />
              {confirmPassword && confirmPassword !== password && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>As passwords não coincidem</div>
              )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              Ao criar conta, aceitas os nossos{' '}
              <a href="#" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Termos de Serviço</a>{' '}
              e{' '}
              <Link href="/dashboard/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Política de Privacidade</Link>.
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn-primary"
              disabled={loading || (!!confirmPassword && confirmPassword !== password)}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> A criar conta...</> : '🚀 Criar Conta Grátis'}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Já tens conta?{' '}
            <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Entrar
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <span className="sim-mode-banner">⚡ Demo gratuito — sem cartão de crédito</span>
        </div>
      </div>
    </div>
  );
}
