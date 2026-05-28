<div align="center">

<h1>NT208_HealthOS</h1>

<p><strong>Bác Sĩ Cá Nhân Ảo</strong></p>

<p>Nền tảng quản lý sức khỏe với Web/BFF, Core API, worker, ứng dụng di động và các dịch vụ dữ liệu.</p>

<p>
  <a href="./README.md">
    <img alt="README tiếng Anh" src="https://img.shields.io/badge/Language-English-2563EB?style=for-the-badge" />
  </a>
  <a href="./README.vi.md">
    <img alt="README tiếng Việt" src="https://img.shields.io/badge/Language-Tieng_Viet-DC2626?style=for-the-badge" />
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

## Công Nghệ Sử Dụng

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Frontend + BFF | Next.js 16, React 19, TypeScript, Tailwind CSS 4, next-intl 4 | BFF Route Handlers nằm dưới `/api/v1/**`; traffic từ trình duyệt đi vào đây |
| Core API | FastAPI, Python 3.12, SQLAlchemy async, Alembic | Router prefix `/v1`; mã trình duyệt không gọi trực tiếp |
| Mobile | Expo SDK 53, React Native 0.79, Expo Router 5, TypeScript | Bề mặt ứng dụng native với entry Expo Router riêng |
| Database | PostgreSQL 16 + asyncpg | Dữ liệu bền vững chính của Core |
| Cache + Queue | Redis 7 + Celery 5 | Cache, rate limit, broker và job bất đồng bộ |
| Storage | MinIO / S3-compatible | Object storage cho phát triển cục bộ và triển khai kiểu S3 |
| Workers | AI Worker (8001), Notification (8002), Queue Worker | Queue worker chạy từ backend; profile `queue-worker-service` tùy chọn trong dev |
| Infra + Dev | Docker Compose | Điều phối hạ tầng cục bộ |
| Testing + Quality | Vitest, Playwright, Pytest, Jest | Unit frontend, E2E, backend và mobile test surfaces |

## Kiến Trúc (Quy Tắc Quan Trọng)

> Mã chạy trong trình duyệt phải gọi Next.js BFF tại `/api/v1/**`. Không được gọi trực tiếp Core API tại `/v1/**`.

```text
Browser -> Next.js BFF (/api/v1/**) -> Core API (/v1/**) -> PostgreSQL / Redis / MinIO
```

- Đường dẫn bắt buộc cho browser: `frontend/src/app/api/v1/**/route.ts`
- BFF proxy helper: `frontend/src/lib/core-api-proxy.ts`
- Core router: `backend/app/api/v1/router.py`

## Khởi Động Nhanh

### Yêu cầu
- Python 3.12 (xem `.python-version`)
- Node.js 20 (xem `.nvmrc`)
- Docker Desktop (cho các dịch vụ hạ tầng)

### Thiết lập lần đầu (chạy một lần sau khi clone)

```powershell
# Windows PowerShell
.\infra\scripts\setup.ps1
```

```bash
# Linux / macOS / WSL
bash infra/scripts/setup.sh
```

Lệnh này copy các file env example, tải model AI YOLO từ Google Drive, cài npm deps, tạo Python venv, cài pip deps và chạy DB migrations.

Bỏ qua bước tải model nếu cần:

```powershell
.\infra\scripts\setup.ps1 -skipModelDownload
```

```bash
bash infra/scripts/setup.sh --skip-model-download
```

Tải model thủ công:

```powershell
.\infra\scripts\download-ai-model.ps1 -EnvFile .\services\ai-worker\.env
```

```bash
bash infra/scripts/download-ai-model.sh --env-file ./services/ai-worker/.env
```

### Tạo Admin Kiểm Thử (Tùy Chọn)

Tạo user admin ban đầu để kiểm thử (chạy sau setup):

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
$env:SEED_ADMIN_PASSWORD="change-me"
$env:SEED_ADMIN_DISPLAY_NAME="Admin Test"
.\.venv\Scripts\python.exe seed_admin.py
```

Script đọc `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` và
`SEED_ADMIN_DISPLAY_NAME`. `SEED_ADMIN_PASSWORD` là bắt buộc và không bao giờ
được in ra. Để xóa cùng tài khoản seed đó:

```powershell
cd backend
$env:SEED_ADMIN_EMAIL="admin@healthos.local"
.\.venv\Scripts\python.exe delete_seed_admin.py --confirm
```

### Tùy chọn A: Docker (khuyến nghị)

```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

### Tùy chọn B: Local (mỗi lệnh ở một terminal riêng)

