Atua como Arquiteto Principal de Software, Engenheiro de IA aplicada a sinais RF/Wi-Fi, especialista em Firebase/Google Cloud e Designer de Produto SaaS B2B.

Quero criar do zero uma plataforma chamada “WGF SenseOS” — um SaaS privacy-first de Wi-Fi Sensing para contagem de pessoas, localização indoor e identificação consentida por padrões de movimento/respiração, com foco em segurança residencial sem câmaras e analytics corporativo.

IMPORTANTE:
Este MVP deve ser tecnicamente honesto. A versão inicial deve funcionar com dados CSI simulados e/ou datasets importados, porque a captura real de CSI depende de hardware/firmware compatível. Não quero falsas promessas. Sempre que uma função ainda for simulada, a UI deve indicar claramente “Modo Simulado”. O sistema deve ser preparado para receber sensores reais no futuro via Edge Agent/OpenWrt/firmware compatível.

Decisão de stack:
Usar Firebase-first, não Vercel nesta versão inicial.

Stack obrigatória:
- Frontend: Next.js com App Router, TypeScript, TailwindCSS ou Material UI, componentes profissionais, responsivo.
- Hosting: Firebase App Hosting ou Firebase Hosting.
- Auth: Firebase Authentication.
- Database: Cloud Firestore.
- Backend: Firebase Cloud Functions em TypeScript para APIs principais.
- Processamento de sinal/IA inicial: funções Python ou módulo separado preparado para Cloud Run futuramente.
- Storage: Firebase Storage para uploads de datasets CSV/JSON.
- Logs: Firestore audit logs + Cloud Logging-ready.
- Realtime: Firestore listeners para dashboard em tempo real.
- Testes: unit tests para lógica crítica e documentação clara.
- Deploy: firebase.json, firestore.rules, firestore.indexes.json, .env.example, README.md completo.

Objetivo do MVP:
Construir uma plataforma funcional onde uma empresa ou residência possa:
1. Criar conta.
2. Criar organização.
3. Criar local/site.
4. Criar mapa/planta simples do espaço.
5. Criar zonas: sala, corredor, loja, escritório, quarto, entrada.
6. Adicionar sensores Wi-Fi simulados.
7. Receber stream simulado de CSI.
8. Processar amplitude/fase simuladas.
9. Mostrar:
   - número estimado de pessoas;
   - localização aproximada no mapa;
   - trajetória temporal;
   - alertas de presença desconhecida;
   - mapas de calor;
   - ocupação por zona;
   - estado dos sensores;
   - logs e histórico.
10. Ter modo Residencial e modo Corporativo.

Contexto técnico do produto:
O sistema deve seguir a arquitetura Universal Wi-Fi Sensing Core:
- Camada 1: Ingestão de Borda / Sensor Gateway.
- Camada 2: Normalização Universal de Matriz CSI.
- Camada 3: Motor TinyML/IA para inferência.
- Camada 4: API criptográfica/privacy-first para entregar apenas eventos anonimizados.

No MVP, criar essas camadas como módulos separados, mesmo que alguns sejam stubs ou simuladores. A estrutura deve permitir substituir dados simulados por CSI real no futuro sem refazer o dashboard.

Funcionalidades principais:

1. Landing Page
Criar página inicial profissional explicando:
- O que é Wi-Fi Sensing.
- Como funciona sem câmaras.
- Casos de uso:
  - segurança residencial;
  - deteção de intrusão;
  - deteção de queda;
  - contagem de pessoas;
  - analytics de lojas;
  - ocupação de salas;
  - automação de climatização/iluminação.
- Benefícios:
  - sem câmaras;
  - privacidade por design;
  - dados anonimizados;
  - baixo custo;
  - compatível com futura integração de hardware.
- Secção “Modo Demo vs Hardware Real”.
- Call-to-action: “Entrar no Dashboard”.

2. Autenticação
Criar:
- Login.
- Registo.
- Recuperação de password.
- Proteção de rotas.
- RBAC:
  - owner;
  - admin;
  - analyst;
  - viewer.
- Cada utilizador pertence a uma organização.

