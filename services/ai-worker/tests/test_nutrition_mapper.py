from app.services.nutrition_mapper import RawFoodNutrition, map_to_healthos_nutrition


def test_mapper_keeps_calories_and_fat() -> None:
    raw = RawFoodNutrition(
        dish_name="Bun bo Hue",
        calories=500,
        fat_g=15,
        sugar_g=4,
        confidence=0.88,
        source="yolo",
    )

    result = map_to_healthos_nutrition(raw)

    assert result.calories == 500
    assert result.fat_g == 15
    assert result.carbs_g >= 4
    assert result.protein_g >= 0
    assert 0 <= result.confidence <= 1


def test_mapper_caps_gemini_confidence() -> None:
    raw = RawFoodNutrition(
        dish_name="Unknown",
        calories=200,
        fat_g=8,
        sugar_g=6,
        confidence=0.95,
        source="gemini",
    )

    result = map_to_healthos_nutrition(raw)
    assert result.confidence <= 0.65
