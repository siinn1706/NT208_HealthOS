from typing import Any

from PIL import Image

from app.services import food_detector_service as service


def test_prepare_image_for_yolo_resizes_large_input() -> None:
    image = Image.new("RGB", (4000, 3000), color="white")
    resized = service._prepare_image_for_yolo(image)

    assert resized.size[0] <= service.settings.ai_max_image_size_px
    assert resized.size[1] <= service.settings.ai_max_image_size_px
    assert image.size == (4000, 3000)


def test_invalid_yolo_class_id_caps_gemini_confidence(monkeypatch: Any) -> None:
    monkeypatch.setattr(
        service,
        "_load_class_db",
        lambda _path: [
            {
                "name": "Pho bo",
                "nutrition": {
                    "Calories": 450.0,
                    "Fat": 12.0,
                    "Saturates": 4.0,
                    "Sugar": 3.0,
                    "Salt": 1.5,
                },
                "serving_type": "1 serving",
            }
        ],
    )
    monkeypatch.setattr(service, "_best_yolo_prediction", lambda _image: (99, 0.9))
    monkeypatch.setattr(
        service,
        "_run_gemini_fallback",
        lambda _image: service.DetectionResult(
            dish_name="Fallback meal",
            serving_type="1 serving",
            calories=320.0,
            fat_g=8.0,
            saturates_g=2.5,
            sugar_g=6.0,
            salt_g=0.9,
            confidence=0.92,
            source="gemini",
        ),
    )

    result = service.detect_food_nutrition(Image.new("RGB", (2, 2), color="white"))

    assert result.source == "gemini"
    assert result.confidence == 0.55
    assert result.saturates_g == 2.5
    assert result.salt_g == 0.9
