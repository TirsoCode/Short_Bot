import { PHASE_PRODUCTION_SERVER, PHASE_DEVELOPMENT_SERVER } from 'next/constants';

export async function register() {
  // register() también corre durante "next build" (prerender), donde NEXT_PHASE
  // no está definido. Solo arrancamos el scheduler en fases de servidor reales:
  // un render lanzado durante el build quedaría huérfano ('rendering' para siempre).
  const phase = process.env.NEXT_PHASE;
  if (phase !== PHASE_PRODUCTION_SERVER && phase !== PHASE_DEVELOPMENT_SERVER) return;

  const { startScheduler } = await import('./lib/scheduler');
  try {
    startScheduler();
  } catch (error) {
    console.error('Failed to start scheduler:', error);
  }
}