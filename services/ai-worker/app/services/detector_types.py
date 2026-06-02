"""Shared types for meal image detectors."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class RawFoodNutrition:
    """Raw nutrition values before HealthOS response normalization."""

    dish_name: str
    serving_type: str
    calories: float
    fat_g: float = 0.0
    saturates_g: float = 0.0
    sugar_g: float = 0.0
    salt_g: float = 0.0
    confidence: float = 0.0
    source: str = "unknown"
    protein_g: float | None = None
    carbs_g: float | None = None
    calorie_min: float | None = None
    calorie_max: float | None = None
    ingredients: list[dict[str, Any]] = field(default_factory=list)
    portion_estimate: str = "medium"
    portion_options: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
