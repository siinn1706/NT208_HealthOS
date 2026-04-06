"""Celery application and tasks."""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "healthos",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
    include=["app.tasks.meal_analysis"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Expire task results after 1 hour to prevent unbounded Redis growth
    result_expires=3600,
)

celery_app.conf.update(
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
)
