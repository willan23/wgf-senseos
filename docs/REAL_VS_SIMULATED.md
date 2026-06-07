# Comparativo: Funcionalidades Reais vs. Simuladas no WGF SenseOS (Produção)

Este documento apresenta de forma transparente quais os componentes da plataforma **WGF SenseOS** são executados sob regras e conexões de produção reais e quais utilizam lógica sintética/simulada.

---

## Tabela Comparativa Geral

| Módulo / Funcionalidade | Estado Atual | Tipo de Processamento / Integração |
| :--- | :---: | :--- |
| **Autenticação de Utilizadores** | **REAL** | Firebase Authentication (email/password, sessão e guards de rotas). |
| **Sincronização de Perfil de Usuário** | **REAL** | Escrita e leitura automática no Firestore na coleção `/users`. |
| **Criação de Organizações** | **REAL** | Criação e gestão no Firestore na coleção `/organizations` (incluindo painel administrativo). |
| **Layout & Interface do Dashboard** | **REAL** | Interface Next.js Responsiva, temas escuros, transições CSS e visualizadores. |
| **Regras de Acesso e Segurança** | **REAL** | Firestore Security Rules ativas no servidor protegendo dados por inquilino. |
| **Filtros e Pipeline de Processamento** | **REAL** | Butterworth bandpass IIR filters, Z-Score amplitude stabilization e extração de perturbações dinâmicas na API `/api/uwsc/ingest`. |
| **Localização Indoor (Planta 2D)** | **REAL** | Renderização dinâmica baseada em subscrições à coleção `detections` do Firestore. |
| **Gestão de Sensores e Sites** | **REAL** | CRUD real e escutas real-time associados ao Firestore. |
| **Upload de Datasets (Lab)** | **REAL** | Envio de ficheiros de CSI (.csv/.json) ao Firebase Storage e registo de metadados no Firestore. |
| **Alertas do Sistema** | **REAL** | Disparo de alertas (queda, intrusão, spoofing) gerados pelo pipeline na base de dados e gestão (reconhecer/resolver) no dashboard. |
| **Geração de Sinal CSI Bruto** | **SIMULADO**| Fórmulas matemáticas que simulam amplitude, fase e ruído das 52 subportadoras. A extração física de hardware (nexmon) continua sob setup de lab. |
| **Modelos de IA Avançados (TinyML)** | **SIMULADO**| Heurísticas e stubs classificadores (CNN, LSTM) simulando o output do modelo final. |
| **Faturação Integrada (Stripe)** | **PREPARADO**| Rotas de checkout e webhook estruturados para receber chaves de produção. |

---

## Detalhamento Técnico

### 1. O que é REAL e funciona em Produção

*   **Processamento no Servidor (Ingest API):** A rota `/api/uwsc/ingest` recebe lotes de frames CSI dos agentes, valida a assinatura com anti-spoofing, aplica normalizações matemáticas, e orquestra a inferência.
*   **Gestão de Estado em Base de Dados (Firestore):** Todo o CRUD de sensores, sites, organizações, utilizadores e logs de auditoria de acessos utiliza o Firestore real.
*   **Renderização Dinâmica do Mapa:** A planta baixa lê posições X/Y reais da coleção `detections` gravadas pelo backend de ingestão de forma assíncrona.
*   **Dataset Laboratory:** Upload e remoção de datasets reais integrados ao Firebase Storage e Firestore.

---

### 2. O que é SIMULADO e por que é necessário

*   **Dados de CSI Bruto de Dispositivos**: Sem o hardware físico de laboratório instalado (Raspberry Pi + Alfa AWUS036ACH), não é possível capturar a atenuação eletromagnética real. O agente mock standalone de Node.js emula esta telemetria.
*   **Classificadores Avançados (TinyML)**: Modelos INT8 reais quantizados rodando em runtime WASM. O sistema expõe stubs estruturados idênticos às assinaturas de rede finais para fácil substituição.
