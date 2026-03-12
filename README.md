# NT208_HealthOS

## Giới thiệu
HealthOS là hệ thống “bác sĩ cá nhân ảo” giúp bảo vệ sức khỏe: quản lý hồ sơ y tế, nhật ký dinh dưỡng, phân tích ảnh bữa ăn, kết nối wearable và cảnh báo realtime.

### Thành viên (Nhóm 3)
- 24521750 — Nguyễn Đỗ Ngọc Huyền Thương
- 24521829 — Hoàng Xuân Minh Trí
- 24521120 — Nguyễn Văn Nam
- 24520229 — Trà Chí Chung

## Cấu trúc repo

```
NT208_HealthOS/
├── frontend/          # FE + BFF  (Next.js App Router + Route Handlers /api/v1/**)
├── backend/           # Core BE   (FastAPI — layered architecture)
├── services/
│   ├── ai-worker/     # AI Service (food recognition, nutrition estimation)
│   ├── queue-worker/  # Celery workers (async jobs, wearable sync, notifications)
│   └── notification/  # Notification dispatcher (email, push, SMS)
├── contracts/
│   ├── openapi/       # OpenAPI 3.1 specs (core-api.yaml, bff-api.yaml)
│   └── events/        # JSON Schema cho async events
├── infra/
│   ├── docker/        # docker-compose.dev.yml
│   ├── env/           # .env.example files cho từng service
│   └── scripts/       # setup.ps1, setup.sh
├── tests/
│   ├── integration/   # pytest — test HTTP endpoints thật
│   ├── contract/      # schemathesis — validate vs OpenAPI spec
│   └── e2e/           # playwright
├── docs/
│   ├── architecture/  # System context, container diagram, data flow
│   ├── standards/     # Folder convention, code style, API conventions, git workflow
│   └── migration/     # Script & path migration guide
└── scratch/           # Tooling/prompts nội bộ (non-runtime)
```

**Tài liệu chuẩn bắt buộc đọc trước khi code:**
- [Folder Convention](docs/standards/folder-convention.md)
- [Code Style](docs/standards/code-style.md)
- [API Conventions](docs/standards/api-conventions.md)
- [Git Workflow](docs/standards/git-workflow.md)

## Hướng dẫn sử dụng GitHub

### Clone repository
```bash
git clone <repo_url>
cd NT208_HealthOS
```

### Tạo branch mới và chuyển branch
```bash
git checkout -b feature/<ten-branch>
```

### Chuyển branch
```bash
git checkout main
```

### Commit và đẩy lên remote
```bash
git add .
git commit -m "<noi_dung_commit>"
git push -u origin feature/<ten-branch>
```

## Công nghệ sử dụng

| Lớp | Stack | Ghi chú |
|-----|-------|---------|
| FE | Next.js 16 App Router + React 19 | UI, i18n (next-intl), SSR/SSG |
| BFF | Next.js Route Handlers `/api/v1/**` | Bắt buộc — proxy auth, aggregate payload |
| Core BE | FastAPI + SQLAlchemy async | REST + WebSocket, layered architecture |
| AI Worker | FastAPI + background tasks | Food recognition, nutrition estimation |
| Queue | Celery + Redis broker | Async jobs: ảnh, sync wearable, notify |
| Database | PostgreSQL 16 + asyncpg | ORM: SQLAlchemy 2 |
| Cache | Redis 7 | Cache, pub/sub, rate-limit |
| Storage | MinIO (local) / S3 (prod) | Ảnh bữa ăn, tài liệu y tế |
| Auth | NextAuth (Auth.js) planned | OAuth/OIDC — TODO |
| Infra | Docker Compose | Local dev stack |

## Quick Start

### Option A — Full stack với Docker (khuyến nghị)

```bash
# 1. Setup env files
.\infra\scripts\setup.ps1          # Windows
bash infra/scripts/setup.sh        # Unix/WSL

# 2. Khởi động toàn bộ stack
docker compose -f infra/docker/docker-compose.dev.yml up
```

> Dữ liệu PostgreSQL được lưu qua Docker volume `postgres_data`. Không dùng `docker compose down -v` nếu muốn giữ dữ liệu.

Services sẽ chạy tại:
| Service | URL |
|---------|-----|
| Frontend + BFF | http://localhost:3000 |
| Core BE API | http://localhost:8000/docs |
| AI Worker | http://localhost:8001/docs |
| MinIO Console | http://localhost:9001 |

### Quản lý Database (Docker)

```powershell
# Trạng thái DB + volume
.\infra\scripts\db.ps1 -Action status

# Start/Stop postgres (không xoá dữ liệu)
.\infra\scripts\db.ps1 -Action up
.\infra\scripts\db.ps1 -Action stop

# Vào psql và liệt kê bảng
.\infra\scripts\db.ps1 -Action psql
.\infra\scripts\db.ps1 -Action tables

# Chạy migration
.\infra\scripts\db.ps1 -Action migrate

# Backup (tạo file .sql trong infra/backups)
.\infra\scripts\db.ps1 -Action dump

# Restore từ file backup
.\infra\scripts\db.ps1 -Action restore -FilePath .\infra\backups\healthos_YYYYMMDD_HHMMSS.sql
```

Nếu bạn chạy PostgreSQL local service (không dùng Docker), thêm `-Mode local`:

```powershell
.\infra\scripts\db.ps1 -Action status -Mode local
.\infra\scripts\db.ps1 -Action psql -Mode local
.\infra\scripts\db.ps1 -Action dump -Mode local
.\infra\scripts\db.ps1 -Action restore -Mode local -FilePath .\infra\backups\healthos_YYYYMMDD_HHMMSS.sql
```

Lệnh truy cập trực tiếp (không qua script):

```powershell
docker compose -f infra/docker/docker-compose.dev.yml exec postgres psql -U healthos -d healthos
```

---

### Option B — Chạy thủ công từng service (như cũ)

#### Frontend (Next.js)
```bash
start_FE.bat             # Windows (legacy)
# hoặc:
cd frontend && npm ci && npm run dev
```

#### Backend (FastAPI)
```bash
start_BE.bat             # Windows (legacy)
# hoặc:
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1    # Windows
# source .venv/bin/activate   # Unix
.\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

#### Chạy FE + BE cùng lúc
```bash
start_ALL.bat
```

> **Migration note:** Script `.bat` cũ vẫn hoạt động. Xem [migration guide](docs/migration/script-and-path-mapping.md) để biết lộ trình chuyển sang scripts mới.

---

## Chạy Frontend (Next.js)

### Cách 1: Sử dụng file .bat (Windows)
```bash
start_FE.bat
```

### Cách 2: Chạy thủ công
```bash
cd frontend
npm ci
npm run dev
```

### Chạy nhiều client (testing)
```bash
start_client_1.bat  # Chạy trên port 3001
start_client_2.bat  # Chạy trên port 3002
```

## Chạy Backend (FastAPI)

### Cách 1: Sử dụng file .bat (Windows)
```bash
start_BE.bat
```

### Cách 2: Chạy thủ công
```bash
cd backend
python -m venv .venv
```

#### Kích hoạt môi trường ảo
Windows (PowerShell):
```bash
.venv\Scripts\Activate.ps1
```

macOS/Linux:
```bash
source .venv/bin/activate
```

#### Cài dependencies và chạy server
```bash
.\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Chạy cả FE và BE cùng lúc
```bash
start_ALL.bat
```
## Unified Start Command

Use the orchestrator for consistent team startup:

```bash
.\start_ALL.bat
# or
.\infra\scripts\start_all.ps1 -Mode auto -Only all
```
