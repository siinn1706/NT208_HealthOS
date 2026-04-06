"""Meals endpoints."""
from __future__ import annotations

import datetime
import io
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.storage import upload_file
from app.core.config import settings
from app.core.security import get_current_user
from app.models.core import Meal, MealStatusEnum, User
from app.schemas.common import DataResponse, ErrorResponse, PaginationMeta
from app.schemas.meals import MealDataResponse, MealListResponse, MealResponse
from app.services import meals as meal_svc
from app.tasks.meal_analysis import analyze_meal_image

router = APIRouter(prefix="/meals", tags=["Meals"])

_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MiB
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


class _MealCreateJsonBody(BaseModel):
    name: str = Field(min_length=1)
    notes: str | None = None
    logged_at: datetime.datetime | None = None


def _bad_request(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": "VALIDATION_ERROR",
            "message": message,
        },
    )


@router.get(
    "",
    response_model=MealListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List meal logs",
)
async def list_meals(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = 1,
    per_page: int = 20,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
) -> MealListResponse:
    if page < 1 or per_page < 1:
        raise _bad_request("page and per_page must be >= 1")

    meals, total = await meal_svc.list_meals(
        db=db,
        user_id=current_user.id,
        page=page,
        per_page=per_page,
        date_from=date_from,
        date_to=date_to,
    )
    return MealListResponse(
        data=[MealResponse.model_validate(item) for item in meals],
        meta=PaginationMeta(page=page, per_page=per_page, total=total),
    )


@router.post(
    "",
    response_model=MealDataResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Create a meal log (with optional image upload)",
)
async def create_meal(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    name_form: Annotated[str | None, Form()] = None,
    notes_form: Annotated[str | None, Form()] = None,
    logged_at_form: Annotated[datetime.datetime | None, Form()] = None,
    image: UploadFile | None = File(default=None),
) -> MealDataResponse:
    content_type = request.headers.get("content-type", "")

    name: str | None = None
    logged_at: datetime.datetime | None = None
    image_url: str | None = None
    job_id: str | None = None

    if "application/json" in content_type:
        body = await request.json()
        try:
            parsed = _MealCreateJsonBody.model_validate(body)
        except Exception as exc:  # pragma: no cover - defensive
            raise _bad_request("Invalid JSON body for meal creation.") from exc
        name = parsed.name
        logged_at = parsed.logged_at
        _ = parsed.notes
    else:
        name = name_form
        logged_at = logged_at_form
        _ = notes_form

    if not name:
        raise _bad_request("name is required")

    # Handle image upload
    if image and image.filename:
        image_bytes = await image.read()
        if len(image_bytes) > _MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum 10 MiB.")
        
        content_type = image.content_type or "image/jpeg"
        if content_type not in _ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {content_type}")
        
        file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        key = f"{current_user.id}/{uuid.uuid4()}.{file_ext}"
        image_url = upload_file(
            bucket=settings.storage_bucket_meals,
            key=key,
            file_bytes=image_bytes,
            content_type=content_type,
        )

    # Create meal first
    meal = await meal_svc.create_meal(
        db=db,
        user_id=current_user.id,
        name=name,
        logged_at=logged_at,
        image_url=image_url,
        job_id=None,
    )

    # If image was uploaded, trigger async analysis after meal is created
    if image_url:
        job = analyze_meal_image.delay(str(meal.id), image_url)
        from sqlalchemy import update

        stmt = update(Meal).where(Meal.id == meal.id).values(job_id=job.id)
        await db.execute(stmt)
        await db.commit()
        meal.job_id = job.id

    return MealDataResponse(data=MealResponse.model_validate(meal))


@router.get(
    "/{meal_id}",
    response_model=MealDataResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Get single meal with nutrition result",
)
async def get_meal(
    meal_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MealDataResponse:
    meal = await meal_svc.get_meal_by_id(db, current_user.id, meal_id)
    if meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_FOUND",
                "message": "Meal not found.",
            },
        )
    return MealDataResponse(data=MealResponse.model_validate(meal))


