"""Security logging service for audit trail."""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEventTypeEnum, AuditLog

logger = logging.getLogger(__name__)


async def log_security_event(
    db: AsyncSession,
    event_type: AuditEventTypeEnum,
    user_id: Optional[uuid.UUID] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[dict] = None,
    *,
    commit: bool = True,
) -> AuditLog:
    """Record a security audit event.

    Args:
        db: Database session
        event_type: Type of security event
        user_id: Associated user ID (if known)
        ip_address: Client IP address
        user_agent: Client User-Agent string
        details: Additional event details (failure reason, lockout duration, etc.)
        commit: When True (default) commits the surrounding transaction
            so the audit row is durable even if the caller crashes
            afterward. Pass False from endpoints that own a multi-step
            transaction (e.g. the HC ingest path) and want to issue a
            single commit at the end — see code-review §M4.

    Returns:
        Created AuditLog entry
    """
    entry = AuditLog(
        user_id=user_id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )
    db.add(entry)
    if commit:
        await db.commit()
    else:
        # Caller owns the transaction; flush so the row gets an `id`
        # and any constraint violations surface here rather than at the
        # surrounding commit.
        await db.flush()
    return entry


async def log_resource_access_denied(
    *,
    user_id: uuid.UUID,
    module: str,
    resource_id: str,
    http_method: str,
    route: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Log a cross-user ownership denial without disrupting the caller's transaction.

    Opens a separate session so the audit row is committed even if the caller's
    transaction is rolled back (e.g. during a 404 response path). Silently
    swallows IntegrityError on duplicate (user_id, event_type, created_at).
    """
    from app.adapters.database import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as audit_db:
            entry = AuditLog(
                user_id=user_id,
                event_type=AuditEventTypeEnum.SECURITY_ACCESS_DENIED,
                ip_address=ip_address,
                user_agent=user_agent,
                details={
                    "module": module,
                    "resource_id": resource_id,
                    "method": http_method,
                    "route": route,
                },
            )
            audit_db.add(entry)
            await audit_db.commit()
    except IntegrityError:
        pass
    except Exception:  # noqa: BLE001
        logger.warning(
            "Failed to write SECURITY_ACCESS_DENIED log for user=%s module=%s resource=%s",
            user_id,
            module,
            resource_id,
        )


async def get_audit_logs(
    db: AsyncSession,
    user_id: Optional[uuid.UUID] = None,
    event_types: Optional[list[AuditEventTypeEnum]] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[AuditLog]:
    """Retrieve audit logs with optional filtering.

    Args:
        db: Database session
        user_id: Filter by user ID
        event_types: Filter by event types
        limit: Max records to return
        offset: Pagination offset

    Returns:
        List of AuditLog entries
    """
    query = select(AuditLog).order_by(AuditLog.created_at.desc())

    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)

    if event_types:
        query = query.where(AuditLog.event_type.in_(event_types))

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return list(result.scalars().all())
