# NT208_HealthOS

## Giới thiệu
HealthOS là hệ thống “bác sĩ cá nhân ảo” giúp bảo vệ sức khỏe: quản lý hồ sơ y tế, nhật ký dinh dưỡng, phân tích ảnh bữa ăn, kết nối wearable và cảnh báo realtime.

### Thành viên (Nhóm 3)
- 24521750 — Nguyễn Đỗ Ngọc Huyền Thương
- 24521829 — Hoàng Xuân Minh Trí
- 24521120 — Nguyễn Văn Nam
- 24520229 — Trà Chí Chung

## Cấu trúc repo
- `frontend/`: FE (Next.js, App Router)
- `backend/`: BE (FastAPI)

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
- FE: Next.js (App Router)
	- Login/portal, dashboard, chat UI, trang báo cáo
	- Gọi HTTP API + subscribe realtime (WS)
- BFF (tuỳ chọn): Next.js Route Handlers để gom API nhẹ, proxy auth, gọi nhiều service rồi trả về 1 payload cho FE (đỡ CORS/đỡ lộ key)
- Core BE: FastAPI
	- REST cho hồ sơ, nhật ký, ảnh bữa ăn, khuyến nghị
	- WebSocket cho cảnh báo realtime/stream trạng thái
- AI service (tách riêng càng tốt): FastAPI worker / background job
	- OCR / nhận diện món ăn / ước lượng dinh dưỡng / rule-based cảnh báo
- Data: PostgreSQL + object storage (ảnh) + Redis (cache/pubsub)
- Queue/Worker: Celery/RQ/Dramatiq để xử lý ảnh, batch đồng bộ wearable, gửi notify (đỡ nghẽn request)

## Chạy Frontend (Next.js)

### Cách 1: Sử dụng file .bat (Windows)
```bash
start_FE.bat
```

### Cách 2: Chạy thủ công
```bash
cd frontend
npm install
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
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Chạy cả FE và BE cùng lúc
```bash
start_ALL.bat
```