```bash
.\start_infra.bat        # Postgres, Redis, MinIO
.\start_BE.bat           # FastAPI backend
.\start_FE.bat           # Next.js frontend
.\start_ai_worker.bat    # AI worker (optional)
```

### Thủ công (chỉ các dịch vụ lõi)

```bash
cd frontend && npm ci && npm run dev
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## URL Dịch Vụ Cục Bộ

| Dịch vụ | URL |
|---|---|
| Frontend + BFF | http://localhost:3000 |
| Tài liệu Core BE | http://localhost:8000/docs |
| Tài liệu AI Worker | http://localhost:8001/docs |
| Notification health | http://localhost:8002/health |
| MinIO API / Console | http://localhost:9000 / http://localhost:9001 |

## Môi Trường (Frontend)

Dùng `infra/env/frontend.env.example` làm nguồn chuẩn.
Setup script tự động copy file này thành `frontend/.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
CORE_API_URL=http://localhost:8000
NEXT_PUBLIC_CORE_WS_URL=ws://localhost:8000
ALLOWED_DEV_ORIGINS=localhost,127.0.0.1,healthos-dev.example.com
BFF_SHARED_SECRET=dev-bff-secret-change-in-production
```

Không dùng `NEXT_PUBLIC_API_URL` cho các lời gọi browser-to-core.
Giữ `BFF_SHARED_SECRET` chỉ ở phía server và không bao giờ expose qua `NEXT_PUBLIC_*`.

### Kiểm Thử OAuth Công Khai Qua Cloudflare Tunnel

- Thiết lập ưu tiên là một Cloudflare tunnel đặt tên ổn định. BFF hiện suy ra origin callback OAuth từ forwarded/request headers, nên flow bắt đầu từ `https://<stable-tunnel>` sẽ quay lại đúng public origin đó thay vì rơi về localhost.
- Giữ `OAUTH_GOOGLE_CALLBACK_URL` và `OAUTH_GITHUB_CALLBACK_URL` làm giá trị fallback cho phát triển cục bộ. Chúng không còn là nguồn duy nhất để tạo callback.
- Các entry `ALLOWED_DEV_ORIGINS` phải là hostname hoặc wildcard hostname, không phải URL đầy đủ. Ví dụ: `localhost,127.0.0.1,healthos-dev.example.com`.
- Nếu tạm dùng URL xoay vòng `trycloudflare.com`, thêm `*.trycloudflare.com` vào `ALLOWED_DEV_ORIGINS` để Next.js chấp nhận traffic HMR `/_next/*` trong dev. Điều này chỉ ảnh hưởng guard dev-origin của Next; OAuth providers vẫn yêu cầu callback URL chính xác.
- Để test chat WebSocket qua cùng frontend tunnel, đặt `NEXT_PUBLIC_CORE_WS_URL=wss://<tunnel-host>` rồi restart `npm run dev`; dev proxy của frontend sẽ chuyển tiếp WebSocket upgrade `/ws` và `/v1/**` sang `CORE_API_URL`.
- Đăng ký cả localhost và stable tunnel callback URI trong Google Cloud Console và GitHub OAuth App settings:
  - `http://localhost:3000/api/v1/auth/oauth/google/callback`
  - `https://<stable-tunnel>/api/v1/auth/oauth/google/callback`
  - `http://localhost:3000/api/v1/auth/oauth/github/callback`
  - `https://<stable-tunnel>/api/v1/auth/oauth/github/callback`
- URL xoay vòng `trycloudflare.com` vẫn chỉ phù hợp làm mục tiêu kiểm thử ad-hoc. Khi hostname đổi, cập nhật provider redirect URI trước khi kiểm thử lại.

## Cách Thành Viên Chạy Dự Án

1. Clone repo
2. Chạy `.\infra\scripts\setup.ps1` (Windows) hoặc `bash infra/scripts/setup.sh` (Linux/macOS)
3. Khởi động Docker Desktop
4. Chạy `docker compose -f infra/docker/docker-compose.dev.yml up -d`
5. Mở http://localhost:3000

**Chạy không dùng Docker:**
1. Chạy setup script (bước 2 ở trên)
2. Đảm bảo Postgres, Redis, MinIO đang chạy local với port khớp `backend/.env`
3. Mở các terminal riêng và chạy: `.\start_infra.bat`, `.\start_BE.bat`, `.\start_FE.bat`

