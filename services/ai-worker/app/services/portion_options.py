"""Calorie ranges and local portion scaling helpers."""
from __future__ import annotations

from typing import Any

PORTION_SCALES: tuple[tuple[str, str, float], ...] = (
    ("small", "Ít", 0.75),
    ("medium", "Vừa", 1.0),
    ("large", "Nhiều", 1.25),
)


def rounded(value: float | int | None) -> float:
    if value is None:
        return 0.0
    return round(max(float(value), 0.0), 2)


def build_calorie_range(
    calories: float,
    range_ratio: float,
    crosscheck_calories: float | None = None,
) -> tuple[float, float]:
    """Build a conservative calorie band from primary and cross-check estimates."""
    center = max(float(calories), 0.0)
    if crosscheck_calories is not None and crosscheck_calories > 0:
        low = min(center, crosscheck_calories)
        high = max(center, crosscheck_calories)
        margin = max((high - low) * 0.35, center * range_ratio * 0.5, 25.0)
        return rounded(low - margin), rounded(high + margin)

    margin = max(center * range_ratio, 25.0)
    return rounded(center - margin), rounded(center + margin)


def scale_number(value: float | int | None, scale: float) -> float:
    return rounded((float(value) if value is not None else 0.0) * scale)


def build_portion_options(
    *,
    calories: float,
    calorie_min: float,
    calorie_max: float,
    protein_g: float,
    carbs_g: float,
    fat_g: float,
) -> list[dict[str, Any]]:
    """Return the three user-facing portion choices expected by clients."""
    return [
        {
            "value": value,
            "label": label,
            "scale": scale,
            "calories": scale_number(calories, scale),
            "calorie_min": scale_number(calorie_min, scale),
            "calorie_max": scale_number(calorie_max, scale),
            "protein_g": scale_number(protein_g, scale),
            "carbs_g": scale_number(carbs_g, scale),
            "fat_g": scale_number(fat_g, scale),
        }
        for value, label, scale in PORTION_SCALES
    ]
