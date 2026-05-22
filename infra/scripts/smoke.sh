#!/usr/bin/env bash
# smoke.sh — post-deploy smoke test for HealthOS BFF
# Usage: bash infra/scripts/smoke.sh [BASE_URL]
# Env:   SMOKE_BASE_URL   default http://localhost:3000
#        SMOKE_USERNAME   required
#        SMOKE_PASSWORD   required (never echoed)
set -euo pipefail

BASE_URL="${1:-${SMOKE_BASE_URL:-http://localhost:3000}}"
USERNAME="${SMOKE_USERNAME:-}"
PASSWORD="${SMOKE_PASSWORD:-}"

if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
  echo "ERROR: set SMOKE_USERNAME and SMOKE_PASSWORD" >&2
  exit 1
fi

COOKIES=$(mktemp /tmp/smoke_cookies.XXXXXX)
trap 'rm -f "$COOKIES"' EXIT

_elapsed_start=$(date +%s%3N)

step() {
  local name="$1" expected="$2"; shift 2
  local t0 t1 status rid body
  t0=$(date +%s%3N)
  body=$(curl -sS -b "$COOKIES" -c "$COOKIES" -D - "$@" 2>/dev/null) || true
  t1=$(date +%s%3N)
  status=$(echo "$body" | grep -i '^HTTP/' | tail -1 | awk '{print $2}')
  rid=$(echo "$body" | grep -i '^x-request-id:' | tail -1 | tr -d '\r' | awk '{print $2}')
  local elapsed=$(( t1 - t0 ))
  if [[ "$status" == "$expected" ]]; then
    printf 'SMOKE  step=%-12s status=%s rid=%-36s elapsed_ms=%d ok\n' \
      "$name" "$status" "${rid:--}" "$elapsed"
  else
    printf 'SMOKE  step=%-12s status=%s (expected %s) rid=%-36s elapsed_ms=%d FAIL\n' \
      "$name" "${status:-(no response)}" "$expected" "${rid:--}" "$elapsed" >&2
    exit 1
  fi
}

# Step 1: health liveness
step health 200 -X GET "${BASE_URL}/api/v1/health"

# Step 2: login — capture session cookies
step login 200 \
  -X POST "${BASE_URL}/api/v1/auth" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}"

# Step 3: protected call (current user)
step protected 200 -X GET "${BASE_URL}/api/v1/users/me"

# Step 4: token refresh
step refresh 200 -X POST "${BASE_URL}/api/v1/auth/refresh"

# Step 5: logout
step logout 200 -X DELETE "${BASE_URL}/api/v1/auth/session"

_elapsed_total=$(( $(date +%s%3N) - _elapsed_start ))
printf 'SMOKE  result=pass total_ms=%d\n' "$_elapsed_total"
