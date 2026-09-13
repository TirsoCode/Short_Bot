import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

async function syncGitHub(): Promise<{ success: boolean; newMediaCount: number; errors: string[] }> {
  const res = await fetch('/api/github/sync', { method: 'POST' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.errors?.[0] || 'Failed to sync');
  return data;
}

export function useGitHubSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncGitHub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}