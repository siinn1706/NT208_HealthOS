"""RBAC service: role/permission lookup, grant helpers, default seed data."""
from __future__ import annotations

import uuid
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEventTypeEnum, AuditLog
from app.models.rbac import Permission, Role, RolePermission, UserRole

DEFAULT_ROLE_USER = "user"
DEFAULT_ROLE_ADMIN = "admin"

DEFAULT_PERMISSIONS: tuple[str, ...] = (
    "admin.access",
    "admin.users.read",
    "admin.users.update",
    "admin.users.ban",
    "admin.subscriptions.read",
    "admin.subscriptions.update",
    "admin.metrics.read",
)

# admin role gets all permissions; user role gets none by default
ADMIN_PERMISSIONS = DEFAULT_PERMISSIONS

_DEFAULT_ROLES = [
    {"code": DEFAULT_ROLE_USER, "name": "User"},
    {"code": DEFAULT_ROLE_ADMIN, "name": "Admin"},
]

_DEFAULT_PERMISSION_ROWS = [
    {"code": c, "description": None} for c in DEFAULT_PERMISSIONS
]


async def list_user_roles(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    """Return role codes for an active (non-deleted) user."""
    from app.models.core import User  # local import avoids circular at module level
    result = await db.execute(
        sa.select(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .join(User, User.id == UserRole.user_id)
        .where(UserRole.user_id == user_id)
        .where(User.deleted_at.is_(None))
    )
    return list(result.scalars().all())


async def list_user_permissions(db: AsyncSession, user_id: uuid.UUID) -> set[str]:
    """Return permission codes for an active user (via roles)."""
    from app.models.core import User
    result = await db.execute(
        sa.select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .join(User, User.id == UserRole.user_id)
        .where(UserRole.user_id == user_id)
        .where(User.deleted_at.is_(None))
    )
    return set(result.scalars().all())


async def has_role(db: AsyncSession, user_id: uuid.UUID, code: str) -> bool:
    from app.models.core import User
    result = await db.execute(
        sa.select(sa.literal(1))
        .select_from(UserRole)
        .join(Role, Role.id == UserRole.role_id)
        .join(User, User.id == UserRole.user_id)
        .where(UserRole.user_id == user_id)
        .where(Role.code == code)
        .where(User.deleted_at.is_(None))
        .limit(1)
    )
    return result.scalar() is not None


async def has_permission(db: AsyncSession, user_id: uuid.UUID, code: str) -> bool:
    from app.models.core import User
    result = await db.execute(
        sa.select(sa.literal(1))
        .select_from(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .join(User, User.id == UserRole.user_id)
        .where(UserRole.user_id == user_id)
        .where(Permission.code == code)
        .where(User.deleted_at.is_(None))
        .limit(1)
    )
    return result.scalar() is not None


async def ensure_default_roles_and_permissions(
    db: AsyncSession,
    *,
    commit: bool = True,
) -> None:
    """Idempotently insert default roles and permissions.

    Caller passes commit=False to batch this with other writes in a single transaction.
    """
    await db.execute(
        pg_insert(Role)
        .values([{"id": uuid.uuid4(), "code": r["code"], "name": r["name"]} for r in _DEFAULT_ROLES])
        .on_conflict_do_nothing(index_elements=["code"])
    )

    await db.execute(
        pg_insert(Permission)
        .values([{"id": uuid.uuid4(), "code": p["code"]} for p in _DEFAULT_PERMISSION_ROWS])
        .on_conflict_do_nothing(index_elements=["code"])
    )
    await db.flush()

    # Resolve admin role id and all permission ids, then bulk-link.
    admin_role_result = await db.execute(sa.select(Role).where(Role.code == DEFAULT_ROLE_ADMIN))
    admin_role = admin_role_result.scalar_one()

    perm_result = await db.execute(
        sa.select(Permission).where(Permission.code.in_(ADMIN_PERMISSIONS))
    )
    perms = perm_result.scalars().all()

    if perms:
        await db.execute(
            pg_insert(RolePermission)
            .values([{"role_id": admin_role.id, "permission_id": p.id} for p in perms])
            .on_conflict_do_nothing(index_elements=["role_id", "permission_id"])
        )

    if commit:
        await db.commit()
    else:
        await db.flush()


async def grant_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    role_code: str,
    *,
    actor_id: Optional[uuid.UUID] = None,
) -> None:
    """Grant a role to a user. Idempotent; writes audit_log in same transaction."""
    role_result = await db.execute(sa.select(Role).where(Role.code == role_code))
    role = role_result.scalar_one()

    inserted = await db.execute(
        pg_insert(UserRole)
        .values(user_id=user_id, role_id=role.id)
        .on_conflict_do_nothing(index_elements=["user_id", "role_id"])
        .returning(UserRole.user_id)
    )
    # Only audit an actual new grant; idempotent re-grants produce no audit row.
    if inserted.scalar_one_or_none() is not None:
        db.add(AuditLog(
            user_id=actor_id,
            event_type=AuditEventTypeEnum.RBAC_ROLE_GRANTED,
            details={"target_user_id": str(user_id), "role": role_code},
        ))
    # Caller owns the transaction commit.


async def revoke_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    role_code: str,
    *,
    actor_id: Optional[uuid.UUID] = None,
) -> None:
    """Revoke a role from a user. Writes audit_log in same transaction."""
    role_result = await db.execute(sa.select(Role).where(Role.code == role_code))
    role = role_result.scalar_one_or_none()
    if role is None:
        return

    await db.execute(
        sa.delete(UserRole)
        .where(UserRole.user_id == user_id)
        .where(UserRole.role_id == role.id)
    )

    db.add(AuditLog(
        user_id=actor_id,
        event_type=AuditEventTypeEnum.RBAC_ROLE_REVOKED,
        details={"target_user_id": str(user_id), "role": role_code},
    ))
