import { hookQueries, hookAnalyticsQueries } from '@/lib/db/queries';
import { generateWithZen, parseListResponse, isZenConfigured } from './zen';

const hookTemplates = [
  '¿Necesitas un CV que realmente atraiga clientes?',
  'Tu CV está perdiendo oportunidades... esto lo arregla',
  'Cómo hacer un CV que consiga entrevistas en 24 horas',
  'El error #1 que cometen todos al crear su CV',
  'Plantilla de CV que triplica tus llamadas de RRHH',
  'Sin experiencia pero necesitas un CV ganador...',
  '¿Sabías que el 70% de los CV son rechazados por esto?',
  'El secreto profesional para un CV perfecto...',
  'Deja de hacer CV genéricos y empieza a destacar',
  'La forma rápida de crear un CV profesional sin complicaciones',
  'Esto cambió mi vida: CV sin experiencia',
  'No pierdas más tiempo con CV aburridos',
  '¿Quieres un CV que los reclutadores quieran leer?',
  'El truco que funciona para CVs sin experiencia',
  'Sin complicaciones, logra tu CV ideal en 1 hora',
  '¿Cansado de que rechacen tu CV? Prueba esto',
  'La diferencia entre un CV rechazado y uno aceptado',
  'Lo que aprendí sobre CVs en una semana',
  'Resultado garantizado: CV profesional en 1 día',
  '¿Sabías que puedes hacer un CV ganador gratis?',
  'El método definitivo para CV sin experiencia',
  'Cómo logré un CV perfecto en solo 1 día',
];

function pickTemplate(): string {
  return hookTemplates[Math.floor(Math.random() * hookTemplates.length)];
}

const ZEN_SYSTEM = `Eres un creador de contenido viral experto en YouTube Shorts en español (España).
Tus frases gancho son breves (6-12 palabras), impactantes y provocan curiosidad inmediata.
Reglas:
- Solo respuestas que parezcan texto que un creador de YouTube pondría en su video.
- NUNCA uses comillas, viñetas ni formato. Solo texto plano.
- Devuelve EXACTAMENTE el número de frases que te piden, una por línea, sin numerar.`;

/**
 * Genera hooks con OpenCode Zen (big-pickle) si está configurado,
 * si no, devuelve templates de fallback.
 */
export async function generateHooksWithZen(count: number, context?: string): Promise<string[]> {
  if (!isZenConfigured()) {
    const hooks: string[] = [];
    for (let i = 0; i < count; i++) hooks.push(pickTemplate());
    return hooks;
  }

  const ctxBlock = context ? `\nContexto: ${context}` : '';
  const prompt = `Genera exactamente ${count} frases gancho atractivas para YouTube Shorts sobre/videos profesionales/creativos.${ctxBlock}\nSolo texto plano, una frase por línea.`;

  const raw = await generateWithZen(ZEN_SYSTEM, prompt, { temperature: 0.95, maxTokens: 400 });

  if (raw) {
    const parsed = parseListResponse(raw).slice(0, count);
    if (parsed.length >= Math.ceil(count / 2)) return parsed;
  }

  const hooks: string[] = [];
  for (let i = 0; i < count; i++) hooks.push(pickTemplate());
  return hooks;
}

/**
 * Genera un hook usando Zen para un short individual.
 * El contexto describe los medios disponibles para personalizarlo.
 */
export async function generateSingleHook(context?: string): Promise<string> {
  if (!isZenConfigured()) return pickTemplate();
  const hooks = await generateHooksWithZen(1, context);
  return hooks[0] || pickTemplate();
}

const HOOK_REFILL_BATCH = 10;
const HOOK_REFILL_THRESHOLD = 5;
const HOOK_POOL_TARGET_DEFAULT = 100;

export function getHookPoolTarget(): number {
  const raw = Number(process.env.HOOK_POOL_TARGET);
  if (Number.isFinite(raw) && raw > 0) return Math.min(Math.floor(raw), 100);
  return HOOK_POOL_TARGET_DEFAULT;
}

/**
 * Cuando quedan pocos hooks activos, llama a OpenCode Zen (big-pickle)
 * por lotes y crea hooks hasta llenar el pool (100 por defecto).
 * Devuelve cuántos hooks creó.
 */
export async function refillHookPool(): Promise<number> {
  if (!isZenConfigured()) return 0;

  const target = getHookPoolTarget();
  const activeCount = (await hookQueries.findActive()).length;
  if (activeCount >= HOOK_REFILL_THRESHOLD) return 0;

  let created = 0;
  const totalNeeded = target - activeCount;

  while (created < totalNeeded) {
    const batch = await generateHooksWithZen(
      Math.min(HOOK_REFILL_BATCH, totalNeeded - created),
      'banco masivo de frases gancho variadas, originales y creativas para reabastecer la biblioteca de hooks de YouTube Shorts'
    );
    if (!batch.length) break;

    for (const text of batch) {
      await hookQueries.create(text);
      created++;
    }
  }

  return created;
}

export async function generateWeeklyHooks(): Promise<{ hooks: string[]; count: number }> {
  const hooks: string[] = [];

  if (isZenConfigured()) {
    const zenHooks = await generateHooksWithZen(7, 'generación semanal de frases gancho variadas para contenido de YouTube Shorts');
    hooks.push(...zenHooks);
  }

  if (hooks.length < 7) {
    const remaining = 7 - hooks.length;
    for (let i = 0; i < remaining; i++) {
      hooks.push(pickTemplate());
    }
  }

  for (const text of hooks) {
    await hookQueries.create(text);
  }

  return { hooks, count: hooks.length };
}

export async function analyzePerformanceAndGenerate(): Promise<{
  topHook: any;
  newHooks: string[];
  analysis: any[];
}> {
  const performance = await hookAnalyticsQueries.getHookPerformance();
  const topHooks = await hookAnalyticsQueries.getTopPerforming(5);

  let topHook = null;
  if (topHooks.length > 0) {
    topHook = topHooks[0];
  }

  const contextHint = topHook?.hook_text
    ? `El mejor hook actual es "${topHook.hook_text}" con ${topHook.views} vistas. Genera hooks diferentes y mejores.`
    : 'Genera hooks variados y creativos para YouTube Shorts.';

  let newHooks: string[] = [];

  if (isZenConfigured()) {
    const zenHooks = await generateHooksWithZen(7, contextHint);
    newHooks.push(...zenHooks);
  }

  if (newHooks.length < 7) {
    const remaining = 7 - newHooks.length;
    for (let i = 0; i < remaining; i++) {
      newHooks.push(pickTemplate());
    }
  }

  for (const text of newHooks) {
    await hookQueries.create(text);
  }

  return {
    topHook,
    newHooks,
    analysis: performance,
  };
}

export async function getAnalyticsDashboard(): Promise<{
  hookPerformance: any[];
  topShorts: any[];
  totalViews: number;
  totalShorts: number;
}> {
  const hookPerformance = await hookAnalyticsQueries.getHookPerformance();
  const topShorts = await hookAnalyticsQueries.getTopPerforming(10);

  const totalViews = hookPerformance.reduce((sum: number, h: any) => sum + (h.total_views || 0), 0);
  const totalShorts = hookPerformance.reduce((sum: number, h: any) => sum + (h.total_shorts || 0), 0);

  return {
    hookPerformance,
    topShorts,
    totalViews,
    totalShorts,
  };
}