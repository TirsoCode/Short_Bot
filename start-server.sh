#!/usr/bin/env bash
# Arranca el servidor de producción (next start) y garantiza el scheduler.
set -u
cd /root/short_bot
export PATH="$PATH:/root/short_bot/node_modules/.bin:/usr/local/bin:/usr/bin:/bin"
mkdir -p logs

read_cron_secret() {
  grep -E "^CRON_SECRET=" .env.local 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r'
}

if [ ! -f .next/BUILD_ID ]; then
  echo "[$(date '+%F %T')] sin build de producción, compilando..." >> logs/server.log
  npm run build >> logs/server.log 2>&1
fi

pkill -f "next-server" 2>/dev/null || true
sleep 1

nohup npm run start >> logs/server.log 2>&1 < /dev/null &
echo "[$(date '+%F %T')] started next start (pid $!)" >> logs/server.log

# Esperar a que el servidor responda (máx 90s)
for i in $(seq 1 45); do
  if curl -fsS -o /dev/null --max-time 3 http://localhost:3000/api/auth/check 2>/dev/null; then
    break
  fi
  sleep 2
done

SECRET="$(read_cron_secret)"
if [ -n "$SECRET" ]; then
  curl -fsS -X POST -H "Authorization: Bearer $SECRET" http://localhost:3000/api/cron/start \
    >> logs/server.log 2>&1 && echo "[$(date '+%F %T')] scheduler started via /api/cron/start" >> logs/server.log
fi