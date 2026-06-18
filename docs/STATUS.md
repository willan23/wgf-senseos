# Resumo do Estado — WGF SenseOS

**Data:** 2026-06-18
**Estado:** Deploy em produção (App Hosting)

---

## Visão Geral

O WGF SenseOS é uma plataforma SaaS de segurança e inteligência espacial baseada em Wi-Fi Sensing (CSI). Utiliza sinais WiFi para detetar presença humana, movimento, respiração, quedas e intrusões — sem câmaras.

**Estado atual: ~95% implementado.** Todo o código de produção está escrito e TypeScript compila sem erros.

---

## O que está pronto

### Código (95%)
- ✅ Edge Agent real (Python, Nexmon CSI)
- ✅ Motor de inferência real (occupancy, fall, AoA)
- ✅ RF SLAM em TypeScript
- ✅ Dashboard 3D
- ✅ Analytics RAG
- ✅ Privacy Core (ZKP)
- ✅ API routes completas
- ✅ Firebase integration

### Infraestrutura (80%)
- ✅ Firebase Auth + Firestore
- ✅ Stripe billing
- ✅ TypeScript strict mode
- ✅ Security rules

---

## O que falta

### Hardware (10%)
- 🔜 Raspberry Pi 5 (~€90)
- 🔜 Firmware Nexmon compilado
- 🔜 Pesos X-Fi XRF55

### Deploy (100%)
- ✅ Firebase App Hosting configurado
- ✅ GitHub → Firebase auto-deploy ativo
- ✅ Next.js 16 + Turbopack build
- ✅ Pacotes @uwsc/* como file: dependencies
- 🔜 Monitoring (Datadog/Grafana)
- 🔜 Load testing (k6)

---

## Para começar agora

### Comprar
- 1x Raspberry Pi 5 (4GB) — ~€85
- 1x Adaptador WiFi Nexmon (bcm43455c0) — ~€15
- 1x Cartão SD 32GB — ~€10
- 1x Fonte USB-C 27W — ~€15
- **Total: ~€125**

### Testar sem hardware
```bash
cd edge-agent/real-agent
python test_generator.py --scenario walking --duration 30 --send --port 5500
python main.py --port 5500
```

### Deploy em produção
```bash
# Push para GitHub → deploy automático via Firebase App Hosting
git push origin main

# URL: https://wgf-senseos--wgf-senseos.us-central1.hosted.app
```

---

## Diferenciação de Mercado

| Feature | WGF SenseOS | Concorrentes |
|---------|------------|--------------|
| ZKP Privacy | ✅ Único | ❌ Nenhum |
| Gait ID | ✅ X-Fi | ❌ Não existe |
| Sem câmaras | ✅ WiFi sensing | ⚠️ Só câmaras |
| Edge-first | ✅ AI na borda | ❌ Só cloud |
| Floor Plan auto | ✅ RF SLAM | ❌ Só LiDAR |

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| `docs/ARCHITECTURE.md` | Arquitetura técnica completa |
| `docs/REAL_VS_SIMULATED.md` | Comparativo real vs simulado |
| `docs/ROADMAP.md` | Roadmap de desenvolvimento |
| `docs/avanço.md` | Estado de implementação |
| `Evolução.md` | Plano de evolução do projeto |
| `implementation_plan.md` | Plano de implementação detalhado |
| `GAPS_AND_MARKET.md` | Análise de gaps e mercado |
