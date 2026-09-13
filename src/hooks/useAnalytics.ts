import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AnalyticsDashboard {
  hookPerformance: Array<{
    id: string;
    text: string;
    total_shorts: number;
    total_views: number;
    avg_views: number;
  }>;
  topShorts: Array<{
    id: string;
    short_id: string;
    hook_id: string;
    hook_text: string;
    views: number;
    likes: number;
    generated_at: string;
  }>;
  totalViews: number;
  totalShorts: number;
}

async function fetchAnalytics(): Promise<AnalyticsDashboard> {
  const res = await fetch('/api/hooks/analytics');
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

async function generateWeekly(): Promise<{ success: boolean; hooks: string[] }> {
  const res = await fetch('/api/hooks/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate-weekly' }),
  });
  if (!res.ok) throw new Error('Failed to generate weekly hooks');
  return res.json();
}

async function analyzeAndGenerate(): Promise<{ success: boolean; topHook: any; newHooks: string[] }> {
  const res = await fetch('/api/hooks/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'analyze-and-generate' }),
  });
  if (!res.ok) throw new Error('Failed to analyze and generate');
  return res.json();
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
    refetchInterval: 60000,
  });
}

export function useGenerateWeeklyHooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateWeekly,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hooks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useAnalyzeAndGenerate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: analyzeAndGenerate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hooks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      return data;
    },
  });
}