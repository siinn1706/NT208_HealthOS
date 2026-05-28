#!/usr/bin/env bash
# HealthOS - Master Env Render Script (Unix/macOS/Linux/WSL)
# Renders generated service .env files from infra/env/.env.master.
# This overwrites generated env files by design; edit the master file instead.
# Usage: bash infra/scripts/sync-env.sh [--target all|dev|prod|workers|backend|frontend|ai-worker|queue-worker|notification|compose-dev|compose-prod|mobile]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="all"
MASTER="$ROOT_DIR/infra/env/.env.master"
MASTER_EXAMPLE="$ROOT_DIR/infra/env/.env.master.example"

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
            echo "[sync-env] Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

if ! command -v node >/dev/null 2>&1; then
    echo "[sync-env] Node.js is required to render env files. Install Node.js 20+ and retry." >&2
    exit 1
fi

if [[ ! -f "$MASTER" ]]; then
    if [[ ! -f "$MASTER_EXAMPLE" ]]; then
        echo "[sync-env] Master env missing and example template not found: $MASTER_EXAMPLE" >&2
        exit 1
    fi
    mkdir -p "$(dirname "$MASTER")"
    cp "$MASTER_EXAMPLE" "$MASTER"
    echo "[ENV] Created infra/env/.env.master from template. Review it before production deploy."
fi

node "$ROOT_DIR/infra/scripts/render-env.mjs" --master "$MASTER" --target "$TARGET"
