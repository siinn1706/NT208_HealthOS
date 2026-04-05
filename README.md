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

This copies env example files, installs npm deps, creates the Python venv, installs pip deps, and runs DB migrations.

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
```

Do not use `NEXT_PUBLIC_API_URL` for browser-to-core calls.

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

**Common issues:**
- CORS errors → Check `ALLOWED_ORIGINS` in `backend/.env` is a JSON array: `["http://localhost:3000"]`
- Import errors → Verify Python version matches 3.12 (see `.python-version`)
- npm errors → Verify Node version matches 20 (see `.nvmrc`)
- Missing env keys after pull → Run `.\check_env.bat` (see Phase 8 tooling)
- Stale DB / broken migrations → Run `.\reset_docker.bat` then `.\start_ALL.bat`

## Current Status

- Implemented: auth/session/otp, profile, meals, reports, appointments, reminders, conversations/chat, vitals, devices, dashboard, goals/health-goals routes.
- Stub/placeholder: AI Worker `POST /analyze`, Notification `POST /dispatch`, queue task internals, some UX paths (feature-level TODO).

## Git Workflow

- Base branch: `main`
- Feature branches: `feature/<scope>/<name>`, `fix/<scope>/<name>`, `docs/<name>`
- PR target: `main`
- Conventional Commits required.

## Documentation

- [Project Overview + PDR](./docs/project-overview-pdr.md)
- [Codebase Summary](./docs/codebase-summary.md)
- [Code Standards](./docs/code-standards.md)
- [System Architecture](./docs/system-architecture.md)
- [Project Roadmap](./docs/project-roadmap.md)
- [Deployment Guide](./docs/deployment-guide.md)
- [Design Guidelines](./docs/design-guidelines.md)
- [Folder Convention](./docs/standards/folder-convention.md)
- [API Conventions](./docs/standards/api-conventions.md)
- [Git Workflow](./docs/standards/git-workflow.md)
