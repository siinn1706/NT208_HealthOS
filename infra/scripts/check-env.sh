#!/usr/bin/env bash
# HealthOS - Master Env Validation (Unix/macOS/Linux/WSL)
# Verifies generated .env files match infra/env/.env.master without writing files.
# Usage: bash infra/scripts/check-env.sh [--target all|dev|prod|workers|backend|frontend|ai-worker|queue-worker|notification|compose-dev|compose-prod|mobile]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="all"
MASTER="$ROOT_DIR/infra/env/.env.master"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --master)
            MASTER="$2"
            shift 2
            ;;
        *)
            echo "[check-env] Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

if ! command -v node >/dev/null 2>&1; then
    echo "[check-env] Node.js is required to validate env files. Install Node.js 20+ and retry." >&2
    exit 1
fi

if [[ ! -f "$MASTER" ]]; then
    echo "[MISSING FILE] infra/env/.env.master"
    echo "  Run setup or sync first: bash infra/scripts/sync-env.sh --target all"
    exit 1
fi

node "$ROOT_DIR/infra/scripts/render-env.mjs" --master "$MASTER" --target "$TARGET" --check
