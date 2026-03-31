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

### Docker (recommended)

```bash
.\infra\scripts\setup.ps1
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

### Manual (core services)

```bash
cd frontend && npm ci && npm run dev
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
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

Use `frontend/.env.example` as source of truth:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
CORE_API_URL=http://localhost:8000
CORE_API_URL_FOR_BFF=http://localhost:8000
NEXT_PUBLIC_CORE_WS_URL=ws://localhost:8000   # set in compose env in dev/prod
```

Do not use `NEXT_PUBLIC_API_URL` for browser-to-core calls.

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
