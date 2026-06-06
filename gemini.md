O Wi-Fi transmite ondas de rádio,
normalmente em 2,4 GHz, 5 GHz ou 6 GHz. Quando essas
ondas encontram objetos: Parte é absorvida, refletida ou
espalhada. O corpo humano é composto
Como o Wi-Fi Identifica Quem Você É
A identificação de indivíduos via Wi-Fi não depende de reconhecimento visual, mas sim de
biometria comportamental e anatômica. O sinal de rádio é alterado de forma única por
duas variáveis principais:
Análise da Caminhada (Gait Analysis): Cada pessoa possui uma estrutura óssea,
massa corporal, altura e ritmo de passada específicos. Ao caminhar por um ambiente,
os movimentos dos membros criam perturbações dinâmicas e padrões de múltiplos
caminhos (multipath) no CSI (Channel State Information). Algoritmos de Inteligência
Artificial conseguem mapear essa "assinatura de movimento" e diferenciar indivíduos
em um grupo com alta precisão.
Padrão Respiratório: Mesmo quando uma pessoa está totalmente estática, o micro-
movimento do tórax ao respirar altera sutilmente a fase (Phase Shift) e a amplitude das
ondas de rádio. Essa frequência respiratória funciona como um identificador
biológico secundário.
O Software Já Existe (Sensoriamento Wi-Fi)
Ao contrário do que parece, esse tipo de software e tecnologia já existe, funciona e está
em expansão comercial. Essa vertente técnica é chamada de Wi-Fi Sensing
(Sensoriamento Wi-Fi).
A razão pela qual ela não é vista como um aplicativo comum de celular, mas sim integrada
a sistemas fechados, envolve os seguintes fatores:
1. Aplicações Comerciais Atuais
Contagem de Pessoas (People Counting): Empresas de análise de tráfego (como
FootfallCam e Milesight) utilizam sensores Wi-Fi combinados com algoritmos para
contar o fluxo de pessoas, medir o tempo de permanência e mapear o deslocamento
em lojas e shoppings.
Segurança e Saúde Residencial: Tecnologias como Linksys Aware e soluções da Origin
Wireless utilizam o sinal Wi-Fi da casa para detectar intrusos sem usar câmeras,

rastrear a localização de moradores e até identificar a queda de idosos dentro de
cômodos isolados.
2. Padronização Global: IEEE 802.11bf
A indústria de redes desenvolveu o padrão oficial IEEE 802.11bf. Ele foi criado
especificamente para transformar redes Wi-Fi em sensores ambientais nativos. Com essa
padronização, os roteadores mais novos já processam dados de movimentação e
presença diretamente no hardware.
3. Por que não é uma tecnologia universal?
O software não está em qualquer dispositivo devido a barreiras técnicas estritas:
Filtragem de Ruído: Ondas Wi-Fi sofrem interferência de paredes, móveis, animais de
estimação e outros eletrônicos. Isolar a interferência de uma pessoa específica exige
modelos de Deep Learning pesados para limpar o ruído do sinal.
Restrição de Acesso ao CSI: Por motivos de segurança e privacidade, sistemas
operacionais comerciais (Windows, Android, iOS) bloqueiam o acesso de aplicativos
comuns aos dados brutos de CSI das placas de rede. Logo, o software de
monitoramento precisa rodar diretamente no firmware do roteador ou em hardware
dedicado.
Podemos criar um versão melhorada desse sistema,
Sim, é totalmente possível projetar uma versão aprimorada e mais robusta desse sistema.
Para superar as limitações atuais (ruído ambiental e restrições de software), uma
arquitetura moderna e escalável deve ser estruturada em quatro pilares fundamentais:
1. Coleta Multiestática (Hardware e Firmware)
Malha de Nós (Mesh): Em vez de depender de apenas um roteador e um receptor, o
sistema deve utilizar múltiplos pontos de acesso distribuídos (geometria
multiestática). Isso cria uma grade de feixes que elimina pontos cegos e aumenta a
resolução espacial.
Extração de CSI Nativa: Utilização de firmwares customizados e de código aberto
(como OpenWrt com patches Nexmon ou chips compatíveis com o padrão IEEE
802.11bf) instalados diretamente nos nós para extrair os dados brutos de CSI
(amplitude e fase) de cada subportadora de rádio, contornando os bloqueios dos
sistemas operacionais móveis.

