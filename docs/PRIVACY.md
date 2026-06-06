# Privacidade por Design e Conformidade — WGF SenseOS

A privacidade não é uma funcionalidade adicional no WGF SenseOS; é o **alicerce** sobre o qual todo o sistema foi projetado. Numa época em que o monitoramento doméstico e empresarial é frequentemente associado à invasão de privacidade e vazamento de vídeos, o WGF SenseOS oferece uma alternativa 100% blindada e em total conformidade com legislações de privacidade globais (como a **GDPR** europeia e a **CCPA** da Califórnia).

---

## 1. O Princípio da Ausência de Imagem

A vulnerabilidade mais óbvia das câmeras inteligentes de segurança é o acesso não autorizado a streams de vídeo ou imagens privadas.
*   O WGF SenseOS **não utiliza** lentes ópticas, sensores de infravermelho ou captação de imagem.
*   O sistema processa apenas as perturbações sofridas por ondas de rádio invisíveis que cruzam o ar.
*   **Impossibilidade Física de Exposição:** Mesmo no caso de uma invasão hacker ao sistema, é impossível obter gravações visuais ou de áudio dos moradores, pois esses dados simplesmente nunca existiram.

---

## 2. Processamento Local e Destruição de Dados Brutos (Edge-Only)

Os dados de CSI (Channel State Information) bruto capturados pelas placas de rede contêm as informações eletromagnéticas detalhadas do ambiente.
*   **Processamento na Borda (Edge):** O sinal bruto de CSI é filtrado e processado inteiramente dentro do hardware local (roteador ou nó mesh) via TinyML runtime.
*   **Descarte Imediato:** Assim que o processamento do movimento e respiração é finalizado, as matrizes brutas de amplitude e fase de rádio são deletadas da RAM do dispositivo.
*   **Zero Nuvem Bruta:** Nenhum dado bruto de CSI é transmitido para os servidores centrais do WGF SenseOS, eliminando riscos de vazamento em trânsito ou repositórios na nuvem.

---

## 3. Provas de Conhecimento Zero (ZKP) para Biometria Comportamental

Para identificar pessoas conhecidas (como "Morador A" ou "Funcionário X"), o sistema analisa a assinatura da caminhada (Gait Analysis).
*   **Assinatura Vetorial Criptografada:** Em vez de armazenar métricas físicas reconhecíveis como altura, peso aproximado ou velocidade da passada, estas propriedades biométricas são convertidas, ainda na borda, num código hash criptográfico efêmero de sentido único (ZKP Hash).
*   **Provas de Conhecimento Zero (Zero-Knowledge Proofs):** O sistema apenas valida se a assinatura da caminhada atual gera o mesmo hash criptográfico registrado. Ele sabe matematicamente que "o utilizador de ID `0x4F8A` está em casa" sem saber qual é a sua aparência física, peso ou características corporais.

---

## 4. Coleção de Perfis de Consentimento (Consent Profiles)

*   **Opt-In Obrigatório:** A identificação de pessoas conhecidas vem desativada por padrão. Cada utilizador que deseje ter a sua caminhada identificada para evitar falsos alarmes deve cadastrar um "Perfil de Consentimento" explícito.
*   **Revogação Simples:** O utilizador pode, a qualquer momento, excluir o seu perfil de consentimento no dashboard. O hash associado é deletado imediatamente do Firestore e da memória dos nós mesh.

---

## 5. Conformidade com a GDPR (Regulamento Geral sobre a Proteção de Dados)

O WGF SenseOS cumpre com as exigências mais severas da GDPR:

*   **Artigo 25 (Privacidade por Design e por Padrão):** O sistema opera em modo de anonimização total por padrão. As empresas só recebem relatórios agregados e estatísticas de contagem de pessoas, não perfis individuais.
*   **Artigo 32 (Segurança do Tratamento):** Criptografia de dados ponta a ponta (AES-256 e SSL/TLS) em todas as comunicações entre roteadores e o banco de dados Firebase Firestore.
*   **Registro de Auditoria Imutável (Audit Logs):** Todos os acessos a painéis administrativos e mudanças em configurações de segurança geram logs automáticos em `/auditLogs`, registrando o timestamp, ação efetuada e IP do autor, garantindo total transparência em conformidade com auditorias de segurança (como SOC2).
