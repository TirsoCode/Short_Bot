#!/usr/bin/env bash
# Supervisor: mantiene el localhost siempre encendido.
# - Comprueba la salud del servidor cada 20s y lo reinicia si cae.
# - No arranca dos procesos: comprueba antes de lanzar.
set -u
cd /root/short_bot
export PATH="$PATH:/root/short_bot/node_modules/.bin:/usr/local/bin:/usr/bin:/bin"
mkdir -p logs

log() { echo "[$(date '+%F %T')] $*" >> logs/server.log; }

while true; do
  if ! curl -fsS -o /dev/null --max-time 4 http://localhost:3000/api/auth/check 2>/dev/null; then
    if ! pgrep -f "next-server" >/dev/null; then
      log "servidor caído -> iniciando"
      bash ./start-server.sh
    else
      log "proceso vivo pero sin respuesta -> reiniciando"
      pkill -f "next-server" 2>/dev/null || true
      sleep 2
      bash ./start-server.sh
    fi
  fi
  sleep 20
done