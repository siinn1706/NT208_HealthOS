"""Notification dispatch Celery tasks."""
from app.celery_app import celery_app


@celery_app.task(name="app.tasks.notification_tasks.send_notification")
def send_notification(event: dict) -> dict:
    """
    Dispatch a notification.requested event to the appropriate channel.

    event: matches contracts/events/notification-requested.json schema

    TODO:
      1. Validate event schema
      2. Route by channel: email → SMTP, push → Firebase, sms → SMS gateway
      3. Record delivery status back to Core BE
    """
    raise NotImplementedError("send_notification not yet implemented")
