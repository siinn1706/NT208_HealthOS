from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import ApiException, ConflictException, NotFoundException
from app.models.core import User
from app.models.subscriptions import SubscriptionPlan, UserSubscription
from app.schemas.admin import AdminCurrentSubscriptionSummary
from app.schemas.subscriptions import (
    SubscriptionPlanCreateBody,
    SubscriptionPlanDTO,
    SubscriptionPlanUpdateBody,
    UserSubscriptionSummary,
    UserSubscriptionUpdateBody,
)
from app.services.account_status import normalize_datetime, utc_now

DEFAULT_PLAN_CODES = ("free", "basic", "family", "professional")
CURRENT_STATUSES = ("active", "trialing")


def _seed_path() -> Path:
    return Path(__file__).resolve().parents[1] / "seeds" / "subscription_plans.json"


def load_default_subscription_plan_rows() -> list[dict[str, Any]]:
    return json.loads(_seed_path().read_text(encoding="utf-8"))


def _canonical_free_plan_payload() -> dict[str, Any]:
    return next(row for row in load_default_subscription_plan_rows() if row["code"] == "free")


def _current_subscription_clause(now: datetime):
    return and_(
        UserSubscription.status.in_(CURRENT_STATUSES),
        or_(UserSubscription.expires_at.is_(None), UserSubscription.expires_at > now),
    )


async def seed_default_subscription_plans(db: AsyncSession, *, commit: bool = True) -> None:
    rows = []
    for row in load_default_subscription_plan_rows():
        rows.append(
            {
                "id": uuid.uuid4(),
                "code": row["code"],
                "name_vi": row["name_vi"],
                "name_en": row.get("name_en"),
                "description_vi": row.get("description_vi"),
                "description_en": row.get("description_en"),
                "price_vnd": row["price_vnd"],
                "billing_period": row["billing_period"],
                "features_vi": row["features_vi"],
                "features_en": row.get("features_en"),
                "limits": row["limits"],
                "is_active": True,
                "is_recommended": row["is_recommended"],
                "sort_order": row["sort_order"],
            }
        )

    stmt = pg_insert(SubscriptionPlan).values(rows)
    await db.execute(
        stmt.on_conflict_do_update(
            index_elements=["code"],
            set_={
                "name_vi": stmt.excluded.name_vi,
                "name_en": stmt.excluded.name_en,
                "description_vi": stmt.excluded.description_vi,
                "description_en": stmt.excluded.description_en,
                "price_vnd": stmt.excluded.price_vnd,
                "billing_period": stmt.excluded.billing_period,
                "features_vi": stmt.excluded.features_vi,
                "features_en": stmt.excluded.features_en,
                "limits": stmt.excluded.limits,
                "is_active": stmt.excluded.is_active,
                "is_recommended": stmt.excluded.is_recommended,
                "sort_order": stmt.excluded.sort_order,
                "updated_at": func.now(),
            },
        )
    )
    if commit:
        await db.commit()
    else:
        await db.flush()


async def list_active_subscription_plans(db: AsyncSession) -> list[SubscriptionPlan]:
    result = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active.is_(True))
        .order_by(SubscriptionPlan.sort_order.asc(), SubscriptionPlan.code.asc())
    )
    return list(result.scalars().all())


async def list_admin_subscription_plans(db: AsyncSession) -> list[SubscriptionPlan]:
    result = await db.execute(
        select(SubscriptionPlan).order_by(
            SubscriptionPlan.sort_order.asc(),
            SubscriptionPlan.code.asc(),
        )
    )
    return list(result.scalars().all())


async def create_subscription_plan(db: AsyncSession, body: SubscriptionPlanCreateBody) -> SubscriptionPlan:
    existing = (
        await db.execute(select(SubscriptionPlan.id).where(SubscriptionPlan.code == body.code))
    ).scalar_one_or_none()
    if existing is not None:
        raise ConflictException(
            code="SUBSCRIPTION_PLAN_CODE_EXISTS",
            message="Subscription plan code already exists.",
            field_errors={"code": "Subscription plan code already exists."},
        )

    plan = SubscriptionPlan(**body.model_dump())
    db.add(plan)
    await db.flush()
    return plan


