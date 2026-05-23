"""Notification Service — FastAPI application."""
from fastapi import FastAPI, HTTPException, status

from app.notification_dispatch_core import EnvelopeValidationError, dispatch

app = FastAPI(title="HealthOS Notification Service", version="0.1.0")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "notification"}


@app.post("/dispatch")
async def dispatch_endpoint(event: dict) -> dict:
    """Dispatch a notification event.

    Accepts either the notification.requested envelope or the demo-friendly
    flat shape with event_id, recipient/user id, title/body/message, and
    channel(s). Idempotency is not guaranteed.
    """
    try:
        result = dispatch(event)
    except EnvelopeValidationError as exc:
        event_id = event.get("event_id") or (event.get("metadata") or {}).get("event_id")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_ENVELOPE",
                "message": "Invalid notification payload.",
                "event_id": event_id,
                "reason": str(exc),
            },
        ) from None
    return result.to_dict()
