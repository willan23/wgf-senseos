# Plano de Implementação — WGF SenseOS

## Contexto

O WGF SenseOS é uma plataforma SaaS de segurança e inteligência espacial baseada em Wi-Fi Sensing (CSI).
Atualmente opera em modo simulação com mocks e placeholders. O objetivo é elevar a plataforma de um MVP
simulado para produção real, integrando repositórios open-source de estado-da-arte.

**Arquitetura de 5 Camadas:**
- Camada 1/1.5: Captura física (Hardware/Nexmon) e verificação IP/Anti-Spoofing
- Camada 2: Processamento de Sinal (PCA, Butterworth) e RF SLAM (Floor Plan)
- Camada 3: Inferência em Borda (TinyML/Foundation Models) — contagem, localização, gait
- Camada 4: Criptografia ZKP (Zero-Knowledge Proofs) — conformidade GDPR/Privacidade
- Camada 5: Nuvem e Dashboard (Next.js, Firebase, Firestore, Analytics Conversacional)

---

## Scope — O que vamos implementar

| # | Módulo | Repos Fonte | Impacto | Risco |
|---|--------|-------------|---------|-------|
| A | **Edge Agent Real (Borda e Hardware)** | `nexmon_csi` | Alto — elimina simulação de dados | Médio |
| B | **RF SLAM e Mapeamento Espacial** | `P2SLAM-sim`, `WAIS` | Alto — gera floor plans reais | Alto |
| C | **Motor de Inferência X-Fi** | `X-Fi`, `Awesome-WiFi-CSI-Sensing` | Crítico — substitui modelos simulados | Médio |
| D | **Analytics RAG Conversacional** | `HoloLLM`, `IoT-Agent` | Alto — permite queries em linguagem natural | Baixo |

> [!IMPORTANT]
> Tudo é **opt-in e backwards-compatible**. Os mocks existentes continuam a funcionar como fallback
> quando os componentes reais não estão disponíveis.

---

## Estado Atual do Código

### O que já é REAL (produção):
- 7 API routes com pipeline completo (anti-spoofing, normalização, inferência, Firestore)
- Sinalização: Butterworth bandpass, DFT, heurística de queda, PCA simplificado
- Normalização CSI: interpolação de subportadoras, alinhamento de fase, z-score, janela temporal 3D
- Protocolo de transporte: JSON MessageEnvelope + Protobuf binário
- Anti-spoofing: extração de fingerprint RF (phase noise, IQ imbalance, CFO, jitter, RSSI drift)
- ZKP: 3 circuitos circom (person_present, fall_detected, known_person) com Poseidon hash
- Privacy core: SHA-256, HMAC-SHA256, gait hashing, CSI redaction, snarkjs Groth16
- Firebase: Firestore CRUD completo para sensores, sites, zonas, alerts, detections, audit logs
- Billing: Stripe checkout + webhooks
- Auth: Dual-mode (Firebase Auth + sim bypass)
- X-Fi bridge: Python PyTorch inference bridge (requer pesos do modelo)

### O que é SIMULADO/PLACEHOLDER:
- Todos os modelos AI no registry (CNN occupancy, SNN motion, AoA localization, fall classifier)
- X-Fi model: bridge existe mas status `unavailable` (precisa de pesos)
- Contagem de pessoas: heurística de energia, não CNN
- Detecção de queda: heurística spike + near-zero, não classificador treinado
- Localização: geração aleatória de posições (não triangulação AoA/ToF)
- Geração de dados CSI: todos os 7 cenários são modulações sintéticas
- Assinaturas de gait: hashes placeholder até o modelo X-Fi ser carregado
- ZKP proofs: fallback para HMAC quando circuitos não compilados

### O que NÃO está implementado:
- Edge agent real para OpenWrt/Raspberry Pi (mock-agent é simulação)
- Processamento de sinal C++/WASM para borda
- Integração com hardware Nexmon real
- RF SLAM / geração de floor plans
- Pipeline RAG para analytics conversacionais

