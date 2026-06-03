"""Primary food analysis detector backed by a local Hugging Face model."""
from __future__ import annotations

import json
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import dataclass
from typing import Any

from PIL import Image

from app.core.config import settings
from app.services.detector_types import RawFoodNutrition

_LOGGER = logging.getLogger(__name__)
_PIPELINE_LOCK = threading.Lock()
_FOOD_ANALYSIS_RUNTIME: "FoodAnalysisRuntime | None" = None


@dataclass(slots=True)
class FoodAnalysisRuntime:
    model: Any
    processor: Any


def _read_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return max(float(value), 0.0)
    if isinstance(value, str):
        match = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
        if match:
            return max(float(match.group(0)), 0.0)
    return None


def _read_string(value: Any) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def _extract_json(text: str) -> dict[str, Any] | None:
    candidates = [text]
    fenced = re.findall(r"```(?:json)?\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    candidates.extend(fenced)
    brace_match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if brace_match:
        candidates.append(brace_match.group(0))
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


def _parse_ingredients(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict):
        ingredients: list[dict[str, Any]] = []
        for name, grams in value.items():
            amount = _read_number(grams)
            if isinstance(name, str) and amount is not None:
                ingredients.append({"name": name, "grams": amount})
        return ingredients
    if not isinstance(value, list):
        return []
    ingredients: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        name = _read_string(item.get("name")) or _read_string(item.get("ingredient_name"))
        if not name:
            continue
        normalized: dict[str, Any] = {"name": name}
        for key in ("grams", "kcal", "calories", "protein_g", "carbs_g", "fat_g", "confidence"):
            number = _read_number(item.get(key))
            if number is not None:
                normalized[key] = number
        ingredients.append(normalized)
    return ingredients


def _parse_text_fallback(text: str) -> dict[str, Any]:
    lower = text.lower()
    calories = _read_number(re.search(r"(?:calories|kcal)\D{0,12}(\d+(?:\.\d+)?)", lower).group(1)) if re.search(r"(?:calories|kcal)\D{0,12}(\d+(?:\.\d+)?)", lower) else None
    dish = None
    for pattern in (r"(?:dish|food|meal|name)\s*[:=-]\s*([^\n,;]+)", r"^([^\n,;]{3,80})"):
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            dish = _read_string(match.group(1))
            break
    return {"dish_name": dish, "calories": calories}


def _parse_payload(text: str) -> RawFoodNutrition | None:
    parsed = _extract_json(text) or _parse_text_fallback(text)
    summary = parsed.get("nutritional_summary")
    summary = summary if isinstance(summary, dict) else {}
    dish_name = (
        _read_string(parsed.get("dish_name"))
        or _read_string(parsed.get("dish"))
        or _read_string(parsed.get("food_name"))
        or _read_string(parsed.get("name"))
    )
    calories = (
        _read_number(parsed.get("calories"))
        or _read_number(parsed.get("kcal"))
        or _read_number(parsed.get("calories_kcal"))
        or _read_number(summary.get("calories_kcal"))
        or _read_number(summary.get("calories"))
        or _read_number(parsed.get("estimated_calories"))
    )
    if not dish_name or calories is None:
        return None
    serving_type = (
        _read_string(parsed.get("serving_type"))
        or _read_string(parsed.get("portion"))
        or _read_string(parsed.get("portion_estimate"))
        or "1 serving"
    )
    return RawFoodNutrition(
        dish_name=dish_name,
        serving_type=serving_type,
        calories=calories,
        protein_g=(
            _read_number(parsed.get("protein_g"))
            or _read_number(parsed.get("protein"))
            or _read_number(summary.get("protein_g"))
        ),
        carbs_g=(
            _read_number(parsed.get("carbs_g"))
            or _read_number(parsed.get("carbs"))
            or _read_number(parsed.get("carbohydrate_g"))
            or _read_number(summary.get("carbohydrate_g"))
            or _read_number(summary.get("carbs_g"))
        ),
        fat_g=_read_number(parsed.get("fat_g")) or _read_number(parsed.get("fat")) or _read_number(summary.get("fat_g")) or 0.0,
        saturates_g=_read_number(parsed.get("saturates_g")) or 0.0,
        sugar_g=_read_number(parsed.get("sugar_g")) or 0.0,
        salt_g=_read_number(parsed.get("salt_g")) or 0.0,
        calorie_min=_read_number(parsed.get("calorie_min")),
        calorie_max=_read_number(parsed.get("calorie_max")),
        ingredients=_parse_ingredients(parsed.get("ingredients") or parsed.get("portion_size")),
        portion_estimate=_read_string(parsed.get("portion_estimate")) or "medium",
        confidence=min(_read_number(parsed.get("confidence")) or 0.72, 1.0),
        source="food-analysis",
    )


def _load_adapter_base_model() -> str:
    local_base = settings.food_analysis_model_path / "base-model"
    if local_base.exists():
        return str(local_base)
    adapter_config = settings.food_analysis_model_path / "adapter_config.json"
    if not adapter_config.exists():
        return str(settings.food_analysis_model_path)
    with adapter_config.open("r", encoding="utf-8") as handle:
        parsed = json.load(handle)
    base_model = parsed.get("base_model_name_or_path")
    if not isinstance(base_model, str) or not base_model.strip():
        raise RuntimeError("food-analysis adapter_config missing base_model_name_or_path")
    return base_model


def _load_food_analysis_runtime() -> FoodAnalysisRuntime:
    global _FOOD_ANALYSIS_RUNTIME
    if _FOOD_ANALYSIS_RUNTIME is not None:
        return _FOOD_ANALYSIS_RUNTIME
    with _PIPELINE_LOCK:
        if _FOOD_ANALYSIS_RUNTIME is not None:
            return _FOOD_ANALYSIS_RUNTIME
        model_path = settings.food_analysis_model_path
        if not model_path.exists():
            raise RuntimeError(f"food-analysis model not found: {model_path}")
        import torch
        from peft import PeftModel
        from transformers import AutoProcessor, Qwen3VLForConditionalGeneration

        base_model = _load_adapter_base_model()
        model = Qwen3VLForConditionalGeneration.from_pretrained(
            base_model,
            dtype=torch.float32,
            device_map="cpu",
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        processor = AutoProcessor.from_pretrained(base_model, trust_remote_code=True)
        if (model_path / "adapter_config.json").exists():
            model = PeftModel.from_pretrained(model, str(model_path))
        model.eval()
        _FOOD_ANALYSIS_RUNTIME = FoodAnalysisRuntime(model=model, processor=processor)
        return _FOOD_ANALYSIS_RUNTIME


def _generate(runtime: FoodAnalysisRuntime, image: Image.Image) -> str:
    import torch

    prompt = (
        "As a food-analyzer AI, analyze the image and return one JSON object "
        "with dish_name, serving_type, calories, protein_g, carbs_g, fat_g, "
        "ingredients, portion_estimate, and warnings. Respond with JSON only."
    )
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt},
            ],
        }
    ]
    text = runtime.processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = runtime.processor(text=[text], images=[image], return_tensors="pt", padding=True)
    with torch.no_grad():
        outputs = runtime.model.generate(
            **inputs,
            max_new_tokens=512,
            temperature=0.1,
            do_sample=False,
            use_cache=True,
            num_beams=1,
            pad_token_id=runtime.processor.tokenizer.pad_token_id,
            eos_token_id=runtime.processor.tokenizer.eos_token_id,
        )
    return str(runtime.processor.decode(outputs[0], skip_special_tokens=True))


