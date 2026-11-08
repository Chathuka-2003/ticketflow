#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "Starting TicketFlow full stack with Docker Compose..."
docker compose up -d --build

echo "Waiting for services to become healthy..."
docker compose ps
echo "TicketFlow UI is live at http://localhost:4200 (and http://localhost:80)"
echo "API Gateway is live at http://localhost:8080"
