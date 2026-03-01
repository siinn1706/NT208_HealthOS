# HealthOS — Folder Convention

> **Đây là tài liệu chuẩn bắt buộc.** Mọi PR phải tuân thủ cấu trúc này. Reviewer có quyền reject nếu file đặt sai vị trí.

---

## Cấu trúc repo tổng thể (Phase 1 — Hybrid)

```
NT208_HealthOS/
│
├── frontend/                  # FE + BFF (Next.js App Router)
├── backend/                   # Core BE (FastAPI)
├── services/
│   ├── ai-worker/             # AI Service (FastAPI worker)
│   ├── queue-worker/          # Celery workers
│   └── notification/          # Notification dispatcher
│
├── contracts/
│   ├── openapi/               # OpenAPI YAML cho Core BE và BFF
│   └── events/                # JSON Schema cho async events
│
├── infra/
│   ├── docker/                # docker-compose files
│   ├── env/                   # .env.example files
│   └── scripts/               # helper scripts (setup, seed, …)
│
├── tests/
│   ├── integration/           # Test tích hợp API thật
│   ├── contract/              # Consumer-driven contract tests
│   └── e2e/                   # End-to-end browser tests
│
├── docs/
│   ├── architecture/          # Context, container, data-flow diagrams
│   ├── standards/             # Convention, code-style, git-workflow
│   └── migration/             # Script + path migration guides
│
├── scratch/                   # Tooling/prompts nội bộ (non-runtime)
├── README.md
└── CONTRIBUTING.md
```

---

## frontend/ — Next.js App Router

```
frontend/src/
│
├── app/
│   ├── layout.tsx             # Root layout (fonts, providers)
│   ├── page.tsx               # Root redirect → /[locale]
│   ├── globals.css
│   │
│   ├── [locale]/              # i18n wrapper (next-intl)
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing
│   │   ├── about/
│   │   ├── articles/
│   │   ├── plans/
│   │   └── services/
│   │
│   └── api/                   # ★ BFF — Route Handlers (bắt buộc)
│       └── v1/
│           ├── health/route.ts
│           ├── auth/
│           │   ├── route.ts
│           │   └── [...nextauth]/route.ts
│           ├── users/route.ts
│           ├── plans/route.ts
│           ├── health-data/route.ts
│           ├── devices/route.ts
│           └── notifications/route.ts
│
├── components/
│   ├── layout/                # Navbar, Footer, …
│   ├── shared/                # ArticleCard, PlanCard, …
│   └── ui/                   # shadcn/ui primitives (đừng sửa tay)
│
├── data/                      # Static/mock data dùng khi chưa có API thật
│   # Khi có API thật → xoá file, di chuyển sang hook hoặc server component
│
├── hooks/                     # Custom React hooks
│   # Quy tắc: tên bắt đầu bằng "use", ví dụ useHealthData.ts
│
├── lib/
│   ├── utils.ts               # cn(), formatDate(), …
│   └── api-client.ts          # fetch helper gọi BFF (dành cho client component)
│
├── i18n/
│   ├── routing.ts
│   └── request.ts
│
├── navigation.ts              # typed navigation helpers
├── middleware.ts              # i18n middleware
│
└── types/
    ├── index.ts               # Domain types dùng chung (FE)
    └── api.ts                 # DTO types cho BFF responses
```

### Quy tắc frontend

| Rule | Mô tả |
|------|--------|
| **BFF bắt buộc** | Page/Component không gọi thẳng `http://localhost:8000`. Luôn qua `/api/v1/**`. |
| **Server Component mặc định** | Chỉ thêm `"use client"` khi thực sự cần (hook, event listener). |
| **Barrel export** | Mỗi thư mục components có `index.ts` re-export, không import sâu 3 cấp. |
| **No magic string** | URL path, locale key, event name → dùng constant hoặc enum trong `types/`. |

---

## backend/ — Core BE (FastAPI)

