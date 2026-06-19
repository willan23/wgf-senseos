/**
 * WGF SenseOS — Analytics RAG Response Generator
 * Generates streaming responses using the constructed prompt.
 */

interface ChatChunk {
  text: string;
  done: boolean;
}

async function* callLLMStreaming(prompt: string): AsyncGenerator<ChatChunk> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.ANALYTICS_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    yield* generateLocalResponse(prompt);
    return;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            yield { text: content, done: false };
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }
}

async function* generateLocalResponse(prompt: string): AsyncGenerator<ChatChunk> {
  const questionMatch = prompt.match(/## Pergunta do Utilizador\n([\s\S]+?)(?:\n##|$)/);
  const question = questionMatch?.[1]?.trim().toLowerCase() || '';

  let response = '';

  if (question.includes('alerta') || question.includes('alert')) {
    response = 'Com base nos dados disponíveis, encontrei alertas registados no sistema. ' +
      'Os alertas incluem detecções de movimento, quedas e tentativas de intrusão. ' +
      'Cada alerta é registado com timestamp, severidade e sensor de origem.';
  } else if (question.includes('pessoa') || question.includes('occupan') || question.includes('ocupa')) {
    response = 'O sistema WGF SenseOS deteta a presença humana através de sinais WiFi CSI. ' +
      'A contagem de pessoas é estimada usando análise de energia espectral dos subportadores.';
  } else if (question.includes('queda') || question.includes('fall')) {
    response = 'O classificador de quedas analisa o sinal CSI em três etapas: ' +
      '1) Deteção de impacto (spike de energia), 2) Análise pós-impacto (redução de movimento), ' +
      '3) Correlação temporal. Quedas são classificadas com confiança >= 75%.';
  } else if (question.includes('segurança') || question.includes('security') || question.includes('intrus')) {
    response = 'O sistema inclui anti-spoofing baseado em fingerprint RF: ' +
      'análise de phase noise, IQ imbalance, CFO e RSSI drift. ' +
      'Sensores não autenticados são bloqueados automaticamente.';
  } else {
    response = 'O WGF SenseOS é uma plataforma de segurança baseada em WiFi Sensing. ' +
      'Posso ajudar com informações sobre: ocupância, alertas, detecções, quedas, ' +
      'e segurança do sistema. Faça uma pergunta mais específica.';
  }

  const words = response.split(' ');
  for (let i = 0; i < words.length; i++) {
    yield { text: words[i] + ' ', done: false };
  }
  yield { text: '', done: true };
}

export async function* generateResponse(
  prompt: string,
): AsyncGenerator<ChatChunk> {
  try {
    yield* callLLMStreaming(prompt);
  } catch (error) {
    console.error('[response-generator] Error:', error);
    yield {
      text: 'Desculpe, ocorreu um erro ao gerar a resposta. ' +
            'Por favor, tente novamente ou contacte o suporte.',
      done: true,
    };
  }
}
