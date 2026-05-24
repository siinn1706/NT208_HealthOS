# HealthOS Demo Checklist

Use this checklist to prepare a local demo. Keep demo claims limited to services that are configured, running, and healthy.

## Setup Checklist

- Run the repository setup script once after clone:
  - Windows: `.\infra\scripts\setup.ps1`
  - Linux/macOS/WSL: `bash infra/scripts/setup.sh`
- Start infrastructure with Docker or local scripts:
  - Docker: `docker compose -f infra/docker/docker-compose.dev.yml up -d`
  - Local scripts: `.\start_infra.bat`, `.\start_BE.bat`, `.\start_FE.bat`
- Start optional demo services only for flows that need them:
  - AI meal analysis: `.\start_ai_worker.bat`
  - Notification service email demo: `.\start_notification.bat`
- Confirm health endpoints before presenting:
  - Frontend/BFF: `http://localhost:3000`
  - Core live: `http://localhost:8000/health`
  - Core ready: `http://localhost:8000/health/ready`
  - Core docs: `http://localhost:8000/docs`
  - AI worker: `http://localhost:8001/health`
  - Notification service: `http://localhost:8002/health`
  - MinIO console: `http://localhost:9001`
- For mobile demo, start Expo from `mobile/` and make sure the device can reach Core:

```bash
cd mobile
npm ci
npx expo start
```

## Accounts and Env Checklist

- Backend: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, `BFF_SHARED_SECRET`, `AI_WORKER_URL`, and storage env vars.
- Frontend/BFF: `CORE_API_URL`, `BFF_SHARED_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CORE_WS_URL`.
- OAuth demo: provider client IDs/secrets plus registered callback URLs for localhost or the active tunnel.
- Admin seed: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_DISPLAY_NAME`.
- Notification email demo: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, optional `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS`.
- AI meal demo: `AI_YOLO_MODEL_PATH`, `AI_CLASS_NAMES_PATH`, optional `GEMINI_API_KEY`.
- Mobile demo: `EXPO_PUBLIC_CORE_API_URL`, `EXPO_PUBLIC_CORE_WS_URL`.

Seed a local admin account if needed:

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
$env:SEED_ADMIN_PASSWORD="change-me"
$env:SEED_ADMIN_DISPLAY_NAME="Admin Test"
.\.venv\Scripts\python.exe seed_admin.py
```

Cleanup after the demo:

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
.\.venv\Scripts\python.exe delete_seed_admin.py --confirm
```

## Main Demo Flows

- Web login with the seeded account. If MFA is enabled, show the challenge and complete the MFA login path.
- Dashboard/profile/meals/reminders/notifications through the web app.
- Browser network check: calls should use `/api/v1/**`; do not demo direct browser calls to Core `/v1/**`.
- Notification dispatch:
  - Core in-app path: use or enqueue `app.tasks.notification_dispatch.dispatch_notification` with channel `in_app`.
  - Standalone email path: `POST http://localhost:8002/dispatch` with channel `email` only when SMTP env is configured; otherwise show the skipped reason.
- AI meal/photo analysis only when Core, MinIO, and AI worker are healthy.
- Mobile: login, show API-backed profile/dashboard surfaces, and use host-reachable Core URLs for device testing.

## Known Limitations

- Browser-to-Core direct calls are intentionally unsupported; web uses the BFF.
- Push notifications and SMS providers are not configured.
- Standalone notification email depends on SMTP env and may report a skipped state.
- AI meal analysis depends on model files, MinIO, and AI worker health.
- Wearable sync is outside this demo scope.
- Mobile API coverage is broad, but some UI paths are still partial workflows.

## Troubleshooting

- Core not ready: inspect `infra/logs/backend*.log` or `docker compose -f infra/docker/docker-compose.dev.yml logs core-be`.
- Frontend/BFF errors: inspect browser network calls for `/api/v1/**`, frontend logs, and `CORE_API_URL`.
- Auth refresh/OAuth issues: confirm `BFF_SHARED_SECRET` matches backend and OAuth callback URLs match the active host.
- Redis/Celery tasks not running: inspect `queue-worker` logs and `REDIS_URL`.
- Notification email skipped: check `/dispatch` response `reason` and SMTP env vars.
- AI meal analysis fails: inspect AI worker logs, model paths, MinIO health, and `AI_WORKER_URL`.
- Mobile API failure: use a host-reachable Core URL; Android emulator local Core usually needs `10.0.2.2` instead of `localhost`.