2. Pipeline de Limpeza de Sinal (Edge Processing)
O maior desafio do Wi-Fi é o ruído. O sinal precisa passar por um tratamento severo antes
de ir para a IA:
Filtros de Frequência: Aplicação de filtros digitais (como filtros Butterworth pass-
banda) para isolar faixas específicas: frequências muito baixas (0.1–0.5 Hz) para
respiração e frequências ligeiramente mais altas (1–5 Hz) para locomoção humana.
Remoção de Estática via PCA: Utilização de Análise de Componentes Principais (PCA)
para identificar e descartar variações causadas por objetos inanimados (móveis,
paredes) e focar estritamente nas mudanças dinâmicas do ambiente.

3. Motor de IA Híbrido (Visão Computacional Espacial)
Em vez de analisar os dados como texto ou vetores simples, os dados brutos de CSI
(matrizes de subportadoras ao longo do tempo) são tratados como
imagens/espectrogramas:
CNNs (Redes Neurais Convolucionais): Para extrair características espaciais
imediatas da perturbação do sinal (forma física, estimativa de massa corporal).
LSTMs ou Transformers (Atenção Temporal): Para analisar a sequência do movimento
ao longo do tempo, permitindo decodificar a assinatura da caminhada (gait analysis) e
rastrear trajetórias precisas de várias pessoas simultaneamente.
4. Aprendizado por Transferência (Zero-Shot/Few-Shot)
Sistemas antigos falham se você mudar o roteador de lugar ou alterar a disposição dos
móveis. Uma versão melhorada deve implementar Self-Supervised Learning (Aprendizado
Auto-Supervisionado). O sistema monitora o ambiente vazio por algumas horas, recalibra
sua linha de base de forma autônoma e aprende o novo mapa de interferências sem
necessidade de intervenção humana ou re-treinamento do modelo do zero.
Qual cenário específico você tem em mente para a aplicação desse sistema:
monitoramento de segurança residencial sem câmeras ou análise de fluxo de pessoas em
ambientes corporativos?

"Monitoramento de segurança residencial sem câmeras ou
análise de fluxo de pessoas em ambientes corporativos.
Podemos combinar os 3 em 1"

