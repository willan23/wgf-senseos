# Roadmap de Desenvolvimento — WGF SenseOS

**Última atualização:** 2026-06-17
**Estado:** Pronto para hardware (código 95% completo)

---

## Estado Atual

```
Código implementado:    ████████████████████  95%
Hardware integrado:     ██░░░░░░░░░░░░░░░░░░  10% (falta RPi 5)
Produção real:          ████████████████░░░░  80%
```

---

## Fases Concluídas

### ✅ Fase 1: Auditoria e Remoção de Mocks
- Todos os 37 mocks/placeholder identificados e substituídos
- TypeScript compila sem erros
- Modelos de inferência reais integrados

### ✅ Fase 2: Edge Agent Real
- Captura CSI via UDP Nexmon (porta 5500)
- Parsing binário (int16 + float)
- RF Fingerprint para anti-spoofing
- Instalação OpenWrt com systemd
- Test mode para desenvolvimento sem hardware

### ✅ Fase 3: Motor de Inferência Real
- Occupancy CNN (energy analysis)
- Fall Classifier (multi-stage)
- AoA Localization (MUSIC beamforming)
- Model Manager (lifecycle + health check)

### ✅ Fase 4: RF SLAM em TypeScript
- AoA Estimator (beamforming)
- ToF Estimator (phase slope)
- Multipath Analyzer (wall detection)
- Floor Plan Generator (geometric output)
- API endpoint `/api/rf-slam/map`

### ✅ Fase 5: Dashboard 3D
- Canvas 3D com projeção perspectiva
- Rotação/zoom interativo
- Toggle 2D/3D no mapa
- Paredes, sensores, grid 3D

### ✅ Fase 6: Analytics RAG
- Retriever Firestore (alerts, detections, sites)
- Prompt builder com contexto recuperado
- Response generator (LLM streaming + local fallback)
- API Route `/api/v1/analytics/chat`

### ✅ Fase 7: Privacy Core
- snarkjs Groth16 (quando circuitos compilados)
- HMAC-SHA256 fallback
- CSI frame redaction
- GDPR data subject requests

---

## Próximas Fases

### 🔜 Fase 8: Hardware e Validação
**Dependência:** Comprar Raspberry Pi 5

| Tarefa | Duração | Prioridade |
|--------|---------|-----------|
| Comprar RPi 5 + adaptador WiFi | 1 dia | Alta |
| Instalar Raspberry Pi OS Lite | 2h | Alta |
| Compilar firmware Nexmon | 4h | Alta |
| Testar captura CSI real | 4h | Alta |
| Validar edge agent com dados reais | 4h | Alta |

### 🔜 Fase 9: X-Fi Model Weights
**Dependência:** Download dos pesos XRF55

| Tarefa | Duração | Prioridade |
|--------|---------|-----------|
| Baixar pesos X-Fi XRF55 | 1h | Média |
| Testar X-Fi bridge | 2h | Média |
| Integrar gait signatures | 4h | Média |

### ✅ Fase 10: Deploy e CI/CD
- ✅ Firebase App Hosting configurado
- ✅ GitHub → Firebase auto-deploy ativo
- ✅ Next.js 16 + Turbopack build
- ✅ Pacotes @uwsc/* como file: dependencies
- 🔜 Monitoring (Datadog/Grafana)
- 🔜 Load testing (k6)

### 🔜 Fase 11: RF SLAM Completo
**Dependência:** Dados CSI reais

| Tarefa | Duração | Prioridade |
|--------|---------|-----------|
| Validar AoA com dados reais | 4h | Média |
| Calibrar ToF estimation | 4h | Média |
| Otimizar floor plan generator | 4h | Baixa |
| Dashboard 3D com Three.js real | 8h | Baixa |

---

## Fases Futuras (6-12 meses)

### Fase 12: Mobile App
- React Native
- Push notifications (FCM)
- Alertas em tempo real

### Fase 13: API Pública
- OpenAPI 3.1
- Rate limiting
- API keys
- RBAC

### Fase 14: Enterprise Security
- MFA/TOTP
- Audit logs avançados
- IP restrictions
- Session management

### Fase 15: IEEE 802.11bf
- Adaptação para novo padrão WiFi
- APIs nativas de routers comerciais

---

## Hardware Necessário (atualizado)

### Para MVP (1 pessoa)
| Componente | Qtd | Custo |
|------------|-----|-------|
| Raspberry Pi 5 (4GB) | 1 | ~€85 |
| Adaptador WiFi Nexmon | 1 | ~€15 |
| Cartão SD 32GB | 1 | ~€10 |
| Fonte USB-C 27W | 1 | ~€15 |
| **Total** | — | **~€125** |

### Para Produção (3 sensores)
| Componente | Qtd | Custo |
|------------|-----|-------|
| Raspberry Pi 5 (4GB) | 3 | ~€255 |
| Adaptadores WiFi Nexmon | 3 | ~€45 |
| Cartões SD 32GB | 3 | ~€30 |
| Fontes USB-C 27W | 3 | ~€45 |
| **Total** | — | **~€375** |

---

## Métricas de Sucesso

| Métrica | Target 6 meses | Target 12 meses |
|---------|----------------|-----------------|
| Clientes beta | 5-10 | 50-100 |
| MRR | €500-1000 | €5000-10000 |
| Sensores ativos | 20-50 | 200-500 |
| Locais mapeados | 10-20 | 100-200 |