class AnalysisJobResponse(BaseModel):
    job_id: str
    status: str


@router.post(
    "/analyze-photo",
    response_model=AnalysisJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Analyze meal photo - starts async job",
)
async def analyze_meal_photo(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    name: str = Form(...),
    image: UploadFile = File(...),
) -> AnalysisJobResponse:
    """Upload meal photo for AI analysis."""
    if not image.filename:
        raise _bad_request("image file is required")

    # Upload image to storage
    image_bytes = await image.read()
    if len(image_bytes) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10 MiB.")
    
    content_type = image.content_type or "image/jpeg"
    if content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {content_type}")
    
    file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
    key = f"{current_user.id}/{uuid.uuid4()}.{file_ext}"
    image_url = upload_file(
        bucket=settings.storage_bucket_meals,
        key=key,
        file_bytes=image_bytes,
        content_type=content_type,
    )

    # Create meal record
    meal = await meal_svc.create_meal(
        db=db,
        user_id=current_user.id,
        name=name,
        logged_at=datetime.datetime.now(datetime.timezone.utc),
        image_url=image_url,
    )

    # Trigger async analysis
    job = analyze_meal_image.delay(str(meal.id), image_url)

    # Update meal with job_id
    from sqlalchemy import update

    stmt = update(Meal).where(Meal.id == meal.id).values(job_id=job.id)
    await db.execute(stmt)
    await db.commit()

    return AnalysisJobResponse(job_id=job.id, status="processing")


@router.get(
    "/analyze-photo/{job_id}",
    response_model=AnalysisJobResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Get analysis job status by job_id",
)
async def get_analysis_status_by_job(
    job_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalysisJobResponse:
    """Get the status of an analysis job by job_id."""
    from sqlalchemy import select

    from app.models.core import Meal

    stmt = select(Meal).where(Meal.job_id == job_id, Meal.user_id == current_user.id)
    meal = (await db.execute(stmt)).scalar_one_or_none()

    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Analysis job not found."},
        )

    return AnalysisJobResponse(job_id=job_id, status=meal.status.value)


@router.get(
    "/{meal_id}/analysis-status",
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Get analysis status for a meal",
)
async def get_meal_analysis_status(
    meal_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Get the analysis status for a specific meal."""
    status_info = await meal_svc.get_meal_analysis_status(db, current_user.id, meal_id)
    if not status_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Meal not found."},
        )
    return status_info


class CalorieSummaryPoint(BaseModel):
    date: str
    total_calories: float


@router.get(
    "/calories-summary",
    response_model=DataResponse[list[CalorieSummaryPoint]],
    responses={401: {"model": ErrorResponse}},
    summary="Get daily calorie totals for a date range",
)
async def get_calories_summary(
    date_from: datetime.date,
    date_to: datetime.date,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse[list[CalorieSummaryPoint]]:
    """Returns daily calorie totals for a date range."""
    from sqlalchemy import and_

    start_dt = datetime.datetime.combine(date_from, datetime.time.min, tzinfo=datetime.timezone.utc)
    end_dt = datetime.datetime.combine(date_to, datetime.time.max, tzinfo=datetime.timezone.utc)

    stmt = (
        select(
            func.date(Meal.logged_at).label("d"),
            func.coalesce(func.sum(Meal.nutrition_result["calories"]), 0).label("total_calories"),
        )
        .where(
            and_(
                Meal.user_id == current_user.id,
                Meal.logged_at >= start_dt,
                Meal.logged_at <= end_dt,
            )
        )
        .group_by(func.date(Meal.logged_at))
        .order_by("d")
    )
    rows = (await db.execute(stmt)).mappings().all()
    return DataResponse(
        data=[
            CalorieSummaryPoint(
                date=r.d.isoformat() if hasattr(r.d, "isoformat") else str(r.d),
                total_calories=float(r.total_calories),
            )
            for r in rows
        ]
    )