---

## Módulo A — Edge Agent Real (Borda e Hardware)

### Objetivo
Substituir o `edge-agent/mock-agent/` por um agent real que rode num Raspberry Pi 4
com OpenWrt + firmware Nexmon, extraia matrizes CSI brutas e envie via protocolo seguro.

### Repos Fonte: `nexmon_csi`

### Arquivos a Criar

```
edge-agent/
├── real-agent/
│   ├── csi_capture.py          [NEW] — Captura CSI via Nexmon (socket UDP)
│   ├── csi_processor.py        [NEW] — Processamento em tempo real (amp/phase extraction)
│   ├── ingestion_client.py     [NEW] — Cliente HTTP/Protobuf para envio ao servidor
│   ├── anti_spoofing.py        [NEW] — Geração de fingerprint RF local
│   ├── config.yaml             [NEW] — Configuração do agent (sensor ID, org, server)
│   ├── requirements.txt        [NEW] — Dependências Python
│   ├── install.sh              [NEW] — Script de instalação no OpenWrt
│   └── systemd/
│       └── csi-agent.service   [NEW] — Service file para systemd
```

### Funcionamento
1. `csi_capture.py` escuta pacotes UDP do Nexmon CSI Tool (porta 5500)
2. Extrai matrizes de subportadoras (amplitude/fase) de cada pacote
3. `anti_spoofing.py` gera RF fingerprint local (phase noise, IQ imbalance, CFO)
4. `csi_processador.py` aplica timestamp e empacota em MessageEnvelope
5. `ingestion_client.py` envia batch via HTTP POST ou gRPC para `/api/uwsc/ingest`
6. Heartbeat a cada 30s via `/api/uwsc/heartbeat`

### Formato de Dado Nexmon
- Pacote UDP com header customizado + CSI matrix
- 52 subportadoras × 2 (amplitude + phase) por stream
- Taxa: ~100 frames/segundo por interface WiFi

---

## Módulo B — RF SLAM e Mapeamento Espacial

### Objetivo
Desenvolver pipeline na Camada 2 que utilise ruído estático (multipath) e AoA para
gerar floor plans geométricos exportáveis para o dashboard Next.js.

### Repos Fonte: `P2SLAM-sim`, `WAIS`

### Arquivos a Criar/Modificar

```
packages/uwsc-core/src/
├── rf-slam/
│   ├── index.ts                [NEW] — Pipeline RF SLAM principal
│   ├── aoa-estimator.ts        [NEW] — Estimativa de Angle of Arrival (MUSIC/ESPRIT)
│   ├── tof-estimator.ts        [NEW] — Estimativa de Time of Flight
│   ├── multipath-analyzer.ts   [NEW] — Análise de multipath para detecção de obstáculos
│   ├── floor-plan-generator.ts [NEW] — Geração de floor plan geométrico
│   └── types.ts                [NEW] — Tipos RF SLAM (Wall, Obstacle, FloorPlan, etc.)

wgf-senseos/app/api/
├── rf-slam/
│   ├── map/route.ts            [NEW] — API para gerar/atualizar floor plan
│   └── stream/route.ts         [NEW] — SSE para atualizações em tempo real

wgf-senseos/app/dashboard/map/
└── page.tsx                    [MODIFY] — Renderizar floor plan real vs simulado
```

### Algoritmo
1. **AoA Estimation**: MUSIC algorithm para estimar ângulos de chegada do sinal
2. **ToF Estimation**: Cross-correlation para estimar tempo de voo
3. **Multipath Analysis**: Identificar reflexões em paredes/obstáculos
4. **Floor Plan Generation**: Triangulação inversa para coordenadas 2D
5. **Export**: Formato JSON com paredes, portas, janelas, zonas

