"""FastAPI dependencies for RBAC: require_role, require_permission, is_admin_user."""
from __future__ import annotations

import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.exceptions import ForbiddenException
from app.models.core import User
from app.services import rbac as rbac_service


async def get_current_user_roles(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    return await rbac_service.list_user_roles(db, user.id)


async def get_current_user_permissions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> set[str]:
    return await rbac_service.list_user_permissions(db, user.id)


def require_role(code: str):
    """Factory: returns a FastAPI dependency that enforces a role requirement."""
    async def _dep(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not await rbac_service.has_role(db, user.id, code):
            raise ForbiddenException("Insufficient privileges.")
        return user
    return _dep


def require_permission(code: str):
    """Factory: returns a FastAPI dependency that enforces a permission requirement."""
    async def _dep(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not await rbac_service.has_permission(db, user.id, code):
            raise ForbiddenException("Insufficient privileges.")
        return user
    return _dep


async def is_admin_user(user: User, db: AsyncSession) -> bool:
    """Coroutine usable from non-HTTP contexts (Celery, scripts)."""
    return await rbac_service.has_role(db, user.id, rbac_service.DEFAULT_ROLE_ADMIN)
