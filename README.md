# NT208_HealthOS — Virtual Personal Doctor

Health management platform with FE+BFF, Core API, workers, and data services.

## Tech Stack

| Layer | Stack | Notes |
|---|---|---|
| FE + BFF | Next.js 16, React 19, Tailwind 4, next-intl | BFF Route Handlers under `/api/v1/**` |
| Core BE | FastAPI + SQLAlchemy async | Router prefix `/v1` |
| Database | PostgreSQL 16 + asyncpg | Core persistent data |
| Cache/Queue | Redis 7 + Celery | Cache + async task broker |
| Storage | MinIO (dev) / S3-compatible | Object storage |
| Workers | AI Worker (8001), Notification (8002), Queue Worker | Queue worker runs from backend; optional `queue-worker-service` profile in dev |

## Architecture (Critical Rule)

Browser **never** calls Core directly.

```
Browser -> Next.js BFF (/api/v1/**) -> Core BE (/v1/**) -> PostgreSQL/Redis/MinIO
```

- BFF handlers: `frontend/src/app/api/v1/**/route.ts`
- BFF proxy helper: `frontend/src/lib/core-api-proxy.ts`
- Core router: `backend/app/api/v1/router.py`

## Quick Start

### Prerequisites
- Python 3.12 (see `.python-version`)
- Node.js 20 (see `.nvmrc`)
- Docker Desktop (for infrastructure services)

### First-time setup (run once after clone)

```powershell
# Windows PowerShell
.\infra\scripts\setup.ps1
```

```bash
# Linux / macOS / WSL
bash infra/scripts/setup.sh
```

This copies env example files, downloads the AI YOLO model from Google Drive, installs npm deps, creates the Python venv, installs pip deps, and runs DB migrations.

Skip model download if needed:

```powershell
.\infra\scripts\setup.ps1 -skipModelDownload
```

```bash
bash infra/scripts/setup.sh --skip-model-download
```

Download model manually:

```powershell
.\infra\scripts\download-ai-model.ps1 -EnvFile .\services\ai-worker\.env
```

```bash
bash infra/scripts/download-ai-model.sh --env-file ./services/ai-worker/.env
```

### Seed Test Admin (Optional)

Create an initial admin user for testing (run after setup):

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
$env:SEED_ADMIN_PASSWORD="change-me"
$env:SEED_ADMIN_DISPLAY_NAME="Admin Test"
.\.venv\Scripts\python.exe seed_admin.py
```

The script reads `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and
`SEED_ADMIN_DISPLAY_NAME`. `SEED_ADMIN_PASSWORD` is required and is never
printed. To remove the same seeded account:

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
.\.venv\Scripts\python.exe delete_seed_admin.py --confirm
```

### Option A: Docker (recommended)

```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

### Option B: Local (each in a separate terminal)

```bash
.\start_infra.bat        # Postgres, Redis, MinIO
.\start_BE.bat           # FastAPI backend
.\start_FE.bat           # Next.js frontend
.\start_ai_worker.bat    # AI worker (optional)
```

### Manual (core services only)

```bash
cd frontend && npm ci && npm run dev
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## Local Service URLs

| Service | URL |
|---|---|
| Frontend + BFF | http://localhost:3000 |
| Core BE docs | http://localhost:8000/docs |
| AI Worker docs | http://localhost:8001/docs |
| Notification health | http://localhost:8002/health |
| MinIO API / Console | http://localhost:9000 / http://localhost:9001 |

## Environment (Frontend)

Use `infra/env/frontend.env.example` as source of truth.
The setup script copies it to `frontend/.env.local` automatically:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
CORE_API_URL=http://localhost:8000
NEXT_PUBLIC_CORE_WS_URL=ws://localhost:8000
ALLOWED_DEV_ORIGINS=localhost,127.0.0.1,healthos-dev.example.com
BFF_SHARED_SECRET=dev-bff-secret-change-in-production
```

Do not use `NEXT_PUBLIC_API_URL` for browser-to-core calls.
Keep `BFF_SHARED_SECRET` server-only and never expose it via `NEXT_PUBLIC_*`.

### Public OAuth Testing via Cloudflare Tunnel

- Preferred setup is a stable named Cloudflare tunnel. The BFF now derives OAuth callback origins from forwarded/request headers, so flows started from `https://<stable-tunnel>` return to that same public origin instead of collapsing back to localhost.
- Keep `OAUTH_GOOGLE_CALLBACK_URL` and `OAUTH_GITHUB_CALLBACK_URL` as fallback values for local development. They are no longer the sole source of truth for callback generation.
- `ALLOWED_DEV_ORIGINS` entries must be hostnames or wildcard hostnames, not full URLs. Example: `localhost,127.0.0.1,healthos-dev.example.com`.
- If you temporarily use a rotating `trycloudflare.com` URL, add `*.trycloudflare.com` to `ALLOWED_DEV_ORIGINS` so Next.js accepts `/_next/*` HMR traffic during dev. This only affects Next's dev-origin guard; OAuth providers still require exact callback URLs.
- Register both localhost and the stable tunnel callback URIs in Google Cloud Console and GitHub OAuth App settings:
  - `http://localhost:3000/api/v1/auth/oauth/google/callback`
  - `https://<stable-tunnel>/api/v1/auth/oauth/google/callback`
  - `http://localhost:3000/api/v1/auth/oauth/github/callback`
  - `https://<stable-tunnel>/api/v1/auth/oauth/github/callback`
