import cron from 'node-cron';
import { syncGitHubMedia } from '/root/short_bot/src/lib/github.ts';
import { renderQueue } from '/root/short_bot/src/lib/render-queue.ts';
import { shortQueries, youtubeTokenQueries } from '/root/short_bot/src/lib/db/queries.ts';
import { YouTubeClient } from '/root/short_bot/src/lib/youtube.js';
import { mediaQueries } from '/root/short_bot/src/lib/db/queries.ts';
import { syncAndGenerate } from '/root/short_bot/src/lib/auto-generate.ts';
import fs from 'fs';
import path from 'path';

let jobs: cron.ScheduledTask[] = [];

export function startScheduler() {
  stopScheduler();

  jobs.push(cron.schedule('0 19 * * *', async () => {
    console.log('[Scheduler] Daily auto-generate at 7PM...');
    try {
      const result = await syncAndGenerate();
      console.log(`[Scheduler] Sync: ${result.synced} new, Generated: ${result.generated} shorts, Errors: ${result.errors.length}`);
    } catch (e: any) {
      console.error(`[Scheduler] Auto-generate error: ${e.message}`);
    }
  }));

  jobs.push(cron.schedule('*/10 * * * *', async () => {
    console.log('[Scheduler] Syncing GitHub...');
    try {
      const r = await syncGitHubMedia();
      console.log(`[Scheduler] GitHub sync: ${r.newMediaCount} new, ${r.errors.length} errors`);
    } catch (e: any) {
      console.error(`[Scheduler] GitHub sync error: ${e.message}`);
    }
  }));

  jobs.push(cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Cleanup old renders...');
    const dir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      if (now - fs.statSync(fp).mtimeMs > 7 * 24 * 60 * 60 * 1000) fs.unlinkSync(fp);
    });
  }));

  jobs.push(cron.schedule('0 20 * * *', async () => {
    console.log('[Scheduler] Syncing YouTube stats...');
    try {
      const { YouTubeClient } = await import('/root/short_bot/src/lib/youtube.ts');
      const { hookAnalyticsQueries, shortQueries: sq } = await import('/root/short_bot/src/lib/db/queries.js');

      const client = await YouTubeClient.createFromStoredTokens();
      if (!client) {
        console.log('[Scheduler] YouTube not connected, skipping stats sync');
        return;
      }

      const stats = await client.getAllShortsStats();
      const allShorts = await sq.findAll();
      const publishedShorts = allShorts.filter(s => s.status === 'published' && s.youtube_video_id);

      for (const stat of stats) {
        const short = publishedShorts.find(s => s.youtube_video_id === stat.videoId);
        if (!short) continue;

        const existingAnalytics = await hookAnalyticsQueries.findByShortId(short.id);
        if (existingAnalytics) {
          await hookAnalyticsQueries.updateViews(existingAnalytics.id, stat.views, stat.likes, 0);
        } else {
          await hookAnalyticsQueries.create({
            shortId: short.id,
            hookId: short.hook_id,
            views: stat.views,
            likes: stat.likes,
            watchTimeSeconds: 0,
          });
        }
      }

      console.log(`[Scheduler] YouTube stats synced: ${stats.length} videos`);
    } catch (e: any) {
      console.error(`[Scheduler] YouTube stats sync error: ${e.message}`);
    }
  }));

  jobs.push(cron.schedule('0 4 * * 1', async () => {
    console.log('[Scheduler] Weekly hook generation...');
    try {
      const { analyzePerformanceAndGenerate } = await import('/root/short_bot/src/lib/hook-generator.js');
      const result = await analyzePerformanceAndGenerate();
      console.log(`[Scheduler] Weekly hooks generated: ${result.newHooks.length} new hooks`);
      if (result.topHook) {
        console.log(`[Scheduler] Best performing hook: "${result.topHook.hook_text}" with ${result.topHook.views} views`);
      }
    } catch (e: any) {
      console.error(`[Scheduler] Weekly hook generation error: ${e.message}`);
    }
  }));

  console.log('[Scheduler] Started - Daily auto-generate at 7PM, GitHub sync every 10min');
}

export function stopScheduler() { jobs.forEach(j => j.stop()); jobs = []; }
