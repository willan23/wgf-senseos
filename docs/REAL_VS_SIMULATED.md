# Comparativo: Funcionalidades Reais vs. Simuladas no MVP — WGF SenseOS

Este documento apresenta de forma transparente quais os componentes da plataforma **WGF SenseOS** são executados sob regras e conexões de produção reais e quais utilizam lógica sintética/simulada neste MVP (Produto Mínimo Viável).

---

## Tabela Comparativa Geral

| Módulo / Funcionalidade | Estado no MVP | Tipo de Processamento / Integração |
| :--- | :---: | :--- |
| **Autenticação de Utilizadores** | **REAL** | Firebase Authentication (email/password, sessão e guards de rotas). |
| **Sincronização de Perfil de Usuário** | **REAL** | Escrita e leitura automática no Firestore na coleção `/users`. |
| **Criação de Organizações Básico** | **REAL** | Criação automática no Firestore na coleção `/organizations` ao registrar. |
| **Layout & Interface do Dashboard** | **REAL** | Interface Next.js Responsiva, temas escuros, transições CSS e visualizadores. |
| **Regras de Acesso e Segurança** | **REAL** | Firestore Security Rules ativas no servidor protegendo dados por inquilino. |
| **Geração de Sinal CSI Bruto** | **SIMULADO**| Fórmulas matemáticas que simulam amplitude, fase e ruído das 52 subportadoras. |
| **Filtros e Pipeline de Limpeza** | **SIMULADO**| Stubs matemáticos locais em TypeScript (PCA, Z-Score) que processam a simulação. |
| **Deteção de Quedas e Intrusos** | **SIMULADO**| Triggers vinculados aos cenários de simulação escolhidos pelo utilizador. |
| **Localização Indoor (Planta 2D)** | **SIMULADO**| Coordenadas X/Y flutuantes geradas sinteticamente com base no cenário ativo. |
| **Gestão Financeira & SaaS (Billing)** | **SIMULADO**| Telas e mockups visuais sem integração com gateways reais (Stripe/STPway). |

---

## Detalhamento Técnico

### 1. O que é REAL e funciona em Produção

*   **Firebase Authentication:** Toda a criação de contas, validação de passwords, verificação de emails e controle de rotas privadas utilizam as APIs reais da Google.
*   **Firestore Database Sync:** Quando um utilizador faz login ou se registra, o Next.js carrega as informações diretamente da base de dados em tempo real. Qualquer alteração em `/users` ou `/organizations` é persistida no servidor.
*   **Regras de Isolamento (Multi-tenant Security):** As regras do Firestore garantem que mesmo que um invasor autenticado tente ler documentos de outra organização em `/organizations/org_outra`, a operação é bloqueada imediatamente no nível de banco de dados.
*   **Controle de Cenários pelo Dashboard:** A interface permite interagir dinamicamente com o simulador, trocando de cenários em tempo real (ex: mudando de "Casa Vazia" para "Queda Detetada").

---

### 2. O que é SIMULADO e por que é necessário no MVP

*   **Sinais Eletromagnéticos (CSI):** A extração de CSI real exige um roteador com firmware customizado ou um Raspberry Pi coletando dados brutos da placa Wi-Fi. O simulador gera dados com propriedades realistas de ruído gaussiano e modulações baseadas nas frequências respiratórias humanas para que a interface possa demonstrar o potencial da tecnologia.
*   **Localização de Pessoas:** As coordenadas das pessoas no mapa indoor são estimadas pelo simulador com base em aproximações matemáticas dos cenários (ex: no cenário "Duas Pessoas a Caminhar", o simulador atualiza as coordenadas para criar movimentos fluidos no mapa).
*   **Deteção de Queda:** Em vez de receber telemetria de um giroscópio ou uma queda real perturbando as ondas Wi-Fi, o dashboard reage de acordo com os dados gerados pelo simulador ao selecionar o cenário correspondente, disparando o alerta visual crítico no painel.

---

## Preparação para Transição Rápida (Ready to Swap)

A arquitetura do MVP foi estrategicamente isolada. Os arquivos que gerenciam a simulação estão concentrados em:
*   [`csi-simulator.ts`](file:///w:/Projetos/WGF%20SenseOS/wgf-senseos/lib/csi-simulator.ts): Responsável por modelar e simular os dados de telemetria.
*   [`useSimulation.ts`](file:///w:/Projetos/WGF%20SenseOS/wgf-senseos/hooks/useSimulation.ts): O hook que distribui estes dados para a interface.

**Como integrar o hardware real:**
Para substituir a simulação por dispositivos físicos, bastará modificar o hook [`useSimulation.ts`](file:///w:/Projetos/WGF%20SenseOS/wgf-senseos/hooks/useSimulation.ts) para que, em vez de disparar a função `tickSimulation` localmente no cliente, ele assine (através de um Firestore Realtime Listener) a coleção `/sensorStreams` daquela organização, que passará a ser preenchida pelo Edge Agent rodando nos roteadores físicos.
