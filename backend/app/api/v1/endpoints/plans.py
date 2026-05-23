"""Plans endpoints — user-owned wellness/health plan CRUD."""
from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.plans import (
    PlanCreateBody,
    PlanDTO,
    PlanListResponse,
    PlanResponse,
    PlanUpdateBody,
)
from app.services import plans as plan_svc

router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get(
    "",
    response_model=PlanListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List the current user's wellness plans",
)
async def list_plans(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    plan_status: Optional[str] = Query(default=None, alias="status"),
    per_page: int = Query(default=20, ge=1, le=100),
    cursor: Optional[str] = Query(default=None),
) -> PlanListResponse:
    plans, meta = await plan_svc.list_plans(
        db,
        current_user.id,
        plan_status=plan_status,
        per_page=per_page,
        cursor=cursor,
    )
    return PlanListResponse(data=[PlanDTO.model_validate(p) for p in plans], meta=meta)


@router.post(
    "",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="Create a wellness plan",
)
async def create_plan(
    body: PlanCreateBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlanResponse:
    plan = await plan_svc.create_plan(db, current_user.id, body)
    await db.commit()
    await db.refresh(plan)
    return PlanResponse(data=PlanDTO.model_validate(plan))


@router.get(
    "/{plan_id}",
    response_model=PlanResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Get a wellness plan by ID",
)
async def get_plan(
    plan_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlanResponse:
    plan = await plan_svc.get_plan(db, current_user.id, plan_id)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Plan not found."},
        )
    return PlanResponse(data=PlanDTO.model_validate(plan))


@router.patch(
    "/{plan_id}",
    response_model=PlanResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="Partially update a wellness plan",
)
async def update_plan(
    plan_id: uuid.UUID,
    body: PlanUpdateBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlanResponse:
    plan = await plan_svc.update_plan(db, current_user.id, plan_id, body)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Plan not found."},
        )
    await db.commit()
    await db.refresh(plan)
    return PlanResponse(data=PlanDTO.model_validate(plan))


@router.post(
    "/{plan_id}/archive",
    response_model=PlanResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Archive a wellness plan (soft delete, idempotent)",
)
async def archive_plan(
    plan_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlanResponse:
    plan = await plan_svc.archive_plan(db, current_user.id, plan_id)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Plan not found."},
        )
    await db.commit()
    await db.refresh(plan)
    return PlanResponse(data=PlanDTO.model_validate(plan))


@router.delete(
    "/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Hard delete a wellness plan",
)
async def delete_plan(
    plan_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    deleted = await plan_svc.delete_plan(db, current_user.id, plan_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Plan not found."},
        )
    await db.commit()