- Rotating `trycloudflare.com` URLs are still supported only as ad-hoc testing targets. When the hostname changes, update the provider redirect URIs before testing again.

## How Teammates Should Run the Project

1. Clone the repo
2. Run `.\infra\scripts\setup.ps1` (Windows) or `bash infra/scripts/setup.sh` (Linux/macOS)
3. Start Docker Desktop
4. Run `docker compose -f infra/docker/docker-compose.dev.yml up -d`
5. Open http://localhost:3000

**Running without Docker:**
1. Run the setup script (step 2 above)
2. Ensure Postgres, Redis, MinIO are running locally with ports matching `backend/.env`
3. Open separate terminals and run: `.\start_infra.bat`, `.\start_BE.bat`, `.\start_FE.bat`

**Orchestrated start (`start_ALL.bat`):**
- `.\start_ALL.bat` picks **Docker** when Docker Desktop is running, otherwise **local** mode (Postgres/Redis/MinIO on the host).
- Override with `-Mode docker` or `-Mode local` (also supported by `.\start_infra.bat`).
- Preflight only (no new terminals / no `docker compose up`): `.\start_ALL.bat -CheckOnly`
- Root `.bat` launchers forward a limited set of extra flags via `cmd` (`%3`–`9`). Typical flags fit; for long custom argument lists, run the matching script under `infra\scripts\` with PowerShell directly.

**Multi-client testing (extra frontends):**
- `.\start_client_1.bat` — Next.js on **http://localhost:3001** (logged under `infra/logs/client_*.log`).
- `.\start_client_2.bat` — Next.js on **http://localhost:3002**.
- Ensure `ALLOWED_ORIGINS` in `backend/.env` includes the extra origin (scripts print a CORS reminder).

**Common issues:**
- CORS errors → Check `ALLOWED_ORIGINS` in `backend/.env` is a JSON array: `["http://localhost:3000"]`
- Import errors → Verify Python version matches 3.12 (see `.python-version`)
- npm errors → Verify Node version matches 20 (see `.nvmrc`)
- Missing env keys after pull → Run `.\check_env.bat` (see Phase 8 tooling)
- Stale DB / broken migrations → Run `.\reset_docker.bat` then `.\start_ALL.bat`
- Services fail to start → Run `.\start_ALL.bat -CheckOnly` and read the reported logs under `infra/logs/`

## Current Status

**v1.2.2 (Current)**: Data layer refactor, documentation audit, chat E2E review (unreleased).
**v1.2.1**: Auth security hardening (JWT revocation, IP rate limiting, Fernet-encrypted MFA, HIBP integration).
**v1.2.0**: User accent color customization and theming.

- **Implemented**: Auth (email/OTP/OAuth), security audit logging, rate limiting, HIBP breach detection, profile/goals, meals, reports, appointments, reminders, chat/WebSocket, vitals, devices, dashboard, gamification, in-app notifications (`/v1/notifications` + read/read-all + unread-count), AI meal analysis (`/analyze`), plans (`/v1/plans`), onboarding drafts (`/v1/users/me/onboarding-draft`).
- **Known gaps / partial**: Notification dispatch supports Core in-app persistence through the backend task and optional SMTP dispatch in the standalone notification service, but push/SMS providers are not configured; wearable sync remains outside this demo-readiness task; some UX paths remain TODO.

## CI/CD Pipeline

GitHub Actions workflows (`.github/workflows/`):
- `ci-smoke.yml` — PR smoke checks for `dev` and `main`
- `release.yml` — semantic-release on pushes to `main`
- `release-beta.yml` — semantic-release on pushes to `dev`
- `branch-protection.yml` — blocks PRs to `main` unless source is `dev` or `hotfix*`
- `sync-main-to-dev.yml` — merges `main` into `dev` after release commits
- `sync-dev-after-release.yml` — hard-resets `dev` to `origin/main` after release commits (force push)

**Note:** Release config is dynamic (`.releaserc.cjs`). Verify deployment platform and artifact targets before first production run.

See [Deployment Guide](./docs/deployment-guide.md) for workflow setup, monitoring/checklist gaps, and troubleshooting.
See [Production Checklist](./docs/production-checklist.md) for required env vars before deploying.

## Git Workflow

- **Base/release branch:** `main` (production releases)
- **Development branch:** `dev` is expected by CI/protection/release-beta workflows
- **Feature branches:** `feature/<scope>/<name>`, `fix/<scope>/<name>`, `docs/<name>`
- **PR targets:** feature/fix → `dev`; release/hotfix flow → `main` (branch protection enforces source)
- **Commits:** Conventional Commits required (`feat:`, `fix:`, `docs:`, `chore:`, etc.)

## Documentation

- [Project Overview + PDR](./docs/project-overview-pdr.md)
- [Codebase Summary](./docs/codebase-summary.md)
- [Code Standards](./docs/code-standards.md)
- [System Architecture](./docs/system-architecture.md)
- [Security](./docs/security.md)
- [Project Changelog](./docs/project-changelog.md)
- [Project Roadmap](./docs/project-roadmap.md)
- [Current Status](./docs/current-status.md)
- [Final Demo Checklist](./docs/demo/demo-checklist.md)
- [Final Demo Script](./docs/demo/demo-script.md)
- [Deployment Guide](./docs/deployment-guide.md)
- [Design Guidelines](./docs/design-guidelines.md)
- [Folder Convention](./docs/standards/folder-convention.md)
- [API Conventions](./docs/standards/api-conventions.md)
- [Git Workflow](./docs/standards/git-workflow.md)
