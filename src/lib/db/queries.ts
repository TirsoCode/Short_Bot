import { query, run, getOne } from './client';
import { DEFAULT_STYLE, normalizeStyle } from '@/lib/short-style';

export interface MediaRow { id: string; name: string; path: string; type: string; size: number; sha: string; url: string; downloaded_path: string | null; created_at: string; updated_at: string; }
export interface HookRow { id: string; text: string; is_active: number; created_at: string; }
export interface ShortRow { id: string; hook_id: string; hook_text: string; media_ids: string; title: string; description: string; tags: string; status: string; rendered_path: string | null; duration: number | null; youtube_video_id: string | null; youtube_url: string | null; error_message: string | null; reject_reason: string | null; created_at: string; updated_at: string; }
export interface SettingsRow { id: string; github_owner: string; github_repo: string; github_branch: string; github_paths: string; github_token: string; youtube_client_id: string; youtube_client_secret: string; youtube_refresh_token: string | null; sync_interval_minutes: number; max_short_duration: number; video_width: number; video_height: number; video_fps: number; media_paths: string; auto_shorts_per_day: number; auto_publish: number; auto_runs: string; style_json: string; buffer_api_key: string; buffer_channel_id: string; buffer_video_base_url: string; created_at: string; updated_at: string; }
export interface YouTubeTokensRow { id: string; access_token: string; refresh_token: string; expiry_date: number; created_at: string; updated_at: string; }

