#!/usr/bin/env bash
# HealthOS — Backend Venv Reset (Unix/macOS/Linux/WSL)
# Deletes and recreates backend/.venv, reinstalls all deps.
# Usage: bash infra/scripts/reset-be-venv.sh [--force]

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"

FORCE=0
for arg in "$@"; do [ "$arg" = "--force" ] && FORCE=1; done

echo "[BE] Will delete and recreate: $VENV_DIR"

if [ "$FORCE" -eq 0 ]; then
    read -rp "Proceed? [y/N] " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

cd "$BACKEND_DIR"

# Deactivate if active (best-effort: VIRTUAL_ENV may not be set in subshell)
deactivate 2>/dev/null || true

[ -d "$VENV_DIR" ] && { echo "[BE] Removing .venv..."; rm -rf "$VENV_DIR"; }

echo "[BE] Creating new venv..."
python3 -m venv .venv
source .venv/bin/activate

echo "[BE] Using: $(python --version)"
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
[ -f requirements-dev.txt ] && pip install -r requirements-dev.txt

echo "[BE] Backend venv reset complete."
