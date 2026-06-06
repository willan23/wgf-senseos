Atua como Arquiteto Principal de Sistemas, especialista em Wi-Fi Sensing, processamento de sinais RF, Edge Computing, TinyML, C++20, WebAssembly, Firebase, Google Cloud, segurança criptográfica e SaaS B2B.

Tenho um MVP chamado WGF SenseOS. Atualmente ele possui frontend Next.js, Firebase Authentication, Firestore, dashboard, modo simulado de CSI, mapa indoor, alertas, sensores simulados e documentação técnica.

Quero agora evoluir o projeto para uma arquitetura avançada chamada:

UWSC — Universal Wi-Fi Sensing Core

Objetivo:
Transformar o MVP atual numa arquitetura modular, defensável, escalável e preparada para hardware real, com 4 camadas principais:

1. Camada de Ingestão de Borda
2. Camada de Normalização Universal de CSI
3. Camada de IA/TinyML
4. Camada de API Criptográfica e Privacidade

A evolução deve ser feita sem destruir o sistema atual. O dashboard, autenticação, Firestore, organizações, sensores simulados, alertas e mapas devem continuar funcionando. Tudo que for novo deve ser integrado de forma modular e progressiva.

Regras obrigatórias:
- Não remover funcionalidades existentes.
- Não quebrar o modo simulado.
- Não fingir captura CSI real se ela ainda não existir.
- Tudo que for simulado deve continuar marcado como “Modo Simulado”.
- Tudo que for experimental deve aparecer como “Experimental / Lab Mode”.
- Separar claramente MVP, Lab Mode e Produção.
- Manter Firebase como base SaaS.
- Preparar Cloud Run para processamento mais pesado.
- Criar interfaces para trocar simulador por hardware real no futuro.
- Priorizar arquitetura limpa, testável e vendável para investidores/empresas.

==================================================
FASE 1 — REESTRUTURAÇÃO ARQUITETURAL UWSC
==================================================

Criar uma estrutura modular nova:

/packages
  /uwsc-core
    /src
      /types
      /ingestion
      /normalization
      /signal-processing
      /inference
      /privacy
      /transport
      /validation
      /adapters
      index.ts

  /uwsc-simulator
    /src
      /scenarios
      /generators
      /noise
      /motion
      /breathing
      /spoofing
      index.ts

  /uwsc-edge-protocol
    /src
      /protobuf
      /grpc
      /schemas
      /signing
      index.ts

  /uwsc-privacy-core
    /src
      /hashing
      /consent
      /zkp-placeholder
      /audit
      index.ts

/services
  /ingestion-api
  /signal-worker
  /inference-worker
  /privacy-worker

/edge-agent
  /mock-agent
  /openwrt-agent
  /raspberry-pi-agent
  /docs

/docs
  UWSC_ARCHITECTURE.md
  EDGE_AGENT_SPEC.md
  CSI_DATA_CONTRACT.md
  PRIVACY_PIPELINE.md
  HARDWARE_TRANSITION.md
  REAL_VS_EXPERIMENTAL.md

Criar primeiro a documentação da nova arquitetura e depois implementar os módulos.

==================================================
FASE 2 — CAMADA 1: INGESTÃO DE BORDA
==================================================

Implementar a Camada 1 como uma abstração universal de ingestão.

Criar interfaces TypeScript:

- CsiFrame
- SensorNode
- EdgeAgent
- IngestionSource
- HardwareFingerprint
- SensorHeartbeat
- IngestionMode

A ingestão deve suportar 3 modos:

1. simulation
   Dados vindos do simulador atual.

2. lab
   Dados importados de ficheiros CSV/JSON/PCAP convertidos.

3. live
   Dados futuros vindos de Edge Agent real em OpenWrt/Raspberry Pi.

Criar adaptadores:

- SimulationIngestionAdapter
- FileDatasetIngestionAdapter
- MockEdgeAgentAdapter
- FutureOpenWrtAdapter
- FutureNexmonAdapter

Criar função principal:

ingestCsiFrame(input: RawCsiInput): Promise<ValidatedCsiFrame>

Validações obrigatórias:
- organizationId obrigatório
- siteId obrigatório
- sensorId obrigatório
- timestamp válido
- assinatura do sensor, mesmo que mock
- número de subportadoras
- amplitude array
- phase array
- RSSI opcional
- noiseFloor opcional
- antennaIndex opcional
- firmwareVersion opcional
- ingestionMode obrigatório

