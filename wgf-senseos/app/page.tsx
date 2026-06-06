'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Animated counter hook
function useCounter(target: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, start]);
  return count;
}

const features = [
  {
    icon: '🏠',
    title: 'Segurança Residencial',
    desc: 'Detete intrusos, presenças desconhecidas e quedas de idosos sem uma única câmera. Total privacidade.',
    color: '#00d4ff',
  },
  {
    icon: '🏢',
    title: 'Analytics Corporativo',
    desc: 'Mapas de calor, contagem de pessoas, ocupação por sala e otimização de recursos em tempo real.',
    color: '#7c3aed',
  },
  {
    icon: '🔒',
    title: 'Privacidade por Design',
    desc: 'CSI bruto nunca armazenado. Dados biométricos transformados em hashes irreversíveis via ZKP.',
    color: '#10d98a',
  },
  {
    icon: '📡',
    title: 'Wi-Fi Sensing',
    desc: 'Usa o sinal Wi-Fi existente para detetar movimento, respiração e caminhada sem hardware extra.',
    color: '#f59e0b',
  },
  {
    icon: '🤖',
    title: 'Motor de IA',
    desc: 'CNN + LSTM + redes neurais de picos para inferência local de baixo consumo (TinyML).',
    color: '#ef4444',
  },
  {
    icon: '🛡️',
    title: 'Anti-Spoofing RF',
    desc: 'Impressão digital de hardware detecta tentativas de clonar ou injetar sinais falsos.',
    color: '#00d4ff',
  },
];

const useCases = [
  { icon: '👤', label: 'Contagem de Pessoas' },
  { icon: '📍', label: 'Localização Indoor' },
  { icon: '💨', label: 'Deteção de Respiração' },
  { icon: '🚨', label: 'Alerta de Intrusão' },
  { icon: '🫸', label: 'Deteção de Queda' },
  { icon: '🌡️', label: 'Automação HVAC' },
  { icon: '💡', label: 'Automação de Luz' },
  { icon: '📊', label: 'Relatórios de Ocupação' },
];

const plans = [
  {
    id: 'free',
    name: 'Free Demo',
    price: '0',
    desc: 'Experimenta com dados simulados',
    features: ['2 sensores simulados', '1 site', 'Dashboard básico', 'Modo simulação'],
    cta: 'Começar Grátis',
    highlighted: false,
  },
  {
    id: 'residential',
    name: 'Residential',
    price: '29',
    desc: 'Para casas e pequenas propriedades',
    features: ['10 sensores', '3 sites', 'Alertas em tempo real', 'Deteção de quedas', 'Modo residencial'],
    cta: 'Escolher Plano',
    highlighted: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: '99',
    desc: 'Para lojas e escritórios',
    features: ['50 sensores', '10 sites', 'Mapas de calor', 'Exportação CSV/PDF', 'Analytics avançados'],
    cta: 'Escolher Plano',
    highlighted: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Soluções à medida',
    features: ['Sensores ilimitados', 'Sites ilimitados', 'SLA dedicado', 'Edge Agent real', 'API privada'],
    cta: 'Contactar Vendas',
    highlighted: false,
  },
];

