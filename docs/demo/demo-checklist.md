# Final Demo Checklist

Use this as the run-of-show readiness list. Keep demo claims limited to the supported paths below.

## Required Env Vars

- Backend: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, `BFF_SHARED_SECRET`, `AI_WORKER_URL`, storage env vars.
- Frontend: `NEXT_PUBLIC_APP_URL`, `CORE_API_URL`, `BFF_SHARED_SECRET`, optional OAuth callback URLs.
- Admin seed: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_DISPLAY_NAME`.
- Notification email demo: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, optional `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS`.
- AI meal demo: `AI_YOLO_MODEL_PATH`, `AI_CLASS_NAMES_PATH`, optional `GEMINI_API_KEY`.
- Mobile demo: `EXPO_PUBLIC_CORE_API_URL`, `EXPO_PUBLIC_CORE_WS_URL`.

## Startup

```powershell
.\start_infra.bat
.\start_BE.bat
.\start_FE.bat
.\start_ai_worker.bat
.\start_notification.bat
```

Docker path:

```powershell
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

## Health Checks

- Frontend/BFF: `http://localhost:3000`
- Core live: `http://localhost:8000/health`
- Core ready: `http://localhost:8000/health/ready`
- Core docs: `http://localhost:8000/docs`
- AI worker: `http://localhost:8001/health`
- Notification service: `http://localhost:8002/health`
- MinIO console: `http://localhost:9001`

## Admin Seed/Delete

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
$env:SEED_ADMIN_PASSWORD="change-me"
$env:SEED_ADMIN_DISPLAY_NAME="Admin Test"
.\.venv\Scripts\python.exe seed_admin.py
```

Cleanup:

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
.\.venv\Scripts\python.exe delete_seed_admin.py --confirm
```

## Demo Checks

- Login with the seeded account.
- If MFA is enabled for a user, confirm password login returns an MFA challenge and complete `/v1/auth/login/mfa`.
- Open dashboard, profile, meals, reminders, and notifications through the web app.
- Confirm browser HTTP calls use `/api/v1/**`; do not demo direct browser `/v1/**` calls.
- Trigger notification dispatch:
  - Core in-app path: run or enqueue `app.tasks.notification_dispatch.dispatch_notification` with channel `in_app`.
  - Standalone service path: `POST http://localhost:8002/dispatch` with channel `email` and SMTP env configured, or show `skipped` reason when SMTP is not configured.
- AI meal/photo demo: upload a meal image from the web/mobile flow only when Core, MinIO, and AI worker are healthy.
- Mobile demo: start Expo, log in, show API-backed profile/dashboard, then force a 401/refresh failure only in test/dev if demonstrating session clearing.

## Common Failures

- Core not ready: inspect `infra/logs/backend*.log` or `docker compose -f infra/docker/docker-compose.dev.yml logs core-be`.
- Frontend BFF errors: inspect browser network calls for `/api/v1/**` and frontend logs.
- Redis/Celery tasks not running: inspect `queue-worker` logs.
- Notification email skipped: check `/dispatch` response `reason` and SMTP env vars.
- AI meal analysis fails: inspect `ai-worker` logs, model path, MinIO health, and `AI_WORKER_URL`.
- Mobile API failure: confirm `EXPO_PUBLIC_CORE_API_URL` points to host-reachable Core (`10.0.2.2` for Android emulator local Core).
- Wearable sync missing: this is out of scope for this demo pass.