### Output esperado
```json
{
  "type": "floor_plan",
  "siteId": "...",
  "version": 1,
  "walls": [{ "x1": 0, "y1": 0, "x2": 5, "y2": 0, "type": "solid" }],
  "obstacles": [{ "x": 2.5, "y": 2.5, "radius": 0.3, "type": "furniture" }],
  "zones": [{ "id": "z1", "name": "Sala", "polygon": [[0,0],[5,0],[5,4],[0,4]] }],
  "sensors": [{ "id": "s1", "x": 1, "y": 1, "antennas": 3 }],
  "confidence": 0.87
}
```

---

## Módulo C — Motor de Inferência X-Fi Real

### Objetivo
Substituir os modelos simulados por inferência real utilizando o X-Fi Foundation Model.

### Repos Fonte: `X-Fi`, `Awesome-WiFi-CSI-Sensing`

### Arquivos a Criar/Modificar

```
packages/uwsc-core/src/inference/
├── index.ts                    [MODIFY] — Registry com modelos reais
├── xfiAdapter.ts               [MODIFY] — Já implementado, ativar quando pesos disponíveis
├── xfiRuntime.ts               [NEW] — Runtime client para X-Fi bridge (subprocess)
├── occupancyModel.ts           [NEW] — CNN real para contagem de pessoas
├── fallModel.ts                [NEW] — Classificador de queda treinado
├── locationModel.ts            [NEW] — Triangulação AoA/ToF real
└── modelManager.ts             [NEW] — Gerenciamento de lifecycle dos modelos

edge-agent/xfi_bridge/
├── xfi_infer.py                [MODIFY] — Já existe, melhorar error handling
├── occupancy_infer.py          [NEW] — Inferência de contagem via CNN
├── fall_infer.py               [NEW] — Inferência de queda via classificador
└── requirements.txt            [MODIFY] — Adicionar dependências
```

### Estratégia de Implementação
1. **X-Fi Gait**: Bridge já existe (`xfi_infer.py`). Ativar quando pesos estiverem disponíveis.
2. **Occupancy CNN**: Exportar modelo treinado para ONNX, rodar via onnxruntime
3. **Fall Classifier**: Treinar classificador simple com dados sintéticos primeiro, depois real
4. **AoA Localization**: Implementar triangulação real baseada em MUSIC + ToF
5. **Model Manager**: Lifecycle completo (load, unload, hot-swap, health check)

### Mudanças no Registry
```typescript
// Modelos reais substituem simulados
{
  id: 'cnn-occ-v2',
  type: 'cnn_occupancy',
  version: '2.0.0',
  backend: 'onnx_runtime',  // ← era 'simulation'
  status: 'active',         // ← era 'simulated'
  isEdge: true,
}
```

---

## Módulo D — Analytics RAG Conversacional

### Objetivo
Criar API Route `/api/v1/analytics/chat` com pipeline RAG que permite
perguntas em linguagem natural sobre histórico de ocupação e segurança.

### Repos Fonte: `HoloLLM`, `IoT-Agent`

### Arquivos a Criar

```
wgf-senseos/app/api/v1/analytics/
├── chat/route.ts               [NEW] — API Route principal
├── ingest/route.ts             [NEW] — Indexação de dados no Firestore
└── rag/
    ├── embeddings.ts           [NEW] — Geração de embeddings para RAG
    ├── retriever.ts            [NEW] — Recuperação de contexto do Firestore
    ├── prompt-builder.ts       [NEW] — Construção de prompts com contexto
    └── response-generator.ts   [NEW] — Geração de resposta final

packages/uwsc-core/src/analytics/
├── index.ts                    [NEW] — Barrel export
├── rag-pipeline.ts             [NEW] — Pipeline RAG completa
├── context-builder.ts          [NEW] — Construção de contexto a partir de alerts/detections
└── types.ts                    [NEW] — Tipos Analytics
```

### Pipeline RAG
1. **Indexação**: Dados de alerts/detections são indexados com embeddings semânticos
2. **Retriever**: Dado uma query do utilizador, busca contexto relevante no Firestore
3. **Prompt Builder**: Monta prompt com contexto recuperado + query do utilizador
4. **Response Generator**: Gera resposta em linguagem natural usando LLM
5. **Streaming**: Resposta enviada via SSE para UI responsiva

