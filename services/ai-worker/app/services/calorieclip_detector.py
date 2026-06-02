"""CalorieCLIP cross-check detector for meal calorie estimates."""
from __future__ import annotations

import importlib.util
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import dataclass
from typing import Any

from PIL import Image

from app.core.config import settings

_LOGGER = logging.getLogger(__name__)
_MODEL_LOCK = threading.Lock()
_CALORIECLIP_MODEL: Any | None = None


@dataclass(slots=True)
class CalorieClipEstimate:
    calories: float
    confidence: float
    label: str


def _load_local_calorieclip_class() -> type[Any]:
    module_path = settings.calorieclip_model_path / "calorie_clip.py"
    if not module_path.exists():
        raise RuntimeError(f"CalorieCLIP wrapper not found: {module_path}")
    spec = importlib.util.spec_from_file_location("local_calorie_clip", str(module_path))
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load CalorieCLIP wrapper module.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    model_class = getattr(module, "CalorieCLIP", None)
    if model_class is None:
        raise RuntimeError("CalorieCLIP class missing from wrapper module.")
    return model_class


def _load_calorieclip() -> Any:
    global _CALORIECLIP_MODEL
    if _CALORIECLIP_MODEL is not None:
        return _CALORIECLIP_MODEL
    with _MODEL_LOCK:
        if _CALORIECLIP_MODEL is not None:
            return _CALORIECLIP_MODEL
        model_path = settings.calorieclip_model_path
        if not model_path.exists():
            raise RuntimeError(f"CalorieCLIP model not found: {model_path}")
        model_class = _load_local_calorieclip_class()
        _CALORIECLIP_MODEL = model_class.from_pretrained(model_path, device="cpu")
        return _CALORIECLIP_MODEL


def _estimate(model: Any, image: Image.Image) -> CalorieClipEstimate | None:
    calories = float(model.predict(image))
    return CalorieClipEstimate(
        calories=max(calories, 0.0),
        confidence=0.7,
        label="CalorieCLIP regression",
    )


def estimate_with_calorieclip(image: Image.Image, dish_name: str | None) -> CalorieClipEstimate | None:
    """Estimate calories with CalorieCLIP when the local model is available."""
    if not settings.ai_calorieclip_enabled:
        return None
    if not settings.calorieclip_model_path.exists():
        return None
    prepared = image.copy().convert("RGB")
    prepared.thumbnail((settings.ai_max_image_size_px, settings.ai_max_image_size_px), Image.Resampling.LANCZOS)
    model = _load_calorieclip()
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_estimate, model, prepared)
    try:
        return future.result(timeout=settings.ai_calorieclip_timeout_seconds)
    except FuturesTimeoutError as exc:
        future.cancel()
        raise TimeoutError(
            f"CalorieCLIP inference timed out after {settings.ai_calorieclip_timeout_seconds}s"
        ) from exc
    except Exception as exc:  # pragma: no cover - model runtime path
        _LOGGER.warning("calorieclip_failed dish=%s reason=%s", dish_name, exc)
        return None
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def get_calorieclip_runtime_status() -> dict[str, Any]:
    """Expose non-secret runtime status for health checks."""
    return {
        "enabled": settings.ai_calorieclip_enabled,
        "model_loaded": _CALORIECLIP_MODEL is not None,
        "model_path": str(settings.calorieclip_model_path),
        "model_exists": settings.calorieclip_model_path.exists(),
        "wrapper_exists": (settings.calorieclip_model_path / "calorie_clip.py").exists(),
    }
