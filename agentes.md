# Agentes

Este documento describe los "agentes" (workers/cron/jobs) que ejecuta el proyecto short_bot, cómo se configuran y buenas prácticas operativas.

## Resumen

En la arquitectura de Short Bot hay varios agentes que automatizan la importación, generación, renderizado y subida de YouTube Shorts. Algunos corren periódicamente (cron en Vercel), otros se disparan desde el dashboard o mediante colas internas. Los principales agentes son:

- Robot diario (Daily Generator)
- Importador de medios (Local + GitHub)
- Refill de hooks (Hook Pool Refill)
- Generador puntual (Generate One / IA)
- Estilizador IA (Style Adjuster)
- Worker de render / Remotion
- Worker de subida a YouTube (Uploader)

---

## 1) Robot diario (Daily Generator)

Qué hace:
- Se ejecuta una vez al día (cron de Vercel apuntando a `/api/cron/sync` o ruta equivalente).
- Sincroniza medios (opcional) y genera hasta `SHORTS_PER_DAY` shorts usando hooks disponibles.
- Programa y lanza jobs de render para cada short generado.

Configuración relevante:
- SHORTS_PER_DAY — número máximo de shorts por día (por defecto 2).
- HOOK_POOL_TARGET — tamaño objetivo del pool de hooks para rellenar cuando baja del umbral.

Buenas prácticas:
- Garantizar idempotencia: si el cron se ejecuta más de una vez no debe generar duplicados.
- Locking/flagging: usar una marca en DB (o mutex) para evitar ejecuciones concurrentes.
- Limitar concurrencia para no sobrecargar el render o la API de YouTube.

---

## 2) Importador de medios (Sync)

Qué hace:
- Escanea `videos/` y `fotos/` locales o descarga desde un repo GitHub especificado.
- Copia/normaliza medias a la biblioteca interna y registra metadatos en la DB.
- Se puede invocar manualmente desde el dashboard (botón "Importar" / "Sync GitHub") o vía cron.

Configuración relevante:
- Variables de GitHub (owner, repo, token PAT) en la configuración si se usa import desde repo.

Buenas prácticas:
- No guardar archivos binarios grandes en el repo; descargar solo assets necesarios.
- Manejar límites de GitHub API y hacer paginación/retries.
- Validar formatos y transcodificar si es necesario para Remotion.

---

## 3) Refill de hooks (Hook Pool Refill)

Qué hace:
- Vigila el número de frases gancho activas (hooks).
- Si quedan menos de un umbral (por ejemplo 5), solicita a OpenCode Zen la generación de hasta `HOOK_POOL_TARGET` hooks.

Configuración relevante:
- OPENCODE_ZEN_API_KEY — clave para llamar a la API de Zen.
- HOOK_POOL_TARGET — objetivo de hooks en el pool (por defecto 100).

Buenas prácticas:
- Rate-limitar las llamadas a Zen y manejar errores (backoff exponencial).
- Validar y sanitizar la salida de la IA antes de insertar en DB.

---

## 4) Generador puntual (Generate One / IA)

Qué hace:
- Botón en dashboard para generar 1 short extra con IA.
- Invoca los mismos pasos que el robot diario para construir el short, pero solo para un item.

Buenas prácticas:
- Aplicar límites por usuario/por sesión para evitar abusos.
- Registrar el origen (manual vs cron) en la DB para trazabilidad.

---

## 5) Estilizador IA (Style Adjuster)

Qué hace:
- Toma instrucciones de configuración (ej.: "aclara el fondo") y transforma las reglas de estilo usadas en la plantilla de render.
- Puede ejecutarse justo antes del render para ajustar colores, tipografías y filtros.

Buenas prácticas:
- Guardar versiones de estilos y permitir revertir cambios.
- Validar que los cambios no rompan la composición en Remotion.

---

## 6) Worker de render / Remotion

Qué hace:
- Recibe la especificación del short (medios, textos, estilo) y ejecuta Remotion para producir el vídeo final.
- Al terminar, guarda el artefacto en almacenamiento (local/externo) y notifica al pipeline.

Buenas prácticas:
- Aislar render en procesos separados (o containers) por consumo de CPU/RAM.
- Tener límite de tiempo y manejo de errores (reintentos con backoff).
- Si los archivos son grandes, usar almacenamiento externo (S3/Cloud Storage) en lugar de Git.

---

## 7) Worker de subida a YouTube (Uploader)

Qué hace:
- Realiza OAuth con YouTube y sube el vídeo cuando el usuario acepta.
- Maneja estados: queued, uploading, uploaded, failed.

Configuración relevante:
- Google OAuth Client ID/Secret, redirect URI (`/api/youtube/callback`).

Buenas prácticas:
- Implementar reintentos y backoff por fallos de red o 5xx.
- Manejar cuotas de la API de YouTube (exponer métricas y alertas).
- Registrar ID de subida y URL en la DB.

---

## Endpoints y rutas relevantes

- /api/cron/sync — punto de entrada del cron (sincronizar medios + generar diarios).
- /api/youtube/callback — callback OAuth de YouTube.
- Rutas para invocar generación manual y sync desde el dashboard (ver carpeta `pages/api` / `app/api` según estructura).

---

## Variables de entorno importantes

- LOGIN_PASSWORD — contraseña para el dashboard.
- OPENCODE_ZEN_API_KEY — clave para OpenCode Zen (opcional pero recomendado).
- SHORTS_PER_DAY — número máximo de shorts diarios.
- HOOK_POOL_TARGET — objetivo de hooks.
- GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN — si se usa import desde GitHub.
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET — OAuth para YouTube.

Asegúrate de no versionar estas claves y usarlas vía secretos en Vercel/GitHub.

---

## Observabilidad y operaciones

- Logs: centralizar logs para errores de render y subida (Sentry/Logflare/Cloud provider).
- Métricas: exponer contadores para shorts generados, renders fallidos, subidas exitosas, errores de API.
- Alertas: configurar alertas para fallos repetidos en render/uploader o agotamiento de hooks.

---

## Cómo añadir un nuevo agente

1. Definir la responsabilidad clara (qué tarea automatiza).
2. Implementar un endpoint o job que sea idempotente.
3. Añadir variables de entorno necesarias a .env.example y a la configuración de despliegue.
4. Añadir tests unitarios / integrados cuando proceda.
5. Añadir logging estructurado y métricas.
6. Probar localmente con datos de ejemplo y con la base de datos inicializada.

---

## Recomendaciones finales

- Asegura idempotencia y locking en jobs cron para evitar duplicados.
- Mantén pools (hooks, tasks) con límites y refill controlado para evitar ráfagas de IA.
- Externaliza almacenamiento de medios si el volumen crece.
- Monitoriza las cuotas de APIs externas (YouTube, OpenCode Zen, GitHub).

---

Document creado automáticamente por el asistente. Si quieres, puedo abrir un PR con este fichero o ajustarlo (idioma, nivel de detalle, formato).