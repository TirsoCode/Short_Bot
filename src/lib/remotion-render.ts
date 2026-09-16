import { shortQueries, mediaQueries, hookQueries, settingsQueries } from '@/lib/db/queries';
import { normalizeStyle, DEFAULT_STYLE } from '@/lib/short-style';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { rendersDir, mediaDir, ensureDirs } from '@/lib/paths';

export async function renderShort(shortId: string, onProgress?: (progress: number) => void) {
  const short = await shortQueries.findById(shortId);
  if (!short) throw new Error('Short not found');
  const hook = await hookQueries.findById(short.hook_id);
  if (!hook) throw new Error('Hook not found');

  const mediaItems = await mediaQueries.findByIds(short.mediaIds);
  const settings = await settingsQueries.find();

  const width = settings?.video_width ?? 1080;
  const height = settings?.video_height ?? 1920;
  const fps = settings?.video_fps ?? 30;
  const maxDuration = Math.max(8, settings?.max_short_duration ?? 30);

  const hookOutroSeconds = 4;
  const mediaCount = mediaItems.length;
  const perItemDuration = mediaCount > 0
    ? Math.max(0.5, Math.round(((maxDuration - hookOutroSeconds) / mediaCount) * 10) / 10)
    : 0;

  const mediaForRemotion = mediaItems.map((m: any) => {
    const remotePath = m.downloaded_path;
    const localPath = remotePath?.startsWith('/api/media/stream/')
      ? path.join(mediaDir, remotePath.split('/').pop())
      : remotePath ?? m.url;
    return {
      id: m.id, type: m.type, path: localPath,
      duration: perItemDuration,
    };
  });

  const mediaTotalSeconds = mediaForRemotion.reduce((acc, m) => acc + m.duration, 0);
  const contentSeconds = mediaCount > 0 ? Math.min(maxDuration, hookOutroSeconds + mediaTotalSeconds) : maxDuration;
  const totalFrames = Math.ceil(contentSeconds * fps);
  const outputDir = rendersDir;
  ensureDirs();
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${shortId}.mp4`);

  const inputProps = { hookText: short.hook_text, media: mediaForRemotion, width, height, fps, durationInFrames: totalFrames, style: normalizeStyle(settings?.styleJson, DEFAULT_STYLE) };
  const propsPath = path.join(outputDir, `${shortId}-props.json`);
  fs.writeFileSync(propsPath, JSON.stringify(inputProps));

  onProgress?.(10);
  return new Promise<{ outputPath: string; publicUrl: string; duration: number }>((resolve, reject) => {
    const args = ['remotion', 'render', 'src/index.tsx', 'ShortComposition', outputPath, `--props=${propsPath}`, '--concurrency=1'];
    const child = spawn('npx', args, {
      cwd: path.join(process.cwd(), 'remotion'),
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '';
    let errOut = '';
    const recent: string[] = [];

    const updateProgress = () => {
      const text = recent.join('\n');
      const frames = text.match(/(\d+)\s*\/\s*(\d+)/);
      const percent = text.match(/(\d+(?:\.\d+)?)\s*%/);
      let pct: number | null = null;
      if (frames && Number(frames[2]) > 0) {
        pct = (Number(frames[1]) / Number(frames[2])) * 100;
      } else if (percent) {
        pct = Number(percent[1]);
      }
      if (pct !== null) onProgress?.(Math.max(12, Math.min(95, Math.round(pct))));
    };

    const onChunk = (data: Buffer) => {
      const s = data.toString();
      out += s;
      recent.push(s);
      if (recent.length > 50) recent.shift();
      updateProgress();
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', (d: Buffer) => { errOut += d.toString(); onChunk(d); });
    child.on('error', (e) => reject(e));
    child.on('close', (code) => {
      if (code === 0) {
        onProgress?.(100);
        resolve({ outputPath, publicUrl: `/api/media/stream/${shortId}.mp4`, duration: contentSeconds });
      } else {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        const tail = errOut.trim().split('\n').slice(-8).join('\n');
        reject(new Error(`Remotion render failed (exit ${code}): ${tail || out.trim().slice(-300) || 'unknown error'}`));
      }
    });
  });
}