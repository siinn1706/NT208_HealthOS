#!/usr/bin/env bash
# HealthOS Local Setup Script (Unix/macOS/Linux/WSL)
# Run from repo root: bash infra/scripts/setup.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "=== HealthOS Setup ==="
echo "Root: $ROOT_DIR"
DOCKER_MODE=0
SKIP_MODEL_DOWNLOAD=0

for arg in "$@"; do
    case "$arg" in
        --docker) DOCKER_MODE=1 ;;
        --skip-model-download) SKIP_MODEL_DOWNLOAD=1 ;;
        *)
            echo "[SETUP] Unknown option: $arg"
            exit 1
            ;;
    esac
done

copy_env() {
    local src="$1" dest="$2"
    if [ ! -f "$dest" ]; then
        cp "$src" "$dest"
        echo "[ENV] Created $dest"
    else
        echo "[ENV] $dest already exists, skipping."
    fi
}

copy_env "$ROOT_DIR/infra/env/frontend.env.example" "$ROOT_DIR/frontend/.env.local"
copy_env "$ROOT_DIR/infra/env/backend.env.example"  "$ROOT_DIR/backend/.env"
copy_env "$ROOT_DIR/infra/env/worker.env.example"   "$ROOT_DIR/services/ai-worker/.env"
copy_env "$ROOT_DIR/infra/env/worker.env.example"   "$ROOT_DIR/services/queue-worker/.env"
copy_env "$ROOT_DIR/infra/env/worker.env.example"   "$ROOT_DIR/services/notification/.env"
copy_env "$ROOT_DIR/infra/docker/.env.dev.example"  "$ROOT_DIR/infra/docker/.env.dev"

if [[ "$SKIP_MODEL_DOWNLOAD" -eq 0 ]]; then
    echo "[MODEL] Ensuring AI YOLO model exists..."
    bash "$ROOT_DIR/infra/scripts/download-ai-model.sh" --env-file "$ROOT_DIR/services/ai-worker/.env"
    echo "[MODEL] Done."
else
    echo "[MODEL] Skipping model download (--skip-model-download)."
fi

if [[ "$DOCKER_MODE" -eq 1 ]]; then
    echo "[DOCKER] Starting full stack..."
    cd "$ROOT_DIR"
    docker compose -f infra/docker/docker-compose.dev.yml up -d
    echo "[DOCKER] Stack running. Ports: FE=3000 BE=8000 AI=8001 Notification=8002 PG=5432 Redis=6379 MinIO=9000"
    exit 0
fi

echo "[FE] Installing npm packages (deterministic)..."
cd "$ROOT_DIR/frontend"
if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi
echo "[FE] Done."

echo "[BE] Setting up Python venv..."
cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
if [ -f requirements-dev.txt ]; then
    pip install -r requirements-dev.txt
fi
echo "[BE] Running database migrations..."
python -m alembic upgrade head || echo "[BE] WARNING: Migration failed. DB may not be running yet."
echo "[BE] Done."

echo ""
echo "=== Setup complete ==="
echo "Run: docker compose -f infra/docker/docker-compose.dev.yml up -d"
