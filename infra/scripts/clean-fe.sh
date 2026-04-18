#!/usr/bin/env bash
# HealthOS — Frontend Clean + Reinstall (Unix/macOS/Linux/WSL)
# Removes node_modules and .next, then reinstalls.
# Usage: bash infra/scripts/clean-fe.sh [--force] [--include-lockfile]

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

FORCE=0
INCLUDE_LOCKFILE=0
for arg in "$@"; do
    case "$arg" in
        --force)            FORCE=1 ;;
        --include-lockfile) INCLUDE_LOCKFILE=1 ;;
    esac
done

echo "[FE] Will delete:"
echo "  $FRONTEND_DIR/node_modules"
echo "  $FRONTEND_DIR/.next"
if [ "$INCLUDE_LOCKFILE" -eq 1 ]; then
    echo "  $FRONTEND_DIR/package-lock.json  (WARNING: dependency resolution may change)"
fi

if [ "$FORCE" -eq 0 ]; then
    read -rp "Proceed? [y/N] " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

cd "$FRONTEND_DIR"

[ -d node_modules ] && { echo "[FE] Removing node_modules..."; rm -rf node_modules; }
[ -d .next ]        && { echo "[FE] Removing .next cache...";  rm -rf .next; }
if [ "$INCLUDE_LOCKFILE" -eq 1 ] && [ -f package-lock.json ]; then
    echo "[FE] Removing package-lock.json..."
    rm -f package-lock.json
fi

if [ -f package-lock.json ]; then
    echo "[FE] Installing with npm ci..."
    npm ci
else
    echo "[FE] Installing with npm install..."
    npm install
fi

echo "[FE] Frontend clean-reinstall complete."
