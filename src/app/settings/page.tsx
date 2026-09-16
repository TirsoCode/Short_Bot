'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { type BufferStatus } from '@/hooks/useBuffer';
import { ArrowLeft, Loader2, Check, X, ExternalLink, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import type { Settings, HookPhrase } from '@/types';
import { DEFAULT_STYLE } from '@/types';
import { Textarea } from '@/components/ui/textarea';

function SettingsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [aiRequest, setAiRequest] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiModel, setAiModel] = useState('big-pickle');
  const [zenKey, setZenKey] = useState('');
  const [zenKeySaving, setZenKeySaving] = useState(false);

  const [bufferStatus, setBufferStatus] = useState<BufferStatus | null>(null);
  const [bufferChecking, setBufferChecking] = useState(false);

  const [settings, setSettings] = useState({
    mediaPaths: 'videos,fotos',
    autoShortsPerDay: 2,
    autoPublish: false,
    bufferApiKey: '',
    bufferChannelId: '',
    bufferVideoBaseUrl: '',
    syncIntervalMinutes: 30,
    maxShortDuration: 30,
    videoWidth: 1080,
    videoHeight: 1920,
    videoFps: 30,
  });

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data.settings) {
        setSettings({
          mediaPaths: (data.settings.mediaPaths || ['videos', 'fotos']).join(','),
          autoShortsPerDay: data.settings.autoShortsPerDay ?? 2,
          autoPublish: !!(data.settings.autoPublish ?? false),
          bufferApiKey: data.settings.bufferApiKey || '',
          bufferChannelId: data.settings.bufferChannelId || '',
          bufferVideoBaseUrl: data.settings.bufferVideoBaseUrl || '',
          syncIntervalMinutes: data.settings.syncIntervalMinutes ?? 30,
          maxShortDuration: data.settings.maxShortDuration ?? 30,
          videoWidth: data.settings.videoWidth ?? 1080,
          videoHeight: data.settings.videoHeight ?? 1920,
          videoFps: data.settings.videoFps ?? 30,
        });
      }
    });
  }, []);

  useEffect(() => {
    fetch('/api/zen/style').then(r => r.json()).then(data => {
      setAiConfigured(data.configured ?? false);
      setAiModel(data.model || 'big-pickle');
      if (data.style) setAiResult(JSON.stringify(data.style, null, 2));
    }).catch(() => setAiConfigured(false));
  }, []);

  const handleAiChange = async () => {
    if (!aiRequest.trim() || !aiConfigured) return;
    setAiBusy(true);
    try {
      const res = await fetch('/api/zen/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: aiRequest }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.style) {
        setAiResult(JSON.stringify(data.style, null, 2));
        toast({ title: 'Estilo generado', description: 'Revisa el JSON y guárdalo para que aplique a los próximos renders', variant: 'success' });
      } else {
        toast({ title: 'La IA no respondió', description: data.error || 'Revisa tu OPENCODE_ZEN_API_KEY', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo contactar con OpenCode Zen', variant: 'destructive' });
    }
    setAiBusy(false);
  };

  const handleAiSave = async (style: string) => {
    let parsed: any = null;
    try { parsed = JSON.parse(style); } catch { toast({ title: 'JSON inválido', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleJson: parsed }),
      });
      setAiResult(JSON.stringify(parsed, null, 2));
      toast({ title: 'Estilo guardado', description: 'Se aplicará en los próximos renders', variant: 'success' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          mediaPaths: settings.mediaPaths.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      toast({ title: 'Guardado', variant: 'success' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSaveZenKey = async () => {
    const key = zenKey.trim();
    if (!key) { toast({ title: 'Escribe una API key', variant: 'destructive' }); return; }
    setZenKeySaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openCodeZenApiKey: key }),
      });
      setZenKey('');
      setAiConfigured(true);
      toast({ title: 'Clave guardada', description: 'OpenCode Zen conectado', variant: 'success' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
    setZenKeySaving(false);
  };

  const handleClearZenKey = async () => {
    setZenKeySaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openCodeZenApiKey: '' }),
      });
      setZenKey('');
      setAiConfigured(false);
      toast({ title: 'Clave eliminada', variant: 'success' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
    setZenKeySaving(false);
  };

  const handleCheckBuffer = async () => {
    setBufferChecking(true);
    try {
      const res = await fetch(`/api/buffer/status?apiKey=${encodeURIComponent(settings.bufferApiKey)}`);
      const data = await res.json();
      setBufferStatus(data);
      if (data.configured && data.channels?.length) {
        toast({ title: 'Buffer conectado', description: `${data.channels.length} canales encontrados`, variant: 'success' });
      } else if (data.configured) {
        toast({ title: 'Buffer conectado', description: 'Conecta tu cuenta de YouTube dentro de Buffer', variant: 'default' });
      } else {
        toast({ title: 'Buffer sin configurar', description: data.error || 'Revisa tu API key', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo contactar con Buffer', variant: 'destructive' });
    }
    setBufferChecking(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-bold">Configuración</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Carpetas locales</CardTitle>
            <CardDescription>Mete aquí los vídeos y fotos (descargados de la web o tuyos) que quieras usar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Carpetas a escanear (separadas por coma)</Label>
              <Input value={settings.mediaPaths} onChange={e => setSettings({...settings, mediaPaths: e.target.value})} placeholder="videos,fotos" />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4 text-sm">
              <p className="text-muted-foreground">
                El bot busca medios automáticamente cada {settings.syncIntervalMinutes} min y con el botón
                "Importar" del dashboard. Los medios quedan en tu carpeta y se copian a la biblioteca.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Robot diario</CardTitle>
            <CardDescription>El bot crea y renderiza shorts automáticamente con tus frases y medios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Shorts por día</Label>
                <Input type="number" min={1} max={24} value={settings.autoShortsPerDay}
                  onChange={e => setSettings({...settings, autoShortsPerDay: Math.max(1, Math.min(24, +e.target.value || 1))})} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <Label className="text-base">Publicar automáticamente</Label>
                  <p className="text-sm text-muted-foreground">Si está apagado, los shorts quedan listos en "Revisar" para que los subas tú</p>
                </div>
                <Switch checked={settings.autoPublish} onCheckedChange={(v) => setSettings({...settings, autoPublish: v})} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              OpenCode Zen
              {aiConfigured ? <Badge className="bg-green-500">Conectado</Badge> : <Badge variant="secondary">No configurado</Badge>}
            </CardTitle>
            <CardDescription>
              Tu API key de OpenCode Zen ({aiModel}) para generar hooks, títulos y ajustar el estilo de los vídeos con IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API key de OpenCode Zen</Label>
              <Input type="password" value={zenKey}
                onChange={e => setZenKey(e.target.value)}
                placeholder={aiConfigured ? 'sk-... (ya hay una clave guardada)' : 'sk-...'}
                autoComplete="off" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveZenKey} disabled={zenKeySaving || !zenKey.trim()}>
                {zenKeySaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar clave
              </Button>
              {aiConfigured && (
                <Button onClick={handleClearZenKey} disabled={zenKeySaving} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Quitar
                </Button>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 border p-4 text-sm text-muted-foreground">
              {aiConfigured ? (
                'OpenCode Zen está conectado. Ya puedes usar la IA en el bloque "Estilo del vídeo (IA)" de abajo y en el dashboard.'
              ) : (
                <>
                  Crea tu API key en{' '}
                  <a className="underline" href="https://opencode.ai/zen" target="_blank" rel="noreferrer">opencode.ai/zen</a>{' '}
                  y pégala aquí. Sin ella, los hooks usan plantillas de respaldo en vez de la IA.
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Estilo del vídeo (IA)
            </CardTitle>
            <CardDescription>
              Dile al bot qué quieres cambiar y {aiModel} (modelo de OpenCode Zen) ajustará el estilo de los vídeos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiConfigured === false ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                No hay <code className="font-mono">OPENCODE_ZEN_API_KEY</code> configurada. Añádela en el bloque "OpenCode Zen"
                de más arriba o en el archivo <code className="font-mono">.env.local</code>.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>¿Qué quieres cambiar?</Label>
              <Textarea value={aiRequest}
                onChange={e => setAiRequest(e.target.value)}
                placeholder="Ej: el fondo es muy oscuro, acláralo y ponle un toque azul"
                rows={2} />
            </div>
            <Button onClick={handleAiChange} disabled={aiBusy || !aiRequest.trim() || aiConfigured === false}>
              {aiBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Cambiar con {aiModel}
            </Button>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Estilo actual / resultado</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAiSave(JSON.stringify(DEFAULT_STYLE))} disabled={saving}>
                    Restablecer
                  </Button>
                  <Button size="sm" onClick={() => handleAiSave(aiResult)} disabled={saving || !aiResult.trim()}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Guardar estilo
                  </Button>
                </div>
              </div>
              <Textarea value={aiResult} onChange={e => setAiResult(e.target.value)} rows={10}
                className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">
                Campos: background, hookTextColor, hookBg, hookBorder, hookFontSize (px), accent, outroText, outroSubtext.
                El estilo se aplica en los próximos renders.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Buffer
              {bufferStatus?.configured ? <Badge className="bg-green-500">Conectado</Badge> : <Badge variant="secondary">No configurado</Badge>}
            </CardTitle>
            <CardDescription>Publica tus shorts como vídeos programados con Buffer (YouTube, TikTok, Instagram...)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API key de Buffer</Label>
              <Input type="password" value={settings.bufferApiKey} onChange={e => setSettings({...settings, bufferApiKey: e.target.value})} placeholder="buffer-api-key" />
            </div>
            <Button onClick={handleCheckBuffer} disabled={bufferChecking || !settings.bufferApiKey.trim()} variant="outline">
              {bufferChecking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Comprobar conexión
            </Button>

            <div className="space-y-2">
              <Label>Canal de YouTube (en Buffer)</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.bufferChannelId}
                onChange={e => setSettings({...settings, bufferChannelId: e.target.value})}
              >
                <option value="">{bufferStatus?.channels?.length ? 'Selecciona un canal...' : 'Comprueba tu conexión para ver los canales'}</option>
                {bufferStatus?.organizations?.map(org => (
                  <optgroup key={org.id} label={org.name}>
                    {org.channels.map(c => (
                      <option key={c.id} value={c.id}>{c.displayName || c.name} ({c.service})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Video base URL (pública)</Label>
              <Input type="url" value={settings.bufferVideoBaseUrl} onChange={e => setSettings({...settings, bufferVideoBaseUrl: e.target.value})} placeholder="https://shortbot-nine.vercel.app" />
              <p className="text-xs text-muted-foreground">
                Es el dominio público donde se sirven tus MP4. Buffer necesita una URL accesible para descargar el vídeo
                (por ejemplo tu app en Vercel). Déjalo vacío si aún no lo tienes.
              </p>
            </div>

            {!bufferStatus?.configured && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                1. Crea tu cuenta en <a className="underline" href="https://buffer.com" target="_blank" rel="noreferrer">buffer.com</a>{' '}
                y conecta tu canal de YouTube.<br />
                2. Genera tu API key en el panel de Buffer (Manage Apps → Access Token).<br />
                3. Pégalo aquí, pulsa "Comprobar conexión" y selecciona tu canal.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Configuración de Vídeo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Ancho</Label><Input type="number" value={settings.videoWidth} onChange={e => setSettings({...settings, videoWidth: +e.target.value})} /></div>
              <div className="space-y-2"><Label>Alto</Label><Input type="number" value={settings.videoHeight} onChange={e => setSettings({...settings, videoHeight: +e.target.value})} /></div>
              <div className="space-y-2"><Label>FPS</Label><Input type="number" value={settings.videoFps} onChange={e => setSettings({...settings, videoFps: +e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Duración máxima (s)</Label><Input type="number" value={settings.maxShortDuration} onChange={e => setSettings({...settings, maxShortDuration: +e.target.value})} /></div>
              <div className="space-y-2"><Label>Intervalo sync (min)</Label><Input type="number" value={settings.syncIntervalMinutes} onChange={e => setSettings({...settings, syncIntervalMinutes: +e.target.value})} /></div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Guardar Configuración
        </Button>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}>
        <SettingsContent />
      </React.Suspense>
    </QueryClientProvider>
  );
}