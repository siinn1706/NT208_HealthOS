"""Request/response schemas for meal analysis."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class AnalyzeMealRequest(BaseModel):
    """Input payload from Core BE."""

    meal_id: str = Field(min_length=1)
    image_url: str = Field(min_length=1)


class NutritionResult(BaseModel):
    """Normalized nutrition payload used by Core."""

    dish_name: str = ""
    serving_type: str = "1 serving"
    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0
    saturates_g: float = 0.0
    sugar_g: float = 0.0
    salt_g: float = 0.0
    confidence: float = 0.0
    source: str = "yolo"


class AnalyzeMealResponse(BaseModel):
    """Response payload returned to Core BE."""

    model_config = ConfigDict(extra="ignore")

    meal_id: str
    status: str = "analyzed"
    nutrition: NutritionResult
