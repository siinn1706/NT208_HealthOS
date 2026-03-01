"""Queue Worker — Celery application factory."""
from celery import Celery
import os

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/2")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

celery_app = Celery(
    "healthos_worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.meal_tasks",
        "app.tasks.wearable_tasks",
        "app.tasks.notification_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Beat schedule — periodic tasks
    beat_schedule={
        "sync-wearable-every-15-min": {
            "task": "app.tasks.wearable_tasks.sync_all_users_wearable",
            "schedule": 900.0,  # seconds
        },
    },
)