async def update_subscription_plan(
    db: AsyncSession,
    plan_id: uuid.UUID,
    body: SubscriptionPlanUpdateBody,
) -> SubscriptionPlan:
    plan = await db.get(SubscriptionPlan, plan_id)
    if plan is None:
        raise NotFoundException(resource="SubscriptionPlan", message="Subscription plan not found.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    await db.flush()
    return plan


async def _get_plan_by_id_or_code(
    db: AsyncSession,
    *,
    plan_id: uuid.UUID | None,
    plan_code: str | None,
) -> SubscriptionPlan | None:
    plan_by_id: SubscriptionPlan | None = None
    plan_by_code: SubscriptionPlan | None = None
    if plan_id is not None:
        plan_by_id = await db.get(SubscriptionPlan, plan_id)
        if plan_by_id is None:
            raise NotFoundException(resource="SubscriptionPlan", message="Subscription plan not found.")
    if plan_code is not None:
        plan_by_code = (
            await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == plan_code))
        ).scalar_one_or_none()
        if plan_by_code is None:
            raise NotFoundException(resource="SubscriptionPlan", message="Subscription plan not found.")
    if plan_by_id is not None and plan_by_code is not None and plan_by_id.id != plan_by_code.id:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="SUBSCRIPTION_PLAN_MISMATCH",
            message="plan_id and plan_code refer to different subscription plans.",
        )
    return plan_by_id or plan_by_code


async def _get_free_plan(db: AsyncSession) -> SubscriptionPlan | None:
    return (
        await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == "free"))
    ).scalar_one_or_none()


def _virtual_free_plan_dto() -> SubscriptionPlanDTO:
    row = _canonical_free_plan_payload()
    return SubscriptionPlanDTO(
        id=uuid.UUID(int=0),
        code=row["code"],
        name_vi=row["name_vi"],
        name_en=row.get("name_en"),
        description_vi=row.get("description_vi"),
        description_en=row.get("description_en"),
        price_vnd=row["price_vnd"],
        billing_period=row["billing_period"],
        features_vi=row["features_vi"],
        features_en=row.get("features_en"),
        limits=row["limits"],
        is_active=True,
        is_recommended=row["is_recommended"],
        sort_order=row["sort_order"],
    )


def _plan_dto(plan: SubscriptionPlan | None) -> SubscriptionPlanDTO:
    if plan is None:
        return _virtual_free_plan_dto()
    return SubscriptionPlanDTO.model_validate(plan)


def _summary_from_subscription(subscription: UserSubscription, plan: SubscriptionPlan | None = None) -> UserSubscriptionSummary:
    selected_plan = plan or subscription.plan
    return UserSubscriptionSummary(
        subscription_id=subscription.id,
        status=subscription.status,
        started_at=subscription.started_at,
        expires_at=subscription.expires_at,
        plan=_plan_dto(selected_plan),
        limits=selected_plan.limits,
        features_vi=selected_plan.features_vi,
        features_en=selected_plan.features_en,
    )


async def _virtual_free_summary(db: AsyncSession) -> UserSubscriptionSummary:
    free_plan = await _get_free_plan(db)
    if free_plan is None:
        plan = _virtual_free_plan_dto()
        return UserSubscriptionSummary(
            subscription_id=None,
            status="active",
            started_at=None,
            expires_at=None,
            plan=plan,
            limits=plan.limits,
            features_vi=plan.features_vi,
            features_en=plan.features_en,
        )
    return UserSubscriptionSummary(
        subscription_id=None,
        status="active",
        started_at=None,
        expires_at=None,
        plan=_plan_dto(free_plan),
        limits=free_plan.limits,
        features_vi=free_plan.features_vi,
        features_en=free_plan.features_en,
    )


async def get_current_subscription(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    now: datetime | None = None,
    for_update: bool = False,
) -> UserSubscription | None:
    effective_now = normalize_datetime(now or utc_now())
    stmt = (
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan))
        .where(UserSubscription.user_id == user_id, _current_subscription_clause(effective_now))
        .order_by(UserSubscription.started_at.desc(), UserSubscription.created_at.desc())
        .limit(1)
    )
    if for_update:
        stmt = stmt.with_for_update()
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_user_subscription_summary(db: AsyncSession, user_id: uuid.UUID) -> UserSubscriptionSummary:
    subscription = await get_current_subscription(db, user_id)
    if subscription is None:
        return await _virtual_free_summary(db)
    return _summary_from_subscription(subscription)


async def ensure_user_default_subscription(db: AsyncSession, user_id: uuid.UUID) -> UserSubscription:
    existing = await get_current_subscription(db, user_id)
    if existing is not None:
        return existing
    free_plan = await _get_free_plan(db)
    if free_plan is None:
        await seed_default_subscription_plans(db, commit=False)
        free_plan = await _get_free_plan(db)
    if free_plan is None:
        raise ApiException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="DEFAULT_SUBSCRIPTION_PLAN_MISSING",
            message="Default Free subscription plan is missing.",
        )
    subscription = UserSubscription(
        user_id=user_id,
        plan_id=free_plan.id,
        status="active",
        started_at=utc_now(),
    )
    db.add(subscription)
    await db.flush()
    subscription.plan = free_plan
    return subscription