function parseJsonField(val: string | null, fallback: any = []): any {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function toMedia(r: MediaRow) { return { ...r, type: r.type as 'video' | 'image', downloadedPath: r.downloaded_path }; }
function toHook(r: HookRow) { return { ...r, isActive: !!r.is_active }; }
function toShort(r: ShortRow) { return { ...r, mediaIds: parseJsonField(r.media_ids), tags: parseJsonField(r.tags), status: r.status as any, renderedPath: r.rendered_path, youtubeVideoId: r.youtube_video_id, youtubeUrl: r.youtube_url, errorMessage: r.error_message, rejectReason: r.reject_reason }; }
function toSettings(r: SettingsRow) { return { ...r, githubOwner: r.github_owner, githubRepo: r.github_repo, githubBranch: r.github_branch, githubPaths: parseJsonField(r.github_paths), githubToken: r.github_token, youtubeClientId: r.youtube_client_id, youtubeClientSecret: r.youtube_client_secret, youtubeRefreshToken: r.youtube_refresh_token, syncIntervalMinutes: r.sync_interval_minutes, maxShortDuration: r.max_short_duration, videoWidth: r.video_width, videoHeight: r.video_height, videoFps: r.video_fps, mediaPaths: parseJsonField(r.media_paths, ['videos', 'fotos']), autoShortsPerDay: r.auto_shorts_per_day, autoPublish: !!r.auto_publish, autoRuns: parseJsonField(r.auto_runs, []), styleJson: normalizeStyle(parseJsonField(r.style_json, null), DEFAULT_STYLE), bufferApiKey: r.buffer_api_key, bufferChannelId: r.buffer_channel_id, bufferVideoBaseUrl: r.buffer_video_base_url }; }

export const mediaQueries = {
  async findAll() { return (await query('SELECT * FROM media ORDER BY created_at DESC')).map(toMedia); },
  async findByIds(ids: string[]) { if (!ids.length) return []; const ph = ids.map(() => '?').join(','); return (await query(`SELECT * FROM media WHERE id IN (${ph})`, ids)).map(toMedia); },
  async findBySha(sha: string) { const r = await getOne('SELECT * FROM media WHERE sha = ?', [sha]); return r ? toMedia(r as MediaRow) : null; },
  async create(d: any) { await run('INSERT INTO media (id, name, path, type, size, sha, url, downloaded_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [d.id, d.name, d.path, d.type, d.size, d.sha, d.url, d.downloadedPath || null]); return d; },
  async updateDownloadedPath(id: string, p: string) { await run('UPDATE media SET downloaded_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [p, id]); },
  async delete(id: string) { await run('DELETE FROM media WHERE id = ?', [id]); },
  async count() { const r = await getOne('SELECT COUNT(*) as c FROM media'); return r?.c ?? 0; },
};

export const hookQueries = {
  async findAll() { return (await query('SELECT * FROM hooks ORDER BY created_at DESC')).map(toHook); },
  async findActive() { return (await query('SELECT * FROM hooks WHERE is_active = 1 ORDER BY created_at DESC')).map(toHook); },
  async findById(id: string) { const r = await getOne('SELECT * FROM hooks WHERE id = ?', [id]); return r ? toHook(r as HookRow) : null; },
  async create(text: string) { const id = crypto.randomUUID(); await run('INSERT INTO hooks (id, text, is_active) VALUES (?, ?, 1)', [id, text]); return { id, text, isActive: true }; },
  async update(id: string, data: any) { if (data.text !== undefined) await run('UPDATE hooks SET text = ? WHERE id = ?', [data.text, id]); if (data.isActive !== undefined) await run('UPDATE hooks SET is_active = ? WHERE id = ?', [data.isActive ? 1 : 0, id]); },
  async delete(id: string) { await run('DELETE FROM hooks WHERE id = ?', [id]); },
};

export const shortQueries = {
  async findAll() { return (await query('SELECT * FROM shorts ORDER BY created_at DESC')).map(toShort); },
  async findByStatus(status: string) { return (await query('SELECT * FROM shorts WHERE status = ? ORDER BY created_at DESC', [status])).map(toShort); },
  async findById(id: string) { const r = await getOne('SELECT * FROM shorts WHERE id = ?', [id]); return r ? toShort(r as ShortRow) : null; },
  async create(d: any) { const id = d.id || crypto.randomUUID(); await run('INSERT INTO shorts (id, hook_id, hook_text, media_ids, title, description, tags, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, d.hookId, d.hookText, JSON.stringify(d.mediaIds || []), d.title || 'Short', d.description || '', JSON.stringify(d.tags || []), d.status || 'draft']); return this.findById(id); },
  async update(id: string, data: any) { const sets: string[] = []; const vals: any[] = []; Object.entries(data).forEach(([k, v]) => { if (v === undefined) return; const col = k === 'mediaIds' ? 'media_ids' : k === 'hookId' ? 'hook_id' : k === 'hookText' ? 'hook_text' : k === 'renderedPath' ? 'rendered_path' : k === 'youtubeVideoId' ? 'youtube_video_id' : k === 'youtubeUrl' ? 'youtube_url' : k === 'errorMessage' ? 'error_message' : k === 'rejectReason' ? 'reject_reason' : k; const val = typeof v === 'object' ? JSON.stringify(v) : v; sets.push(`${col} = ?`); vals.push(val); }); if (sets.length) { sets.push('updated_at = CURRENT_TIMESTAMP'); vals.push(id); await run(`UPDATE shorts SET ${sets.join(', ')} WHERE id = ?`, vals); } },
  async updateStatus(id: string, status: string, extra?: any) { await this.update(id, { status, ...extra }); },
  async delete(id: string) { await run('DELETE FROM shorts WHERE id = ?', [id]); },
};

export const settingsQueries = {
  async find() { const r = await getOne('SELECT * FROM settings WHERE id = ?', ['default']); return r ? toSettings(r as SettingsRow) : null; },
  async update(data: any) { const sets: string[] = []; const vals: any[] = []; Object.entries(data).forEach(([k, v]) => { if (v === undefined) return; const col = k === 'githubOwner' ? 'github_owner' : k === 'githubRepo' ? 'github_repo' : k === 'githubBranch' ? 'github_branch' : k === 'githubPaths' ? 'github_paths' : k === 'githubToken' ? 'github_token' : k === 'youtubeClientId' ? 'youtube_client_id' : k === 'youtubeClientSecret' ? 'youtube_client_secret' : k === 'youtubeRefreshToken' ? 'youtube_refresh_token' : k === 'syncIntervalMinutes' ? 'sync_interval_minutes' : k === 'maxShortDuration' ? 'max_short_duration' : k === 'videoWidth' ? 'video_width' : k === 'videoHeight' ? 'video_height' : k === 'videoFps' ? 'video_fps' : k === 'mediaPaths' ? 'media_paths' : k === 'autoShortsPerDay' ? 'auto_shorts_per_day' : k === 'autoPublish' ? 'auto_publish' : k === 'autoRuns' ? 'auto_runs' : k === 'styleJson' ? 'style_json' : k === 'bufferApiKey' ? 'buffer_api_key' : k === 'bufferChannelId' ? 'buffer_channel_id' : k === 'bufferVideoBaseUrl' ? 'buffer_video_base_url' : k; const val = (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v; sets.push(`${col} = ?`); vals.push(val); }); if (sets.length) { sets.push('updated_at = CURRENT_TIMESTAMP'); await run(`UPDATE settings SET ${sets.join(', ')} WHERE id = ?`, [...vals, 'default']); } },
};

export interface HookAnalyticsRow { id: string; short_id: string; hook_id: string; views: number; likes: number; watch_time_seconds: number; generated_at: string; analyzed_at: string | null; }

export const hookAnalyticsQueries = {
  async findAll() { return query('SELECT * FROM hook_analytics ORDER BY generated_at DESC'); },
  async findByHookId(hookId: string) { return query('SELECT * FROM hook_analytics WHERE hook_id = ? ORDER BY generated_at DESC', [hookId]); },
  async findByShortId(shortId: string) { const r = getOne('SELECT * FROM hook_analytics WHERE short_id = ?', [shortId]); return r || null; },
  async create(d: { shortId: string; hookId: string; views?: number; likes?: number; watchTimeSeconds?: number }) {
    const id = crypto.randomUUID();
    run('INSERT INTO hook_analytics (id, short_id, hook_id, views, likes, watch_time_seconds) VALUES (?, ?, ?, ?, ?, ?)',
      [id, d.shortId, d.hookId, d.views || 0, d.likes || 0, d.watchTimeSeconds || 0]);
    return id;
  },
  async updateViews(id: string, views: number, likes: number, watchTimeSeconds: number) {
    run('UPDATE hook_analytics SET views = ?, likes = ?, watch_time_seconds = ?, analyzed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [views, likes, watchTimeSeconds, id]);
  },
  async getTopPerforming(limit: number = 5) {
    return query('SELECT ha.*, h.text as hook_text FROM hook_analytics ha JOIN hooks h ON ha.hook_id = h.id ORDER BY ha.views DESC LIMIT ?', [limit]);
  },
  async getHookPerformance() {
    return query(`SELECT h.id, h.text, COUNT(ha.id) as total_shorts, SUM(ha.views) as total_views, AVG(ha.views) as avg_views
      FROM hooks h LEFT JOIN hook_analytics ha ON h.id = ha.hook_id
      WHERE h.is_active = 1 GROUP BY h.id ORDER BY avg_views DESC`);
  },
  async delete(id: string) { run('DELETE FROM hook_analytics WHERE id = ?', [id]); },
};