Criar heartbeat de sensores:
- sensor online
- sensor offline
- latência
- última transmissão
- versão do agente
- modo: simulated/lab/live
- confiança da fonte

Adicionar no Firestore:
- /sensorHeartbeats
- /sensorStreams
- /edgeAgents
- /hardwareFingerprints

Criar Cloud Function:
- receiveCsiFrame
- receiveSensorHeartbeat
- registerEdgeAgent
- revokeEdgeAgent
- listEdgeAgents

==================================================
FASE 3 — ANTI-SPOOFING E HARDWARE FINGERPRINTING
==================================================

Criar módulo experimental:

/packages/uwsc-core/src/ingestion/antiSpoofing.ts

Implementar versão inicial heurística, não militar/falsa.

Funções:
- extractRfFingerprint()
- compareHardwareFingerprint()
- detectSpoofingAnomaly()
- scoreSignalAuthenticity()

No MVP/Lab Mode, isto deve usar métricas simuladas:
- phaseNoiseVariance
- iqImbalanceScore
- rssiDrift
- carrierFrequencyOffset
- packetTimingJitter

Retornar:
- authenticityScore: 0 a 1
- spoofingRisk: low/medium/high
- reasonCodes[]
- recommendedAction: accept/quarantine/reject

A UI deve mostrar:
- “Anti-Spoofing Experimental”
- score de autenticidade
- sensores suspeitos
- eventos rejeitados/quarentenados

Nunca afirmar que isto é segurança militar pronta para produção. Marcar como camada experimental.

==================================================
FASE 4 — CAMADA 2: NORMALIZAÇÃO UNIVERSAL DE CSI
==================================================

Criar a camada mais importante do sistema: Matrix Normalization Layer.

Objetivo:
Converter CSI bruto de diferentes fontes, padrões Wi-Fi e quantidades de subportadoras numa matriz tensorial padronizada.

Criar tipos:

- RawCsiFrame
- NormalizedCsiFrame
- CsiTensor
- NormalizationProfile
- SubcarrierMapping
- AntennaMatrix
- TemporalWindow

Criar funções:

normalizeCsiMatrix(rawFrame): NormalizedCsiFrame

standardizeSubcarriers(input, targetSubcarrierCount)

alignPhase(phaseArray)

normalizeAmplitude(amplitudeArray)

buildTemporalWindow(frames, windowSizeMs)

removeStaticComponents(frames)

applyPcaDenoising(tensor)

extractDynamicPerturbations(tensor)

O sistema deve suportar:
- Wi-Fi 5: 52 subportadoras úteis
- Wi-Fi 6: 242 subportadoras
- Wi-Fi 7: preparado para mais subportadoras
- simulação com 52 subportadoras
- datasets importados com formatos diferentes

A saída padrão deve ser:

T x S x A

Onde:
- T = tempo
- S = subportadoras normalizadas
- A = antenas/sensores

Criar testes unitários para:
- CSI com 52 subportadoras
- CSI com 242 subportadoras
- CSI incompleto
- CSI com ruído
- CSI simulado
- CSI de ficheiro importado

Criar documentação:
- como funciona a normalização
- o que ainda é heurístico
- como trocar por C++/WASM no futuro

==================================================
FASE 5 — PROCESSAMENTO DE SINAL
==================================================

Criar módulo:

/packages/uwsc-core/src/signal-processing

Funções obrigatórias:

applyButterworthBandpass()
extractBreathingBand()
extractGaitBand()
calculateMotionEnergy()
calculateRespirationFrequency()
detectStaticPresence()
detectMovementPattern()
estimateOccupancyFromSignal()
estimateFallFromZAxisPerturbation()
calculateConfidenceScore()

Faixas de referência:
- respiração: 0.1 Hz a 0.5 Hz
- locomoção/movimento humano: 1 Hz a 5 Hz

Implementar versão inicial em TypeScript, mas criar interface para futura versão C++/WASM:

SignalProcessorAdapter
- TypeScriptSignalProcessor
- WasmSignalProcessorPlaceholder
- CloudRunSignalProcessorPlaceholder

Cada resultado deve devolver:
- value
- confidence
- method
- limitations
- isSimulated
- processingMode

