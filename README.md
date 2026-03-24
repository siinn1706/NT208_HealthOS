# NT208_HealthOS — Virtual Personal Doctor

Health management platform: health records, nutrition tracking, wearable sync, real-time chat, health alerts.

## Tech Stack

| Layer | Stack | Key Details |
|-------|-------|-------------|
| FE + BFF | Next.js 16 + React 19 | shadcn/ui, Tailwind CSS 4, i18n (next-intl) |
| BFF | Route Handlers `/api/v1/**` | Session/auth, proxy to Core BE |
| Core BE | FastAPI + SQLAlchemy 2 async | REST + WebSocket |
| Database | PostgreSQL 16 + asyncpg | 15+ ORM models |
| Cache/Queue | Redis 7 + Celery | pub/sub, rate-limit, async tasks |
| Storage | MinIO (local) / S3 | Binary blobs |
| Workers | AI, Queue, Notification | Ports 8001, 8002 |

## Architecture

**CRITICAL**: Frontend NEVER calls Core BE directly. All requests via `/api/v1/**` BFF routes.

```
Browser → Next.js BFF (/api/v1/**) → Core BE (/v1/**) → PostgreSQL
```

## Quick Start

### Docker (Recommended)

```bash
# Setup env files
.\infra\scripts\setup.ps1          # Windows
bash infra/scripts/setup.sh        # Unix/WSL

# Start stack
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

### Manual

```bash
# Frontend
cd frontend && npm ci && npm run dev

# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Services

| Service | URL |
|---------|-----|
| Frontend + BFF | http://localhost:3000 |
| Core BE API | http://localhost:8000/docs |
| AI Worker | http://localhost:8001/docs |
| MinIO Console | http://localhost:9001 |

## Features

| Module | Status | BFF Routes |
|--------|--------|------------|
| Authentication + OTP | ✅ | `/api/v1/auth/*` |
| Profile + Onboarding | ✅ | `/api/v1/users/*` |
| Dashboard + Vitals | ✅ | `/api/v1/dashboard/*`, `/api/v1/vitals/*` |
| Meals Diary | ✅ | `/api/v1/meals/*` |
| Appointments | ✅ | `/api/v1/appointments` |
| Reminders | ✅ | `/api/v1/reminders/*` |
| Health Reports | ✅ | `/api/v1/reports/*` |
| Real-time Chat | ✅ | `/api/v1/conversations/*` |
| Risk Predictions | ✅ | `/api/v1/health/risk-predictions` |
| Devices (Wearable) | ✅ | `/api/v1/devices` |
| Gamification | 🔧 Partial | Stubs ready |

**TODO**: AI food recognition ML, Notification dispatch, Wearable real APIs, PDF export

## Database Operations

```powershell
# Docker mode
.\infra\scripts\db.ps1 -Action migrate
.\infra\scripts\db.ps1 -Action psql

# Local mode
.\infra\scripts\db.ps1 -Action migrate -Mode local
.\infra\scripts\db.ps1 -Action psql -Mode local
```

## Key Files

| Purpose | Path |
|---------|------|
| BFF routes | `frontend/src/app/api/v1/**/route.ts` |
| BFF client | `frontend/src/lib/api-client.ts` |
| Core API | `backend/app/api/v1/**` |
| Models | `backend/app/models/*.py` |
| Services | `backend/app/services/*.py` |

## Code Quality

```bash
# Frontend
npm run lint

# Backend
ruff format . && ruff check . && mypy app
```

## Git Workflow

```bash
# Create branch
git checkout -b feature/<scope>/<name>

# Commit (Conventional Commits)
git commit -m "feat(be): add /v1/meals endpoint"

# Push
git push -u origin feature/<scope>/<name>
```

**PR Requirements**: Title follows Conventional Commits, 1 reviewer approval, CI passes.

## Team Members

- 24521750 — Nguyen Do Ngoc Huyen Thuong
- 24521829 — Hoang Xuan Minh Tri
- 24521120 — Nguyen Van Nam
- 24520229 — Tra Chi Chung

## Documentation

- [Project Overview + PDR](./docs/project-overview-pdr.md)
- [Codebase Summary](./docs/codebase-summary.md)
- [Code Standards](./docs/code-standards.md)
- [System Architecture](./docs/system-architecture.md)
- [Project Roadmap](./docs/project-roadmap.md)
- [Folder Convention](./docs/standards/folder-convention.md)
- [API Conventions](./docs/standards/api-conventions.md)

## Conventions

| Type | Convention | Example |
|------|------------|---------|
| Python modules | snake_case | `health_metrics.py` |
| Python classes | PascalCase | `HealthMetric` |
| React components | PascalCase | `ProfileForm.tsx` |
| React hooks | use prefix | `useHealthData.ts` |
| API paths | kebab-case | `/api/v1/health-data` |
| DB tables | snake_case plural | `health_metrics` |
| Env vars | UPPER_SNAKE | `DATABASE_URL` |
| Event names | `<domain>.<action>` | `meal.analyzed` |
