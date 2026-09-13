import path from 'path';
import os from 'os';
import fs from 'fs';

export function publicToFsPath(publicPath: string): string {
  if (!publicPath) return publicPath;
  return path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
}

function pickDataDir(): string {
  const project = path.join(process.cwd(), 'data');
  try {
    fs.mkdirSync(project, { recursive: true });
    const probe = path.join(project, '.write-test');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return project;
  } catch {
    return path.join(os.tmpdir(), 'shortbot');
  }
}

export const dataDir = pickDataDir();
export const mediaDir = path.join(dataDir, 'media');
export const rendersDir = path.join(dataDir, 'renders');

export function ensureDirs() {
  for (const dir of [dataDir, mediaDir, rendersDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}