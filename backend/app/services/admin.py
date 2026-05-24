from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Request, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import ApiException, NotFoundException
from app.models.audit import AuditEventTypeEnum
from app.models.core import RefreshTokenSession, User, UserProfile
from app.models.rbac import Role, UserRole
from app.schemas.admin import (
    AdminCurrentSubscriptionSummary,
    AdminLoginSessionSummary,
    AdminOverview,
    AdminProfileSummary,
    AdminUserDetail,
    AdminUserListItem,
)
from app.schemas.common import PaginationMeta
from app.services.account_status import is_active_ban, normalize_datetime, utc_now
from app.services.audit import audit
from app.services.refresh_tokens import revoke_refresh_tokens_for_user
from app.services import subscriptions as subscription_service

AdminUserStatus = Literal["all", "active", "banned", "deleted"]
AdminUserSort = Literal["created_at_desc", "created_at_asc", "email_asc"]


def _active_ban_clause(now: datetime):
    return and_(
        User.banned_at.is_not(None),
        or_(User.banned_until.is_(None), User.banned_until > now),
    )


def _not_active_ban_clause(now: datetime):
    return or_(
        User.banned_at.is_(None),
        and_(User.banned_until.is_not(None), User.banned_until <= now),
    )


def _human_user_clause():
    return User.is_system.is_(False)


def _account_status(user: User, now: datetime) -> Literal["active", "banned", "deleted", "system"]:
    if user.is_system:
        return "system"
    if user.deleted_at is not None:
        return "deleted"
    if is_active_ban(user, now=now):
        return "banned"
    return "active"


def _profile_summary(profile: UserProfile | None) -> AdminProfileSummary | None:
    if profile is None:
        return None
    gender = profile.gender.value if hasattr(profile.gender, "value") else profile.gender
    return AdminProfileSummary(
        full_name=profile.full_name,
        date_of_birth=profile.date_of_birth,
        gender=gender,
        blood_type=profile.blood_type,
        height_cm=profile.height_cm,
        weight_kg=profile.weight_kg,
        phone=profile.phone,
        address=profile.address,
        avatar_url=profile.avatar_url,
    )


async def _roles_by_user_id(db: AsyncSession, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[str]]:
    if not user_ids:
        return {}
    rows = (
        await db.execute(
            select(UserRole.user_id, Role.code)
            .join(Role, Role.id == UserRole.role_id)
            .where(UserRole.user_id.in_(user_ids))
            .order_by(Role.code.asc())
        )
    ).all()
    role_map: dict[uuid.UUID, list[str]] = {user_id: [] for user_id in user_ids}
    for user_id, role_code in rows:
        role_map.setdefault(user_id, []).append(role_code)
    return role_map


async def _session_summary(db: AsyncSession, user_id: uuid.UUID, user: User) -> AdminLoginSessionSummary:
    row = (
        await db.execute(
            select(
                func.count(RefreshTokenSession.id),
                func.count(RefreshTokenSession.id).filter(RefreshTokenSession.revoked_at.is_(None)),
                func.count(RefreshTokenSession.id).filter(RefreshTokenSession.revoked_at.is_not(None)),
                func.max(RefreshTokenSession.last_used_at),
            ).where(RefreshTokenSession.user_id == user_id)
        )
    ).one()
    return AdminLoginSessionSummary(
        refresh_session_count=row[0] or 0,
        active_refresh_sessions=row[1] or 0,
        revoked_refresh_sessions=row[2] or 0,
        last_refresh_used_at=row[3],
        tokens_invalidated_at=user.tokens_invalidated_at,
    )


def _list_item(
    user: User,
    roles: list[str],
    current_subscription: AdminCurrentSubscriptionSummary | None = None,
) -> AdminUserListItem:
    return AdminUserListItem(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        onboarding_status=user.onboarding_status,
        email_verified_at=user.email_verified_at,
        created_at=user.created_at,
        deleted_at=user.deleted_at,
        banned_at=user.banned_at,
        banned_reason=user.banned_reason,
        roles=roles,
        current_subscription=current_subscription,
        last_seen_at=user.last_seen_at,
    )


async def _detail(
    db: AsyncSession,
    user: User,
    roles: list[str],
    now: datetime,
    current_subscription: AdminCurrentSubscriptionSummary | None = None,
) -> AdminUserDetail:
    session_summary = await _session_summary(db, user.id, user)
    base = _list_item(user, roles, current_subscription)
    return AdminUserDetail(
        **base.model_dump(),
        profile_summary=_profile_summary(user.profile),
        subscription=current_subscription,
        login_session_summary=session_summary,
        account_status=_account_status(user, now),
        is_system=user.is_system,
        banned_by_id=user.banned_by_id,
        banned_until=user.banned_until,
    )


