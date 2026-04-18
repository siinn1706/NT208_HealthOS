"""Security logging service for audit trail."""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEventTypeEnum, AuditLog


async def log_security_event(
    db: AsyncSession,
    event_type: AuditEventTypeEnum,
    user_id: Optional[uuid.UUID] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[dict] = None,
) -> AuditLog:
    """Record a security audit event.

    Args:
        db: Database session
        event_type: Type of security event
        user_id: Associated user ID (if known)
        ip_address: Client IP address
        user_agent: Client User-Agent string
        details: Additional event details (failure reason, lockout duration, etc.)

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
    await db.commit()
    return entry


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