3. Dashboard principal
Criar dashboard com:
- Total de pessoas presentes agora.
- Sensores online/offline.
- Alertas ativos.
- Ocupação por zona.
- Gráfico temporal de presença.
- Últimos eventos.
- Modo ativo: Residencial ou Corporativo.
- Botão para iniciar/parar simulação em tempo real.

4. Mapa indoor
Criar uma tela visual com planta simples 2D:
- Zonas desenhadas em cards/grid.
- Pontos representando pessoas detetadas.
- Sensores posicionados no mapa.
- Trajetória recente.
- Diferenciar:
  - pessoa conhecida;
  - pessoa desconhecida;
  - presença anónima;
  - possível queda.
- Tudo deve funcionar com dados simulados.

5. Motor de simulação CSI
Criar módulo “csi-simulator” que gere dados sintéticos:
- amplitude;
- fase;
- subportadoras;
- timestamp;
- sensorId;
- ruído ambiental;
- eventos de movimento;
- padrões respiratórios simples;
- trajetórias X/Y/Z.
O simulador deve permitir cenários:
- casa vazia;
- uma pessoa entra;
- duas pessoas caminham;
- pessoa parada respirando;
- queda simulada;
- intruso desconhecido;
- loja com fluxo de clientes.

6. Pipeline de sinal
Criar módulo “signal-core” com funções bem separadas:
- normalizeCsiMatrix()
- removeStaticNoise()
- extractMotionFeatures()
- estimateOccupancy()
- estimateLocation()
- detectFallEvent()
- classifyKnownSignature()
- generatePrivacyPreservingHash()

Mesmo que os algoritmos sejam simplificados no MVP, criar interfaces reais e documentação para substituir por modelos avançados no futuro.

7. Motor de IA inicial
Criar um motor heurístico inicial, sem fingir deep learning real:
- Regras matemáticas para estimar presença por variação de amplitude.
- Regras para movimento por variação temporal.
- Regras para queda por mudança abrupta no eixo Z.
- Identificação apenas por perfis consentidos e simulados.
- Criar interface preparada para depois trocar por CNN/LSTM/Transformer/TinyML.

8. Privacidade e conformidade
Isto é obrigatório:
- Não armazenar CSI bruto por padrão.
- Criar opção “guardar CSI bruto” apenas em modo laboratório.
- Criar consent_profiles para identificação de pessoas conhecidas.
- Identificação deve ser desativada por padrão.
- Por padrão, empresas só devem ver dados agregados/anónimos.
- Criar página de privacidade.
- Criar audit log de acesso a dados sensíveis.
- Criar avisos de consentimento.
- Criar modo GDPR-ready.
- Criar explicação clara: “este sistema não usa câmara nem imagem visual”.

9. Alertas
Criar sistema de alertas:
- presença desconhecida em modo residencial;
- queda possível;
- sensor offline;
- ocupação acima do limite;
- zona restrita ocupada;
- anomalia de sinal;
- simulação de spoofing RF.
Cada alerta deve ter:
- severidade;
- timestamp;
- zona;
- status: aberto, reconhecido, resolvido;
- responsável;
- histórico.

10. Modo Residencial
Criar UI focada em:
- casa protegida;
- familiares presentes;
- intruso desconhecido;
- possível queda;
- horários de presença;
- notificações silenciosas.

11. Modo Corporativo
Criar UI focada em:
- ocupação por sala;
- mapa de calor;
- fluxo por zona;
- taxa de utilização;
- horários de pico;
- otimização de recursos;
- exportação CSV/PDF dos relatórios.

12. Admin SaaS
Criar painel admin separado:
- organizações;
- utilizadores;
- sensores;
- planos;
- uso mensal;
- eventos processados;
- logs;
- billing mock;
- flags de funcionalidades.
Criar planos:
- Free Demo;
- Residential;
- Business;
- Enterprise.

13. Estrutura de dados Firestore
Criar coleções:
- users
- organizations
- organizationMembers
- sites
- zones
- sensors
- sensorStreams
- detections
- alerts
- consentProfiles
- auditLogs
- simulationRuns
- billingPlans
- featureFlags

Definir tipos TypeScript para tudo.

