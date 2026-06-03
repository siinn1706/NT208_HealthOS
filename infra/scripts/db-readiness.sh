#!/usr/bin/env bash
# db-readiness.sh — verify PostgreSQL is reachable and all migrations are applied
# Usage: bash infra/scripts/db-readiness.sh [DATABASE_URL]
# Env:   DATABASE_URL   fallback from backend/.env if not set
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

red()   { printf "\033[31m✗ %s\033[0m\n" "$*"; }
green() { printf "\033[32m✓ %s\033[0m\n" "$*"; }
warn()  { printf "\033[33m⚠ %s\033[0m\n" "$*"; }

# Resolve DATABASE_URL from arg, env, or backend/.env
DB_URL="${1:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" && -f "$ROOT_DIR/backend/.env" ]]; then
  DB_URL=$(grep -E '^DATABASE_URL=' "$ROOT_DIR/backend/.env" | head -1 | cut -d= -f2-)
fi
if [[ -z "$DB_URL" ]]; then
  red "DATABASE_URL not set. Pass it as argument or set it in backend/.env."
  exit 1
fi

# Convert asyncpg URL to psql-compatible URL (replace +asyncpg driver if present)
PSQL_URL="${DB_URL/+asyncpg/}"

echo "=== DB Readiness Check ==="
echo "URL: ${PSQL_URL//:*@/:***@}"   # mask password

# --- Connectivity ---
echo ""
echo "--- Connectivity ---"
if psql "$PSQL_URL" -c "SELECT 1" -q --no-psqlrc >/dev/null 2>&1; then
  green "PostgreSQL reachable"
else
  red "Cannot connect to PostgreSQL at the given URL"
  echo "  Ensure the DB is running and DATABASE_URL is correct."
  exit 1
fi

# --- Migration status ---
echo ""
echo "--- Migration Status ---"
cd "$ROOT_DIR/backend"

# Requires the venv to be active or alembic on PATH
ALEMBIC_CMD="${ALEMBIC_CMD:-python3 -m alembic}"
if ! $ALEMBIC_CMD current 2>/dev/null | grep -q "(head)"; then
  CURRENT=$($ALEMBIC_CMD current 2>/dev/null || echo "unknown")
  HEADS=$($ALEMBIC_CMD heads 2>/dev/null || echo "unknown")
  warn "Migrations may not be at head."
  echo "  Current: $CURRENT"
  echo "  Head(s): $HEADS"
  echo "  Run: cd backend && python -m alembic upgrade head"
  exit 1
else
  green "Migrations at head"
fi

echo ""
green "DB readiness check passed."
