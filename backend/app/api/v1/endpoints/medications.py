"""Medication Hub endpoints (`/v1/medications`).

Browser → BFF → Core. Browser never calls these directly. Auth + ownership
checks are enforced by the service layer (which always filters on `user_id`).

Per-dose actions (mark done / skip / snooze) intentionally reuse the existing
reminder occurrence endpoints; this router does NOT duplicate them. The
medication detail UI calls `/api/v1/reminders/{rem_id}/done|skip|snooze`.
"""
from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.core.security import get_current_user
from app.models.audit import AuditEventTypeEnum
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.medications import (
    AdherenceResponse,
    MedicationDoseListResponse,
    MedicationImportBody,
    MedicationImportResponse,
    MedicationPlanCreateBody,
    MedicationPlanDetailResponse,
    MedicationPlanListResponse,
    MedicationPlanResponse,
    MedicationPlanUpdateBody,
    MedicationRefillBody,
)
from app.services import medications as med_svc
from app.services.audit import audit
from app.services.reminder_recurrence import DEFAULT_TZID

router = APIRouter(prefix="/medications", tags=["Medications"])


# Review M16 — per-user Redis token-bucket rate limits. Matches the pattern
# at `endpoints/reports.py` lines 35-56 (PDF rate limit). Tuned conservatively;
# real abuse would be programmatic, not human, so even slow limits hurt the
# attacker without bothering legitimate users.
_CREATE_RATE_KEY = "rate:medications.create:{user_id}"
_CREATE_RATE_MAX = 50           # 50 plan creates per rolling hour per user
_CREATE_RATE_WINDOW_S = 60 * 60

_IMPORT_RATE_KEY = "rate:medications.import:{user_id}"
_IMPORT_RATE_MAX = 10           # 10 imports per rolling hour per user
_IMPORT_RATE_WINDOW_S = 60 * 60


async def _enforce_rate_limit(
    redis: Redis,
    *,
    key_template: str,
    user_id: uuid.UUID,
    limit: int,
    window_s: int,
) -> None:
    """Per-user fixed-window token bucket. Mirrors `_enforce_pdf_rate_limit`
    in `endpoints/reports.py` so the canonical 429 envelope (with
    `retry_after_s`) is consistent across the app."""
    key = key_template.format(user_id=user_id)
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_s)
    if current > limit:
        ttl = await redis.ttl(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMITED",
                "message": (
                    f"You can perform this action at most {limit} times per hour."
                ),
                "details": {"retry_after_s": max(60, int(ttl) if ttl else window_s)},
            },
        )


@router.get(
    "",
    response_model=MedicationPlanListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List medication plans",
)
async def list_medications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        pattern="^(active|paused|completed|cancelled|all)$",
    ),
) -> MedicationPlanListResponse:
    items = await med_svc.list_plans(
        db=db, user_id=current_user.id, status_filter=status_filter
    )
    return MedicationPlanListResponse(data=items)


@router.get(
    "/today",
    response_model=MedicationDoseListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Today's pending + done doses across active plans",
)
async def list_today_doses(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    tzid: str = Query(default=DEFAULT_TZID, max_length=64),
) -> MedicationDoseListResponse:
    doses = await med_svc.today_doses(db=db, user_id=current_user.id, tzid=tzid)
    return MedicationDoseListResponse(data=doses)


@router.post(
    "",
    response_model=MedicationPlanResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
    summary="Create a medication plan + dose reminders atomically",
)
async def create_medication(
    body: MedicationPlanCreateBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> MedicationPlanResponse:
    await _enforce_rate_limit(
        redis,
        key_template=_CREATE_RATE_KEY,
        user_id=current_user.id,
        limit=_CREATE_RATE_MAX,
        window_s=_CREATE_RATE_WINDOW_S,
    )
    try:
        plan = await med_svc.create_plan(db, current_user.id, body)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        ) from exc
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.MEDICATION_PLAN_CREATED,
        user_id=current_user.id,
        request=request,
        details={
            "plan_id": str(plan.id),
            "dose_count": plan.dose_count,
            "appointment_id": str(plan.appointment_id) if plan.appointment_id else None,
        },
    )
    await db.commit()
    return MedicationPlanResponse(data=plan)


