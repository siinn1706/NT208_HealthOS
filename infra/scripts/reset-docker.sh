#!/usr/bin/env bash
# HealthOS — Docker Full Reset (Unix/macOS/Linux/WSL)
# Stops all containers, removes volumes and orphans, clears stale state.
# Usage: bash infra/scripts/reset-docker.sh [--force] [--rebuild]

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker/docker-compose.dev.yml"

FORCE=0
REBUILD=0
for arg in "$@"; do
    case "$arg" in
        --force)   FORCE=1 ;;
        --rebuild) REBUILD=1 ;;
    esac
done

echo "[DOCKER] WARNING: This will stop all HealthOS containers and DELETE all Docker volumes."
echo "[DOCKER] Data removed: PostgreSQL data, Redis cache, MinIO files."

if ! command -v docker &>/dev/null; then
    echo "[DOCKER] docker CLI not found. Install Docker Desktop." >&2
    exit 1
fi

if [ "$FORCE" -eq 0 ]; then
    read -rp "Proceed? [y/N] " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

cd "$ROOT_DIR"

echo "[DOCKER] Stopping containers and removing volumes..."
docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans

if [ "$REBUILD" -eq 1 ]; then
    echo "[DOCKER] Rebuilding images (no cache)..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
fi

echo ""
echo "[DOCKER] Reset complete."
echo "Run: bash infra/scripts/setup.sh --docker  (or start_ALL.bat) to recreate."
