# Queue Worker Service

## Mô tả

Celery workers xử lý async jobs:
- `process_meal_image` — trigger AI Worker để phân tích ảnh, cập nhật kết quả về Core BE
- `sync_wearable_data` — gọi Wearable APIs, normalize, upsert vào DB qua Core BE
- `send_notification` — forward notification.requested event tới Notification service
- `celery beat` — scheduler cho sync định kỳ

## Cấu trúc thư mục

```
app/
├── __init__.py
├── celery_app.py     # Celery app factory (broker, beat_schedule)
├── tasks/
│   ├── __init__.py
│   ├── meal_tasks.py         # process_meal_image
│   ├── wearable_tasks.py     # sync_wearable_data
│   └── notification_tasks.py # send_notification
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