==================================================
FASE 6 — CAMADA 3: IA/TINYML
==================================================

Criar módulo:

/packages/uwsc-core/src/inference

Objetivo:
Separar inferência heurística atual da futura IA real.

Criar interfaces:

InferenceEngine
InferenceInput
InferenceResult
OccupancyModel
LocalizationModel
IdentificationModel
FallDetectionModel

Implementar motores:

1. HeuristicInferenceEngine
   Para produção MVP atual.

2. SimulatedScenarioInferenceEngine
   Para demos.

3. TinyMLRuntimePlaceholder
   Para futura execução no edge.

4. CloudRunInferenceEnginePlaceholder
   Para futura inferência pesada.

Funções:

estimateOccupancy()
estimateLocation()
detectFall()
classifyKnownSignature()
detectUnknownPresence()
generateHeatmap()
generateTrajectory()

A resposta deve conter:

{
  occupancyCount,
  persons[],
  zones[],
  alerts[],
  confidence,
  modelVersion,
  inferenceMode,
  privacyMode,
  rawDataRetained: false
}

Criar conceito de Model Registry:

/modelRegistry
  - modelId
  - version
  - type
  - status: heuristic/simulated/lab/production
  - accuracyEstimate
  - limitations
  - createdAt

Não usar TensorFlow/PyTorch se não for necessário agora. Criar só a arquitetura e os contratos. Preparar para INT8/TinyML no futuro.

==================================================
FASE 7 — CNN + SNN PLACEHOLDER
==================================================

Criar documentação e interfaces para arquitetura híbrida:

- CNN para extração espacial
- SNN para eventos/movimento
- quantização INT8
- runtime C++20/WASM

Criar ficheiros:

/packages/uwsc-core/src/inference/cnnSpatialModel.placeholder.ts
/packages/uwsc-core/src/inference/snnEventModel.placeholder.ts
/packages/uwsc-core/src/inference/tinymlRuntime.placeholder.ts

Esses ficheiros devem conter:
- interfaces reais
- comentários técnicos
- TODOs estruturados
- nenhum falso modelo treinado
- nenhum claim falso de precisão

Criar documentação:

/docs/TINYML_INFERENCE_PLAN.md

Incluir:
- como treinar futuramente
- que datasets serão necessários
- como validar precisão
- como compilar para WASM
- como rodar em Edge Agent
- como manter fallback heurístico

==================================================
FASE 8 — CAMADA 4: API CRIPTOGRÁFICA E PRIVACIDADE
==================================================

Criar módulo:

/packages/uwsc-privacy-core

Objetivo:
Garantir que o sistema nunca dependa de CSI bruto na nuvem.

Implementar:

generateEphemeralSignatureHash()
hashConsentProfile()
comparePrivacyPreservingSignature()
redactRawCsiFrame()
destroyRawFrameAfterProcessing()
writePrivacyAuditLog()
validateConsentBeforeIdentification()
createPrivacySafeEvent()

Importante:
Nesta fase, não implementar ZKP real se não houver circuito criptográfico real. Criar:

- ZkpProofPlaceholder
- PrivacyHashV1
- ConsentSignatureV1

A UI e documentação devem explicar:
“Esta versão usa hash criptográfico e consentimento explícito. ZKP completo está planeado para uma fase posterior.”

Nunca chamar hash simples de ZKP real.

Privacidade obrigatória:
- identificação desativada por padrão
- perfis consentidos opt-in
- empresas veem dados agregados por padrão
- CSI bruto não armazenado por padrão
- modo laboratório pode guardar CSI bruto apenas com flag explícita
- todo acesso sensível gera audit log
- eliminação de consent profile deve apagar hash e histórico associado quando aplicável

Atualizar Firestore:
- /consentProfiles
- /privacyEvents
- /auditLogs
- /dataRetentionPolicies

Criar regras:
- só owner/admin pode gerir consent profiles
- viewer nunca vê dados sensíveis
- analyst vê analytics agregados
- admin global não deve ver CSI bruto sem modo lab autorizado

==================================================
FASE 9 — TRANSPORTE: gRPC / PROTOBUF / JSON FALLBACK
==================================================

Criar contratos de transporte:

/packages/uwsc-edge-protocol

