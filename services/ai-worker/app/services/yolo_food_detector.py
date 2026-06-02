"""Legacy YOLO food detector used as the final local fallback."""
from __future__ import annotations

import importlib.util
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from pathlib import Path
from typing import Any

from PIL import Image

from app.core.config import settings

_LOGGER = logging.getLogger(__name__)
_MODEL_LOCK = threading.Lock()
_CLASS_DB_LOCK = threading.Lock()
_YOLO_MODEL: Any | None = None
_CLASS_DB: list[dict[str, Any]] | None = None


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


def get_yolo_runtime_status() -> dict[str, Any]:
    """Expose lightweight legacy detector status for health checks."""
    return {
        "model_loaded": _YOLO_MODEL is not None,
        "model_path": str(settings.yolo_model_path),
        "model_exists": settings.yolo_model_path.exists(),
        "class_db_loaded": _CLASS_DB is not None,
        "class_db_size": len(_CLASS_DB) if _CLASS_DB is not None else 0,
        "class_names_path": str(settings.class_names_path),
        "class_names_exists": settings.class_names_path.exists(),
    }
