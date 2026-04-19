"""B7 audit helper — one-line wrapper around `log_security_event`.

Centralizes the FastAPI Request → ip_address/user_agent extraction so callers
can write a single line for any rights/destructive event:

    await audit(db, AuditEventTypeEnum.DATA_EXPORT_REQUESTED, user.id, request,
                details={"job_id": str(job.id)})

This keeps the audit trail consistent across export / delete / OAuth-link /
prescription / PDF flows without each endpoint re-implementing IP/UA parsing.
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEventTypeEnum, AuditLog
from app.services.security_logging import log_security_event


def _client_ip(request: Optional[Request]) -> Optional[str]:
    """Resolve client IP, honoring `X-Forwarded-For` if present.

    Cloud setups put the real client behind a proxy; the BFF should already
    forward it. We take the *first* (left-most) entry as the public client.
    """
    if request is None:
        return None
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def _user_agent(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    return request.headers.get("user-agent")


async def audit(
    db: AsyncSession,
    event_type: AuditEventTypeEnum,
    user_id: Optional[uuid.UUID],
    request: Optional[Request] = None,
    details: Optional[dict[str, Any]] = None,
) -> AuditLog:
    """Record a security/privacy/destructive event.

    `details` should be small and PHI-free (job ids, target resource id,
    coarse failure reason). The audit log is **not** the place to store
    bodies, tokens, signed URLs, or any user-supplied free text.
    """
    return await log_security_event(
        db=db,
        event_type=event_type,
        user_id=user_id,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
        details=details,
    )
