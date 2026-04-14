from typing import Any

from PIL import Image

from app.services import food_detector_service as service


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
                    "Sugar": 3.0,
                },
            }
        ],
    )
    monkeypatch.setattr(service, "_best_yolo_prediction", lambda _image: (99, 0.9))
    monkeypatch.setattr(
        service,
        "_run_gemini_fallback",
        lambda _image: service.DetectionResult(
            dish_name="Fallback meal",
            calories=320.0,
            fat_g=8.0,
            sugar_g=6.0,
            confidence=0.92,
            source="gemini",
        ),
    )

    result = service.detect_food_nutrition(Image.new("RGB", (2, 2), color="white"))

    assert result.source == "gemini"
    assert result.confidence == 0.55
