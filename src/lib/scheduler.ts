import cron, { ScheduledTask } from 'node-cron';
import { syncLocalMedia } from '@/lib/local-media';
import { maybeRunAutoShorts } from '@/lib/auto-shorts';
import { renderQueue } from './render-queue';
import { shortQueries, settingsQueries } from '@/lib/db/queries';
import { publishShortToBuffer } from '@/lib/buffer';
import { rendersDir } from '@/lib/paths';
import fs from 'fs';
import path from 'path';

let jobs: ScheduledTask[] = [];
let startupTimer: ReturnType<typeof setTimeout> | null = null;

export function startScheduler() {
  stopScheduler();

  // Catches-up al arrancar: si ya pasaron slots del día (p. ej. reboot a las 14:00)
  // genera lo pendiente sin esperar a la siguiente hora exacta.
  startupTimer = setTimeout(async () => {
    try {
      const ran = await maybeRunAutoShorts();
      if (ran) console.log(`[Scheduler] Auto-generated ${ran} short(s) on startup`);
      const r = await syncLocalMedia();
      console.log(`[Scheduler] Startup sync: ${r.newMediaCount} new, ${r.errors.length} errors`);
    } catch (e: any) {
      console.error('[Scheduler] Startup run failed:', e.message);
    }
  }, 3000);

  jobs.push(cron.schedule('*/30 * * * *', async () => {
    console.log('[Scheduler] Syncing local folders...');
    const r = await syncLocalMedia();
    console.log(`[Scheduler] Sync: ${r.newMediaCount} new, ${r.errors.length} errors`);
  }));
  jobs.push(cron.schedule('0 * * * *', async () => {
    const ran = await maybeRunAutoShorts();
    if (ran) console.log(`[Scheduler] Auto-generated ${ran} short(s)`);
  }));
  jobs.push(cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Cleanup...');
    const dir = rendersDir;
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      if (now - fs.statSync(fp).mtimeMs > 7 * 24 * 60 * 60 * 1000) fs.unlinkSync(fp);
    });
  }));
  jobs.push(cron.schedule('* * * * *', async () => {
    const settings = await settingsQueries.find();
    if (!settings?.autoPublish) return;
    const shorts = await shortQueries.findByStatus('accepted');
    for (const s of shorts) {
      if (!s.rendered_path) continue;
      try {
        shortQueries.updateStatus(s.id, 'uploading');
        const result = await publishShortToBuffer(s.id);
        shortQueries.updateStatus(s.id, 'published', { youtube_url: 'https://buffer.com', youtube_video_id: result.post?.id });
      } catch (e: any) {
        shortQueries.updateStatus(s.id, 'failed', { error_message: e.message });
      }
    }
  }));
  console.log('[Scheduler] Started');
}

export function stopScheduler() {
  if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
  jobs.forEach(j => j.stop());
  jobs = [];
}