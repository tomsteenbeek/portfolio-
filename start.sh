#!/usr/bin/env bash
# macOS/Linux-variant van start.bat
set -e
cd "$(dirname "$0")"
docker info >/dev/null 2>&1 || { echo "Docker draait niet. Start Docker Desktop en probeer opnieuw."; exit 1; }
[ -d .git ] && command -v git >/dev/null && git pull --ff-only || true
[ -f .env ] || echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d --build
echo "Wachten tot de app klaar is..."
for i in $(seq 1 60); do curl -fs http://localhost:3000/api/health >/dev/null && break; sleep 3; done
echo "Klaar: http://localhost:3000"
(command -v open >/dev/null && open http://localhost:3000) || (command -v xdg-open >/dev/null && xdg-open http://localhost:3000) || true
