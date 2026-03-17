from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.dashboard import NutritionSuggestionsResponse
from app.services import dashboard as dashboard_svc

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

