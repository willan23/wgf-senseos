# Roadmap de Integração de Hardware Real — WGF SenseOS

Este documento estabelece o roteiro técnico e os requisitos necessários para efetuar a transição do motor de simulação (MVP) para a integração com **dispositivos físicos de hardware real**.

---

## 1. Requisitos de Hardware Compatível

A extração de dados CSI (Channel State Information) exige chipsets Wi-Fi específicos que permitam expor os dados da camada física (PHY) para a camada de software.

### A. Roteadores Comerciais com OpenWrt
*   **Chipsets Recomendados:** Qualcomm Atheros (série QCA988x, QCA998x) ou MediaTek (MT7621, MT7622).
*   **Firmware:** OpenWrt (versão 21.02 ou superior) instalado no roteador.
*   **Driver:** Modificações específicas de driver (como o utilitário `ath9k_csi` ou `ath10k` com patches de monitoramento) para habilitar o envio dos relatórios de subportadora.

### B. Nós de Coleta Dedicados (Raspberry Pi / Jetson Nano)
*   **Hardware:** Raspberry Pi 4 Model B ou Jetson Nano.
*   **Placa Wi-Fi Auxiliar:** Placas baseadas no chip Broadcom (ex: chip Wi-Fi integrado da Pi 4) utilizando os patches de firmware **Nexmon**.
*   **Nexmon Project:** Repositório open-source que ativa o modo monitor e a extração de CSI de subportadoras OFDM específicas no chip da Broadcom (BCM43455c0).

---

## 2. A Geometria de Malha Multiestática (Mesh Grid)

Para obter alta precisão e cobrir pontos cegos residenciais ou comerciais, a arquitetura deve evoluir de um modelo monostático (um transmissor, um receptor) para uma **Malha Multiestática**:

```
                  ┌───────────────────────┐
                  │ Transmissor (Router)  │
                  └──────────┬────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │ Receptor Nó 01  │ <───────────> │ Receptor Nó 02  │
   │ (Raspberry Pi)  │  RF Crossing  │ (Raspberry Pi)  │
   └─────────────────┘               └─────────────────┘
```

1.  **Grade de Feixes:** Ao espalhar 2 ou mais receptores (Nós) por uma divisão, criam-se múltiplos canais de rádio cruzados.
2.  **Triangulação de Localização (AoA/ToF):** O atraso temporal (Time of Flight) e o ângulo de chegada (Angle of Arrival) das ondas difratadas permitem ao algoritmo mapear as coordenadas tridimensionais (X, Y, Z) das perturbações biológicas.

---

## 3. Roteiro de Desenvolvimento e Fases

```
   Fase 1: Lab Solo      Fase 2: Driver OpenWrt      Fase 3: Edge Agent      Fase 4: Escala SaaS
   [ 1-2 meses ]           [ 2-3 meses ]             [ 2 meses ]             [ Contínuo ]
   ┌──────────────┐        ┌────────────────┐        ┌──────────────┐        ┌────────────────┐
   │ Raspberry Pi │ ─────> │ Roteadores     │ ─────> │ API de Ingest│ ─────> │ IEEE 802.11bf  │
   │ com Nexmon   │        │ com OpenWrt    │        │ de Produção  │        │ Padronização   │
   └──────────────┘        └────────────────┘        └──────────────┘        └────────────────┘
```

### Fase 1: Validação em Laboratório Controlado (Raspberry Pi + Nexmon)
*   Configuração de 1 transmissor (AP doméstico comum) e 2 receptores Raspberry Pi 4 rodando patches Nexmon.
*   Coleta e exportação de dados brutos de CSI em arquivos binários (.pcap) para validação off-line dos filtros de limpeza de sinal (Butterworth e PCA).
*   Treinamento inicial de redes neurais convolucionais (CNN) para contagem de pessoas com dados reais.

### Fase 2: Desenvolvimento do Firmware Customizado (OpenWrt Integration)
*   Desenvolvimento de um pacote `.ipk` para OpenWrt que encapsula o script de extração CSI (Edge Ingestion Agent) e eBPF runtime.
*   Implementação do canal de comunicação via WebSocket ou gRPC seguro entre o roteador e a nuvem.
*   Testes de desempenho de CPU e consumo de memória RAM nos roteadores de baixo custo para garantir que a coleta de CSI não afete o desempenho de internet dos clientes.

### Fase 3: Ingestão de Produção e Homologação
*   Substituição das fontes de dados simuladas no dashboard pelas APIs de ingestão real.
*   Lançamento do primeiro kit físico (1 Roteador Central SenseOS + 2 Extensores Mesh Dedicados) para beta-testers residenciais.
*   Refinamento do modelo de detecção de queda e gait analysis em ambientes domésticos dinâmicos.

### Fase 4: Padronização IEEE 802.11bf (Prontidão para o Futuro)
*   **O que é o 802.11bf?** O novo padrão oficial da indústria para Wi-Fi Sensing. Com este padrão, fabricantes de roteadores (como Netgear, Linksys, TP-Link) já processam as perturbações de sinal nativamente no chip e expõem APIs de CSI padronizadas.
*   **Evolução do WGF SenseOS:** Adaptação da Camada 2 (Abstração Universal) para consumir dados das APIs nativas 802.11bf à medida que roteadores comerciais compatíveis cheguem ao mercado de consumo de massa, permitindo que a nossa plataforma seja instalada instantaneamente em roteadores modernos de terceiros sem necessidade de firmwares customizados.
