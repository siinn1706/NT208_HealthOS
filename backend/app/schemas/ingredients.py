"""Pydantic schemas for the bilingual ingredient catalog (B7 P2)."""
from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, PaginatedResponse


class IngredientDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name_vi: str
    name_en: str
    category: str
    calories_per_100g: float = Field(ge=0)
    protein_per_100g: float = Field(ge=0)
    carbs_per_100g: float = Field(ge=0)
    fat_per_100g: float = Field(ge=0)
    unit_hint: str
    name_en_verified: bool = True


class IngredientResponse(DataResponse[IngredientDTO]):
    ...


class IngredientListResponse(PaginatedResponse[IngredientDTO]):
    ...
