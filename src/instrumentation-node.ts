export async function register() {
  // No queremos efectos secundarios (scheduler, auto-shorts, sync) durante "next build":
  // ahí NO corre el servidor y los renders quedarían huérfanos.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { startScheduler } = await import('./lib/scheduler');
  try {
    startScheduler();
  } catch (error) {
    console.error('Failed to start scheduler:', error);
  }
}