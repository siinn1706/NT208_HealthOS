# Contributing to HealthOS

Cảm ơn bạn đã đóng góp! Vui lòng đọc kỹ hướng dẫn này trước khi bắt đầu.

---

## Trước khi code

1. **Đọc tài liệu chuẩn** (bắt buộc):
   - [Folder Convention](docs/standards/folder-convention.md)
   - [Code Style](docs/standards/code-style.md)
   - [API Conventions](docs/standards/api-conventions.md)
   - [Git Workflow](docs/standards/git-workflow.md)

2. **Setup môi trường local**:
   ```bash
   .\infra\scripts\setup.ps1     # Windows
   bash infra/scripts/setup.sh   # Unix/WSL
   ```

3. **Tạo branch** từ `develop` (không bao giờ commit thẳng vào `main`):
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/<scope>/<name>
   # vd: feature/be/meal-api, feature/fe/nutrition-chart
   ```

---

## Quy tắc bắt buộc

### Frontend & BFF

- **FE không gọi thẳng Core BE.** Mọi request đi qua BFF (`/api/v1/**`).
- Thêm endpoint BFF → cập nhật `contracts/openapi/bff-api.yaml`.
- Thêm types → vào `frontend/src/types/api.ts`.
- Component đặt đúng folder theo [Folder Convention](docs/standards/folder-convention.md).

### Backend (Core BE)

- Endpoint nằm trong `backend/app/api/v1/endpoints/`.
- Logic nghiệp vụ trong `backend/app/services/`, không trong endpoint.
- Mọi config đọc qua `backend/app/core/config.py` (pydantic-settings).
- Thêm endpoint → cập nhật `contracts/openapi/core-api.yaml`.

### Services (Workers)

- Task Celery nằm trong `services/queue-worker/app/tasks/`.
- Task không block lâu — nếu cần gọi AI → forward tới AI Worker qua HTTP.
- Async event phải follow schema trong `contracts/events/`.

---

## Quy trình PR

1. Tự review checklist trước khi tạo PR:
   - [ ] Code đặt đúng layer/folder
   - [ ] Không hardcode URL, secret, magic number
   - [ ] `contracts/` cập nhật nếu thêm endpoint/event mới
   - [ ] `infra/env/*.env.example` cập nhật nếu thêm biến mới
   - [ ] PR title theo format Conventional Commits

2. Target branch: `develop` (không phải `main`).

3. Cần ít nhất **1 reviewer** approve.

4. Resolve tất cả comment trước khi merge.

---

## Báo lỗi

Tạo GitHub Issue với:
- Mô tả ngắn gọn
- Steps to reproduce
- Expected vs Actual behavior
- Logs (nếu có)

---

## Câu hỏi

Hỏi trong channel team hoặc tạo GitHub Discussion.
