from typing import Any

import pytest
import time
from PIL import Image

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

    monkeypatch.setattr(service, "_load_yolo_model", lambda: SlowModel())
    monkeypatch.setattr(service.settings, "ai_yolo_timeout_seconds", 0.01, raising=False)

    started = time.perf_counter()
    with pytest.raises(TimeoutError):
        service._best_yolo_prediction(Image.new("RGB", (2, 2), color="white"))

    assert time.perf_counter() - started < 0.2


def test_valid_yolo_class_returns_dataset_nutrition(monkeypatch: Any) -> None:
    monkeypatch.setattr(service, "detect_with_food_analysis", lambda _image: None)
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


def test_invalid_yolo_class_id_raises_controlled_error(monkeypatch: Any) -> None:
    monkeypatch.setattr(service, "detect_with_food_analysis", lambda _image: None)
    monkeypatch.setattr(service, "_load_class_db", lambda _path: [{"name": "Pho bo", "nutrition": {}}])
    monkeypatch.setattr(service, "_best_yolo_prediction", lambda _image: (99, 0.9))

    with pytest.raises(RuntimeError, match="Local meal detector"):
        service.detect_food_nutrition(Image.new("RGB", (2, 2), color="white"))
