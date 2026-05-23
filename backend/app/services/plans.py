"""Service functions for user-owned wellness plans."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Plan, PlanStatusEnum
from app.schemas.plans import (
    PlanCreateBody,
    PlanUpdateBody,
    PlanListMeta,
    encode_plan_cursor,
    decode_plan_cursor,
)

logger = logging.getLogger(__name__)

_DEFAULT_PER_PAGE = 20
_MAX_PER_PAGE = 100
_MAX_ITEMS_BYTES = 32 * 1024  # 32 KiB


def _check_items_size(items: list | None) -> None:
    if items is None:
        return
    raw = len(json.dumps(items).encode("utf-8"))
    if raw > _MAX_ITEMS_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": "items payload exceeds 32 KiB limit."},
        )


async def list_plans(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    plan_status: Optional[str] = None,
    per_page: int = _DEFAULT_PER_PAGE,
    cursor: Optional[str] = None,
) -> tuple[list[Plan], PlanListMeta]:
    per_page = max(1, min(per_page, _MAX_PER_PAGE))
    stmt = select(Plan).where(Plan.user_id == user_id)
    if plan_status:
        stmt = stmt.where(Plan.status == plan_status)

    decoded = decode_plan_cursor(cursor)
    if decoded:
        created_at, plan_id = decoded
        stmt = stmt.where(
            (Plan.created_at < created_at)
            | ((Plan.created_at == created_at) & (Plan.id < plan_id))
        )

    stmt = stmt.order_by(Plan.created_at.desc(), Plan.id.desc()).limit(per_page + 1)
    rows = list((await db.execute(stmt)).scalars().all())

    has_more = len(rows) > per_page
    items = rows[:per_page]
    next_cursor = encode_plan_cursor(items[-1].created_at, items[-1].id) if has_more and items else None

    meta = PlanListMeta(next_cursor=next_cursor, has_more=has_more, per_page=per_page)
    return items, meta


async def create_plan(db: AsyncSession, user_id: uuid.UUID, body: PlanCreateBody) -> Plan:
    _check_items_size(body.items)
    plan = Plan(
        user_id=user_id,
        title=body.title,
        category=body.category,
        description=body.description,
        start_date=body.start_date,
        end_date=body.end_date,
        items=body.items,
        status=PlanStatusEnum.ACTIVE.value,
    )
    db.add(plan)
    await db.flush()
    return plan


async def get_plan(db: AsyncSession, user_id: uuid.UUID, plan_id: uuid.UUID) -> Optional[Plan]:
    stmt = select(Plan).where(Plan.id == plan_id, Plan.user_id == user_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def update_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
    body: PlanUpdateBody,
) -> Optional[Plan]:
    plan = await get_plan(db, user_id, plan_id)
    if plan is None:
        return None
    update_data = body.model_dump(exclude_unset=True)
    if "items" in update_data:
        _check_items_size(update_data["items"])
    for field, value in update_data.items():
        setattr(plan, field, value)
    await db.flush()
    return plan


async def archive_plan(db: AsyncSession, user_id: uuid.UUID, plan_id: uuid.UUID) -> Optional[Plan]:
    plan = await get_plan(db, user_id, plan_id)
    if plan is None:
        return None
    if plan.status != PlanStatusEnum.ARCHIVED.value:
        plan.status = PlanStatusEnum.ARCHIVED.value
        plan.archived_at = datetime.now(timezone.utc)
        await db.flush()
    return plan


async def delete_plan(db: AsyncSession, user_id: uuid.UUID, plan_id: uuid.UUID) -> bool:
    stmt = delete(Plan).where(Plan.id == plan_id, Plan.user_id == user_id)
    result = await db.execute(stmt)
    await db.flush()
    return result.rowcount > 0