async def update_user_subscription(
    db: AsyncSession,
    *,
    target_user_id: uuid.UUID,
    body: UserSubscriptionUpdateBody,
    assigned_by_admin_id: uuid.UUID | None,
) -> UserSubscriptionSummary:
    target = await db.get(User, target_user_id)
    if target is None:
        raise NotFoundException(resource="User", message="User not found.")

    requested_status = body.status or "active"
    plan = await _get_plan_by_id_or_code(db, plan_id=body.plan_id, plan_code=body.plan_code)
    current = await get_current_subscription(db, target_user_id, for_update=True)
    fields = body.model_dump(exclude_unset=True)

    if plan is not None and not plan.is_active:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INACTIVE_SUBSCRIPTION_PLAN",
            message="Inactive subscription plans cannot be assigned.",
        )

    if plan is None:
        if current is None:
            raise ApiException(
                status_code=status.HTTP_409_CONFLICT,
                code="NO_ACTIVE_SUBSCRIPTION",
                message="User does not have an active subscription to update.",
            )
        if "status" in fields:
            current.status = requested_status
            if requested_status == "canceled":
                current.canceled_at = utc_now()
        if "expires_at" in fields:
            current.expires_at = body.expires_at
        if "admin_note" in fields:
            current.admin_note = body.admin_note
        current.assigned_by_admin_id = assigned_by_admin_id
        await db.flush()
        return _summary_from_subscription(current)

    if current is not None:
        current.status = "canceled"
        current.canceled_at = utc_now()
        await db.flush()

    subscription = UserSubscription(
        user_id=target_user_id,
        plan_id=plan.id,
        status=requested_status,
        started_at=utc_now(),
        expires_at=body.expires_at if "expires_at" in fields else None,
        canceled_at=utc_now() if requested_status == "canceled" else None,
        assigned_by_admin_id=assigned_by_admin_id,
        admin_note=body.admin_note if "admin_note" in fields else None,
    )
    db.add(subscription)
    await db.flush()
    subscription.plan = plan
    return _summary_from_subscription(subscription, plan)


async def count_active_subscription_plans(db: AsyncSession) -> int:
    return (
        await db.execute(select(func.count(SubscriptionPlan.id)).where(SubscriptionPlan.is_active.is_(True)))
    ).scalar_one()


async def count_active_user_subscriptions(db: AsyncSession, *, now: datetime | None = None) -> int:
    effective_now = normalize_datetime(now or utc_now())
    return (
        await db.execute(select(func.count(UserSubscription.id)).where(_current_subscription_clause(effective_now)))
    ).scalar_one()


def _admin_summary_from_parts(
    *,
    subscription_id: uuid.UUID | None,
    plan_code: str,
    plan_name: str,
    status_value: str,
    expires_at: datetime | None,
) -> AdminCurrentSubscriptionSummary:
    return AdminCurrentSubscriptionSummary(
        id=subscription_id,
        plan_code=plan_code,
        plan_name=plan_name,
        status=status_value,
        current_period_end=expires_at,
    )


async def current_subscription_summaries_by_user_id(
    db: AsyncSession,
    user_ids: list[uuid.UUID],
    *,
    now: datetime | None = None,
) -> dict[uuid.UUID, AdminCurrentSubscriptionSummary]:
    if not user_ids:
        return {}
    effective_now = normalize_datetime(now or utc_now())
    result = await db.execute(
        select(UserSubscription, SubscriptionPlan)
        .join(SubscriptionPlan, SubscriptionPlan.id == UserSubscription.plan_id)
        .where(UserSubscription.user_id.in_(user_ids), _current_subscription_clause(effective_now))
        .order_by(UserSubscription.started_at.desc(), UserSubscription.created_at.desc())
    )
    summaries: dict[uuid.UUID, AdminCurrentSubscriptionSummary] = {}
    for subscription, plan in result.all():
        if subscription.user_id in summaries:
            continue
        summaries[subscription.user_id] = _admin_summary_from_parts(
            subscription_id=subscription.id,
            plan_code=plan.code,
            plan_name=plan.name_vi,
            status_value=subscription.status,
            expires_at=subscription.expires_at,
        )

    missing_ids = [user_id for user_id in user_ids if user_id not in summaries]
    if missing_ids:
        free_plan = await _get_free_plan(db)
        if free_plan is None:
            virtual = _virtual_free_plan_dto()
            plan_code = virtual.code
            plan_name = virtual.name_vi
        else:
            plan_code = free_plan.code
            plan_name = free_plan.name_vi
        for user_id in missing_ids:
            summaries[user_id] = _admin_summary_from_parts(
                subscription_id=None,
                plan_code=plan_code,
                plan_name=plan_name,
                status_value="active",
                expires_at=None,
            )
    return summaries
