import { useMutation, useQueryClient } from '@tanstack/react-query';

async function syncMedia(): Promise<{ success: boolean; newMediaCount: number; errors: string[] }> {
  const res = await fetch('/api/media/sync', { method: 'POST' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.errors?.[0] || 'Failed to sync');
  return data;
}

export function useMediaSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}