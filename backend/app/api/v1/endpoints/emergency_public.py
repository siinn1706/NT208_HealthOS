"""Emergency Health Card — PUBLIC, UNAUTHENTICATED endpoint.

This module deliberately lives in its own file (not co-located with the
owner-side `emergency.py`) so that any reviewer immediately spots the
"this route does NOT call get_current_user" boundary. Adding additional
unauthenticated endpoints to this file is fine; mixing them into
`emergency.py` is not.

Failure-mode policy: every "you cannot see this card" reason returns the
**same** `410 Gone` so an attacker probing tokens cannot distinguish
"never existed" from "revoked yesterday" from "user soft-deleted".
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.models.audit import AuditEventTypeEnum
from app.models.core import NotificationKindEnum
from app.schemas.common import ErrorResponse
from app.schemas.emergency import (
    PublicEmergencyCardDTO,
    PublicEmergencyCardResponse,
)
from app.services import emergency_profile as emergency_svc
from app.services import notifications as notif_svc
from app.services.emergency_profile import TOKEN_SANITY_CAP_READS
from app.services.security_logging import log_security_event

logger = logging.getLogger(__name__)


# Per-IP rate limit: at most 30 reads per 5 minutes per truncated IP.
# Tuned to allow a single ER team to scan the same QR several times in a
# row (re-checks at handover) while shutting down enumeration scrapers.
_RATE_LIMIT_KEY = "rl:emerg:public:{ip}"
_RATE_LIMIT_MAX = 30
_RATE_LIMIT_WINDOW_S = 5 * 60


router = APIRouter(prefix="/public/emergency", tags=["Emergency Card (Public)"])


async def _enforce_public_rate_limit(redis: Redis, ip_truncated: str) -> None:
    key = _RATE_LIMIT_KEY.format(ip=ip_truncated)
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, _RATE_LIMIT_WINDOW_S)
    if current > _RATE_LIMIT_MAX:
        ttl = await redis.ttl(key)
        retry_after = max(60, int(ttl) if ttl and ttl > 0 else _RATE_LIMIT_WINDOW_S)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMITED",
                "message": "Too many requests. Please slow down.",
                "details": {"retry_after_s": retry_after},
            },
            headers={"Retry-After": str(retry_after)},
        )


def _gone() -> HTTPException:
    """Single canonical 410 response. Generic message — never identifies the
    card owner, never differentiates revoked from missing.
    """
    return HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "code": "EMERGENCY_CARD_UNAVAILABLE",
            "message": (
                "This emergency card is no longer active. Please contact the "
                "patient or use other identification."
            ),
        },
    )


def _set_privacy_headers(response: Response) -> None:
    """Common cache + crawler hygiene for the public route."""
    response.headers["Cache-Control"] = "private, no-store, max-age=0"
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    # Redundant with the global middleware but explicit at the route level
    # so refactors of `main.py` cannot accidentally weaken this surface.
    response.headers["X-Content-Type-Options"] = "nosniff"


@router.get(
    "/{token}",
    response_model=PublicEmergencyCardResponse,
    responses={
        410: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
    summary="Resolve a QR token to a minimal public emergency card. UNAUTHENTICATED.",
)
async def get_public_emergency_card(
    token: str,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> PublicEmergencyCardResponse:
    _set_privacy_headers(response)

    # Resolve the caller IP. Trust the proxy-supplied X-Forwarded-For first
    # (the BFF guarantees this is set when proxying); fall back to the raw
    # socket peer when no proxy is in front.
    #
    # H4 — DO NOT pool unparseable IPs into a shared bucket. An attacker
    # spoofing `X-Forwarded-For: garbage` would otherwise share a single
    # rate-limit bucket with every other broken-proxy user. We try the raw
    # socket address as a fallback; if even that is missing the request is
    # rejected as a deployment misconfig (400, not 410 — this isn't a
    # card-availability question).
    xff_first = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    socket_host = request.client.host if request.client else None

    ip_truncated = (
        emergency_svc.truncate_ip(xff_first)
        or emergency_svc.truncate_ip(socket_host)
    )
    if ip_truncated is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "MISSING_CLIENT_IP",
                "message": "Cannot identify client. Check proxy configuration.",
            },
        )

    await _enforce_public_rate_limit(redis, ip_truncated)

    token_row = await emergency_svc.lookup_active_token(db, plaintext_token=token)
    if token_row is None:
        raise _gone()

    user, profile, plans, emergency_profile = await emergency_svc.load_card_source_data(
        db, token_row.user_id
    )
    if user is None:
        # User soft-deleted or hard-purged → same 410 as missing/revoked.
        raise _gone()
    if emergency_profile is None or not emergency_profile.is_published:
        # Master kill switch — overrides any active token.
        raise _gone()

    # M2 — no card_short_id on the anonymous payload. Owner-side queries
    # still see the full token UUID; the public viewer does not.
    card, fields_returned = emergency_svc.derive_card(
        user=user,
        profile=profile,
        medication_plans=plans,
        emergency_profile=emergency_profile,
    )

    # Append-only access log (always written) + counter bump on the token.
    _, is_first_in_window = await emergency_svc.log_access(
        db,
        token=token_row,
        request=request,
        fields_returned=fields_returned,
    )

    # H1 — per-token sanity cap. Fires exactly once when access_count crosses
    # TOKEN_SANITY_CAP_READS so the owner gets one notification (not a flood).
    # We do NOT hard-revoke the token — the user might have a genuinely
    # heavily-scanned card (multi-hospital long-term patient). The audit row
    # + notification is enough signal for the owner to investigate.
    realtime_notification = None
    if token_row.access_count == TOKEN_SANITY_CAP_READS:
        realtime_notification = await notif_svc.enqueue(
            db=db,
            user_id=token_row.user_id,
            title="Emergency QR card scanned heavily",
            body=(
                f"Your emergency card '{token_row.label}' has been scanned "
                f"{TOKEN_SANITY_CAP_READS:,}+ times. If this is unexpected, "
                "review the access log and revoke the card."
            ),
            kind=NotificationKindEnum.ACCOUNT,
            link="/dashboard/emergency-card",
        )
        await log_security_event(
            db=db,
            event_type=AuditEventTypeEnum.EMERGENCY_PUBLIC_ACCESS_FIRST,
            user_id=token_row.user_id,
            ip_address=ip_truncated,
            user_agent=request.headers.get("user-agent"),
            details={
                "token_id": str(token_row.id),
                "flagged": True,
                "reason": "sanity_cap_crossed",
                "access_count": token_row.access_count,
            },
        )

    # Audit only the *first* access per (token, ip/24, 24h) — keeps the
    # security_audit_logs table sparse on a heavily-scanned card while still
    # giving the owner enough signal to detect a leak.
    elif is_first_in_window:
        await log_security_event(
            db=db,
            event_type=AuditEventTypeEnum.EMERGENCY_PUBLIC_ACCESS_FIRST,
            user_id=token_row.user_id,
            ip_address=ip_truncated,
            user_agent=request.headers.get("user-agent"),
            details={
                "token_id": str(token_row.id),
                "fields_returned": list(
                    k for k, v in fields_returned.items() if v
                ),
            },
        )

    await db.commit()
    if realtime_notification is not None:
        await notif_svc.emit_notification_created(realtime_notification)

    return PublicEmergencyCardResponse(data=card)