14. Segurança
Implementar:
- Firestore Security Rules robustas.
- Separação por organizationId.
- Utilizador só acede aos dados da própria organização.
- Admin global separado.
- Validação com Zod em todas as APIs.
- Rate limiting básico nas Cloud Functions.
- Sanitização de inputs.
- Nunca expor chaves privadas no frontend.
- Criar .env.example sem segredos reais.

15. Design
Criar interface premium, futurista e limpa:
- Visual escuro profissional.
- Cards com glassmorphism moderado.
- Gráficos modernos.
- Layout responsivo.
- Dashboard com aparência de produto enterprise.
- Não criar UI infantil.
- Design deve parecer vendável para investidores e empresas.
- Criar microcopy em português.
- Preparar i18n para inglês e francês, mas português deve ser padrão.

16. Páginas obrigatórias
Criar:
- /
- /login
- /register
- /dashboard
- /dashboard/map
- /dashboard/analytics
- /dashboard/alerts
- /dashboard/sensors
- /dashboard/sites
- /dashboard/privacy
- /dashboard/settings
- /admin
- /admin/organizations
- /admin/users
- /admin/billing
- /admin/logs

17. Edge Agent futuro
Criar pasta “edge-agent” com documentação e stub:
- README explicando futura integração com OpenWrt/CSI real.
- Mock agent que envia dados simulados para uma Cloud Function.
- Estrutura preparada para:
  - sensorId;
  - siteId;
  - organizationId;
  - assinatura do dispositivo;
  - heartbeat;
  - envio de frames CSI.
Não implementar captura real de Wi-Fi nesta fase, apenas preparar a arquitetura.

18. API
Criar endpoints/funções:
- createOrganization
- createSite
- createZone
- registerSensor
- receiveSensorHeartbeat
- ingestSimulatedCsiFrame
- startSimulation
- stopSimulation
- listDetections
- createAlert
- acknowledgeAlert
- resolveAlert
- exportAnalytics
- createConsentProfile
- deleteConsentProfile
- writeAuditLog

19. Dados demo
Criar seed script com:
- organização demo;
- casa demo;
- loja demo;
- sensores demo;
- zonas demo;
- eventos demo;
- alertas demo;
- simulação de intruso;
- simulação de loja cheia;
- simulação de queda.

20. Entregáveis finais
No final, entregar:
- código completo;
- estrutura de pastas;
- instruções para instalar;
- instruções para configurar Firebase;
- instruções para rodar local;
- instruções para deploy;
- exemplos de regras Firestore;
- README técnico;
- README de produto;
- lista do que é real no MVP;
- lista do que é simulado;
- roadmap para versão com hardware real.

Estrutura sugerida:

/apps
  /web
    /src
      /app
      /components
      /features
      /lib
      /hooks
      /types
      /styles

/functions
  /src
    /api
    /auth
    /simulation
    /sensors
    /alerts
    /analytics
    /privacy
    /admin
    /utils

/packages
  /signal-core
  /csi-simulator
  /shared-types
  /privacy-core

/edge-agent
  /mock-agent
  README.md

/firebase
  firestore.rules
  firestore.indexes.json
  storage.rules

/docs
  ARCHITECTURE.md
  PRODUCT.md
  PRIVACY.md
  ROADMAP.md
  REAL_VS_SIMULATED.md

Critérios de qualidade:
- Nada de código incompleto.
- Nada de páginas vazias.
- Nada de botões sem função.
- Tudo que for demo/simulado deve estar marcado.
- Código limpo e modular.
- Componentes reutilizáveis.
- Tipos fortes em TypeScript.
- Tratamento de erros.
- Loading states.
- Empty states.
- Logs de auditoria.
- Segurança por organização.
- Preparado para produção, mesmo sendo MVP.

Começa criando a estrutura completa do projeto e depois implementa por fases:
Fase 1: Firebase config + Auth + layout.
Fase 2: Firestore schema + regras.
Fase 3: Dashboard.
Fase 4: Simulador CSI.
Fase 5: Pipeline signal-core.
Fase 6: Mapa indoor.
Fase 7: Alertas.
Fase 8: Admin SaaS.
Fase 9: Documentação e deploy.
Fase 10: Testes e correções.

Antes de escrever código, apresenta a arquitetura final e confirma a estrutura de pastas. Depois gera o código completo.