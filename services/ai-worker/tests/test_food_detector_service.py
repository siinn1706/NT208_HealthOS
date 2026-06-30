from typing import Any

import pytest
import time
from PIL import Image

from app.services.calorieclip_detector import CalorieClipEstimate
from app.services import food_detector_service as service


def test_prepare_image_for_yolo_resizes_large_input() -> None:
    image = Image.new("RGB", (4000, 3000), color="white")
    resized = service._prepare_image_for_yolo(image)

    assert resized.size[0] <= service.settings.ai_max_image_size_px
    assert resized.size[1] <= service.settings.ai_max_image_size_px
    assert image.size == (4000, 3000)


def test_yolo_timeout_returns_without_waiting_for_hung_inference(monkeypatch: Any) -> None:
    class SlowModel:
        def __call__(self, *args: Any, **kwargs: Any) -> list[Any]:
            time.sleep(0.5)
            return []

    import app.services.yolo_food_detector as yolo_mod
    monkeypatch.setattr(yolo_mod, "_load_yolo_model", lambda: SlowModel())
    monkeypatch.setattr(service.settings, "ai_yolo_timeout_seconds", 0.01, raising=False)

    started = time.perf_counter()
    with pytest.raises(TimeoutError):
        service._best_yolo_prediction(Image.new("RGB", (2, 2), color="white"))

    assert time.perf_counter() - started < 0.2


def test_valid_yolo_class_returns_dataset_nutrition(monkeypatch: Any) -> None:
    monkeypatch.setattr(service, "detect_with_food_analysis", lambda _image: None)
    monkeypatch.setattr(service, "estimate_with_calorieclip", lambda _image, _dish_name: None)
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
    monkeypatch.setattr(service, "_best_yolo_prediction", lambda _image: (0, 0.9))

    result = service.detect_food_nutrition(Image.new("RGB", (2, 2), color="white"))

    assert result.source == "yolo"
    assert result.dish_name == "Pho bo"
    assert result.confidence == 0.9
    assert result.saturates_g == 4.0
    assert result.salt_g == 1.5


def test_yolo_fallback_uses_calorieclip_crosscheck(monkeypatch: Any) -> None:
    monkeypatch.setattr(service, "detect_with_food_analysis", lambda _image: None)
    monkeypatch.setattr(
        service,
        "estimate_with_calorieclip",
        lambda _image, _dish_name: CalorieClipEstimate(
            calories=620.0,
            confidence=0.7,
            label="CalorieCLIP regression",
        ),
    )
    monkeypatch.setattr(
        service,
        "_load_class_db",
        lambda _path: [
            {
                "name": "Hamburger",
                "nutrition": {"Calories": 350.0},
                "serving_type": "1 serving",
            }
        ],
    )
    monkeypatch.setattr(service, "_best_yolo_prediction", lambda _image: (0, 0.9))

    result = service.detect_food_nutrition(Image.new("RGB", (2, 2), color="white"))

    assert result.source == "yolo+calorieclip"
    assert result.dish_name == "Hamburger"
    assert result.confidence == 0.8
    assert result.calorie_min is not None
    assert result.calorie_max is not None
    assert result.calorie_max > result.calories


def test_generic_fallback_returns_low_confidence_estimate(monkeypatch: Any) -> None:
    monkeypatch.setattr(service, "detect_with_food_analysis", lambda _image: None)
    monkeypatch.setattr(service, "_load_class_db", lambda _path: [{"name": "Pho bo", "nutrition": {}}])
    monkeypatch.setattr(service, "_best_yolo_prediction", lambda _image: None)

    result = service.detect_food_nutrition(Image.new("RGB", (2, 2), color="white"))

    assert result.source == "generic-photo-estimate"
    assert result.dish_name == "Photo meal"
    assert result.calories == 250.0
    assert result.confidence == 0.25
    assert result.calorie_min is not None
    assert result.calorie_max is not None
    assert result.warnings == [
        "Low-confidence fallback estimate; confirm food name and portion before saving.",
    ]


def test_invalid_yolo_class_id_uses_generic_fallback(monkeypatch: Any) -> None:
    monkeypatch.setattr(service, "detect_with_food_analysis", lambda _image: None)
    monkeypatch.setattr(service, "estimate_with_calorieclip", lambda _image, _dish_name: None)
    monkeypatch.setattr(service, "_load_class_db", lambda _path: [{"name": "Pho bo", "nutrition": {}}])
    monkeypatch.setattr(service, "_best_yolo_prediction", lambda _image: (99, 0.9))

    result = service.detect_food_nutrition(Image.new("RGB", (2, 2), color="white"))

    assert result.source == "generic-photo-estimate"
    assert result.confidence == 0.25
