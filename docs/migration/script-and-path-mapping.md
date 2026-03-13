# HealthOS - Migration Guide: Script and Path Mapping

## Overview

This guide maps old startup workflows to the current standardized scripts.
`start_ALL.bat` now calls `infra/scripts/start_all.ps1` (Docker-first with local fallback only when daemon is reachable).

---

## Runtime Script Mapping

| Legacy entrypoint | Current entrypoint | Notes |
|---|---|---|
| `start_FE.bat` | `infra/scripts/start_fe.ps1` | Starts Next.js on port 3000 |
| `start_BE.bat` | `infra/scripts/start_be.ps1` | Runs `python -m alembic upgrade head` then FastAPI on port 8000 |
| `start_ai_worker.bat` | `infra/scripts/start_ai_worker.ps1` | Starts AI worker on port 8001 |
| `start_queue_worker.bat` | `infra/scripts/start_queue_worker.ps1` | Starts Celery worker |
| `start_notification.bat` | `infra/scripts/start_notification.ps1` | Starts notification service on port 8002 |
| `start_infra.bat` | `infra/scripts/start_infra.ps1` | Starts infra (Postgres, Redis, MinIO) |
| `start_ALL.bat` | `infra/scripts/start_all.ps1` | Orchestrates full stack: infra + BE + FE + AI + queue + notification |
| _(n/a)_ | `infra/scripts/db.ps1` | DB utilities: status, up/stop, psql, migrate, dump/restore |

### `start_all.ps1` public interface

```powershell
.\infra\scripts\start_all.ps1 -Mode auto|docker|local -Only infra|be|fe|ai|queue|notification|all -InstallPolicy prompt|auto|never -SkipInstall -CheckOnly [-LogFile <path>]
```

- `-Mode auto`: Prefer Docker only if both `docker compose` and daemon are available; otherwise fallback to local.
- `-Mode docker`: Strict Docker mode; fail with actionable error when daemon is down.
- `-InstallPolicy`: Infra dependency install policy in local mode (`prompt` default, `auto`, `never`).
- `-SkipInstall`: Skip dependency installation.
- `-Only`: Start/check a subset of components.
- `-CheckOnly`: Run dependency/service checks only (no npm/pip install side effects).
- `-LogFile`: Optional explicit log path. Default logs go to `infra/logs/<component>_<timestamp>.log`.

---

## Current Folder Mapping

| Before | After | Notes |
|---|---|---|
| _(none)_ | `services/ai-worker/` | AI service |
| _(none)_ | `services/queue-worker/` | Async/Celery service |
| _(none)_ | `services/notification/` | Notification service |
| _(none)_ | `contracts/openapi/` | API contracts |
| _(none)_ | `infra/docker/` | Docker compose |
| _(none)_ | `infra/env/` | Env templates |
| _(none)_ | `tests/` | Integration/contract/e2e tests |
| _(none)_ | `docs/` | Standards and architecture docs |

---

## Local Upgrade Checklist

```bash
# 1. Pull latest code
git pull origin develop

# 2. Refresh env files (if new vars were added)
cp infra/env/backend.env.example backend/.env
cp infra/env/frontend.env.example frontend/.env.local
cp infra/env/worker.env.example services/ai-worker/.env
cp infra/env/worker.env.example services/queue-worker/.env
cp infra/env/worker.env.example services/notification/.env

# 3. Deterministic dependency setup
cd frontend && npm ci
cd ../backend && .\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt

# 4. Start full stack
cd .. && start_ALL.bat
```

---

## Deprecation Timeline

| Item | Deprecated | Removed |
|---|---|---|
| Root `start_*.bat` logic | Phase 2 start (wrapper-only) | Phase 2 end |
| Legacy fallback mocks in frontend runtime data | When API endpoints are stable | Next sprint after endpoint stabilization |
