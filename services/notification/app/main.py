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

    Validates against contracts/events/notification-requested.json schema.
    Idempotency: not guaranteed — producers must not re-publish the same event_id.
    """
    try:
        result = dispatch(event)
    except EnvelopeValidationError as exc:
        event_id = (event.get("metadata") or {}).get("event_id")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_ENVELOPE", "message": "Invalid event envelope.", "event_id": event_id},
        ) from None
    return result.to_dict()
