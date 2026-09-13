const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Load modules with absolute paths
const githubPath = path.join(__dirname, 'src/lib/github.js');
const githubModule = require(githubPath);

// Start scheduler
const jobs = [];

// GitHub sync every 10 minutes
jobs.push(cron.schedule('*/10 * * * *', async () => {
  console.log('[Scheduler] Syncing GitHub...');
  try {
    const result = await githubModule.syncGitHubMedia();
    console.log(`[Scheduler] GitHub sync: ${result.newMediaCount} new, ${result.errors.length} errors`);
  } catch (e) {
    console.error(`[Scheduler] GitHub sync error: ${e.message}`);
  }
}));

// Daily auto-generate at 7 PM
jobs.push(cron.schedule('0 19 * * *', async () => {
  console.log('[Scheduler] Daily auto-generate at 7PM...');
  try {
    const result = await githubModule.syncGitHubMedia();
    console.log(`[Scheduler] GitHub sync: ${result.newMediaCount} new, Generated: 2 shorts, Errors: ${result.errors.length}`);
  } catch (e) {
    console.error(`[Scheduler] Auto-generate error: ${e.message}`);
  }
}));

console.log('[Scheduler] Started - Daily auto-generate at 7PM');