export default function LandingPage() {
  const [started, setStarted] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 500);
    const handleScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const countSensors = useCounter(12000, 2500, started);
  const countDetections = useCounter(98, 2000, started);
  const countUptime = useCounter(99, 1500, started);

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>

      {/* ========== NAVBAR ========== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 32px',
        background: navScrolled ? 'rgba(2,8,23,0.92)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(16px)' : 'none',
        borderBottom: navScrolled ? '1px solid rgba(0,212,255,0.1)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} 
            />
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              WGF <span style={{ color: 'var(--accent-primary)' }}>SenseOS</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="sim-mode-banner" style={{ marginRight: 8 }}>
              ⚡ Modo Demo Ativo
            </span>
            <Link href="/login">
              <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Entrar</button>
            </Link>
            <Link href="/register">
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Começar Grátis</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="bg-grid" style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '120px 32px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: '20%', left: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '10%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 800, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
            padding: '6px 14px', borderRadius: 9999,
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
          }}>
            <div className="status-dot online" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)' }}>
              Sistema Ativo — Dados Simulados
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900,
            lineHeight: 1.05, letterSpacing: '-0.04em',
            marginBottom: 24, color: 'var(--text-primary)',
          }}>
            Segurança e Analytics
            <br />
            <span className="text-gradient">sem uma câmera sequer</span>
          </h1>

          <p style={{
            fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.8,
            maxWidth: 600, margin: '0 auto 40px',
          }}>
            O WGF SenseOS usa o sinal Wi-Fi do seu espaço para detetar presença, localizar pessoas,
            identificar intrusos e prevenir quedas — tudo com <strong style={{ color: 'var(--text-primary)' }}>privacidade total</strong> e zero câmeras.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register">
              <button className="btn-primary" style={{ padding: '14px 28px', fontSize: 15 }}>
                🚀 Entrar no Dashboard
              </button>
            </Link>
            <a href="#como-funciona">
              <button className="btn-secondary" style={{ padding: '14px 28px', fontSize: 15 }}>
                Como Funciona
              </button>
            </a>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24, marginTop: 64, maxWidth: 600, marginInline: 'auto',
          }}>
            {[
              { value: `${countSensors.toLocaleString()}+`, label: 'Sensores Monitorados' },
              { value: `${countDetections}%`, label: 'Precisão de Deteção' },
              { value: `${countUptime}.9%`, label: 'Uptime Garantido' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--accent-primary)' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="como-funciona" style={{ padding: '100px 32px', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
              Como o <span className="text-gradient">Wi-Fi Sensing</span> funciona
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
              O sinal Wi-Fi é alterado de forma única quando uma pessoa se move, respira ou caminha.
              O SenseOS captura e processa essas variações em tempo real.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { step: '01', icon: '📡', title: 'Captura de Sinal', desc: 'Antenas Wi-Fi em mesh capturam dados CSI (amplitude e fase) de cada subportadora.' },
              { step: '02', icon: '🔬', title: 'Limpeza de Ruído', desc: 'Filtros digitais e PCA removem interferências de objetos inanimados.' },
              { step: '03', icon: '🤖', title: 'Motor de IA', desc: 'CNN + LSTM analisam padrões de movimento, respiração e caminhada.' },
              { step: '04', icon: '🔐', title: 'Privacidade ZKP', desc: 'Biometria é transformada em hash irreversível. Dados brutos destruídos.' },
              { step: '05', icon: '📊', title: 'Dashboard', desc: 'Eventos anonimizados chegam ao painel em tempo real via Firestore.' },
            ].map((item) => (
              <div key={item.step} className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: -8, right: -4,
                  fontSize: 48, fontWeight: 900, color: 'rgba(0,212,255,0.06)',
                  fontFamily: 'var(--font-mono)',
                }}>{item.step}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Demo vs Real */}
          <div className="glass-card" style={{ marginTop: 40, padding: 32, borderColor: 'rgba(245,158,11,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Modo Demo vs Hardware Real</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div className="badge badge-yellow" style={{ marginBottom: 12 }}>🔬 Modo Demo (Atual)</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['CSI simulado por algoritmos', 'Cenários pré-definidos', 'Dashboard completamente funcional', 'Sem hardware necessário'].map(item => (
                    <li key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                      <span style={{ color: '#f59e0b' }}>◆</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="badge badge-cyan" style={{ marginBottom: 12 }}>📡 Hardware Real (Futuro)</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['Roteadores OpenWrt + Nexmon', 'Edge Agent via MQTT/gRPC', 'CSI real de subportadoras', 'Compatível com IEEE 802.11bf'].map(item => (
                    <li key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                      <span style={{ color: '#00d4ff' }}>◆</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section style={{ padding: '100px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
              Tudo o que precisas, <span className="text-gradient">numa plataforma</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} className="glass-card" style={{ padding: 28, transition: 'all 0.25s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = f.color + '44'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)'; }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: f.color + '18', border: `1px solid ${f.color}33`, fontSize: 22, marginBottom: 16,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== USE CASES ========== */}
      <section style={{ padding: '60px 32px', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 40, letterSpacing: '-0.03em' }}>
            Casos de Uso
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {useCases.map((uc) => (
              <div key={uc.label} className="glass-card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{uc.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{uc.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="precos" style={{ padding: '100px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
              Planos <span className="text-gradient">transparentes</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Começa gratuitamente com dados simulados. Escala quando quiseres.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {plans.map((plan) => (
              <div key={plan.id} style={{
                background: plan.highlighted ? 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,58,237,0.08))' : 'var(--bg-card)',
                border: `1px solid ${plan.highlighted ? 'rgba(0,212,255,0.4)' : 'var(--border-card)'}`,
                borderRadius: 16, padding: 28, position: 'relative',
                boxShadow: plan.highlighted ? '0 0 40px rgba(0,212,255,0.1)' : 'none',
              }}>
                {plan.highlighted && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                    color: '#020817', padding: '4px 16px', borderRadius: 9999,
                    fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                  }}>⭐ MAIS POPULAR</div>
                )}
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{plan.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{plan.desc}</p>
                <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4, letterSpacing: '-0.04em', color: plan.highlighted ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                  {plan.price === 'Custom' ? 'Custom' : `€${plan.price}`}
                  {plan.price !== 'Custom' && plan.price !== '0' && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/mês</span>}
                </div>
                <div className="divider" />
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--status-online)' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" style={{ display: 'block' }}>
                  <button className={plan.highlighted ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', justifyContent: 'center' }}>
                    {plan.cta}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section style={{ padding: '80px 32px', background: 'var(--bg-secondary)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Pronto para começar?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 32 }}>
            Cria a tua conta gratuitamente e explora o dashboard com dados simulados em segundos.
          </p>
          <Link href="/register">
            <button className="btn-primary" style={{ padding: '16px 40px', fontSize: 16 }}>
              🚀 Criar Conta Grátis
            </button>
          </Link>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer style={{
        padding: '32px', background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📡</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-secondary)' }}>WGF SenseOS</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Privacy-First Wi-Fi Sensing Platform · MVP v0.1 · Dados Simulados
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/dashboard/privacy" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>Privacidade</Link>
          <Link href="/login" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>Login</Link>
        </div>
      </footer>
    </div>
  );
}
