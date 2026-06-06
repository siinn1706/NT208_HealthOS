"""GET /api/v1/ws/smoke-ticket — mint a short-lived ws_ticket for smoke tests.

Gated by X-Smoke-Secret header matching WS_SMOKE_SECRET.
The ws-corebe-smoke script uses this to run an auth-success probe that
exercises the full single-accept path through ConnectionManager.connect().
"""
from datetime import timedelta

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.core.security import create_ws_ticket

router = APIRouter(tags=["internal"])


@router.get("/api/v1/ws/smoke-ticket")
async def smoke_ticket(x_smoke_secret: str = Header(...)):
    if not settings.ws_smoke_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="smoke endpoint not configured")
    if x_smoke_secret != settings.ws_smoke_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invalid smoke secret")
    # Mint a ws_ticket valid for 30s — long enough for the smoke probe to connect
    ticket = create_ws_ticket(subject="00000000-0000-0000-0000-000000000000", expires_seconds=30)
    return {"ticket": ticket}
