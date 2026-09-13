'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Trophy, RefreshCw, Sparkles, Video } from 'lucide-react';
import { useAnalytics, useGenerateWeeklyHooks, useAnalyzeAndGenerate } from '@/hooks/useAnalytics';
import { useToast } from '@/hooks/useToast';

export function AnalyticsPanel() {
  const { data, isLoading, isError } = useAnalytics();
  const generateWeeklyMutation = useGenerateWeeklyHooks();
  const analyzeMutation = useAnalyzeAndGenerate();
  const { toast } = useToast();

  const handleGenerateWeekly = async () => {
    try {
      const result = await generateWeeklyMutation.mutateAsync();
      toast({
        title: 'Frases generadas',
        description: `Se generaron ${result.hooks.length} frases gancho nuevas`,
        variant: 'success',
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron generar las frases', variant: 'destructive' });
    }
  };

  const handleAnalyze = async () => {
    try {
      const result = await analyzeMutation.mutateAsync();
      if (result.topHook) {
        toast({
          title: 'Análisis completo',
          description: `Mejor frase: "${result.topHook.hook_text}" — se generaron 7 nuevas basadas en el patrón`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Análisis completo',
          description: 'No hay datos suficientes aún. Se generaron 7 frases nuevas.',
          variant: 'success',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo analizar', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="py-8 text-center">
        <CardContent>
          <p className="text-muted-foreground">Error al cargar analíticas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items gap-3 items-center">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{data.totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Vistas totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><Video className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{data.totalShorts}</p>
              <p className="text-xs text-muted-foreground">Shorts analizados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center"><Sparkles className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold">{data.hookPerformance.length}</p>
              <p className="text-xs text-muted-foreground">Frases activas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleGenerateWeekly} disabled={generateWeeklyMutation.isPending}>
          {generateWeeklyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generar 7 frases semanales
        </Button>
        <Button variant="outline" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
          {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Analizar rendimiento
        </Button>
      </div>

      {data.topShorts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Shorts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topShorts.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-muted-foreground w-6">#{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.hook_text}</p>
                      <p className="text-xs text-muted-foreground">Generado {new Date(item.generated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {item.views.toLocaleString()} vistas
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.hookPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Frase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.hookPerformance.map((hook) => (
                <div key={hook.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{hook.text}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{hook.total_shorts} shorts</span>
                    <Badge variant="outline">{Math.round(hook.avg_views || 0).toLocaleString()} views avg</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.topShorts.length === 0 && data.hookPerformance.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Aún no hay datos de rendimiento. Publica algunos shorts en YouTube y las estadísticas se reflejarán aquí.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