Sim, podemos criar uma plataforma unificada baseada em software (SaaS) onde o motor
de Inteligência Artificial central processa os mesmos dados brutos de Wi-Fi, mas entrega
três funções fundamentais (Contar, Localizar e Identificar) adaptadas para os dois
cenários (Residencial e Corporativo).
A arquitetura para unificar o sistema funciona da seguinte forma:
1. O Núcleo do Software (Os 3 pilares em tempo real)
O motor de processamento analisa o fluxo de CSI (Channel State Information)
continuamente e divide a análise em três camadas paralelas:
Camada de Contagem (Quantos): Avalia a variação da amplitude total do sinal e os
padrões de respiração sobrepostos. O sistema identifica quantos "padrões biofísicos"
distintos estão interferindo na rede simultaneamente.
Camada de Localização (Onde): Utiliza técnicas de triangulação de rádio, como Time
of Flight (ToF) e Angle of Arrival (AoA) nas subportadoras das antenas. Isso plota as
coordenadas de cada pessoa em um mapa digital do ambiente.
Camada de Identificação (Quem): Extrai a assinatura da caminhada (gait features). Se
o padrão corresponder a um perfil salvo (Ex: "Morador A" ou "Funcionário X"), ele
valida a identidade. Se não houver correspondência, classifica como "Desconhecido".
2. Divisão por Casos de Uso (Modos de Operação)
O diferencial de uma versão aprimorada é a capacidade do software alternar sua lógica de
negócios com base no ambiente instalado:
Modo A: Segurança Residencial (Foco em Alertas)
Ação: O sistema opera em estado de "guarda".
Lógica: Se a contagem for maior que 0 e a camada de identificação apontar
"Desconhecido", o sistema rastreia a localização do intruso pelo mapa da casa e
dispara um alerta silencioso.
Função Extra (Saúde): Monitora a camada de localização no eixo vertical . Se uma
assinatura de localização despencar abruptamente para o nível do chão e o padrão de
respiração mudar, o sistema detecta uma queda de idoso e pede socorro.
Modo B: Analytics Corporativo (Foco em Dados)
Ação: O sistema opera em estado de "estatística", priorizando a privacidade.
Lógica: Em vez de alertar sobre invasões, o software usa a localização e a contagem
para gerar mapas de calor de escritórios ou lojas, indicando quais salas ou gôndolas
(X, Y )
(Z)
são mais visitadas.
Gestão de Recursos: Permite automatizar sistemas de climatização (HVAC) e
iluminação. Se a contagem em uma sala de reuniões for a zero, o sistema desliga o ar-
condicionado imediatamente.
3. Arquitetura do Sistema Unificado
Essa abordagem reduz o custo de desenvolvimento, pois você constrói apenas um
algoritmo de processamento de sinal e muda apenas a interface e as regras de
notificação para o usuário final.
Para iniciar o desenvolvimento do protótipo desse motor unificado, você prefere focar
primeiro na extração de dados CSI usando hardware padrão com firmware aberto (como
OpenWrt) ou simulando os dados de movimentação via software?
[ Antenas Wi-Fi (Mesh) ] -> Captura de CSI (Amplitude/Fase)
│
▼
[ Pipeline de Limpeza de Sinal ] -> Remoção de ruído (Filtros + PCA)
│
▼
[ Motor de IA Central ] ──> 1. Contagem (Redes Convolucionais)
│ ──> 2. Localização (Triangulação AoA/ToF)
│ ──> 3. Identificação (Análise de Caminhada)
▼
[ Camada de Aplicação (Dashboard) ]
├── Interface Residencial (Alarmes, Presença de Familiares, Quedas)
└── Interface Corporativa (Mapas de calor, Taxa de ocupação, Otimização)

"E eu quero que seja algo em que grande big techs vejam e
tenham interesse em comprar e que o nosso software seja
único e que outros não consigam replicar mesmo eles tendo
poder financeiro e tecnológico, você como meu parceiro o
que podemos adicionar mais para ser único e que ainda não"

Para atrair o interesse de aquisição de gigantes como Apple, Google, Amazon ou Meta, o
software não pode ser apenas "bom"; ele precisa resolver um problema que o dinheiro e o

