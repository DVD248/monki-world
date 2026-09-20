#!/bin/zsh
cd "${0:A:h}"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "Monki World needs Node.js 20 or newer. Install it from https://nodejs.org then open this file again."
  read -r "?Press Return to close."
  exit 1
fi
if curl -fsS http://localhost:4173/api/health >/dev/null 2>&1; then
  open http://localhost:4173
  exit 0
fi
node server.mjs &
monki_server_pid=$!
trap 'kill "$monki_server_pid" 2>/dev/null' EXIT INT TERM
for monki_attempt in {1..40}; do
  if curl -fsS http://localhost:4173/api/health >/dev/null 2>&1; then
    open http://localhost:4173
    break
  fi
  sleep 0.2
done
wait "$monki_server_pid"