### Exemplo de Uso
```
Utilizador: "Quantas pessoas passaram no corredor hoje?"
Sistema: RAG recupera detections do corredor de hoje → Gera resposta:
"Hoje detetaram-se 12 passagens no corredor principal, com pico às 14:30."
```

---

## Ficheiros Afetados (Resumo)

```
WGF SenseOS/
├── edge-agent/
│   ├── mock-agent/             [EXISTE] — mantido como fallback
│   ├── real-agent/             [NEW]    — edge agent para Raspberry Pi
│   └── xfi_bridge/             [MODIFY] — melhorar + adicionar modelos
├── packages/
│   ├── uwsc-core/src/
│   │   ├── rf-slam/            [NEW]    — RF SLAM e mapeamento
│   │   ├── inference/          [MODIFY] — substituir simulados por reais
│   │   └── analytics/          [NEW]    — RAG pipeline
│   ├── uwsc-edge-protocol/     [EXISTE] — inalterado
│   └── uwsc-privacy-core/      [EXISTE] — inalterado
├── wgf-senseos/
│   ├── app/
│   │   ├── api/
│   │   │   ├── uwsc/           [EXISTE] — inalterado
│   │   │   ├── rf-slam/        [NEW]    — APIs de mapeamento
│   │   │   └── v1/analytics/   [NEW]    — RAG chat API
│   │   └── dashboard/
│   │       └── map/page.tsx    [MODIFY] — renderizar floor plan real
│   └── lib/
│       └── server/
│           └── xfi-runtime.ts  [MODIFY] — melhorar integração
├── Evolução.md                 [EXISTE] — referência
└── implementation_plan.md      [MODIFY] — este ficheiro
```

---

## Ordem de Implementação

| Fase | Módulo | Dependências | Esforço Est. |
|------|--------|--------------|--------------|
| 1 | Módulo C (X-Fi Inferência) | Nenhuma | 2-3 dias |
| 2 | Módulo A (Edge Agent) | Módulo C | 2-3 dias |
| 3 | Módulo B (RF SLAM) | Nenhuma | 3-4 dias |
| 4 | Módulo D (Analytics RAG) | Módulos A+C | 1-2 dias |

> Começamos pelo Módulo C porque o X-Fi bridge já existe e é o componente mais crítico.

---

## Verification Plan

### Módulo A — Edge Agent
```bash
# 1. Testar captura CSI (simulada) com o novo agent
cd edge-agent/real-agent
python csi_capture.py --test-mode

# 2. Verificar ingestion no servidor
curl -X POST http://localhost:3000/api/uwsc/ingest \
  -H "Content-Type: application/json" \
  -d @test_payload.json

# 3. Heartbeat
curl -X POST http://localhost:3000/api/uwsc/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"test","orgId":"test","status":"online"}'
```

### Módulo B — RF SLAM
```bash
# 1. Gerar floor plan a partir de dados CSI simulados
curl -X POST http://localhost:3000/api/rf-slam/map \
  -H "Content-Type: application/json" \
  -d '{"siteId":"test","csiData":[...]}'

# 2. Verificar output JSON
# 3. Renderizar no dashboard /dashboard/map
```

### Módulo C — X-Fi Inferência
```bash
# 1. Smoke test do modelo real (quando pesos disponíveis)
cd edge-agent/xfi_bridge
XFI_REPO_DIR=/path/to/X-Fi XFI_WEIGHTS_PATH=/path/to/weights \
  python xfi_infer.py < test_request.json

# 2. Verificar que modelos simulados são substituídos
# 3. Comparar latência: simulado vs real
```

### Módulo D — Analytics RAG
```bash
# 1. Testar endpoint de chat
curl -X POST http://localhost:3000/api/v1/analytics/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Quantas pessoas passaram hoje?","orgId":"test"}'

# 2. Verificar streaming de resposta
# 3. Testar com diferentes queries
```
