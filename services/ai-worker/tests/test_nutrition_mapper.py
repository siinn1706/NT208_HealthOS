from app.services.nutrition_mapper import RawFoodNutrition, map_to_healthos_nutrition


def test_mapper_keeps_calories_and_fat() -> None:
    raw = RawFoodNutrition(
        dish_name="Bun bo Hue",
        serving_type="1 serving",
        calories=500,
        fat_g=15,
        saturates_g=5,
        sugar_g=4,
        salt_g=1.2,
        confidence=0.88,
        source="yolo",
    )

    result = map_to_healthos_nutrition(raw)

    assert result.calories == 500
    assert result.fat_g == 15
    assert result.saturates_g == 5
    assert result.sugar_g == 4
    assert result.salt_g == 1.2
    assert result.carbs_g >= 4
    assert result.protein_g >= 0
    assert result.dish_name == "Bun bo Hue"
    assert result.serving_type == "1 serving"
    assert result.source == "yolo"
    assert 0 <= result.confidence <= 1


def test_mapper_clamps_confidence_to_one() -> None:
    raw = RawFoodNutrition(
        dish_name="Unknown",
        serving_type="1 serving",
        calories=200,
        fat_g=8,
        saturates_g=2,
        sugar_g=6,
        salt_g=0.6,
        confidence=1.5,
        source="external",
    )

    result = map_to_healthos_nutrition(raw)
    assert result.confidence == 1.0
