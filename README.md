<div align="center">

<h1>NT208_HealthOS</h1>

<p><strong>Virtual Personal Doctor</strong></p>

<p>Health management platform with Web/BFF, Core API, workers, mobile app, and data services.</p>

<p>
  <a href="./README.md">
    <img alt="English README" src="https://img.shields.io/badge/Language-English-2563EB?style=for-the-badge" />
  </a>
  <a href="./README.vi.md">
    <img alt="Vietnamese README" src="https://img.shields.io/badge/Language-Tieng_Viet-DC2626?style=for-the-badge" />
  </a>
</p>

<p>
  <strong>Frontend / BFF</strong><br />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="next-intl" src="https://img.shields.io/badge/next--intl-4-7C3AED?style=flat-square&logoColor=white" />
</p>

<p>
  <strong>Backend / Data</strong><br />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.128-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=FFD43B" />
  <img alt="SQLAlchemy" src="https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat-square&logoColor=white" />
  <img alt="Alembic" src="https://img.shields.io/badge/Alembic-1.18-6BA81E?style=flat-square&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="Celery" src="https://img.shields.io/badge/Celery-5-37814A?style=flat-square&logo=celery&logoColor=white" />
  <img alt="MinIO" src="https://img.shields.io/badge/MinIO-S3--compatible-C72E49?style=flat-square&logo=minio&logoColor=white" />
</p>

<p>
  <strong>Mobile / Infra / Quality</strong><br />
  <img alt="Expo" src="https://img.shields.io/badge/Expo-53-4630EB?style=flat-square&logo=expo&logoColor=white" />
  <img alt="React Native" src="https://img.shields.io/badge/React_Native-0.79-20232A?style=flat-square&logo=react&logoColor=61DAFB" />
  <img alt="Expo Router" src="https://img.shields.io/badge/Expo_Router-5-4630EB?style=flat-square&logo=expo&logoColor=white" />
  <img alt="Docker Compose" src="https://img.shields.io/badge/Docker_Compose-dev-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-4-6E9F18?style=flat-square&logo=vitest&logoColor=white" />
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-1.59-2EAD33?style=flat-square&logo=playwright&logoColor=white" />
  <img alt="Pytest" src="https://img.shields.io/badge/Pytest-8-009FE3?style=flat-square&logo=pytest&logoColor=white" />
  <img alt="Jest" src="https://img.shields.io/badge/Jest-29-C21325?style=flat-square&logo=jest&logoColor=white" />
</p>

</div>

## Tech Stack

| Layer | Stack | Notes |
|---|---|---|
| Frontend + BFF | Next.js 16, React 19, TypeScript, Tailwind CSS 4, next-intl 4 | BFF Route Handlers under `/api/v1/**`; browser traffic enters here |
| Core API | FastAPI, Python 3.12, SQLAlchemy async, Alembic | Router prefix `/v1`; not called directly by browser code |
| Mobile | Expo SDK 53, React Native 0.79, Expo Router 5, TypeScript | Native app surface with its own Expo Router entry |
| Database | PostgreSQL 16 + asyncpg | Core persistent data |
| Cache + Queue | Redis 7 + Celery 5 | Cache, rate limits, broker, and async jobs |
| Storage | MinIO / S3-compatible | Object storage for local development and S3-style deployments |
| Workers | AI Worker (8001), Notification (8002), Queue Worker | Queue worker runs from backend; optional `queue-worker-service` profile in dev |
| Infra + Dev | Docker Compose | Local infrastructure orchestration |
| Testing + Quality | Vitest, Playwright, Pytest, Jest | Frontend unit, E2E, backend, and mobile test surfaces |

## Architecture (Critical Rule)

> Browser code must call the Next.js BFF at `/api/v1/**`. It must not call the Core API at `/v1/**` directly.

```text
Browser -> Next.js BFF (/api/v1/**) -> Core API (/v1/**) -> PostgreSQL / Redis / MinIO
```

- Required browser path: `frontend/src/app/api/v1/**/route.ts`
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

HealthOS is a demo-oriented full-stack project with separate web, Core API, worker, and native mobile surfaces.

- **Web**: Browser traffic goes through the Next.js BFF under `/api/v1/**`; Core remains a server-side `/v1/**` target.
- **Core backend**: FastAPI provides auth, profile/dashboard, meals, reports, appointments, reminders, medications, plans, onboarding drafts, chat/WebSocket, devices, notification list/read/unread routes, and audit/security flows.
- **Workers/services**: AI meal analysis is available when Core, MinIO, and the AI worker are configured. Notification dispatch supports Core in-app persistence and optional SMTP email through the standalone notification service.
- **Mobile**: The Expo app calls Core directly with bearer-token auth and uses the shared API contracts where available.

## Known Limitations

- Browser code must not call Core `/v1/**` directly; use BFF `/api/v1/**`.
- Push notifications and SMS providers are not configured.
- WebSocket presence is still single-process/in-memory.
- Wearable sync remains outside the demo scope and is stubbed in the worker surface.
- Some native mobile UI affordances are partial workflows rather than production-complete flows.
- These docs do not assert a clean global build or test run; run the relevant scripts for the surface you are changing.

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

- [Frontend + BFF README](./frontend/README.md)
- [Mobile README](./mobile/README.md)
- [Backend/Core Architecture](./docs/system-architecture.md)
- [Backend Security](./docs/security.md)
- [Project Overview + PDR](./docs/project-overview-pdr.md)
- [Codebase Summary](./docs/codebase-summary.md)
- [Code Standards](./docs/code-standards.md)
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
