"""Food detection service based on the local YOLO model."""
from __future__ import annotations

import importlib.util
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image

from app.core.config import settings
from app.services.nutrition_mapper import RawFoodNutrition

_MODEL_LOCK = threading.Lock()
_CLASS_DB_LOCK = threading.Lock()
_YOLO_MODEL: Any | None = None
_CLASS_DB: list[dict[str, Any]] | None = None
_LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class DetectionResult:
    dish_name: str
    serving_type: str
    calories: float
    fat_g: float
    saturates_g: float
    sugar_g: float
    salt_g: float
    confidence: float
    source: str


def _load_class_db(path: Path) -> list[dict[str, Any]]:
    global _CLASS_DB
    if _CLASS_DB is not None:
        return _CLASS_DB

    with _CLASS_DB_LOCK:
        if _CLASS_DB is not None:
            return _CLASS_DB
        if not path.exists():
            raise RuntimeError(f"class_names file not found: {path}")

        spec = importlib.util.spec_from_file_location("fooddetector_class_names", str(path))
        if spec is None or spec.loader is None:
            raise RuntimeError("Cannot load class_names module.")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        raw = getattr(module, "class_names", None)
        if not isinstance(raw, list):
            raise RuntimeError("class_names is missing or invalid.")
        _CLASS_DB = raw
        return _CLASS_DB


def _load_yolo_model() -> Any:
    global _YOLO_MODEL
    if _YOLO_MODEL is not None:
        return _YOLO_MODEL

    with _MODEL_LOCK:
        if _YOLO_MODEL is not None:
            return _YOLO_MODEL
        from ultralytics import YOLO  # Imported lazily due heavy dependency.

        model_path = settings.yolo_model_path
        if not model_path.exists():
            raise RuntimeError(f"YOLO model not found: {model_path}")
        _YOLO_MODEL = YOLO(str(model_path))
        return _YOLO_MODEL


def _best_yolo_prediction(image: Image.Image) -> tuple[int, float] | None:
    model = _load_yolo_model()
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(
        model,
        image,
        conf=settings.ai_confidence_threshold,
        device="cpu",
        verbose=False,
    )
    try:
        results = future.result(timeout=settings.ai_yolo_timeout_seconds)
    except FuturesTimeoutError as exc:
        future.cancel()
        raise TimeoutError(
            f"YOLO inference timed out after {settings.ai_yolo_timeout_seconds}s"
        ) from exc
    finally:
        executor.shutdown(wait=False, cancel_futures=True)
    first_result = results[0] if results else None
    if first_result is None or first_result.boxes is None or len(first_result.boxes) == 0:
        return None

    best_conf = 0.0
    best_class_id: int | None = None
    for box in first_result.boxes:
        conf = float(box.conf)
        class_id = int(box.cls)
        if conf > best_conf:
            best_conf = conf
            best_class_id = class_id
    if best_class_id is None:
        return None
    return best_class_id, best_conf


def _prepare_image_for_yolo(image: Image.Image) -> Image.Image:
    prepared = image.copy()
    prepared.thumbnail((settings.ai_max_image_size_px, settings.ai_max_image_size_px), Image.Resampling.LANCZOS)
    return prepared


def detect_food_nutrition(image: Image.Image) -> RawFoodNutrition:
    """Detect food and retrieve raw nutrition attributes."""
    class_db: list[dict[str, Any]] | None = None
    yolo_error: Exception | None = None
    try:
        class_db = _load_class_db(settings.class_names_path)
        prediction = _best_yolo_prediction(_prepare_image_for_yolo(image))
        if prediction is not None:
            class_id, confidence = prediction
            if 0 <= class_id < len(class_db):
                item = class_db[class_id]
                nutrition = item.get("nutrition") or {}
                result = DetectionResult(
                    dish_name=str(item.get("name") or "Unknown meal"),
                    serving_type=str(item.get("serving_type") or "1 serving"),
                    calories=float(nutrition.get("Calories") or 0.0),
                    fat_g=float(nutrition.get("Fat") or 0.0),
                    saturates_g=float(nutrition.get("Saturates") or 0.0),
                    sugar_g=float(nutrition.get("Sugar") or 0.0),
                    salt_g=float(nutrition.get("Salt") or 0.0),
                    confidence=confidence,
                    source="yolo",
                )
                _LOGGER.info(
                    "food_detection_success source=yolo dish=%s confidence=%.3f",
                    result.dish_name,
                    result.confidence,
                )
                return RawFoodNutrition(
                    dish_name=result.dish_name,
                    serving_type=result.serving_type,
                    calories=result.calories,
                    fat_g=result.fat_g,
                    saturates_g=result.saturates_g,
                    sugar_g=result.sugar_g,
                    salt_g=result.salt_g,
                    confidence=result.confidence,
                    source=result.source,
                )
            yolo_error = ValueError(
                f"YOLO returned invalid class_id={class_id} for class_db size={len(class_db)}"
            )
    except Exception as exc:  # pragma: no cover - model runtime path
        yolo_error = exc

    _LOGGER.warning("food_detection_failed source=yolo reason=%s", yolo_error)
    raise RuntimeError("Local meal detector could not identify a supported food class.") from yolo_error


def get_detector_runtime_status() -> dict[str, Any]:
    """Expose lightweight runtime status for health checks."""
    return {
        "model_loaded": _YOLO_MODEL is not None,
        "class_db_loaded": _CLASS_DB is not None,
        "class_db_size": len(_CLASS_DB) if _CLASS_DB is not None else 0,
        "yolo_model_path": str(settings.yolo_model_path),
        "class_names_path": str(settings.class_names_path),
    }
