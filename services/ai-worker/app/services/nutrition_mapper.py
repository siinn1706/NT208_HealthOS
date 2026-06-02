"""Map FoodDetector nutrition to HealthOS schema."""
from __future__ import annotations

from typing import Any

from app.schemas.analysis import NutritionResult
from app.services.detector_types import RawFoodNutrition
from app.services.portion_options import build_calorie_range, build_portion_options, rounded

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


def _calc_carb_ratio(dish_name: str) -> float:
    text = dish_name.lower()
    carb_hits = sum(1 for item in _CARB_KEYWORDS if item in text)
    protein_hits = sum(1 for item in _PROTEIN_KEYWORDS if item in text)

    # Start from balanced split of non-fat calories.
    carb_ratio = 0.62
    carb_ratio += min(carb_hits * 0.08, 0.22)
    carb_ratio -= min(protein_hits * 0.07, 0.20)
    return max(0.30, min(carb_ratio, 0.88))


def _sanitize_ingredients(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized: list[dict[str, Any]] = []
    for item in items:
        name = item.get("ingredient_name") or item.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        row: dict[str, Any] = {"name": name.strip()}
        for key in ("grams", "kcal", "calories", "protein_g", "carbs_g", "fat_g", "confidence"):
            value = item.get(key)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                row[key] = rounded(value)
        sanitized.append(row)
    return sanitized


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

    carbs_g = (
        max(float(raw.carbs_g), 0.0)
        if raw.carbs_g is not None
        else max(non_fat_kcal * carb_ratio / 4.0, sugar_g)
    )
    protein_g = (
        max(float(raw.protein_g), 0.0)
        if raw.protein_g is not None
        else max(non_fat_kcal * (1.0 - carb_ratio) / 4.0, 0.0)
    )

    confidence = max(min(float(raw.confidence), 1.0), 0.0)
    fallback_min, fallback_max = build_calorie_range(calories, 0.15)
    calorie_min = max(float(raw.calorie_min), 0.0) if raw.calorie_min is not None else fallback_min
    calorie_max = max(float(raw.calorie_max), 0.0) if raw.calorie_max is not None else fallback_max
    if calorie_min > calorie_max:
        calorie_min, calorie_max = calorie_max, calorie_min

    portion_options = raw.portion_options or build_portion_options(
        calories=calories,
        calorie_min=calorie_min,
        calorie_max=calorie_max,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
    )

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
        calorie_min=round(calorie_min, 2) if calorie_min is not None else None,
        calorie_max=round(calorie_max, 2) if calorie_max is not None else None,
        portion_estimate=raw.portion_estimate or "medium",
        portion_options=portion_options,
        ingredients=_sanitize_ingredients(raw.ingredients),
        warnings=[item for item in raw.warnings if isinstance(item, str) and item.strip()],
    )