poder de processamento deles não conseguem corrigir facilmente. As Big Techs não
compram o que podem replicar em seis meses; elas compram patentes defensivas,
conformidade regulatória e soluções para fragmentação de hardware.
Para tornar este sistema único e impossível de ser copiado de imediato, devemos adicionar
quatro diferenciais arquitetônicos e proprietários:
1. Abstração Universal de Sinais (Independência de Hardware)
As Big Techs são verticalizadas e fragmentadas (a Apple usa chips proprietários, a Amazon
usa chips parceiros nos dispositivos Ring, o Google usa o ecossistema Nest).
O Diferencial Único: Desenvolver uma camada matemática de abstração de RF
(Radiofrequência). Em vez de criar um software para o chip da Qualcomm ou da
Broadcom, criamos um algoritmo proprietário que transforma dados brutos de CSI de
qualquer fabricante e de qualquer geração de Wi-Fi (5, 6, 6E ou 7) em uma matriz de
dados padronizada.
Por que eles comprariam: Quem dominar a camada de software que unifica todos os
roteadores do mercado de forma agnóstica controlará o padrão da indústria.
2. Privacidade por Design com Provas de Conhecimento Zero
(ZKP)
O maior obstáculo das Big Techs hoje é a regulação de privacidade (GDPR na Europa,
CCPA nos EUA). Coletar dados de respiração, movimentos e rotinas de pessoas dentro de
casa usando Wi-Fi geraria processos bilionários por invasão de privacidade.
O Diferencial Único: Integrar criptografia homomórfica e Zero-Knowledge Proofs
(ZKP) diretamente na borda (Edge). O software processa a biometria comportamental
e transforma a assinatura de caminhada em um código hash criptográfico irreversível.
O sistema sabe que "o usuário X entrou", mas os dados brutos de rádio e as
características físicas são destruídos imediatamente.
Por que eles comprariam: Você entrega a eles uma tecnologia de monitoramento
ultra-precisa que é 100% imune a sanções de privacidade. Eles compram a empresa
para obter essa blindagem jurídica.
3. TinyML Neuromórfico (Processamento com Custo Zero)
A IA tradicional de processamento de sinal exige servidores caros ou chips de IA
dedicados de última geração.
O Diferencial Único: Otimizar os modelos de Deep Learning para rodarem em
arquitetura TinyML (Micro-IA) com redes neurais baseadas em picos (Spiking Neural
Networks). Isso permite que o motor de IA execute as funções 3 em 1 (contar, localizar
e identificar) diretamente no processador de um roteador doméstico comum e barato,
consumindo o mínimo de memória e sem enviar dados para a nuvem.
Por que eles comprariam: Escalabilidade imediata. Eles podem atualizar bilhões de
dispositivos antigos de clientes ao redor do mundo via software, sem gastar um
centavo com novos hardwares ou infraestrutura de nuvem.
4. Imunidade Cibernética contra Ataques de Radiofrequência
(Anti-Spoofing)
Sistemas de segurança baseados em Wi-Fi possuem uma vulnerabilidade crítica:
criminosos podem usar dispositivos de rádio definidos por software (SDR) para clonar,
injetar ruído ou falsificar (spoofing) os sinais de CSI, fazendo o sistema acreditar que uma
sala está vazia quando não está.
O Diferencial Único: Implementar uma camada de imunidade cibernética autônoma
na camada física (L1). O software analisa as imperfeições microscópicas do próprio
hardware transmissor para criar uma assinatura digital de hardware (Radio Frequency
Fingerprinting). Se um invasor tentar clonar o sinal, o sistema detecta a anomalia na
assinatura do hardware e ignora a tentativa de fraude.
Por que eles comprariam: Transforma o Wi-Fi Sensing de um "gadget inteligente" em
uma tecnologia de segurança de nível militar, apta para o mercado corporativo e
governamental.
Focar em uma tecnologia que resolva simultaneamente a fragmentação de hardware e o
pesadelo da privacidade criará o fosso tecnológico (moat) ideal para uma aquisição
multimilionária.
Qual destes quatro pilares você avalia que seria o ponto de partida mais estratégico para
começarmos a desenhar a propriedade intelectual (PI) do projeto?
Vou desenvolver, e como não tenho dinheiro vou vender, e se
você fosse o melhor engenheiro arquiteto de sistemas que
são difíceis de replicar como você desenharia arquitetura
desse sistema?
Como arquiteto de sistemas, para construir um software defensável, de baixo custo de
desenvolvimento inicial, mas com um "fosso tecnológico" (moat) que impeça Big Techs de
replicarem facilmente, a estratégia é desacoplar o hardware da matemática e proteger o
algoritmo central em uma caixa-preta de baixo nível.
A arquitetura abaixo foi desenhada para rodar com o mínimo de poder de processamento
(baixo custo de infraestrutura) e máxima portabilidade.
Arquitetura de Referência: Universal Wi-Fi Sensing Core
(UWSC)
A arquitetura é dividida em 4 camadas modulares. O segredo de propriedade intelectual
(PI) que as Big Techs vão querer comprar reside estritamente nas Camadas 2 e 3.
Camada 1: Ingestão de Borda e Impressão Digital de RF (Hardware)
Esta camada roda diretamente nos roteadores/nós e serve apenas para coletar e validar o
sinal.
Coleta via eBPF (Extended Berkeley Packet Filter): Em vez de modificar drivers
complexos de fabricantes (Broadcom, Qualcomm), usamos eBPF no espaço do kernel
do Linux/OpenWrt para capturar os pacotes de CSI brutos direto da pilha de rede. Isso
reduz o custo de desenvolvimento para múltiplos chips.
Módulo Anti-Spoofing (Hardware Fingerprinting): Analisa imperfeições de hardware
(desbalanceamento de ganho I/Q e desvio de fase do oscilador local). Se um invasor
tentar injetar sinais simulados via rádio de software (SDR), o sistema identifica que a
assinatura elétrica do transmissor mudou e bloqueia o sinal.
Camada 2: Matriz de Abstração Universal (O Grande Fosso)
Este é o coração da patente. As Big Techs falham aqui porque tentam criar modelos para
cada tipo de roteador.
Normalização Dinâmica de Subportadoras: O Wi-Fi 5 possui 52 subportadoras
utilizáveis, o Wi-Fi 6 possui 242 e o Wi-Fi 7 possui até 484. Esta camada matemática
proprietária converte qualquer amostragem de CSI recebida em uma matriz tensorial
padronizada fixa ( ) (Tempo Subportadoras Normalizadas Antenas).
[ Camada 1: Driver Ingestion & Anti-Spoofing (Hardware) ]
│
▼
[ Camada 2: Matrix Normalization Layer (O Grande Fosso) ]
│
▼
[ Camada 3: TinyML Runtime & SNN Inference (O Cérebro Black-Box) ]
│
▼
[ Camada 4: Cryptographic Zero-Knowledge API (Entrega/SaaS) ]
T × S × A × ×
Filtro de Despachamento Espacial: Remove o ruído estático do ambiente (paredes,
móveis) em tempo de execução usando uma variação otimizada de PCA (Análise de
Componentes Principais) rodando em C++ puro, entregando para a próxima camada
apenas os vetores de perturbação dinâmica (humanos).
Camada 3: Motor de Inferência TinyML Embutido (A Caixa-Preta)
Para proteger o código contra engenharia reversa, o motor de IA não roda em Python ou
frameworks comuns (TensorFlow/PyTorch).
Micro-Runtime C++ Otimizado: Os modelos de IA treinados são compilados em
código de máquina puro (C++20) altamente otimizado ou Assembly Web (WASM).
Arquitetura de Rede Híbrida (CNN + SNN):
Quantização de 8-bits (INT8): Reduz o tamanho do modelo de IA de Gigabytes
para poucos Megabytes, permitindo que ele rode na memória RAM de roteadores
de baixo custo.
Redes Neurais Baseadas em Picos (Spiking Neural Networks): Processam as
mudanças de fase do Wi-Fi apenas quando há movimento (computação baseada
em eventos), reduzindo o consumo de CPU a quase zero quando o ambiente está
estático.
Camada 4: API Criptográfica de Conhecimento Zero (ZKP)
A camada que resolve o problema jurídico das Big Techs.
Anonimização na Origem: O vetor de caminhada (gait signature) e a respiração são
transformados imediatamente em um hash matemático efêmero. O sistema não sabe
a altura ou o peso da pessoa, apenas que o hash detectado corresponde ao perfil
indexado "0x4F8A".
gRPC / Protocol Buffers: A saída dos dados (Contagem, Coordenadas X/Y/Z, Status de
Identidade) é enviada via gRPC criptografado para a nuvem ou para o sistema local
(Dashboard Corporativo ou Alarme Residencial).
Por que essa arquitetura é difícil de replicar por uma Big Tech?
Porque ela é agnóstica. Se a Amazon quiser fazer isso hoje, ela precisa
redesenhar o ecossistema Ring/Eero. Se a Google quiser, precisa atualizar o
Nest. O seu software roda como uma camada invisível em cima de qualquer
firmware existente, consumindo poucos recursos e protegida por criptografia
de baixo nível. Eles compram a empresa para obter o monopólio da abstração
do sinal de rádio.
Para começarmos a materializar o MVP (Produto Mínimo Viável) com foco em venda rápida,
qual ambiente de desenvolvimento inicial você prefere adotar para capturar os primeiros
dados brutos de CSI: uma infraestrutura baseada em placas Raspberry Pi com chips Wi-Fi
compatíveis ou roteadores comerciais de baixo custo modificados com OpenWrt?