Criar schemas:
- CsiFrame.proto
- SensorHeartbeat.proto
- InferenceEvent.proto
- PrivacySafeEvent.proto
- AlertEvent.proto

Criar também JSON fallback para Firebase Functions.

A arquitetura deve aceitar:
- Edge Agent -> Cloud Function HTTPS
- Edge Agent -> Cloud Run gRPC futuro
- Simulador -> Firestore local
- Dataset importado -> Signal Worker

Criar validação Zod para todos os payloads.

==================================================
FASE 10 — INTEGRAÇÃO COM FIREBASE ATUAL
==================================================

Integrar UWSC ao sistema existente sem quebrar dashboard.

Atualizar frontend:
- /dashboard/sensors
- /dashboard/map
- /dashboard/analytics
- /dashboard/alerts
- /dashboard/privacy
- /dashboard/lab
- /dashboard/uwsc

Nova página:
/dashboard/uwsc

Deve mostrar:
- estado da Camada 1 — Ingestão
- estado da Camada 2 — Normalização
- estado da Camada 3 — Inferência
- estado da Camada 4 — Privacidade
- modo atual: Simulado / Lab / Live
- frames processados
- frames rejeitados
- latência média
- confiança média
- sensores ativos
- eventos privacy-safe enviados
- raw CSI retention: on/off

Criar visual “pipeline inspector”:
Sensor -> Ingestão -> Normalização -> Signal Processing -> Inferência -> Privacy API -> Dashboard

Cada etapa deve mostrar:
- input
- output
- status
- tempo de processamento
- erros
- warnings
- se é simulado ou real

==================================================
FASE 11 — TRANSIÇÃO DO SIMULADOR PARA SENSORSTREAMS
==================================================

O sistema atual usa simulador local. Evoluir para arquitetura “ready to swap”.

Criar DataSourceManager:

- useSimulationSource()
- useFirestoreSensorStreamSource()
- useDatasetReplaySource()
- useLiveEdgeSourcePlaceholder()

Criar hook:

useUwscPipeline({
  organizationId,
  siteId,
  mode
})

O hook deve:
- receber frames
- normalizar
- processar
- inferir
- gerar eventos privacy-safe
- atualizar dashboard
- criar alertas se necessário

Não apagar useSimulation atual. Adaptar gradualmente.

==================================================
FASE 12 — LAB MODE: IMPORTAÇÃO DE DATASETS
==================================================

Criar página:

/dashboard/lab/datasets

Permitir:
- upload CSV
- upload JSON
- replay de dataset
- escolher velocidade do replay
- ver frames
- processar pelo pipeline
- comparar resultado esperado vs resultado inferido

Criar coleção:
- /datasets
- /datasetRuns

Criar storage path:
- /organizations/{orgId}/datasets/{datasetId}

Marcar sempre como Lab Mode.

==================================================
FASE 13 — EDGE AGENT MOCK
==================================================

Criar Edge Agent mock em Node.js ou Python:

/edge-agent/mock-agent

Ele deve:
- ler .env
- identificar organizationId, siteId e sensorId
- gerar heartbeat
- gerar frames CSI simulados
- assinar payload com chave mock
- enviar para Cloud Function receiveCsiFrame
- simular perda de conexão
- simular spoofing
- simular queda
- simular intruso

Criar README com:
- instalação
- configuração
- execução
- exemplo de payload
- limitações

==================================================
FASE 14 — OPENWRT / RASPBERRY PI FUTURO
==================================================

Criar apenas documentação e stubs, sem fingir suporte real.

Criar:

/edge-agent/openwrt-agent/README.md
/edge-agent/raspberry-pi-agent/README.md

Explicar:
- requisitos de chipset
- OpenWrt
- Nexmon
- CSI real
- limitações
- plano de integração
- riscos técnicos
- como o pacote .ipk seria estruturado no futuro
- como o agente enviaria dados para o backend

Criar interface:

HardwareCsiProvider

Implementações placeholder:
- OpenWrtCsiProviderPlaceholder
- NexmonCsiProviderPlaceholder
- IEEE80211bfProviderPlaceholder

==================================================
FASE 15 — SEGURANÇA E FIRESTORE RULES
==================================================

Atualizar regras Firestore para novas coleções.

