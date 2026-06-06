# Documentação de Produto — WGF SenseOS

O **WGF SenseOS** é uma plataforma SaaS (Software as a Service) pioneira que revoluciona o mercado de monitoramento ambiental e segurança, utilizando **sensoriamento Wi-Fi (Wi-Fi Sensing)**. Sem utilizar câmeras, microfones ou sensores vestíveis, a plataforma providencia inteligência espacial e biométrica com garantia absoluta de privacidade.

---

## Proposta de Valor

*   **100% Livre de Câmeras:** Monitoramento residencial e corporativo sem invasão de privacidade, ideal para áreas íntimas (quartos, casas de banho, escritórios confidenciais).
*   **Privacidade por Design (Privacy-First):** Toda a biometria é processada na borda (Edge) e transmitida de forma criptografada usando assinaturas matemáticas efêmeras de Conhecimento Zero (ZKP).
*   **Baixo Custo de Infraestrutura:** Aproveita a infraestrutura de redes Wi-Fi existente (roteadores e repetidores mesh) eliminando a necessidade de passar cabos ou comprar sensores dedicados caros.

---

## Funcionalidades Centrais (Os 3 Pilares)

```
                       ┌─────────────────────────┐
                       │   Ingestão Sinais Wi-Fi │
                       └────────────┬────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  ▼                 ▼                 ▼
          ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
          │   CONTAGEM    │ │  LOCALIZAÇÃO  │ │ IDENTIFICAÇÃO  │
          │   (Quantos?)  │ │    (Onde?)    │ │    (Quem?)    │
          └───────────────┘ └───────────────┘ └───────────────┘
```

1.  **Contagem de Pessoas (Quantos):**
    *   Mapeamento de perturbações dinâmicas na amplitude das subportadoras Wi-Fi.
    *   Filtros biológicos de frequência que isolam múltiplos padrões respiratórios sobrepostos para estimar o número exato de pessoas na rede.
2.  **Localização Indoor (Onde):**
    *   Triangulação de rádio usando dados de *Time of Flight* (ToF) e *Angle of Arrival* (AoA) das antenas Wi-Fi.
    *   Plotagem precisa de coordenadas bidimensionais (X, Y) e tridimensionais (Z) em plantas digitais interativas.
3.  **Identificação Consentida (Quem):**
    *   **Análise de Caminhada (Gait Analysis):** Cada indivíduo possui características únicas de ritmo de passada, estrutura óssea, altura e distribuição de massa corporal. O motor de IA classifica e correlaciona a "assinatura de perturbação Wi-Fi" a perfis consentidos cadastrados.
    *   **Frequência Respiratória:** Identificação complementar estática por micro-movimentações do tórax (0.1–0.5 Hz).

---

## Casos de Uso e Modos de Operação

O WGF SenseOS permite alternar o comportamento da plataforma para atender a dois mercados distintos:

### A. Modo Residencial (Foco em Alertas & Saúde)
*   **Monitoramento de Intrusão Sem Câmeras:** O sistema permanece em estado de vigilância. Se o número de pessoas for maior que 0 e o motor de identificação detectar uma assinatura "Desconhecida", um alerta crítico é disparado para os moradores.
*   **Deteção de Queda de Idosos (Monitoramento Eixo Vertical Z):** A IA monitora a altitude vertical da assinatura corporal. Se o sensor detectar uma queda abrupta para o nível do solo (Z próximo de zero) seguida por uma alteração repentina ou interrupção na frequência respiratória, o sistema aciona serviços de emergência e contatos familiares.
*   **Notificações Silenciosas:** Alertas de saúde e segurança enviados de forma discreta para dispositivos autorizados.

### B. Modo Corporativo (Foco em Analytics & Otimização)
*   **Mapas de Calor e Ocupação (Otimização de Espaço):** Análise de tráfego de funcionários e clientes em tempo real para identificar gargalos ou áreas de maior interesse comercial.
*   **Gestão Sustentável de Recursos (Integração HVAC/Iluminação):** Integração com sistemas inteligentes de gestão predial. Se a contagem de pessoas de uma sala de reuniões ou setor do escritório cair para zero, o WGF SenseOS comunica a infraestrutura para desligar a climatização e as luzes instantaneamente, reduzindo a pegada de carbono e os custos de energia.
*   **Relatórios de Fluxo Temporal:** Exportação e análise histórica de taxas de ocupação, permitindo otimizar o design de lojas e escalas de pessoal.

---

## Planos de Subscrição

| Funcionalidade / Limite | Free Demo | Residencial | Business | Enterprise |
| :--- | :--- | :--- | :--- | :--- |
| **Público-Alvo** | Testes e MVP | Casas / Apartamentos | PMEs / Escritórios | Grandes Corporações |
| **Sensores Máximos** | 2 (Simulados) | 5 (Reais/Simulados) | 20 | Ilimitado |
| **Locais (Sites)** | 1 | 2 | 5 | Ilimitado |
| **Deteção de Queda** | Sim | Sim (Alta Precisão) | Não | Opcional |
| **Mapas de Calor** | Não | Não | Sim | Sim (3D) |
| **Integração HVAC** | Não | Não | Sim | Sim (Custom APIs) |
| **Audit Logs** | Não | Sim (Básico) | Sim (Avançado) | Sim (SOC2 Compliance) |
