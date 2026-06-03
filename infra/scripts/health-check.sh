#!/usr/bin/env bash
# health-check.sh — preflight validation for HealthOS services
# Usage: bash infra/scripts/health-check.sh [--mode docker|local]
# Checks: Python 3.12, Node 20, Docker, required ports, .env files
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:-auto}"
FAIL=0

red()   { printf "\033[31m✗ %s\033[0m\n" "$*"; }
green() { printf "\033[32m✓ %s\033[0m\n" "$*"; }
warn()  { printf "\033[33m⚠ %s\033[0m\n" "$*"; }

check_cmd() {
  local name="$1" cmd="$2" pattern="$3"
  if output=$(eval "$cmd" 2>&1); then
    if echo "$output" | grep -q "$pattern"; then
      green "$name: $output"
    else
      warn "$name found but version mismatch (expected $pattern): $output"
    fi
  else
    red "$name not found or not on PATH"
    FAIL=1
  fi
}

check_port_free() {
  local port="$1" service="$2"
  if ! (nc -z localhost "$port" 2>/dev/null); then
    green "Port $port ($service): free"
  else
    warn "Port $port ($service): already in use — another process may conflict"
  fi
}

check_file() {
  local path="$1" label="$2"
  if [[ -f "$path" ]]; then
    green "Env file: $label"
  else
    red "Missing env file: $label ($path)"
    FAIL=1
  fi
}

echo "=== HealthOS Preflight Check ==="
echo ""

# --- Runtime versions ---
echo "--- Runtime ---"
check_cmd "Python" "python3 --version" "3\.12"
check_cmd "Node"   "node --version"    "v2[0-9]"
check_cmd "npm"    "npm --version"     "."

# --- Docker ---
echo ""
echo "--- Docker ---"
if [[ "$MODE" == "auto" || "$MODE" == "docker" ]]; then
  if docker info >/dev/null 2>&1; then
    green "Docker Desktop: running"
  else
    warn "Docker Desktop: not running (required for Docker mode)"
    [[ "$MODE" == "docker" ]] && FAIL=1
  fi
fi

# --- Ports ---
echo ""
echo "--- Ports ---"
check_port_free 3000  "Frontend"
check_port_free 8000  "Core BE"
check_port_free 8001  "AI Worker"
check_port_free 8002  "Notification"
check_port_free 5432  "PostgreSQL"
check_port_free 6379  "Redis"
check_port_free 9000  "MinIO API"
check_port_free 9001  "MinIO Console"

# --- Env files ---
echo ""
echo "--- Env Files ---"
if [[ -f "$ROOT_DIR/infra/env/.env.master" ]]; then
  green "infra/env/.env.master"
else
  red "infra/env/.env.master missing — run setup first:"
  echo "  bash infra/scripts/setup.sh"
  FAIL=1
fi
check_file "$ROOT_DIR/backend/.env"                 "backend/.env"
check_file "$ROOT_DIR/frontend/.env.local"          "frontend/.env.local"
check_file "$ROOT_DIR/services/ai-worker/.env"      "services/ai-worker/.env"
check_file "$ROOT_DIR/services/notification/.env"   "services/notification/.env"

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  green "Preflight passed. Ready to start services."
  exit 0
else
  red "Preflight failed. Fix the issues above before starting."
  exit 1
fi
