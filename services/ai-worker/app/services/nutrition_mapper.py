"""Map FoodDetector nutrition to HealthOS schema."""
from __future__ import annotations

from dataclasses import dataclass

from app.schemas.analysis import NutritionResult

_PROTEIN_KEYWORDS = (
    "beef",
    "pork",
    "chicken",
    "fish",
    "shrimp",
    "egg",
    "tofu",
    "duck",
    "seafood",
    "mutton",
)
_CARB_KEYWORDS = (
    "rice",
    "noodle",
    "bun",
    "pho",
    "bread",
    "cake",
    "sticky",
    "porridge",
    "vermicelli",
    "pancake",
)


@dataclass(slots=True)
class RawFoodNutrition:
    """Raw nutrition values from FoodDetector dataset/API."""

    dish_name: str
    serving_type: str
    calories: float
    fat_g: float
    saturates_g: float
    sugar_g: float
    salt_g: float
    confidence: float
    source: str


def _calc_carb_ratio(dish_name: str) -> float:
    text = dish_name.lower()
    carb_hits = sum(1 for item in _CARB_KEYWORDS if item in text)
    protein_hits = sum(1 for item in _PROTEIN_KEYWORDS if item in text)

    # Start from balanced split of non-fat calories.
    carb_ratio = 0.62
    carb_ratio += min(carb_hits * 0.08, 0.22)
    carb_ratio -= min(protein_hits * 0.07, 0.20)
    return max(0.30, min(carb_ratio, 0.88))


def map_to_healthos_nutrition(raw: RawFoodNutrition) -> NutritionResult:
    """Normalize dataset nutrition to HealthOS macro fields."""
    dish_name = str(raw.dish_name or "Unknown meal")
    serving_type = str(raw.serving_type or "1 serving")
    calories = max(float(raw.calories), 0.0)
    fat_g = max(float(raw.fat_g), 0.0)
    saturates_g = max(float(raw.saturates_g), 0.0)
    sugar_g = max(float(raw.sugar_g), 0.0)
    salt_g = max(float(raw.salt_g), 0.0)

    non_fat_kcal = max(calories - (fat_g * 9.0), 0.0)
    carb_ratio = _calc_carb_ratio(dish_name)

    carbs_g = max(non_fat_kcal * carb_ratio / 4.0, sugar_g)
    protein_g = max(non_fat_kcal * (1.0 - carb_ratio) / 4.0, 0.0)

    confidence = max(min(float(raw.confidence), 1.0), 0.0)

    return NutritionResult(
        dish_name=dish_name,
        serving_type=serving_type,
        calories=round(calories, 2),
        protein_g=round(protein_g, 2),
        carbs_g=round(carbs_g, 2),
        fat_g=round(fat_g, 2),
        saturates_g=round(saturates_g, 2),
        sugar_g=round(sugar_g, 2),
        salt_g=round(salt_g, 2),
        confidence=round(confidence, 3),
        source=raw.source,
    )
