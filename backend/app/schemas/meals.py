from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, PaginatedResponse


class NutritionResult(BaseModel):
    dish_name: str | None = None
    serving_type: str | None = None
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    saturates_g: float | None = None
    sugar_g: float | None = None
    salt_g: float | None = None
    confidence: float | None = None
    source: str | None = None


class MealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    image_url: str | None = None
    job_id: str | None = None
    status: str
    nutrition_result: NutritionResult | None = None
    logged_at: datetime.datetime
    created_at: datetime.datetime


class MealUpdateBody(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    logged_at: datetime.datetime | None = None


class MealIngredientItem(BaseModel):
    name: str
    grams: float = Field(ge=0)
    kcal: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)


class MealDataResponse(DataResponse[MealResponse]):
    ...


class MealListResponse(PaginatedResponse[MealResponse]):
    ...


class MealIngredientListResponse(DataResponse[list[MealIngredientItem]]):
    ...
