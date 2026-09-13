import { mediaQueries, settingsQueries } from '@/lib/db/queries';
import { getMediaType, generateId } from '@/lib/utils';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface LocalSyncResult {
  success: boolean;
  newMediaCount: number;
  errors: string[];
}

export async function syncLocalMedia(): Promise<LocalSyncResult> {
  const errors: string[] = [];
  let newMediaCount = 0;

  const settings = await settingsQueries.find();
  const paths = settings?.githubPaths || ['videos', 'fotos'];

  for (const dirPath of paths) {
    const result = await syncLocalPath(dirPath);
    newMediaCount += result.newMediaCount;
    errors.push(...result.errors);
  }

  return { success: errors.length === 0, newMediaCount, errors };
}

async function syncLocalPath(dirPath: string): Promise<LocalSyncResult> {
  const errors: string[] = [];
  let newMediaCount = 0;

  try {
    const fullPath = path.join(process.cwd(), dirPath);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      return { success: true, newMediaCount: 0, errors: [] };
    }

    const items = fs.readdirSync(fullPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isFile()) {
        const filePath = path.join(fullPath, item.name);
        const mediaType = getMediaType(item.name);

        if (mediaType !== 'unknown') {
          const fileBuffer = fs.readFileSync(filePath);
          const fileHash = crypto.createHash('sha1').update(fileBuffer).digest('hex');

          const exists = await mediaQueries.findBySha(fileHash);
          if (!exists) {
            const publicDir = path.join(process.cwd(), 'public', 'media');
            if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

            const ext = path.extname(item.name);
            const filename = `${generateId()}${ext}`;
            const destPath = path.join(publicDir, filename);

            fs.copyFileSync(filePath, destPath);

            const stats = fs.statSync(filePath);
            await mediaQueries.create({
              id: generateId(),
              name: item.name,
              path: `${dirPath}/${item.name}`,
              type: mediaType,
              size: stats.size,
              sha: fileHash,
              url: `local://${dirPath}/${item.name}`,
              downloadedPath: `/media/${filename}`,
            });

            newMediaCount++;
          }
        }
      } else if (item.isDirectory()) {
        const subResult = await syncLocalPath(`${dirPath}/${item.name}`);
        newMediaCount += subResult.newMediaCount;
        errors.push(...subResult.errors);
      }
    }
  } catch (error: any) {
    errors.push(`Failed to sync local ${dirPath}: ${error.message}`);
  }

  return { success: errors.length === 0, newMediaCount, errors };
}
