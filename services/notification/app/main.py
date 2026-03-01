"""Notification Service — FastAPI application."""
from fastapi import FastAPI

app = FastAPI(title="HealthOS Notification Service", version="0.1.0")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "notification"}


@app.post("/dispatch")
async def dispatch(event: dict) -> dict:
    """
    Dispatch a notification event directly (alternative to Celery task).
    Validates against contracts/events/notification-requested.json schema.

    TODO:
      1. Validate event envelope & payload
      2. Route by channel (email/push/sms/in_app)
      3. Call corresponding provider adapter
      4. Return delivery status
    """
    return {"status": "queued", "event_id": event.get("metadata", {}).get("event_id")}