def detect_with_food_analysis(image: Image.Image) -> RawFoodNutrition | None:
    """Run the primary Ateeqq/food-analysis detector when the model is present."""
    if not settings.ai_food_analysis_enabled:
        return None
    if not settings.food_analysis_model_path.exists():
        return None

    prepared = image.copy()
    prepared.thumbnail((settings.ai_max_image_size_px, settings.ai_max_image_size_px), Image.Resampling.LANCZOS)
    runtime = _load_food_analysis_runtime()
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_generate, runtime, prepared)
    try:
        text = future.result(timeout=settings.ai_food_analysis_timeout_seconds)
    except FuturesTimeoutError as exc:
        future.cancel()
        raise TimeoutError(
            f"food-analysis inference timed out after {settings.ai_food_analysis_timeout_seconds}s"
        ) from exc
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    result = _parse_payload(text)
    if result is None:
        _LOGGER.warning("food_analysis_parse_failed output=%s", text[:240])
        return None
    return result


def get_food_analysis_runtime_status() -> dict[str, Any]:
    """Expose non-secret runtime status for health checks."""
    return {
        "enabled": settings.ai_food_analysis_enabled,
        "model_loaded": _FOOD_ANALYSIS_RUNTIME is not None,
        "model_path": str(settings.food_analysis_model_path),
        "model_exists": settings.food_analysis_model_path.exists(),
        "adapter_exists": (settings.food_analysis_model_path / "adapter_config.json").exists(),
        "local_base_exists": (settings.food_analysis_model_path / "base-model").exists(),
    }
