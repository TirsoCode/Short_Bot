# Short Bot

Generador automático de YouTube Shorts desde tu repositorio de GitHub.

## Qué hace

1. **Sync**: Baja vídeos y fotos de tu repo GitHub y de las carpetas locales `videos/` y `fotos/` (cron diario en Vercel + botón manual)
2. **Genera**: Remotion crea **2 Shorts 9:16 al día** con frase gancho + tus medios. Las frases gancho las genera **OpenCode Zen (modelo `big-pickle`)** con la API de Zen.
3. **Hooks infinitos**: Cuando quedan pocas frases gancho activas, el bot llama automáticamente a la API de OpenCode Zen y genera **hasta 100 hooks nuevos** para reabastecer la biblioteca.
4. **Revisión**: Dashboard → aceptar/rechazar
5. **Upload**: Tú decides cuándo subir a YouTube con un botón

## Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **DB**: SQLite (sql.js)
- **Video**: Remotion
- **APIs**: GitHub (Octokit), YouTube (googleapis), OpenCode Zen

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales.
# OPENCODE_ZEN_API_KEY (https://opencode.ai/zen) es OPCIONAL pero recomendada:
# sin ella los hooks usan plantillas de respaldo en vez de la IA.

# 3. Inicializar base de datos
npm run db:init

# 4. Arrancar
npm run dev
```

## Automatización

- **Generación diaria**: El cron de Vercel (`/api/cron/sync`, una vez al día en el plan Hobby) sincroniza GitHub + medios locales y genera hasta `SHORTS_PER_DAY` shorts (2 por defecto) usando la API de OpenCode Zen.
- **OpenCode Zen**: Configura `OPENCODE_ZEN_API_KEY` (https://opencode.ai/zen). El modelo por defecto es `big-pickle`. Las frases gancho se generan con IA contextualizando los medios disponibles.
- **Refill de hooks**: Si quedan menos de 5 hooks activos, se llama a Zen y se generan hasta `HOOK_POOL_TARGET` hooks (100 por defecto).
- **Limite diario**: `SHORTS_PER_DAY` (por defecto 2), no se supera aunque el cron corra varias veces al día.

## Cómo usar

1. Abre http://localhost:3000
2. Entra con la contraseña de `LOGIN_PASSWORD`
3. Ve a **Configuración** → rellena GitHub + YouTube
4. Haz **Sync GitHub** para descargar medios
5. Ve a **Crear Short** → elige frase + medios → Generar
6. En **Revisar** → Accept para subir a YouTube

## Credenciales

### OpenCode Zen
1. Entra en https://opencode.ai/zen → sign in → añade créditos
2. Copia tu API key y ponla en `OPENCODE_ZEN_API_KEY`

### GitHub PAT
1. GitHub → Settings → Developer settings → Personal access tokens
2. Crear token con scope `repo`

### YouTube OAuth
1. Google Cloud Console → APIs & Services → Credentials
2. Crear OAuth 2.0 Client ID (Web application)
3. Redirect URI: `http://localhost:3000/api/youtube/callback`
4. Copiar Client ID + Secret en Configuración
5. Click "Conectar con YouTube"

## Comandos

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run db:init      # Init DB
```

