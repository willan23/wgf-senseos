# WGF SenseOS — Master Checklist: Zero Mocks, 100% Real
> Objetivo: transformar cada componente simulado em produção real.  
> Legenda: `[x]` Completo · `[/]` Em progresso · `[ ]` Pendente

---

## ✅ BLOCO A — Infraestrutura SaaS (Concluído)

- `[x]` A1: Autenticação Firebase Auth multi-tenant em produção
- `[x]` A2: Firestore security rules multi-tenant com fallback custom claims
- `[x]` A3: Dashboard Next.js App Router em produção (Firebase App Hosting)
- `[x]` A4: CI/CD: GitHub → Firebase auto-deploy ativo (App Hosting)
- `[x]` A5: Schema Firestore: users, organizations, sites, zones, sensors, alerts
- `[x]` A6: UWSC 4-layer pipeline (código completo, mocks swap-ready)
- `[x]` A7: hook `useUwscPipeline` — orquestra as 4 camadas
- `[x]` A8: API routes `/api/uwsc/ingest` e `/api/uwsc/heartbeat`
- `[x]` A9: Painel `/dashboard/uwsc` — Pipeline Inspector em tempo real
- `[x]` A10: Edge Agent mock Node.js standalone (7 cenários)
- `[x]` A11: Protocolo de transporte v1 tipado (proto-ready)
- `[x]` A12: Privacy core com SHA-256/HMAC e ZKP placeholder
- `[x]` A13: STRATEGIC_MASTER.md — tese de aquisição documentada
- `[x]` A14: Build Turbopack (Next.js 16) + pacotes @uwsc/* como file: deps
- `[x]` A15: Fix cmath.exp no test_generator.py (complex number support)

---

## 🔴 BLOCO B — Hardware Real (Fase 1 — Meses 1-3)

### B1: Setup de Laboratório
- `[ ]` B1.1: Comprar 2× Raspberry Pi 4 Model B 4GB RAM
- `[ ]` B1.2: Comprar 2× Placa Wi-Fi USB Alfa AWUS036ACH (chipset BCM43455)
- `[ ]` B1.3: Comprar 1× Roteador TP-Link TL-WDR4300 (chipset AR9344)
- `[ ]` B1.4: Instalar Nexmon CSI firmware nos Raspberry Pi (`seemoo-lab/nexmon_csi`)
- `[ ]` B1.5: Instalar OpenWrt 23.05 + patches `ath9k_csi` no roteador
- `[ ]` B1.6: Validar extração de subportadoras reais em ficheiro `.pcap`
- `[ ]` B1.7: Ligar Edge Agent real ao fluxo de CSI bruto (substituir gerador mock)

### B2: Validação do Pipeline com Dados Reais
- `[ ]` B2.1: Confirmar que filtro Butterworth (0.1-0.5 Hz) deteta respiração real
- `[ ]` B2.2: Confirmar que filtro Butterworth (1-5 Hz) deteta passo real de caminhada
- `[ ]` B2.3: Confirmar que anti-spoofing RF fingerprint aceita CSI legítimo
- `[ ]` B2.4: Confirmar que anti-spoofing bloqueia CSI injetado via SDR (teste)
- `[ ]` B2.5: Gravar primeiros datasets: 5 cenários × 10h cada (anotados)
- `[ ]` B2.6: Publicar paper técnico de validação (IEEE 802.11 Workshop ou arXiv)

### B3: Geometria Multi-nó (Triangulação Real)
- `[ ]` B3.1: Posicionar 2+ nós em ambiente controlado (sala 4×5m)
- `[ ]` B3.2: Calibrar phase difference entre antenas dos nós
- `[ ]` B3.3: Implementar algoritmo MUSIC/ESPRIT para AoA real
- `[ ]` B3.4: Validar localização X/Y com erro ≤ ±0.5m
- `[ ]` B3.5: Estender para coordenada Z (altura da perturbação)
- `[ ]` B3.6: Substituir `runAoaLocalization` placeholder pelo algoritmo real

---

## 🔴 BLOCO C — Modelos de IA Reais (Fase 2 — Meses 3-6)

### C1: Dataset de Treino
- `[ ]` C1.1: Definir protocolo de coleta (ambientes, participantes, durações)
- `[ ]` C1.2: Coletar 50h de CSI: cenário vazio, 1 pessoa, 2 pessoas, 3+ pessoas
- `[ ]` C1.3: Coletar 20h de CSI: cenário de quedas (simuladas com manequim/voluntários)
- `[ ]` C1.4: Coletar 10h de CSI: caminhada de 50+ participantes distintos para gait
- `[ ]` C1.5: Anotar datasets com ground truth (câmera de referência temporária em lab)
- `[ ]` C1.6: Criar pipeline de pré-processamento: `.pcap` → `CsiTensor` → dataset

### C2: CNN de Contagem de Pessoas (substituir `runCnnOccupancy`)
- `[ ]` C2.1: Implementar arquitetura ResNet-style 2D CNN em Python/PyTorch
- `[ ]` C2.2: Treinar com dataset real — target: >92% accuracy
- `[ ]` C2.3: Quantizar para INT8 com TensorFlow Lite
- `[ ]` C2.4: Exportar para WASM com `tfjs-converter`
- `[ ]` C2.5: Integrar no Edge Agent Node.js (substituir placeholder)
- `[ ]` C2.6: Benchmark: <2MB modelo, <50ms inference, <5% CPU no Pi 4

### C3: Classificador de Queda (substituir `runFallClassifier`)
- `[ ]` C3.1: Implementar 1D CNN + threshold heurística em Python/PyTorch
- `[ ]` C3.2: Treinar com dados reais + protocolo AHA Fall
- `[ ]` C3.3: Target: <0.5% falsos positivos, >99% recall
- `[ ]` C3.4: Validar em 3 ambientes distintos (carpete, madeira, azulejo)
- `[ ]` C3.5: Quantizar INT8 e integrar no Edge Agent

### C4: LSTM de Gait Analysis / Identificação (substituir `runLstmGait`)
- `[ ]` C4.1: Implementar LSTM bidirecional com attention em Python/PyTorch
- `[ ]` C4.2: Treinar embeddings de 128D com dataset de 50+ participantes
- `[ ]` C4.3: Implementar cosine similarity vs consent profiles no Firestore
- `[ ]` C4.4: Garantir: NUNCA armazenar embedding raw — apenas HMAC hash
- `[ ]` C4.5: Target: >95% identificação em espaço controlado
- `[ ]` C4.6: Substituir placeholder pelo modelo real no pipeline

### C5: SNN Event-Driven (substituir modo idle com CPU ~0%)
- `[ ]` C5.1: Avaliar frameworks SNN: Norse, BindsNET, ou SNNTorch
- `[ ]` C5.2: Implementar detector de evento: só processa quando há variação >threshold
- `[ ]` C5.3: Validar redução de CPU em ambiente estático (target: <1% CPU)
- `[ ]` C5.4: Integrar no pipeline após validação dos outros modelos

---

## 🔴 BLOCO D — Zero-Knowledge Proofs Reais (Fase 3 — Meses 4-7)

- `[x]` D1: Instalar `snarkjs` e `circomlib` no projeto (`npm install snarkjs circomlib`)
- `[x]` D2: Implementar circuit `person_present.circom` (prova: existe pessoa, sem revelar posição)
- `[x]` D3: Implementar circuit `fall_detected.circom` (prova: queda ocorreu, sem revelar identidade)
- `[x]` D4: Implementar circuit `known_person.circom` (prova: pessoa identificada, sem revelar hash)
- `[ ]` D5: Compilar circuits e gerar `*.zkey` (trusted setup ceremony)
- `[x]` D6: Substituir `generateZkpProof` placeholder pela implementação snarkjs real
- `[x]` D7: Substituir `verifyZkpProof` placeholder pela verificação snarkjs real
- `[ ]` D8: Integrar geração de prova no final do pipeline UWSC (após inferência)
- `[ ]` D9: Armazenar apenas `ZkpProof` no Firestore — nunca dados brutos
- `[ ]` D10: Auditoria de privacidade independente (Trail of Bits ou similar)
- `[ ]` D11: Publicar whitepaper ZKP-CSI (diferenciação única de mercado)

---

## 🟡 BLOCO E — Protocolo gRPC Real (Fase 3 — Mês 3-4)

- `[x]` E1: Criar ficheiros `.proto` em `packages/uwsc-edge-protocol/proto/`
  - `[x]` E1.1: `csi_frame.proto` — CsiFrameBatch, CsiFrame, IngestResponse
  - `[ ]` E1.2: `heartbeat.proto` — HeartbeatMsg, HeartbeatAck
  - `[ ]` E1.3: `inference_event.proto` — InferenceEventPayload
  - `[ ]` E1.4: `alert_event.proto` — AlertEventPayload
- `[x]` E2: Compilar schemas com `protoc` + plugin TypeScript (`ts-proto`)
- `[x]` E3: Implementar servidor gRPC em Next.js (via `@grpc/grpc-js`)
- `[ ]` E4: Atualizar Edge Agent para usar gRPC em vez de HTTP/JSON
- `[ ]` E5: Configurar TLS + mTLS com certificado por sensor ID
- `[x]` E6: Benchmark: payload gRPC vs JSON (target: 60-70% menor em bytes)

---

## 🟡 BLOCO F — Produto Comercial Real (Fase 4 — Meses 6-9)

### F1: Billing e Subscriptions
- `[ ]` F1.1: Criar conta Stripe e configurar produtos/preços
- `[x]` F1.2: Implementar webhook Stripe no Next.js (`/api/billing/webhook`)
- `[x]` F1.3: Criar página `/dashboard/billing` com estado real de subscrição
- `[x]` F1.4: Enforce de limites de plano no Firestore (maxSensors, maxSites)
- `[x]` F1.5: Alertas de upgrade quando limite é atingido
- `[ ]` F1.6: Faturação automática mensal e emissão de faturas PDF

### F2: App Mobile de Setup
- `[ ]` F2.1: Criar app React Native ou Flutter para setup de hardware
- `[ ]` F2.2: Fluxo: scan QR code no roteador → deteta rede → configura Edge Agent
- `[ ]` F2.3: Onboarding: adicionar sensor ao site via app (<5 min)
- `[ ]` F2.4: Push notifications para alertas críticos (queda, intrusão)
- `[ ]` F2.5: Publicar na App Store e Google Play

### F3: Kit Hardware WGF Branded
- `[ ]` F3.1: Design industrial da caixa do kit (1 roteador + 2 Raspberry Pi)
- `[ ]` F3.2: Pré-instalar Edge Agent no SD card via imagem flashada
- `[ ]` F3.3: QR code único por kit → ativa organização automaticamente
- `[ ]` F3.4: Guia de instalação impresso (<15 min de setup)
- `[ ]` F3.5: Preço de venda e margem definidos

### F4: Dashboard — Funcionalidades Pendentes
- `[x]` F4.1: `/dashboard/lab/datasets` — importação de CSI real (JSON/CSV/.pcap)
- `[ ]` F4.2: `/dashboard/analytics` — mapas de calor de ocupação (dados reais)
- `[ ]` F4.3: `/dashboard/map` — localização 3D real (substituir coordenadas simuladas)
- `[x]` F4.4: `/admin/observability` — logs estruturados e métricas de pipeline
- `[x]` F4.5: Modo Lab — replay de datasets gravados em tempo real

---

## 🟡 BLOCO G — Integrações Externas Reais (Fase 4-5)

- `[ ]` G1: Integração HVAC/BMS (Building Management Systems)
  - `[ ]` G1.1: Protocolo BACnet/IP ou Modbus para sistemas de climatização
  - `[ ]` G1.2: Webhook configurável por zona (presença=0 → desligar AC)
  - `[ ]` G1.3: Dashboard de economia de energia (kWh poupados)
- `[ ]` G2: Integração de Alertas Externos
  - `[ ]` G2.1: SMS via Twilio para alertas críticos (queda)
  - `[ ]` G2.2: Webhook configurável por organização (Slack, Teams, PagerDuty)
  - `[ ]` G2.3: Integração com serviços de emergência (INEM/112 API se disponível)
- `[ ]` G3: Export de Dados
  - `[ ]` G3.1: Export CSV/JSON de dados de ocupação históricos
  - `[ ]` G3.2: API pública REST para integrações enterprise (/api/v1/*)
  - `[ ]` G3.3: Webhooks de eventos real-time para parceiros

---

## 🟢 BLOCO H — Observabilidade e Segurança (Fase 5 — Meses 9-12)

- `[ ]` H1: Logging Estruturado
  - `[x]` H1.1: Implementar Cloud Logging (Firebase/GCP) para todos os API routes
  - `[x]` H1.2: Log de cada frame CSI processado (sem dados brutos — apenas metadata)
  - `[ ]` H1.3: Log de latência de pipeline end-to-end (edge → UI)
  - `[ ]` H1.4: Alertas de anomalia (latência >500ms, CPU >80%, spoofing attempt)
- `[ ]` H2: Painel `/admin/observability`
  - `[ ]` H2.1: Gráfico de frames/segundo por sensor
  - `[ ]` H2.2: Distribuição de latência do pipeline (p50, p95, p99)
  - `[ ]` H2.3: Taxa de spoofing bloqueados por organização
  - `[ ]` H2.4: Uptime por sensor (online/offline/warning)
- `[ ]` H3: Firestore Security Rules — Atualização Final
  - `[x]` H3.1: Adicionar regras para coleção `detections` (isolamento por org)
  - `[x]` H3.2: Adicionar regras para coleção `sensorStreams` (edge agent auth)
  - `[x]` H3.3: Adicionar regras para coleção `zkpProofs` (write-only por edge)
  - `[ ]` H3.4: Rate limiting por organização (evitar abuse)
  - `[ ]` H3.5: Testes automatizados das rules com `@firebase/rules-unit-testing`
- `[ ]` H4: Audit Logs Completos
  - `[x]` H4.1: Log de todos os acessos ao dashboard por utilizador
  - `[ ]` H4.2: Log de todas as alterações de configuração
  - `[ ]` H4.3: Export de audit logs para compliance (SOC2 evidence)

---

## 🟢 BLOCO I — Certificações e Compliance (Fase 5-6 — Meses 9-18)

- `[ ]` I1: GDPR / Privacidade
  - `[ ]` I1.1: DPA (Data Processing Agreement) template para clientes
  - `[ ]` I1.2: Política de Privacidade publicada
  - `[ ]` I1.3: Mecanismo de Right to Erasure funcional (GDPR Art. 17)
  - `[ ]` I1.4: Registo de atividades de tratamento (Art. 30)
- `[ ]` I2: ISO 27001 (Information Security)
  - `[ ]` I2.1: Risk assessment inicial
  - `[ ]` I2.2: Políticas de segurança documentadas
  - `[ ]` I2.3: Controles técnicos mapeados
  - `[ ]` I2.4: Auditoria e certificação
- `[ ]` I3: SOC 2 Type II
  - `[ ]` I3.1: Selecionar auditor (Prescient Assurance, BARR Advisory, etc.)
  - `[ ]` I3.2: Período de observação 6 meses (controls em operação)
  - `[ ]` I3.3: Report SOC 2 emitido
- `[ ]` I4: HIPAA (mercado healthcare — queda de idosos)
  - `[ ]` I4.1: BAA (Business Associate Agreement) template
  - `[ ]` I4.2: Controlos HIPAA mapeados para arquitetura WGF
  - `[ ]` I4.3: Avaliação de risco HIPAA
- `[ ]` I5: CE / FCC (hardware)
  - `[ ]` I5.1: Testes RF de emissão e imunidade
  - `[ ]` I5.2: Submissão para certificação CE (Europa)
  - `[ ]` I5.3: Submissão para certificação FCC (EUA)
- `[ ]` I6: IEEE 802.11bf
  - `[ ]` I6.1: Monitorar evolução do draft standard
  - `[ ]` I6.2: Implementar compatibility layer na Camada 2 UWSC
  - `[ ]` I6.3: Testar com primeiro hardware 802.11bf disponível no mercado

---

## 🟢 BLOCO J — Propriedade Intelectual (Urgente — antes de publicação)

- `[ ]` J1: Contratar patent attorney especializado em RF + ML
- `[ ]` J2: Depositar patent: UWSC — Universal Wi-Fi Sensing Core Layer Abstraction
- `[ ]` J3: Depositar patent: RF Fingerprinting Anti-Spoofing via Phase Noise + IQ Imbalance
- `[ ]` J4: Depositar patent: ZKP-CSI — Zero-Knowledge Proof para Biometria Wi-Fi
- `[ ]` J5: Depositar patent: Gait Identification via CSI sem raw data storage
- `[ ]` J6: Depositar patent: Multi-Static Mesh Grid para Localização 3D Wi-Fi Comercial
- `[ ]` J7: Processo PCT (Patent Cooperation Treaty) para proteção internacional
- `[ ]` J8: Trademark "WGF SenseOS" e "UWSC" nas jurisdições relevantes

---

## 🟢 BLOCO K — Documentação Final (Fase 5-6)

- `[ ]` K1: Atualizar `REAL_VS_SIMULATED.md` — documentar o que passou a ser real
- `[ ]` K2: Atualizar `ROADMAP.md` — refletir o progresso real das fases
- `[ ]` K3: Criar `docs/HARDWARE_SETUP.md` — guia completo Raspberry Pi + Nexmon
- `[ ]` K4: Criar `docs/API_REFERENCE.md` — documentação pública da REST API v1
- `[ ]` K5: Criar `docs/SECURITY.md` — security disclosure policy
- `[ ]` K6: Criar `docs/TINYML_INFERENCE_PLAN.md` — especificação dos modelos de IA
- `[ ]` K7: README principal atualizado com demo video e quick start real

---

## 🟢 BLOCO L — Acquisition Readiness (Fase 6 — Meses 18-24)

- `[ ]` L1: ARR > $1M documentado
- `[ ]` L2: Data room preparado (Capchase, Docsend ou similar)
  - `[ ]` L2.1: Financeiro: P&L, unit economics, cohort analysis
  - `[ ]` L2.2: Técnico: architecture overview, IP portfolio, model benchmarks
  - `[ ]` L2.3: Legal: GDPR compliance, patents, certifications
  - `[ ]` L2.4: Comercial: clientes, contratos, pipeline
- `[ ]` L3: Parcerias OEM assinadas (TP-Link, Netgear, ou similar)
- `[ ]` L4: Dataset proprietário: >1000h de CSI anotado
- `[ ]` L5: Relatório de benchmarks publicado (accuracy, latência, privacy)
- `[ ]` L6: Bankers engajados para processo de venda (Qatalyst ou similar)
- `[ ]` L7: NDA pipeline com potenciais acquirers (Qualcomm, Amazon, Google, Cisco, Apple)

---

## 📊 Progresso por Bloco

| Bloco | Área | Total | Completo | % |
|-------|------|-------|----------|---|
| A | Infraestrutura SaaS | 15 | 15 | 100% ✅ |
| B | Hardware Real | 16 | 0 | 0% 🔴 |
| C | Modelos IA Reais | 26 | 0 | 0% 🔴 |
| D | ZKP Reais | 11 | 6 | 54% 🟡 |
| E | gRPC Real | 11 | 4 | 36% 🟡 |
| F | Produto Comercial | 19 | 4 | 21% 🟡 |
| G | Integrações Externas | 9 | 0 | 0% 🟡 |
| H | Observabilidade | 16 | 6 | 37% 🟢 |
| I | Certificações | 19 | 0 | 0% 🟢 |
| J | Propriedade Intelectual | 8 | 0 | 0% 🟢 |
| K | Documentação Final | 7 | 0 | 0% 🟢 |
| L | Acquisition Ready | 11 | 0 | 0% 🟢 |
| **TOTAL** | | **166** | **33** | **20%** |

---

> **Próxima ação imediata:** Bloco B1 — comprar hardware (~€240) e fazer o primeiro CSI real fluir pelo pipeline. O código está pronto. O hardware é o único desbloqueador.