```
backend/
├── app/
│   ├── main.py                # FastAPI app factory, include routers
│   ├── __init__.py
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py      # APIRouter tổng hợp tất cả endpoints
│   │       └── endpoints/
│   │           ├── health.py
│   │           ├── users.py
│   │           ├── meals.py
│   │           ├── health_metrics.py
│   │           └── plans.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Settings (pydantic-settings, đọc .env)
│   │   └── security.py        # JWT decode/verify, password hash
│   │
│   ├── domain/
│   │   ├── __init__.py
│   │   └── <entity>.py        # Dataclass/entity thuần Python, không import ORM
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── <usecase>.py       # Business logic, orchestrate adapters
│   │
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── database.py        # SQLAlchemy engine + session
│   │   ├── redis_client.py    # Redis connection pool
│   │   └── storage.py        # S3/MinIO client
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── common.py          # Pydantic models (request/response DTOs)
│   │
│   └── ws/
│       ├── __init__.py
│       └── handlers.py        # WebSocket connection manager
│
├── alembic/                   # DB migrations (khi thêm dependency alembic)
├── requirements.txt
└── .env.example → (copy từ infra/env/backend.env.example)
```

### Quy tắc backend

| Rule | Mô tả |
|------|--------|
| **Layered strictly** | `api` → `services` → `domain`. `api` không gọi `adapters` trực tiếp. |
| **Schemas ≠ Domain** | Pydantic schema ở `schemas/`, domain entity ở `domain/`. |
| **Không hardcode config** | Mọi giá trị cấu hình phải qua `core/config.py` (pydantic-settings). |
| **DI thông qua Depends** | Service/adapter inject bằng `Depends()`, không instantiate trong hàm. |
| **Versioning API** | Mọi endpoint đặt trong `api/v1/`. Khi break thay đổi → tạo `api/v2/`. |

---

## services/ — Microservices phụ

Cấu trúc trong mỗi service `services/<name>/` giống `backend/` nhưng thu gọn:

```
services/<name>/
├── app/
│   ├── main.py
│   ├── __init__.py
│   ├── tasks/                 # Celery tasks hoặc background jobs
│   ├── schemas/
│   └── adapters/
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## contracts/ — API Contracts

```
contracts/
├── openapi/
│   ├── core-api.yaml          # OpenAPI 3.1 — Core BE
│   └── bff-api.yaml           # OpenAPI 3.1 — BFF (Next route handlers)
└── events/
    ├── README.md
    └── <event-name>.json      # JSON Schema cho mỗi event async
```

**Quy tắc:** Khi thêm endpoint mới, cập nhật file YAML trước (contract-first), sau đó implement.

---

## infra/ — Infrastructure

```
infra/
├── docker/
│   ├── docker-compose.dev.yml   # Stack local đầy đủ (postgres, redis, minio)
│   └── docker-compose.prod.yml  # Production config
├── env/
│   ├── .env.example             # Tổng hợp tất cả biến
│   ├── frontend.env.example
│   ├── backend.env.example
│   └── worker.env.example
└── scripts/
    ├── setup.ps1               # Windows bootstrap
    └── setup.sh                # Unix bootstrap
```

---

## tests/ — Testing

| Folder | Framework | Mục đích |
|--------|-----------|----------|
| `tests/integration/` | pytest | Test HTTP endpoint thật (ngta DB test) |
| `tests/contract/` | pytest + schemathesis | Validate API response vs OpenAPI spec |
| `tests/e2e/` | playwright | Browser automation |

---

## Naming conventions tóm tắt

| Loại | Convention | Ví dụ |
|------|-----------|--------|
| Component React | PascalCase | `ArticleCard.tsx` |
| Hook React | camelCase, prefix `use` | `useHealthData.ts` |
| Util function | camelCase | `formatDate.ts` |
| Python module | snake_case | `health_metrics.py` |
| Python class | PascalCase | `HealthMetric` |
| Event name | `<domain>.<action>` | `meal.analyzed`, `alert.triggered` |
| API path | kebab-case | `/api/v1/health-data` |
| DB table | snake_case plural | `health_metrics`, `meal_logs` |
| Env var | UPPER_SNAKE | `DATABASE_URL`, `REDIS_URL` |
