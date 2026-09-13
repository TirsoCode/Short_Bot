# Short Bot

Generador automático de YouTube Shorts con tus propios videos y fotos.

## Qué hace

1. **Importa**: El bot escanea automáticamente las carpetas `videos/` y `fotos/` (cron diario en Vercel + botón "Importar"/"Sync GitHub" en el dashboard) y copia los medios a tu biblioteca.
2. **Robot diario**: Crea y renderiza los shorts del día (2 por defecto, configurable con `SHORTS_PER_DAY`) con frases gancho generadas por **OpenCode Zen (modelo `big-pickle`)** usando tus medios.
3. **Hooks infinitos**: Cuando quedan pocas frases gancho activas, el bot llama automáticamente a la API de OpenCode Zen y genera **hasta 100 hooks nuevos** (configurable con `HOOK_POOL_TARGET`) para reabastecer la biblioteca.
4. **Generar uno más (IA)**: Botón en el dashboard que genera 1 short extra con IA cada vez que le das click (sin límite diario).
5. **Estilo con IA**: En **Configuración** puedes escribirle al bot cosas como "el fondo es muy oscuro, acláralo" y él ajusta los colores/tipografía del vídeo antes de renderizar.
6. **Revisión**: Dashboard → "Aceptar y Subir" o "Rechazar". Si activas "Publicar automáticamente" no pasan por revisión y se suben solos a YouTube.
7. **Upload**: Sube automáticamente a YouTube al aceptar.

## Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **DB**: SQLite (sql.js)
- **Video**: Remotion
- **APIs**: YouTube (googleapis), OpenCode Zen

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Genera una contraseña secreta para LOGIN_PASSWORD (nunca uses una por defecto)
# OPENCODE_ZEN_API_KEY (https://opencode.ai/zen) es OPCIONAL pero recomendada:
# sin ella los hooks usan plantillas de respaldo en vez de la IA.

# 3. Inicializar base de datos
npm run db:init

# 4. Arrancar
npm run dev
```

## Automatización

- **Generación diaria**: El cron de Vercel (`/api/cron/sync`, una vez al día en el plan Hobby) sincroniza GitHub + medios locales y genera hasta `SHORTS_PER_DAY` shorts (2 por defecto) con hooks de OpenCode Zen.
- **OpenCode Zen**: Configura `OPENCODE_ZEN_API_KEY`. El modelo por defecto es `big-pickle`.
- **Refill de hooks**: Si quedan menos de 5 hooks activos, se llama a Zen y se generan hasta `HOOK_POOL_TARGET` hooks (100 por defecto).
- **Límite diario**: `SHORTS_PER_DAY` (por defecto 2), no se supera aunque el cron corra varias veces al día.

## Cómo usar

1. Abre http://localhost:3000
2. Entra con la contraseña de `LOGIN_PASSWORD` (defínela en tu `.env.local` o como secret/GitHub secret)
3. Mete tus videos y fotos en `videos/` y `fotos/` (formatos: mp4, mov, webm, jpg, png, gif, webp)
4. Ve a **Dashboard** → pulsa **Importar** (o espera al cron automático)
5. Ve a **Crear Short** → elige frase gancho + medios → Generar
6. En **Revisar** → Aceptar y Subir para subirlo a YouTube

## Credenciales

### OpenCode Zen
1. Entra en https://opencode.ai/zen → sign in → añade créditos
2. Copia tu API key y ponla en `OPENCODE_ZEN_API_KEY`

### YouTube OAuth
Para que el bot suba a YouTube:

1. Google Cloud Console → APIs & Services → Credentials
2. Crear OAuth 2.0 Client ID (Web application)
3. Redirect URI: `http://localhost:3000/api/youtube/callback`
4. Copiar Client ID + Secret en **Configuración** del dashboard
5. Click "Conectar con YouTube"

## Opcional: importar desde GitHub

Si además quieres importar medios desde un repositorio GitHub, ve a **Configuración** y rellena los campos de GitHub (owner, repo, token PAT, etc.).

## Comandos

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run db:init      # Init DB
```