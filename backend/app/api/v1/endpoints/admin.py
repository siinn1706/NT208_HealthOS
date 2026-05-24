from __future__ import annotations

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.rbac_deps import require_permission
from app.models.core import User
from app.schemas.admin import (
    AdminBanUserBody,
    AdminOverviewResponse,
    AdminUserDetailResponse,
    AdminUserListResponse,
)
from app.schemas.common import ErrorResponse
from app.services import admin as admin_service

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_permission("admin.access"))],
)


@router.get(
    "/overview",
    response_model=AdminOverviewResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
async def get_admin_overview(
    _admin: Annotated[User, Depends(require_permission("admin.metrics.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminOverviewResponse:
    overview = await admin_service.get_admin_overview(db)
    return AdminOverviewResponse(data=overview)


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
async def list_admin_users(
    _admin: Annotated[User, Depends(require_permission("admin.users.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str | None = Query(default=None),
    status_filter: Literal["all", "active", "banned", "deleted"] = Query(default="all", alias="status"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    sort: Literal["created_at_desc", "created_at_asc", "email_asc"] = Query(default="created_at_desc"),
) -> AdminUserListResponse:
    users, meta = await admin_service.list_users(
        db,
        q=q,
        status_filter=status_filter,
        page=page,
        per_page=per_page,
        sort=sort,
    )
    return AdminUserListResponse(data=users, meta=meta)


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def get_admin_user_detail(
    user_id: uuid.UUID,
    _admin: Annotated[User, Depends(require_permission("admin.users.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserDetailResponse:
    detail = await admin_service.get_user_detail(db, user_id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "User not found."},
        )
    return AdminUserDetailResponse(data=detail)


@router.post(
    "/users/{user_id}/ban",
    response_model=AdminUserDetailResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
async def ban_admin_user(
    user_id: uuid.UUID,
    body: AdminBanUserBody,
    request: Request,
    admin: Annotated[User, Depends(require_permission("admin.users.ban"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserDetailResponse:
    target = await admin_service.ban_user(
        db,
        actor=admin,
        target_user_id=user_id,
        reason=body.reason,
        banned_until=body.banned_until,
        request=request,
    )
    await db.commit()
    await db.refresh(target)
    detail = await admin_service.get_user_detail(db, target.id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "User not found."},
        )
    return AdminUserDetailResponse(data=detail)


@router.post(
    "/users/{user_id}/unban",
    response_model=AdminUserDetailResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def unban_admin_user(
    user_id: uuid.UUID,
    request: Request,
    admin: Annotated[User, Depends(require_permission("admin.users.ban"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserDetailResponse:
    target = await admin_service.unban_user(
        db,
        actor=admin,
        target_user_id=user_id,
        request=request,
    )
    await db.commit()
    await db.refresh(target)
    detail = await admin_service.get_user_detail(db, target.id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "User not found."},
        )
    return AdminUserDetailResponse(data=detail)
