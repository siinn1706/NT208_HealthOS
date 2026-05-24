# HealthOS Demo Checklist

Use this checklist to prepare a local demo. Keep demo claims limited to services that are configured, running, and healthy.

> **Note:** This checklist does not assert a clean global build or test run. Run individual test scripts for the surface being changed.

---

## Prerequisites

- Python 3.12 (`.python-version` at repo root)
- Node.js 20 (`.nvmrc` at repo root)
- Docker Desktop running (for infrastructure services)
- Git clone of the repository with all submodules

---

## Environment Files

Ensure the following env files exist before starting. The setup script copies them from examples automatically.

| File | Source |
|------|--------|
| `backend/.env` | `infra/env/backend.env.example` |
| `frontend/.env.local` | `infra/env/frontend.env.example` |
| `services/ai-worker/.env` | `infra/env/worker.env.example` |
| `services/notification/.env` | *(created by setup, check for SMTP vars)* |
| `infra/docker/.env.dev` | `infra/docker/.env.dev.example` |

Required env vars per surface:

- **Backend**: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, `BFF_SHARED_SECRET`, `AI_WORKER_URL`, storage vars
- **Frontend/BFF**: `CORE_API_URL`, `BFF_SHARED_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CORE_WS_URL`
- **OAuth demo** *(optional)*: provider client IDs/secrets + registered callback URLs
- **AI meal demo** *(optional)*: `AI_YOLO_MODEL_PATH`, `AI_CLASS_NAMES_PATH`, optionally `GEMINI_API_KEY`
- **Notification email demo** *(optional)*: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, optionally `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS`
- **Mobile demo** *(optional)*: `EXPO_PUBLIC_CORE_API_URL`, `EXPO_PUBLIC_CORE_WS_URL`

---

## First-Time Setup (run once after clone)

```powershell
# Windows
.\infra\scripts\setup.ps1
```

```bash
# Linux / macOS / WSL
bash infra/scripts/setup.sh
```

This copies env examples, downloads the AI YOLO model, installs npm deps, creates Python venv, installs pip deps, and runs DB migrations.

Skip model download:

```powershell
.\infra\scripts\setup.ps1 -skipModelDownload
```

---

## Start Order

### Option A: Docker (recommended)

```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

This starts all services in dependency order. Wait for all health checks to pass before opening the browser.

### Option B: Local (separate terminals, in order)

1. **Infrastructure** (Postgres, Redis, MinIO):
   ```powershell
   .\start_infra.bat
   ```
2. **Core Backend** (FastAPI on port 8000):
   ```powershell
   .\start_BE.bat
   ```
3. **AI Worker** *(optional, required for meal analysis)*:
   ```powershell
   .\start_ai_worker.bat
   ```
4. **Notification service** *(optional, required for email dispatch demo)*:
   ```powershell
   .\start_notification.bat
   ```
5. **Frontend + BFF** (Next.js on port 3000):
   ```powershell
   .\start_FE.bat
   ```

---

## Health Check Before Demo

Confirm each required service is responding before presenting:

| Service | URL |
|---------|-----|
| Frontend + BFF | http://localhost:3000 |
| Core live | http://localhost:8000/health |
| Core ready | http://localhost:8000/health/ready |
| Core API docs | http://localhost:8000/docs |
| AI Worker | http://localhost:8001/health *(if running)* |
| Notification | http://localhost:8002/health *(if running)* |
| MinIO console | http://localhost:9001 |

---

## Demo User / Admin Seed

Create a local admin account before the demo:

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
$env:SEED_ADMIN_PASSWORD="change-me"
$env:SEED_ADMIN_DISPLAY_NAME="Admin Test"
.\.venv\Scripts\python.exe seed_admin.py
```

Remove the seeded account after the demo:

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
.\.venv\Scripts\python.exe delete_seed_admin.py --confirm
```

---

## Main Demo Flows

- **Login**: web login with seeded account; show MFA challenge if enabled
- **Dashboard / profile / meals / reminders / notifications** through the web app
- **BFF check**: confirm browser network calls use `/api/v1/**` — do not demo direct browser calls to Core `/v1/**`
- **Notification dispatch**:
  - In-app path: enqueue `app.tasks.notification_dispatch.dispatch_notification` with `channel=in_app`
  - Email path: `POST http://localhost:8002/dispatch` with `channel=email` — only when SMTP env is configured; otherwise show the skipped reason
- **AI meal / photo analysis**: only when Core, MinIO, and AI Worker are all healthy
- **Mobile** *(optional)*: login, show API-backed profile/dashboard, confirm device can reach Core using a host-reachable URL

---

## Known Limitations

- Browser-to-Core direct calls are intentionally unsupported; web always goes through the BFF
- Push notifications and SMS providers are not configured in the demo setup
- Standalone notification email requires SMTP env and may report a skipped state
- AI meal analysis requires model files, MinIO, and AI Worker running and healthy
- Wearable sync is outside this demo scope (stubbed)
- WebSocket presence is single-process / in-memory (not HA)
- Mobile UI has broad API coverage; some paths are partial workflows rather than production-complete flows
- No claim is made about global build or test pass; run surface-specific scripts to verify

---

## Troubleshooting

| Symptom | Steps |
|---------|-------|
| Core not ready | Check `infra/logs/` or `docker compose ... logs core-be` |
| Frontend BFF errors | Inspect browser network `/api/v1/**`, check `CORE_API_URL` |
| Auth / OAuth issues | Confirm `BFF_SHARED_SECRET` matches backend and callback URLs match active host |
| Redis / Celery tasks not running | Check `queue-worker` logs and `REDIS_URL` |
| Notification email skipped | Check `/dispatch` response `reason` and SMTP env |
| AI meal analysis fails | Check AI Worker logs, model paths, MinIO health, `AI_WORKER_URL` |
| Mobile API failure | Use host-reachable Core URL; Android emulator may need `10.0.2.2` instead of `localhost` |
| CORS errors | Confirm `ALLOWED_ORIGINS` in `backend/.env` is a JSON array: `["http://localhost:3000"]` |
| Missing env keys after pull | Run `.\check_env.bat` |
| Stale DB / broken migrations | Run `.\reset_docker.bat` then `.\start_ALL.bat` |
