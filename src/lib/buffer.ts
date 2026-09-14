import { shortQueries, settingsQueries } from '@/lib/db/queries';

const BUFFER_ENDPOINT = 'https://api.buffer.com';

export interface BufferOrganization {
  id: string;
  name: string;
  ownerEmail?: string;
  channels?: BufferChannel[];
}

export interface BufferChannel {
  id: string;
  name: string;
  displayName?: string;
  service: string;
  avatar?: string;
}

export interface CreatePostOptions {
  channelId: string;
  text: string;
  videoUrl?: string;
  scheduleMode?: 'addToQueue' | 'customScheduled';
  dueAt?: string;
}

export interface CreatePostResult {
  post?: { id: string; text: string; dueAt?: string };
  message?: string;
}

export class BufferClient {
  constructor(private apiKey: string) {}

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(BUFFER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    if (data?.errors?.length) {
      throw new Error(data.errors.map((e: any) => e.message).join('; '));
    }
    return data?.data as T;
  }

  async getOrganizations(): Promise<BufferOrganization[]> {
    const data = await this.graphql<{ account: { organizations: BufferOrganization[] } }>(`
      query GetOrganizations {
        account {
          organizations {
            id
            name
            ownerEmail
          }
        }
      }
    `);
    return data.account?.organizations ?? [];
  }

  async getChannels(organizationId: string): Promise<BufferChannel[]> {
    const data = await this.graphql<{ channels: BufferChannel[] }>(
      `query GetChannels($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId, filter: { isLocked: false } }) {
          id
          name
          displayName
          service
          avatar
        }
      }`,
      { organizationId }
    );
    return data.channels ?? [];
  }

  async createPost(opts: CreatePostOptions): Promise<CreatePostResult> {
    const input: Record<string, unknown> = {
      text: opts.text,
      channelId: opts.channelId,
      schedulingType: 'automatic',
      mode: opts.scheduleMode === 'customScheduled' ? 'customScheduled' : 'addToQueue',
    };
    if (opts.scheduleMode === 'customScheduled' && opts.dueAt) {
      input.dueAt = opts.dueAt;
    }
    if (opts.videoUrl) {
      input.assets = [{ video: { url: opts.videoUrl } }];
    }
    const data = await this.graphql<{ createPost: CreatePostResult }>(
      `mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          ... on PostActionSuccess {
            post { id text dueAt }
          }
          ... on MutationError {
            message
          }
        }
      }`,
      { input }
    );
    return data.createPost;
  }
}

export function getBufferApiKey(settings: any): string {
  return settings?.buffer_api_key || process.env.BUFFER_API_KEY || '';
}

export function getBufferVideoBaseUrl(settings: any): string {
  return (settings?.buffer_video_base_url || process.env.BUFFER_VIDEO_BASE_URL || '').replace(/\/+$/, '');
}

export async function publishShortToBuffer(
  shortId: string,
  overrides?: { videoUrl?: string; scheduledAt?: string }
): Promise<CreatePostResult & { short: any }> {
  const short = await shortQueries.findById(shortId);
  if (!short) throw new Error('Short not found');
  if (!short.rendered_path) throw new Error('Short no renderizado');

  const settings = await settingsQueries.find();
  const apiKey = getBufferApiKey(settings);
  if (!apiKey) throw new Error('Buffer: configura tu API key en Ajustes');

  const channelId = settings?.buffer_channel_id || '';
  if (!channelId) throw new Error('Buffer: selecciona un canal de YouTube en Ajustes');

  const baseUrl = getBufferVideoBaseUrl(settings);
  const videoUrl = overrides?.videoUrl || (baseUrl ? `${baseUrl}${short.rendered_path}` : '');
  if (!videoUrl) throw new Error('Buffer: configura la URL pública de tus vídeos (Video base URL) en Ajustes');
  if (!/^https?:\/\//.test(videoUrl)) throw new Error('Buffer: la URL del vídeo debe ser pública y empezar por https://');

  const client = new BufferClient(apiKey);
  const result = await client.createPost({
    channelId,
    text: `${short.title}\n\n${short.description}`.trim(),
    videoUrl,
    scheduleMode: overrides?.scheduledAt ? 'customScheduled' : 'addToQueue',
    dueAt: overrides?.scheduledAt,
  });

  if (result.message) throw new Error(`Buffer: ${result.message}`);
  return { ...result, short };
}