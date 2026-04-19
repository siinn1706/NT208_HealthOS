from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse, PaginationMeta
from app.schemas.dashboard import NutritionSuggestionsResponse
from app.schemas.ingredients import IngredientDTO, IngredientListResponse
from app.services import dashboard as dashboard_svc
from app.services import ingredients as ingredient_svc

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


@router.get(
    "/suggestions",
    response_model=NutritionSuggestionsResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get nutrition suggestions",
)
async def get_nutrition_suggestions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NutritionSuggestionsResponse:
    data = await dashboard_svc.get_nutrition_suggestions(db=db, user_id=current_user.id)
    return NutritionSuggestionsResponse(data=data)


@router.get(
    "/ingredients",
    response_model=IngredientListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Search the bilingual ingredient catalog (matches name_vi OR name_en)",
)
async def list_ingredients(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str | None = Query(default=None, max_length=128, description="Search term (matches both languages)"),
    category: str | None = Query(default=None, max_length=32),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
) -> IngredientListResponse:
    items, total = await ingredient_svc.search_ingredients(
        db=db,
        query=q,
        category=category,
        page=page,
        per_page=per_page,
    )
    return IngredientListResponse(
        data=[IngredientDTO.model_validate(item) for item in items],
        meta=PaginationMeta(page=page, per_page=per_page, total=total),
    )

