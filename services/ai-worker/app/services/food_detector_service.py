"""Food detection service based on YOLO with Gemini fallback."""
from __future__ import annotations

import importlib.util
import json
import threading
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


@dataclass(slots=True)
class DetectionResult:
    dish_name: str
    calories: float
    fat_g: float
    sugar_g: float
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
    results = model(image, conf=settings.ai_confidence_threshold, device="cpu", verbose=False)
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


def _run_gemini_fallback(image: Image.Image) -> DetectionResult:
    if not settings.ai_enable_gemini_fallback or not settings.gemini_api_key:
        raise RuntimeError("Gemini fallback unavailable (disabled or missing API key).")

    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    prompt = (
        "Analyze this meal image and return strict JSON only with keys: "
        "dish_name, calories, fat_g, sugar_g, confidence. "
        "All numeric values must be numbers."
    )
    response = model.generate_content([prompt, image], request_options={"timeout": settings.ai_gemini_timeout_seconds})
    raw_text = (response.text or "").strip()
    if not raw_text:
        raise RuntimeError("Gemini returned empty content.")

    start = raw_text.find("{")
    end = raw_text.rfind("}")
    payload = json.loads(raw_text[start : end + 1] if start != -1 and end != -1 else raw_text)

    return DetectionResult(
        dish_name=str(payload.get("dish_name") or "Unknown meal"),
        calories=float(payload.get("calories") or 0.0),
        fat_g=float(payload.get("fat_g") or 0.0),
        sugar_g=float(payload.get("sugar_g") or 0.0),
        confidence=float(payload.get("confidence") or 0.5),
        source="gemini",
    )


def detect_food_nutrition(image: Image.Image) -> RawFoodNutrition:
    """Detect food and retrieve raw nutrition attributes."""
    class_db = _load_class_db(settings.class_names_path)

    yolo_error: Exception | None = None
    try:
        prediction = _best_yolo_prediction(image)
        if prediction is not None:
            class_id, confidence = prediction
            if 0 <= class_id < len(class_db):
                item = class_db[class_id]
                nutrition = item.get("nutrition") or {}
                result = DetectionResult(
                    dish_name=str(item.get("name") or "Unknown meal"),
                    calories=float(nutrition.get("Calories") or 0.0),
                    fat_g=float(nutrition.get("Fat") or 0.0),
                    sugar_g=float(nutrition.get("Sugar") or 0.0),
                    confidence=confidence,
                    source="yolo",
                )
                return RawFoodNutrition(
                    dish_name=result.dish_name,
                    calories=result.calories,
                    fat_g=result.fat_g,
                    sugar_g=result.sugar_g,
                    confidence=result.confidence,
                    source=result.source,
                )
            yolo_error = ValueError(
                f"YOLO returned invalid class_id={class_id} for class_db size={len(class_db)}"
            )
    except Exception as exc:  # pragma: no cover - model runtime path
        yolo_error = exc

    gemini_result = _run_gemini_fallback(image)
    return RawFoodNutrition(
        dish_name=gemini_result.dish_name,
        calories=gemini_result.calories,
        fat_g=gemini_result.fat_g,
        sugar_g=gemini_result.sugar_g,
        confidence=gemini_result.confidence if yolo_error is None else min(gemini_result.confidence, 0.55),
        source=gemini_result.source,
    )