async def get_admin_overview(db: AsyncSession, *, now: datetime | None = None) -> AdminOverview:
    effective_now = normalize_datetime(now or utc_now())
    human = _human_user_clause()
    active_ban = _active_ban_clause(effective_now)
    not_active_ban = _not_active_ban_clause(effective_now)
    online_cutoff = effective_now - timedelta(minutes=5)

    total_users = (
        await db.execute(select(func.count(User.id)).where(human))
    ).scalar_one()
    active_users = (
        await db.execute(
            select(func.count(User.id)).where(
                human,
                User.deleted_at.is_(None),
                not_active_ban,
            )
        )
    ).scalar_one()
    banned_users = (
        await db.execute(select(func.count(User.id)).where(human, active_ban))
    ).scalar_one()
    soft_deleted_users = (
        await db.execute(select(func.count(User.id)).where(human, User.deleted_at.is_not(None)))
    ).scalar_one()
    online_users_estimate = (
        await db.execute(
            select(func.count(User.id)).where(
                human,
                User.deleted_at.is_(None),
                not_active_ban,
                User.last_seen_at >= online_cutoff,
            )
        )
    ).scalar_one()

    return AdminOverview(
        total_users=total_users,
        active_users=active_users,
        banned_users=banned_users,
        soft_deleted_users=soft_deleted_users,
        online_users_estimate=online_users_estimate,
        total_subscription_plans=await subscription_service.count_active_subscription_plans(db),
        total_active_subscriptions=await subscription_service.count_active_user_subscriptions(db, now=effective_now),
        created_at=effective_now,
    )


async def list_users(
    db: AsyncSession,
    *,
    q: str | None = None,
    status_filter: AdminUserStatus = "all",
    page: int = 1,
    per_page: int = 20,
    sort: AdminUserSort = "created_at_desc",
    now: datetime | None = None,
) -> tuple[list[AdminUserListItem], PaginationMeta]:
    effective_now = normalize_datetime(now or utc_now())
    clauses = [_human_user_clause()]
    if q:
        pattern = f"%{q.strip().lower()}%"
        clauses.append(
            or_(
                func.lower(User.email).ilike(pattern),
                func.lower(User.username).ilike(pattern),
                func.lower(User.display_name).ilike(pattern),
            )
        )
    if status_filter == "active":
        clauses.extend([User.deleted_at.is_(None), _not_active_ban_clause(effective_now)])
    elif status_filter == "banned":
        clauses.append(_active_ban_clause(effective_now))
    elif status_filter == "deleted":
        clauses.append(User.deleted_at.is_not(None))

    total = (await db.execute(select(func.count(User.id)).where(*clauses))).scalar_one()

    if sort == "created_at_asc":
        order_by = (User.created_at.asc(), User.id.asc())
    elif sort == "email_asc":
        order_by = (User.email.asc(), User.id.asc())
    else:
        order_by = (User.created_at.desc(), User.id.desc())

    rows = (
        await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(*clauses)
            .order_by(*order_by)
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).scalars().all()
    users = list(rows)
    user_ids = [user.id for user in users]
    roles = await _roles_by_user_id(db, user_ids)
    subscriptions = await subscription_service.current_subscription_summaries_by_user_id(
        db,
        user_ids,
        now=effective_now,
    )
    return (
        [_list_item(user, roles.get(user.id, []), subscriptions.get(user.id)) for user in users],
        PaginationMeta(page=page, per_page=per_page, total=total),
    )


async def get_user_detail(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    now: datetime | None = None,
) -> AdminUserDetail | None:
    user = (
        await db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == user_id)
        )
    ).scalar_one_or_none()
    if user is None:
        return None
    role_map = await _roles_by_user_id(db, [user.id])
    effective_now = normalize_datetime(now or utc_now())
    subscriptions = await subscription_service.current_subscription_summaries_by_user_id(
        db,
        [user.id],
        now=effective_now,
    )
    return await _detail(
        db,
        user,
        role_map.get(user.id, []),
        effective_now,
        subscriptions.get(user.id),
    )


async def ban_user(
    db: AsyncSession,
    *,
    actor: User,
    target_user_id: uuid.UUID,
    reason: str,
    banned_until: datetime | None,
    request: Request | None,
) -> User:
    if actor.id == target_user_id:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="ADMIN_CANNOT_BAN_SELF",
            message="Admin cannot ban themselves.",
        )

    target = (
        await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.id == target_user_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if target is None:
        raise NotFoundException(resource="User", message="User not found.")
    if target.is_system:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="SYSTEM_USER_PROTECTED",
            message="System users cannot be banned.",
        )
    if target.deleted_at is not None:
        raise ApiException(
            status_code=status.HTTP_409_CONFLICT,
            code="ACCOUNT_DELETED",
            message="Deleted accounts cannot be banned.",
        )

    now = utc_now()
    target.banned_at = now
    target.banned_reason = reason.strip()
    target.banned_by_id = actor.id
    target.banned_until = banned_until
    target.tokens_invalidated_at = now
    await revoke_refresh_tokens_for_user(db, user_id=target.id)
    await audit(
        db,
        AuditEventTypeEnum.ADMIN_USER_BANNED,
        actor.id,
        request,
        details={
            "target_user_id": str(target.id),
            "banned_until": banned_until.isoformat() if banned_until else None,
            "reason_length": len(target.banned_reason or ""),
        },
        commit=False,
    )
    await db.flush()
    return target


async def unban_user(
    db: AsyncSession,
    *,
    actor: User,
    target_user_id: uuid.UUID,
    request: Request | None,
) -> User:
    target = (
        await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.id == target_user_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if target is None:
        raise NotFoundException(resource="User", message="User not found.")

    was_banned = target.banned_at is not None
    target.banned_at = None
    target.banned_reason = None
    target.banned_by_id = None
    target.banned_until = None
    await audit(
        db,
        AuditEventTypeEnum.ADMIN_USER_UNBANNED,
        actor.id,
        request,
        details={"target_user_id": str(target.id), "was_banned": was_banned},
        commit=False,
    )
    await db.flush()
    return target
