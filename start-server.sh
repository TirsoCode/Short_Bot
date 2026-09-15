#!/usr/bin/env bash
# Arranca el servidor de producción (next start) en segundo plano.
set -u
cd /root/short_bot
export PATH="$PATH:/root/short_bot/node_modules/.bin:/usr/local/bin:/usr/bin:/bin"
mkdir -p logs

if [ ! -f .next/BUILD_ID ]; then
  echo "[$(date '+%F %T')] sin build de producción, compilando..." >> logs/server.log
  npm run build >> logs/server.log 2>&1
fi

pkill -f "next-server" 2>/dev/null || true
sleep 1

nohup npm run start >> logs/server.log 2>&1 < /dev/null &
echo "[$(date '+%F %T')] started next start (pid $!)" >> logs/server.log