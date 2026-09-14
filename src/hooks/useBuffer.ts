import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface BufferStatus {
  configured: boolean;
  apiKey?: string;
  selectedChannelId?: string;
  videoBaseUrl?: string;
  organizations?: Array<{
    id: string;
    name: string;
    channels: Array<{
      id: string;
      name: string;
      displayName?: string;
      service: string;
    }>;
  }>;
  channels?: Array<{
    id: string;
    name: string;
    displayName?: string;
    service: string;
  }>;
  error?: string;
}

export function useBufferStatus() {
  return useQuery<BufferStatus>({
    queryKey: ['buffer', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/buffer/status');
      if (!res.ok) return { configured: false };
      return res.json();
    },
  });
}

export function useBufferPublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shortId, videoUrl, scheduledAt }: { shortId: string; videoUrl?: string; scheduledAt?: string }) => {
      const res = await fetch('/api/buffer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortId, videoUrl, scheduledAt }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Buffer publish failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });
}