@router.get(
    "/{plan_id}",
    response_model=MedicationPlanDetailResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Get medication plan detail (incl. child dose schedule)",
)
async def get_medication(
    plan_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedicationPlanDetailResponse:
    detail = await med_svc.get_plan_detail(db, current_user.id, plan_id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Medication plan not found."},
        )
    return MedicationPlanDetailResponse(data=detail)


@router.patch(
    "/{plan_id}",
    response_model=MedicationPlanResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="Update medication plan (metadata + optional schedule rebuild)",
)
async def update_medication(
    plan_id: uuid.UUID,
    body: MedicationPlanUpdateBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedicationPlanResponse:
    try:
        plan = await med_svc.update_plan(db, current_user.id, plan_id, body)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        ) from exc
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Medication plan not found."},
        )
    schedule_changed = (
        body.dose_times is not None
        or body.repeat is not None
        or body.weekday_mask is not None
        or body.day_of_month is not None
    )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.MEDICATION_PLAN_UPDATED,
        user_id=current_user.id,
        request=request,
        details={"plan_id": str(plan.id), "schedule_changed": schedule_changed},
    )
    await db.commit()
    return MedicationPlanResponse(data=plan)


@router.post(
    "/{plan_id}/pause",
    response_model=MedicationPlanResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Pause a plan (deactivate child reminders, cancel pending doses)",
)
async def pause_medication(
    plan_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedicationPlanResponse:
    plan = await med_svc.pause_plan(db, current_user.id, plan_id)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Medication plan not found."},
        )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.MEDICATION_PLAN_PAUSED,
        user_id=current_user.id,
        request=request,
        details={"plan_id": str(plan.id)},
    )
    await db.commit()
    return MedicationPlanResponse(data=plan)


@router.post(
    "/{plan_id}/resume",
    response_model=MedicationPlanResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Resume a paused plan (re-activate reminders, top up materialization)",
)
async def resume_medication(
    plan_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedicationPlanResponse:
    plan = await med_svc.resume_plan(db, current_user.id, plan_id)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Medication plan not found."},
        )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.MEDICATION_PLAN_RESUMED,
        user_id=current_user.id,
        request=request,
        details={"plan_id": str(plan.id)},
    )
    await db.commit()
    return MedicationPlanResponse(data=plan)


@router.delete(
    "/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Soft-archive plan (status=cancelled; history preserved)",
)
async def delete_medication(
    plan_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    ok = await med_svc.archive_plan(db, current_user.id, plan_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Medication plan not found."},
        )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.MEDICATION_PLAN_DELETED,
        user_id=current_user.id,
        request=request,
        details={"plan_id": str(plan_id)},
    )
    await db.commit()


@router.get(
    "/{plan_id}/adherence",
    response_model=AdherenceResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="Compute taken / missed / scheduled stats over a window",
)
async def get_adherence(
    plan_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(default="7d", pattern="^(7d|30d|90d)$"),
) -> AdherenceResponse:
    try:
        adh = await med_svc.compute_adherence(
            db=db, user_id=current_user.id, plan_id=plan_id, period=period
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        ) from exc
    if adh is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Medication plan not found."},
        )
    return AdherenceResponse(data=adh)


@router.post(
    "/{plan_id}/refill",
    response_model=MedicationPlanResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="Log a refill — updates supply units + projects next_refill date",
)
async def log_refill(
    plan_id: uuid.UUID,
    body: MedicationRefillBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedicationPlanResponse:
    plan = await med_svc.log_refill(db, current_user.id, plan_id, body)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Medication plan not found."},
        )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.MEDICATION_REFILL_LOGGED,
        user_id=current_user.id,
        request=request,
        details={
            "plan_id": str(plan.id),
            "supply_units": plan.refill_supply_units,
        },
    )
    await db.commit()
    return MedicationPlanResponse(data=plan)


@router.post(
    "/import/{appointment_id}",
    response_model=MedicationImportResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
    summary="Import each medicine from an appointment's prescription (idempotent)",
)
async def import_from_appointment(
    appointment_id: uuid.UUID,
    body: MedicationImportBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> MedicationImportResponse:
    await _enforce_rate_limit(
        redis,
        key_template=_IMPORT_RATE_KEY,
        user_id=current_user.id,
        limit=_IMPORT_RATE_MAX,
        window_s=_IMPORT_RATE_WINDOW_S,
    )
    result = await med_svc.import_from_appointment(
        db=db,
        user_id=current_user.id,
        appointment_id=appointment_id,
        body=body,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Appointment not found."},
        )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.MEDICATION_IMPORTED_FROM_APPOINTMENT,
        user_id=current_user.id,
        request=request,
        details={
            "appointment_id": str(appointment_id),
            "created_count": len(result.created),
            "skipped_count": len(result.skipped),
        },
    )
    await db.commit()
    return MedicationImportResponse(data=result)
