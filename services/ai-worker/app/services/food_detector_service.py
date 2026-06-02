"""Food detection orchestration with primary, cross-check, and legacy fallback."""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import replace
from typing import Any

from PIL import Image

from app.core.config import settings
from app.services.calorieclip_detector import (
    estimate_with_calorieclip,
    get_calorieclip_runtime_status,
)
from app.services.detector_types import RawFoodNutrition
from app.services.food_analysis_detector import (
    detect_with_food_analysis,
    get_food_analysis_runtime_status,
)
from app.services.portion_options import build_calorie_range
from app.services.yolo_food_detector import (
    _load_class_db,
    _load_yolo_model,
    _prepare_image_for_yolo,
    get_yolo_runtime_status,
)

_LOGGER = logging.getLogger(__name__)


def _best_yolo_prediction(image: Image.Image) -> tuple[int, float] | None:
    """Compatibility wrapper kept here for focused unit monkeypatches."""
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


def _raw_from_yolo_item(
    item: dict[str, Any],
    *,
    confidence: float,
) -> RawFoodNutrition:
    nutrition = item.get("nutrition") or {}
    calories = float(nutrition.get("Calories") or 0.0)
    calorie_min, calorie_max = build_calorie_range(
        calories,
        settings.ai_calorie_range_ratio,
    )
    return RawFoodNutrition(
        dish_name=str(item.get("name") or "Unknown meal"),
        serving_type=str(item.get("serving_type") or "1 serving"),
        calories=calories,
        fat_g=float(nutrition.get("Fat") or 0.0),
        saturates_g=float(nutrition.get("Saturates") or 0.0),
        sugar_g=float(nutrition.get("Sugar") or 0.0),
        salt_g=float(nutrition.get("Salt") or 0.0),
        confidence=confidence,
        source="yolo",
        calorie_min=calorie_min,
        calorie_max=calorie_max,
        portion_estimate="medium",
        warnings=["Legacy YOLO nutrition estimate; confirm portion before saving."],
    )


def _detect_with_yolo(image: Image.Image) -> RawFoodNutrition:
    yolo_error: Exception | None = None
    try:
        class_db = _load_class_db(settings.class_names_path)
        prediction = _best_yolo_prediction(_prepare_image_for_yolo(image))
        if prediction is not None:
            class_id, confidence = prediction
            if 0 <= class_id < len(class_db):
                result = _raw_from_yolo_item(class_db[class_id], confidence=confidence)
                _LOGGER.info(
                    "food_detection_success source=yolo dish=%s confidence=%.3f",
                    result.dish_name,
                    result.confidence,
                )
                return result
            yolo_error = ValueError(
                f"YOLO returned invalid class_id={class_id} for class_db size={len(class_db)}"
            )
    except Exception as exc:  # pragma: no cover - model runtime path
        yolo_error = exc

    _LOGGER.warning("food_detection_failed source=yolo reason=%s", yolo_error)
    raise RuntimeError("Local meal detector could not identify a supported food class.") from yolo_error


def _with_calorieclip_range(image: Image.Image, primary: RawFoodNutrition) -> RawFoodNutrition:
    warnings = list(primary.warnings)
    try:
        estimate = estimate_with_calorieclip(image, primary.dish_name)
    except Exception as exc:  # pragma: no cover - model runtime path
        estimate = None
        warnings.append("CalorieCLIP unavailable; range derived from primary model.")
        _LOGGER.warning("food_detection_crosscheck_failed source=calorieclip reason=%s", exc)

    if estimate is None:
        calorie_min, calorie_max = build_calorie_range(
            primary.calories,
            settings.ai_calorie_range_ratio,
        )
        return replace(
            primary,
            calorie_min=primary.calorie_min or calorie_min,
            calorie_max=primary.calorie_max or calorie_max,
            warnings=warnings,
        )

    calorie_min, calorie_max = build_calorie_range(
        primary.calories,
        settings.ai_calorie_range_ratio,
        estimate.calories,
    )
    confidence = max(min((primary.confidence + estimate.confidence) / 2.0, 1.0), 0.0)
    return replace(
        primary,
        calorie_min=calorie_min,
        calorie_max=calorie_max,
        confidence=confidence,
        source="food-analysis+calorieclip",
        warnings=warnings,
    )


def detect_food_nutrition(image: Image.Image) -> RawFoodNutrition:
    """Detect food and retrieve raw nutrition attributes."""
    try:
        primary = detect_with_food_analysis(image)
        if primary is not None:
            nutrition = _with_calorieclip_range(image, primary)
            _LOGGER.info(
                "food_detection_success source=%s dish=%s confidence=%.3f",
                nutrition.source,
                nutrition.dish_name,
                nutrition.confidence,
            )
            return nutrition
    except Exception as exc:  # pragma: no cover - model runtime path
        _LOGGER.warning("food_detection_failed source=food-analysis reason=%s", exc)

    return _detect_with_yolo(image)


def get_detector_runtime_status() -> dict[str, Any]:
    """Expose lightweight runtime status for health checks."""
    return {
        "primary": get_food_analysis_runtime_status(),
        "crosscheck": get_calorieclip_runtime_status(),
        "legacy_yolo": get_yolo_runtime_status(),
    }
