"""Security audit log endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.audit import AuditEventTypeEnum, AuditLog
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.services.security_logging import get_audit_logs

router = APIRouter(prefix="/security-logs", tags=["Security Logs"])


@router.get(
    "/",
    responses={401: {"model": ErrorResponse}},
)
async def list_security_logs(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List security audit logs for the current user.

    Returns up to `limit` records ordered by most recent first.
    """
    event_types = None
    if event_type:
        try:
            event_types = [AuditEventTypeEnum(event_type)]
        except ValueError:
            pass

    logs = await get_audit_logs(
        db,
        user_id=current_user.id,
        event_types=event_types,
        limit=limit,
        offset=offset,
    )

    return {
        "data": [
            {
                "id": str(log.id),
                "event_type": log.event_type.value,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "details": log.details,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ]
    }
