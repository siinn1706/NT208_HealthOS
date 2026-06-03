#!/usr/bin/env bash
# ai-check.sh — verify AI worker reachability and model readiness
# Usage: bash infra/scripts/ai-check.sh [AI_WORKER_URL]
# Env:   AI_WORKER_URL  default http://localhost:8001
set -euo pipefail

AI_URL="${1:-${AI_WORKER_URL:-http://localhost:8001}}"
TIMEOUT=10
FAIL=0

red()   { printf "\033[31m✗ %s\033[0m\n" "$*"; }
green() { printf "\033[32m✓ %s\033[0m\n" "$*"; }
warn()  { printf "\033[33m⚠ %s\033[0m\n" "$*"; }

echo "=== AI Worker Connectivity Check ==="
echo "Target: $AI_URL"
echo ""

# --- /health liveness ---
echo "--- Liveness ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${AI_URL}/health" 2>/dev/null || echo "000")
if [[ "$STATUS" == "200" ]]; then
  green "/health → 200"
else
  red "/health → $STATUS (expected 200)"
  echo "  AI worker is not reachable. Ensure services/ai-worker is running."
  FAIL=1
fi

# --- /health/ready (model loaded) ---
echo ""
echo "--- Model Ready ---"
READY_BODY=$(curl -s --max-time "$TIMEOUT" "${AI_URL}/health/ready" 2>/dev/null || echo "{}")
READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${AI_URL}/health/ready" 2>/dev/null || echo "000")
if [[ "$READY_STATUS" == "200" ]]; then
  green "/health/ready → 200 — models loaded"
  echo "  $READY_BODY"
elif [[ "$READY_STATUS" == "503" ]]; then
  warn "/health/ready → 503 — models not yet loaded"
  echo "  $READY_BODY"
  echo "  Model download may still be in progress. Retry after model setup completes."
  FAIL=1
else
  warn "/health/ready → $READY_STATUS (endpoint may not exist on this version)"
fi

# --- /docs reachable (only in debug mode) ---
echo ""
echo "--- Docs (debug-only) ---"
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${AI_URL}/docs" 2>/dev/null || echo "000")
if [[ "$DOCS_STATUS" == "200" ]]; then
  green "/docs → 200 (debug mode on)"
elif [[ "$DOCS_STATUS" == "404" ]]; then
  green "/docs → 404 (production mode — docs disabled)"
else
  warn "/docs → $DOCS_STATUS"
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  green "AI worker check passed."
  exit 0
else
  red "AI worker check failed. Check logs: docker compose logs ai-worker"
  exit 1
fi
