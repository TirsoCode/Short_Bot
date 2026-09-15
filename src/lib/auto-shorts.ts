import { hookQueries, mediaQueries, settingsQueries, shortQueries } from '@/lib/db/queries';
import { renderQueue } from '@/lib/render-queue';
import { generateId } from '@/lib/utils';
import { generateShortContent, generateHooksBatch, getHookPoolTarget } from '@/lib/ai';

function pickRandom<T>(items: T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

function pickRandomN<T>(items: T[], n: number): T[] {
  const copy = [...items];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

const HOOK_REFILL_THRESHOLD = 5;
const HOOK_REFILL_BATCH = 10;
const FALLBACK_HOOK = 'No creerás lo que viene a continuación';

/**
 * Si quedan pocos hooks activos, llama a OpenCode Zen por lotes y crea
 * hooks hasta llenar el pool (100 por defecto, configurable con HOOK_POOL_TARGET).
 */
export async function maybeRefillHooks(): Promise<number> {
  const activeCount = (await hookQueries.findActive()).length;
  if (activeCount >= HOOK_REFILL_THRESHOLD) return 0;

  const target = getHookPoolTarget();
  let created = 0;
  let needed = target - activeCount;

  while (needed > 0) {
    const batch = await generateHooksBatch(Math.min(HOOK_REFILL_BATCH, needed));
    if (!batch.length) break;
    for (const text of batch) {
      await hookQueries.create(text);
      created++;
    }
    needed -= batch.length;
  }

  return created;
}

export async function generateAutoShort(publish: boolean): Promise<boolean> {
  const hooks = await hookQueries.findActive();
  if (!hooks.length) {
    await maybeRefillHooks();
  }
  const media = await mediaQueries.findAll();
  if (!media.length) return false;

  const selected = pickRandomN(media, Math.min(3, media.length));
  const idea = await generateShortContent(selected.map(m => m.name));

  let hookId: string;
  let hookText: string;
  if (idea?.hook) {
    const created = await hookQueries.create(idea.hook);
    hookId = created.id;
    hookText = created.text;
  } else {
    const refreshed = await hookQueries.findActive();
    const pool = refreshed.length ? refreshed : hooks;
    const chosen = pickRandom(pool);
    const fallback = await hookQueries.create(FALLBACK_HOOK);
    hookId = chosen?.id ?? fallback.id;
    hookText = chosen?.text ?? fallback.text;
  }

  const short = await shortQueries.create({
    id: generateId(),
    hookId,
    hookText,
    mediaIds: selected.map(m => m.id),
    title: idea?.title ?? `Short - ${hookText.slice(0, 40)}`,
    description: idea?.description ?? '',
    tags: idea?.tags ?? [],
    status: 'draft',
  });
  if (!short) return false;

  renderQueue.add(short.id).catch(() => {});
  if (publish) await shortQueries.updateStatus(short.id, 'accepted');
  return true;
}

/**
 * Botón manual "Generar uno más (IA)": genera 1 short sin límite diario
 * usando OpenCode Zen. Devuelve el hook usado si lo hubo.
 */
export async function generateOneManualShort(): Promise<{ success: boolean; hookText?: string; shortId?: string; error?: string }> {
  const media = await mediaQueries.findAll();
  if (!media.length) return { success: false, error: 'No hay medios disponibles para generar un short' };

  const hooks = await hookQueries.findActive();
  if (!hooks.length) await maybeRefillHooks();

  const selected = pickRandomN(media, Math.min(3, media.length));
  const idea = await generateShortContent(selected.map(m => m.name));

  let hookId: string;
  let hookText: string;
  if (idea?.hook) {
    const created = await hookQueries.create(idea.hook);
    hookId = created.id;
    hookText = created.text;
  } else {
    const refreshed = await hookQueries.findActive();
    if (!refreshed.length) return { success: false, error: 'No hay hooks activos y Zen no devolvió ninguno' };
    const chosen = pickRandom(refreshed);
    if (!chosen) return { success: false, error: 'No hay hooks activos y Zen no devolvió ninguno' };
    hookId = chosen.id;
    hookText = chosen.text;
  }

  const short = await shortQueries.create({
    id: generateId(),
    hookId,
    hookText,
    mediaIds: selected.map(m => m.id),
    title: idea?.title ?? `Short - ${hookText.slice(0, 40)}`,
    description: idea?.description ?? '',
    tags: idea?.tags ?? [],
    status: 'draft',
  });
  if (!short) return { success: false, error: 'No se pudo crear el short' };

  renderQueue.add(short.id).catch(() => {});
  return { success: true, hookText, shortId: short.id };
}

function localDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function maybeRunAutoShorts(): Promise<number> {
  const settings = await settingsQueries.find();
  const perDaySetting = Number(process.env.SHORTS_PER_DAY) || 2;
  const perDay = Math.max(1, Math.min(24, settings?.autoShortsPerDay ?? perDaySetting));
  const publish = !!(settings?.autoPublish ?? 0);
  const autoRuns: string[] = Array.isArray(settings?.autoRuns) ? settings.autoRuns : [];

  const now = new Date();
  const today = localDateString(now);
  const minutesOfDay = now.getHours() * 60 + now.getMinutes();
  const firstSlot = 9 * 60;
  const interval = Math.floor(1440 / perDay);

  const dueSlots: number[] = [];
  for (let k = 0; k < perDay; k++) {
    const slot = firstSlot + k * interval;
    if (slot >= 1440) break;
    const marker = `${today}|${k}`;
    if (minutesOfDay >= slot && !autoRuns.includes(marker)) dueSlots.push(k);
  }

  if (!dueSlots.length) return 0;

  let ran = 0;
  for (const k of dueSlots) {
    try {
      if (await generateAutoShort(publish)) {
        autoRuns.push(`${today}|${k}`);
        ran++;
      }
    } catch (error: any) {
      console.error(`[Auto] Failed to generate short (slot ${k}):`, error.message);
    }
  }

  if (ran) await settingsQueries.update({ autoRuns });
  return ran;
}