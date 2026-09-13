const DEFAULT_ENDPOINT = 'https://opencode.ai/zen/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENCODE_ZEN_MODEL || 'big-pickle';

interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export function isZenConfigured(): boolean {
  return Boolean(process.env.OPENCODE_ZEN_API_KEY);
}

/**
 * Llama a la API de OpenCode Zen (compatible con OpenAI Chat Completions).
 * Devuelve el texto de la respuesta o null si falla / no hay API key.
 */
export async function generateWithZen(
  system: string,
  prompt: string,
  options: GenerateOptions = {}
): Promise<string | null> {
  const apiKey = process.env.OPENCODE_ZEN_API_KEY;
  if (!apiKey) return null;

  const model = options.model || DEFAULT_MODEL;

  try {
    const res = await fetch(process.env.OPENCODE_ZEN_ENDPOINT || DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature ?? 0.9,
        max_tokens: options.maxTokens ?? 600,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Zen] API error ${res.status} (${model}): ${body.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      console.error(`[Zen] Respuesta sin contenido (${model})`);
      return null;
    }
    return content.trim();
  } catch (e: any) {
    console.error(`[Zen] Request failed (${model}): ${e.message}`);
    return null;
  }
}

/** Extrae un array de strings a partir de la respuesta del modelo. */
export function parseListResponse(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map(s => s.trim()).filter(Boolean);
    }
  } catch {}

  const lines = raw
    .split('\n')
    .map(l => l.trim().replace(/^[-*\d.)]+\s*/, '').replace(/^[`"'"]+|[`"'"]+$/g, '').trim())
    .filter(l => l && !l.startsWith('{') && !l.startsWith('[') && !l.startsWith('}'));

  return lines;
}