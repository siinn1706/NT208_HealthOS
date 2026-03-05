"""Meals endpoints."""
from __future__ import annotations

import datetime
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse, PaginationMeta
from app.schemas.meals import MealDataResponse, MealListResponse, MealResponse
from app.services import meals as meal_svc

router = APIRouter(prefix="/meals", tags=["Meals"])


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
        _ = image

    if not name:
        raise _bad_request("name is required")

    meal = await meal_svc.create_meal(
        db=db,
        user_id=current_user.id,
        name=name,
        logged_at=logged_at,
    )
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
