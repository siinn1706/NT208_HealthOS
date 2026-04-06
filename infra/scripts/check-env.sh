#!/usr/bin/env bash
# HealthOS — Env Key Validation (Unix/macOS/Linux/WSL)
# Compares local .env files against infra/env/*.env.example for missing keys.
# Safe: read-only, non-destructive.
# Usage: bash infra/scripts/check-env.sh

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

check_pair() {
    local example="$1" local_file="$2"
    local example_path="$ROOT_DIR/$example"
    local local_path="$ROOT_DIR/$local_file"

    if [ ! -f "$example_path" ]; then
        echo "[SKIP] Example not found: $example"
        return 0
    fi

    if [ ! -f "$local_path" ]; then
        echo "[MISSING FILE] $local_file"
        echo "  Run: bash infra/scripts/setup.sh"
        return 1
    fi

    local example_keys local_keys missing
    example_keys=$(grep -E '^[A-Z_][A-Z0-9_]*=' "$example_path" | cut -d= -f1)
    local_keys=$(grep -E '^[A-Z_][A-Z0-9_]*=' "$local_path" | cut -d= -f1)

    missing=""
    for key in $example_keys; do
        if ! echo "$local_keys" | grep -qx "$key"; then
            missing="$missing $key"
        fi
    done

    if [ -z "$missing" ]; then
        echo "[OK] $local_file"
        return 0
    else
        echo "[MISSING KEYS] $local_file"
        for k in $missing; do echo "  - $k"; done
        return 1
    fi
}

ANY_MISSING=0
check_pair "infra/env/backend.env.example"   "backend/.env"                   || ANY_MISSING=1
check_pair "infra/env/frontend.env.example"  "frontend/.env.local"            || ANY_MISSING=1
check_pair "infra/env/worker.env.example"    "services/ai-worker/.env"        || ANY_MISSING=1
check_pair "infra/env/worker.env.example"    "services/queue-worker/.env"     || ANY_MISSING=1
check_pair "infra/env/worker.env.example"    "services/notification/.env"     || ANY_MISSING=1
check_pair "infra/docker/.env.dev.example"   "infra/docker/.env.dev"          || ANY_MISSING=1

echo ""
if [ "$ANY_MISSING" -ne 0 ]; then
    echo "Fix: copy missing keys from infra/env/*.env.example into your local .env file."
    exit 1
else
    echo "All env files look good."
fi