**Khởi động có điều phối (`start_ALL.bat`):**
- `.\start_ALL.bat` chọn **Docker** khi Docker Desktop đang chạy, nếu không sẽ chọn mode **local** (Postgres/Redis/MinIO trên host).
- Override bằng `-Mode docker` hoặc `-Mode local` (cũng được hỗ trợ bởi `.\start_infra.bat`).
- Chỉ preflight (không mở terminal mới / không chạy `docker compose up`): `.\start_ALL.bat -CheckOnly`
- Các launcher `.bat` ở root forward một tập giới hạn extra flags qua `cmd` (`%3`-`9`). Các flag thông thường vẫn phù hợp; với danh sách argument tùy chỉnh dài, chạy script tương ứng trong `infra\scripts\` trực tiếp bằng PowerShell.

**Kiểm thử multi-client (frontend bổ sung):**
- `.\start_client_1.bat` - Next.js trên **http://localhost:3001** (log nằm trong `infra/logs/client_*.log`).
- `.\start_client_2.bat` - Next.js trên **http://localhost:3002**.
- Đảm bảo `ALLOWED_ORIGINS` trong `backend/.env` có thêm origin bổ sung (script sẽ in nhắc nhở CORS).

**Lỗi thường gặp:**
- Lỗi CORS -> Kiểm tra `ALLOWED_ORIGINS` trong `backend/.env` là JSON array: `["http://localhost:3000"]`
- Lỗi import -> Xác minh Python version khớp 3.12 (xem `.python-version`)
- Lỗi npm -> Xác minh Node version khớp 20 (xem `.nvmrc`)
- Thiếu env key sau khi pull -> Chạy `.\check_env.bat` (xem tooling Phase 8)
- DB cũ / migrations lỗi -> Chạy `.\reset_docker.bat` rồi `.\start_ALL.bat`
- Service khởi động lỗi -> Chạy `.\start_ALL.bat -CheckOnly` và đọc log được báo trong `infra/logs/`

## Trạng Thái Hiện Tại

HealthOS là dự án full-stack định hướng demo với các bề mặt web, Core API, worker và native mobile tách riêng.

- **Web**: Traffic trình duyệt đi qua Next.js BFF dưới `/api/v1/**`; Core vẫn là target `/v1/**` phía server.
- **Core backend**: FastAPI cung cấp auth, profile/dashboard, meals, reports, appointments, reminders, medications, plans, onboarding drafts, chat/WebSocket, devices, notification list/read/unread routes và audit/security flows.
- **Workers/services**: AI meal analysis hoạt động khi Core, MinIO và AI worker được cấu hình. Notification dispatch hỗ trợ Core in-app persistence và SMTP email tùy chọn qua standalone notification service.
- **Mobile**: Ứng dụng Expo gọi trực tiếp Core bằng bearer-token auth và dùng shared API contracts khi có.

## Giới Hạn Đã Biết

- Mã trình duyệt không được gọi trực tiếp Core `/v1/**`; hãy dùng BFF `/api/v1/**`.
- Push notifications và SMS providers chưa được cấu hình.
- WebSocket presence vẫn là single-process/in-memory.
- Wearable sync nằm ngoài phạm vi demo và đang được stub trong worker surface.
- Một số native mobile UI affordances là workflow một phần, chưa phải flow hoàn chỉnh cho production.
- Tài liệu này không khẳng định toàn bộ build hoặc test global đang sạch; hãy chạy các script phù hợp với surface bạn đang thay đổi.

## Quy Trình CI/CD

GitHub Actions workflows (`.github/workflows/`):
- `ci-smoke.yml` - kiểm tra smoke cho PR vào `dev` và `main`
- `release.yml` - semantic-release khi push vào `main`
- `release-beta.yml` - semantic-release khi push vào `dev`
- `branch-protection.yml` - chặn PR vào `main` nếu source không phải `dev` hoặc `hotfix*`
- `sync-main-to-dev.yml` - merge `main` vào `dev` sau release commits
- `sync-dev-after-release.yml` - hard-reset `dev` về `origin/main` sau release commits (force push)

**Lưu ý:** Release config là dynamic (`.releaserc.cjs`). Xác minh deployment platform và artifact targets trước lần chạy production đầu tiên.

Xem [Deployment Guide](./docs/deployment-guide.md) để thiết lập workflow, các khoảng trống monitoring/checklist và troubleshooting.
Xem [Production Checklist](./docs/production-checklist.md) để biết các env vars bắt buộc trước khi deploy.

## Quy Trình Git

- **Base/release branch:** `main` (production releases)
- **Development branch:** CI/protection/release-beta workflows kỳ vọng `dev`
- **Feature branches:** `feature/<scope>/<name>`, `fix/<scope>/<name>`, `docs/<name>`
- **PR targets:** feature/fix -> `dev`; release/hotfix flow -> `main` (branch protection bắt buộc source)
- **Commits:** Bắt buộc Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, v.v.)

## Tài Liệu

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
