#!/usr/bin/env bash
set -euo pipefail

# Run the WS core-be smoke inside the production compose network.
# This script targets the compose network directly (bypasses Cloudflare Tunnel).
# It verifies Core WS endpoints are healthy and the single-accept fix works.
#
# Usage: bash infra/docker/run-ws-corebe-smoke.sh
#
# Pre-requisites:
#   - The prod compose stack must be running (core-be healthy).
#   - WS_SMOKE_SECRET must be set in the environment or .env file.
#
# What this proves:
#   - Core WS endpoints (/ws, /v1/chat/ws/{id}) are reachable inside compose.
#   - Garbage-frame auth-reject (4401) works correctly on all WS paths.
#   - Auth-success path exercises ConnectionManager.connect() and verifies
#     the single-accept fix (no RuntimeError from double ws.accept()).
#
# What this does NOT prove:
#   - Cloudflare Tunnel routing of wss://healthos.page/ws → core-be.
#   - External reachability of wss://healthos.page from the internet.
#   - See docs/deployment-guide.md "Post-deploy WS core-be verification".

COMPOSE_FILE="$(dirname "$0")/docker-compose.prod.yml"

exec docker compose -f "$COMPOSE_FILE" --profile smoke run --rm ws-corebe-smoke
