# HealthOS — Migration Guide: Script & Path

## Tổng quan

Cấu trúc thư mục đã được chuẩn hoá theo kiến trúc hệ thống. Dưới đây là bản mapping giữa workflow cũ và mới để bạn không bị broken khi cập nhật local.

---

## Mapping script chạy local

| Script cũ | Script mới | Ghi chú |
|-----------|-----------|---------|
| `start_FE.bat` | `infra/scripts/start_fe.ps1` hoặc `cd frontend && npm run dev` | Port 3000, giữ nguyên |
| `start_BE.bat` | `infra/scripts/start_be.ps1` hoặc `cd backend && uvicorn app.main:app --reload` | Port 8000, giữ nguyên |
| `start_ALL.bat` | `docker compose -f infra/docker/docker-compose.dev.yml up` | Khởi động toàn bộ stack |
| `start_client_1.bat` | `cd frontend && PORT=3001 npm run dev` | Testing multi-client |
| `start_client_2.bat` | `cd frontend && PORT=3002 npm run dev` | Testing multi-client |
| _(chưa có)_ | `infra/scripts/start_ai_worker.ps1` | AI Worker port 8001 |
| _(chưa có)_ | `infra/scripts/start_queue_worker.ps1` | Celery worker |

> **Ghi chú:** Script `.bat` cũ vẫn còn hoạt động trong phase 1. Sẽ deprecated ở phase 2.

---

## Mapping đường dẫn thư mục

| Trước | Sau | Ghi chú |
|-------|-----|---------|
| _(không có)_ | `services/ai-worker/` | Service mới |
| _(không có)_ | `services/queue-worker/` | Service mới |
| _(không có)_ | `services/notification/` | Service mới |
| _(không có)_ | `contracts/openapi/` | API contracts |
| _(không có)_ | `infra/docker/` | Docker compose |
| _(không có)_ | `infra/env/` | Env examples |
| _(không có)_ | `tests/` | Test suites |
| _(không có)_ | `docs/` | Tài liệu chuẩn |
| `backend/app/main.py` (monolith) | `backend/app/api/v1/endpoints/` | Đã tách thành layers |
| _(không có)_ | `frontend/src/app/api/v1/` | BFF Route Handlers |
| `frontend/src/data/*.ts` | Dần dần → server components + BFF | Xoá khi có API thật |

---

## Checklist upgrade local cho developer hiện tại

```bash
# 1. Pull code mới
git pull origin develop

# 2. Cập nhật env (nếu có biến mới)
cp infra/env/backend.env.example backend/.env
cp infra/env/frontend.env.example frontend/.env.local

# 3. Cài dependencies (nếu requirements.txt thay đổi)
cd backend && pip install -r requirements.txt

# 4. Chạy lại như bình thường (script cũ vẫn hoạt động)
start_FE.bat
start_BE.bat
```

---

## Lộ trình Phase 2 — Monorepo

Khi workload tăng và team mở rộng, sẽ migration:

```
Phase 2 target:
apps/
  web/        ← từ frontend/
  api-core/   ← từ backend/
  ai-worker/  ← từ services/ai-worker/
  queue/      ← từ services/queue-worker/
packages/
  contracts/  ← từ contracts/
  shared-types/
  config/
infra/        ← giữ nguyên
docs/         ← giữ nguyên
tests/        ← giữ nguyên
```

Migration guide chi tiết sẽ viết khi bắt đầu Phase 2.

---

## Deprecation timeline

| Item | Deprecated | Removed |
|------|-----------|---------|
| `start_*.bat` (root) | Phase 2 start | Phase 2 end |
| `frontend/src/data/*.ts` mock | Khi endpoint tương ứng live | Sprint sau khi endpoint live |