Regras:
- isolamento por organizationId
- edgeAgents só escrevem em endpoints autorizados
- sensorStreams não podem ser lidos diretamente por viewers
- rawCsiFrames só em lab mode e admin/owner
- auditLogs append-only
- consentProfiles protegidos
- privacyEvents acessíveis conforme role
- alerts acessíveis à organização

Criar validações server-side nas Cloud Functions.

Criar rate limit básico por sensorId e organizationId.

Criar bloqueio:
- sensor não registado não envia frame
- sensor revogado não envia frame
- payload sem assinatura é rejeitado
- timestamp muito antigo é rejeitado
- organizationId inconsistente é rejeitado

==================================================
FASE 16 — OBSERVABILIDADE
==================================================

Criar logs estruturados:

- ingestion.frame.received
- ingestion.frame.rejected
- normalization.completed
- inference.completed
- privacy.raw_destroyed
- alert.created
- sensor.offline
- spoofing.suspected
- consent.profile.created
- consent.profile.deleted

Criar métricas internas:
- frames por minuto
- latência média
- taxa de rejeição
- confiança média
- sensores offline
- alertas críticos
- uso por organização

Criar página:
/admin/observability

==================================================
FASE 17 — REAL VS SIMULATED ATUALIZADO
==================================================

Atualizar documentação:

/docs/REAL_VS_SIMULATED.md

Separar em 4 estados:

1. Real
   Firebase Auth, Firestore, dashboard, regras, audit logs.

2. Simulado
   CSI sintético, cenários, localização sintética.

3. Lab
   datasets importados, replay, processamento experimental.

4. Futuro/Não Implementado
   captura CSI real, OpenWrt real, Nexmon real, TinyML real, ZKP completo real.

Essa transparência é obrigatória para evitar claims falsos.

==================================================
FASE 18 — ROADMAP TÉCNICO
==================================================

Atualizar roadmap:

Fase A — MVP Simulado
Fase B — UWSC Core Modular
Fase C — Lab Mode com datasets reais
Fase D — Edge Agent Mock
Fase E — Raspberry Pi/Nexmon
Fase F — OpenWrt Agent
Fase G — Cloud Run Signal Worker
Fase H — TinyML/WASM
Fase I — Privacy Hash v2 / ZKP real
Fase J — Enterprise Pilot

Para cada fase indicar:
- objetivo
- entregável
- risco técnico
- custo provável
- dificuldade
- o que prova para investidores

==================================================
FASE 19 — CRITÉRIOS DE ACEITAÇÃO
==================================================

A implementação só está correta se:

- O dashboard atual continuar funcionando.
- O modo simulado continuar funcionando.
- Existir /dashboard/uwsc com pipeline visual.
- Existir DataSourceManager.
- Existir uwsc-core separado.
- Existir normalização CSI modular.
- Existir ingestão com modos simulation/lab/live.
- Existir privacy-core.
- Existir Edge Agent mock.
- Existirem regras Firestore para novas coleções.
- Existir documentação clara.
- Nenhuma parte experimental for apresentada como produção.
- Nenhum dado bruto CSI for armazenado por padrão.
- Consentimento for obrigatório para identificação.
- O sistema estiver preparado para substituir simulação por sensorStreams reais.

==================================================
FASE 20 — ORDEM DE EXECUÇÃO
==================================================

Executa nesta ordem:

1. Ler a estrutura atual do projeto.
2. Mapear onde estão dashboard, simulador, hooks e Firebase.
3. Criar plano de migração sem quebrar nada.
4. Criar packages UWSC.
5. Criar tipos compartilhados.
6. Criar ingestão.
7. Criar normalização.
8. Criar signal-processing.
9. Criar inference.
10. Criar privacy-core.
11. Criar Cloud Functions.
12. Criar DataSourceManager.
13. Criar página /dashboard/uwsc.
14. Criar Edge Agent mock.
15. Atualizar regras Firestore.
16. Atualizar documentação.
17. Criar testes.
18. Corrigir erros de build.
19. Garantir que npm run build passa.
20. Entregar resumo final do que foi alterado.

No final, entregar:
- lista de ficheiros criados;
- lista de ficheiros alterados;
- instruções para rodar local;
- instruções para testar o Edge Agent mock;
- instruções para testar o pipeline UWSC;
- explicação do que é real, simulado, lab e futuro;
- próximos passos para integrar hardware real.