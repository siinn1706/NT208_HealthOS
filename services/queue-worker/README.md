# Queue Worker Service

## Mô tả

Celery workers xử lý async jobs:
- `sync_wearable_data` — gọi Wearable APIs, normalize, upsert vào DB qua Core BE
- `celery beat` — scheduler cho sync định kỳ

**Note:** Meal analysis and notification dispatch have been moved to the Core backend.
- **Meal analysis** runs in `backend/app/tasks/meal_analysis.py` (Celery task in Core BE)
- **Notification dispatch** runs in `backend/app/tasks/notification_dispatch.py` (Celery task in Core BE)
- Old task files (`meal_tasks.py`, `notification_tasks.py`) were deleted from queue-worker service.

## Cấu trúc thư mục

```
app/
├── __init__.py
├── celery_app.py     # Celery app factory (broker, beat_schedule)
├── tasks/
│   ├── __init__.py
│   └── wearable_tasks.py     # sync_wearable_data
├── schemas/
│   └── __init__.py
└── adapters/
    ├── __init__.py
    ├── core_api.py    # HTTP client gọi Core BE
    └── ai_worker.py   # HTTP client gọi AI Worker
```

## Chạy local

```bash
cd services/queue-worker
cp ../../infra/env/worker.env.example .env
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt

# Run worker
celery -A app.celery_app worker --loglevel=info

# Run beat scheduler (cần chạy riêng)
celery -A app.celery_app beat --loglevel=info
```
