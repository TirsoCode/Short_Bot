import { Octokit } from '@octokit/rest';
import { mediaQueries, settingsQueries } from '@/lib/db/queries';
import { getMediaType, generateId } from '@/lib/utils';
import { mediaDir, ensureDirs } from '@/lib/paths';
import fs from 'fs';
import path from 'path';

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private branch: string;
  private paths: string[];

  constructor(token: string, owner: string, repo: string, branch: string, paths: string[]) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.paths = paths;
  }

  async syncMedia() {
    const errors: string[] = [];
    let newMediaCount = 0;
    for (const p of this.paths) {
      const r = await this.syncPath(p);
      newMediaCount += r.newMediaCount;
      errors.push(...r.errors);
    }
    return { success: errors.length === 0, newMediaCount, errors };
  }

  private async syncPath(dirPath: string): Promise<{ success: boolean; newMediaCount: number; errors: string[] }> {
    const errors: string[] = [];
    let newMediaCount = 0;
    try {
      const contents = await this.octokit.rest.repos.getContent({ owner: this.owner, repo: this.repo, path: dirPath, ref: this.branch });
      const items = Array.isArray(contents.data) ? contents.data : [contents.data];
      for (const item of items) {
        if (item.type === 'file' && 'name' in item && 'sha' in item && 'size' in item && 'path' in item) {
          const mediaType = getMediaType(item.name);
          if (mediaType !== 'unknown') {
            const exists = await mediaQueries.findBySha(item.sha);
            if (exists) continue;
            try {
              const response = await this.octokit.rest.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: item.path,
                ref: this.branch,
                mediaType: { format: 'raw' },
              });
              const buf = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data as any);
              ensureDirs();
              if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
              const ext = path.extname(item.name);
              const filename = `${generateId()}${ext}`;
              fs.writeFileSync(path.join(mediaDir, filename), buf);
              await mediaQueries.create({ id: generateId(), name: item.name, path: item.path, type: mediaType, size: item.size, sha: item.sha, url: item.html_url, downloadedPath: `/api/media/stream/${filename}` });
              newMediaCount++;
            } catch (error: any) {
              errors.push(`Failed to download ${item.name}: ${error.message}`);
            }
          }
        } else if (item.type === 'dir' && 'path' in item) {
          const sub = await this.syncPath(item.path);
          newMediaCount += sub.newMediaCount;
          errors.push(...sub.errors);
        }
      }
    } catch (error: any) {
      errors.push(`Failed to sync ${dirPath}: ${error.message}`);
    }
    return { success: errors.length === 0, newMediaCount, errors };
  }

  static async createFromSettings() {
    const s = await settingsQueries.find();
    const token = (s?.github_token || process.env.GITHUB_TOKEN || '').trim();
    let owner = (s?.github_owner || process.env.GITHUB_OWNER || '').trim();
    let repo = (s?.github_repo || process.env.GITHUB_REPO || '').trim();
    let branch = (s?.github_branch || process.env.GITHUB_BRANCH || 'main').trim() || 'main';
    const githubPaths = s?.githubPaths?.length ? s.githubPaths : ['videos', 'fotos'];

    if (!owner || !repo) {
      const detected = detectFromGitRemote();
      if (detected) {
        owner = owner || detected.owner;
        repo = repo || detected.repo;
        if (!branch || branch === 'main') branch = detected.branch || 'main';
      }
    }

    if (!owner || !repo) return null;
    // Repos públicos no necesitan token; si no hay token, se lee sin autenticar.
    return new GitHubClient(token, owner, repo, branch, githubPaths);
  }
}

function detectFromGitRemote(): { owner: string; repo: string; branch: string } | null {
  try {
    const gitPath = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitPath)) return null;
    const config = fs.readFileSync(path.join(gitPath, 'config'), 'utf8');
    const urlMatch = config.match(/url\s*=\s*(.+)/);
    if (!urlMatch) return null;
    let url = urlMatch[1].trim();
    url = url.replace(/\.git$/, '').replace(/\/+$/, '');
    let owner = '';
    let repo = '';
    if (url.includes('github.com')) {
      const m = url.match(/github\.com[:/]([^/]+)\/([^/]+)/);
      if (!m) return null;
      owner = m[1];
      repo = m[2];
    } else {
      const parts = url.split(/[:/]/).filter(Boolean);
      if (parts.length >= 2) {
        owner = parts[parts.length - 2];
        repo = parts[parts.length - 1];
      }
    }
    const branchMatch = config.match(/\[branch\s+"([^"]+)"\]/);
    const branch = branchMatch ? branchMatch[1] : 'main';
    return owner && repo ? { owner, repo, branch } : null;
  } catch {
    return null;
  }
}

export async function syncGitHubMedia() {
  const client = await GitHubClient.createFromSettings();
  if (!client) return { success: false, newMediaCount: 0, errors: ['GitHub not configured: no se pudo detectar owner/repo. Configúralo en Ajustes o en GITHUB_OWNER/GITHUB_REPO'] };
  return client.syncMedia();
}