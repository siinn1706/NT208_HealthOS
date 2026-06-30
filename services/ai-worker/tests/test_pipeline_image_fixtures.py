"""Validate synthetic test-image generation and local pipeline edge-case handling.

These tests run offline (no running server, no real models) and verify that:
- All seven test-image factories produce valid JPEG-decodable images.
- Each image has the expected dimensions/properties.
- detect_food_nutrition() returns a low-confidence editable fallback when
  model-backed detectors are unavailable.
"""
from __future__ import annotations

import io
from typing import Any

import pytest
from PIL import Image

from scripts.test_ai_pipeline import (
    _make_blurry,
    _make_large_image,
    _make_mixed_meal,
    _make_mobile_portrait,
    _make_non_food,
    _make_poor_lighting,
    _make_single_dish,
    build_test_images,
)


# ---------------------------------------------------------------------------
# Image factory correctness
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("factory,min_px,max_px,expected_mode", [
    (_make_single_dish, 1, 4000, "RGB"),
    (_make_mixed_meal, 1, 4000, "RGB"),
    (_make_poor_lighting, 1, 4000, "RGB"),
    (_make_blurry, 1, 4000, "RGB"),
    (_make_non_food, 1, 4000, "RGB"),
    (_make_large_image, 2000, 8000, "RGB"),  # landscape 3840×2160: height=2160 > 2000
    (_make_mobile_portrait, 1, 4000, "RGB"),
])
def test_image_factory_produces_valid_image(factory, min_px, max_px, expected_mode):
    img = factory()
    assert img.mode == expected_mode
    assert min_px <= img.width <= max_px
    assert min_px <= img.height <= max_px


def test_large_image_is_actually_large():
    img = _make_large_image()
    assert img.width >= 3000
    assert img.height >= 1000


def test_mobile_portrait_is_taller_than_wide():
    img = _make_mobile_portrait()
    assert img.height > img.width


def test_poor_lighting_is_darker_than_original():
    original = _make_single_dish()
    dark = _make_poor_lighting()
    orig_mean = sum(original.getpixel((320, 240))) / 3
    dark_mean = sum(dark.getpixel((320, 240))) / 3
    assert dark_mean < orig_mean


def test_blurry_is_measurably_blurry():
    """Blurred image should have a narrower brightness range than the sharp original.

    Flat-color synthetic images have a few extreme values.  Heavy blur pulls
    extreme pixels toward the mean, shrinking the min-max range.
    """
    original = _make_single_dish()
    blurry = _make_blurry()
    # Compare the range of the red channel.
    orig_r = [p[0] for p in original.getdata()]
    blur_r = [p[0] for p in blurry.getdata()]
    orig_range = max(orig_r) - min(orig_r)
    blur_range = max(blur_r) - min(blur_r)
    assert blur_range < orig_range


# ---------------------------------------------------------------------------
# build_test_images produces re-decodable JPEG for every case
# ---------------------------------------------------------------------------

def test_build_test_images_returns_all_seven_synthetic_cases():
    images, all_cases = build_test_images()
    synth_names = {n for n, _, _ in all_cases if not n.startswith("real_")}
    expected = {"single_dish", "mixed_meal", "poor_lighting", "blurry", "non_food", "large_image", "mobile_portrait"}
    assert synth_names == expected


def test_build_test_images_all_jpeg_decodable():
    images, _ = build_test_images()
    for name, data in images.items():
        img = Image.open(io.BytesIO(data))
        img.load()
        assert img.mode == "RGB", f"{name}: expected RGB, got {img.mode}"


def test_build_test_images_sizes_are_positive():
    images, _ = build_test_images()
    for name, data in images.items():
        img = Image.open(io.BytesIO(data))
        assert img.width > 0 and img.height > 0, f"{name}: invalid dimensions"


# ---------------------------------------------------------------------------
# Pipeline fallback chain: all detectors absent → editable fallback
# ---------------------------------------------------------------------------

def test_detect_food_nutrition_returns_generic_when_all_detectors_unavailable(monkeypatch: Any) -> None:
    from app.services import food_detector_service as svc
    import app.services.yolo_food_detector as yolo_mod

    monkeypatch.setattr(svc, "detect_with_food_analysis", lambda _img: None)
    monkeypatch.setattr(svc, "estimate_with_calorieclip", lambda _img, _name: None)
    monkeypatch.setattr(svc, "_load_class_db", lambda _path: [])
    monkeypatch.setattr(yolo_mod, "_load_yolo_model", lambda: None)
    monkeypatch.setattr(svc, "_best_yolo_prediction", lambda _img: None)

    result = svc.detect_food_nutrition(Image.new("RGB", (2, 2)))

    assert result.source == "generic-photo-estimate"
    assert result.confidence == 0.25


def test_detect_food_nutrition_uses_primary_when_available(monkeypatch: Any) -> None:
    from app.services import food_detector_service as svc
    from app.services.detector_types import RawFoodNutrition

    fake_primary = RawFoodNutrition(
        dish_name="Bun bo Hue",
        serving_type="1 bowl",
        calories=520.0,
        fat_g=14.0,
        saturates_g=5.0,
        sugar_g=2.0,
        salt_g=1.8,
        confidence=0.88,
        source="food-analysis",
        calorie_min=460.0,
        calorie_max=580.0,
        portion_estimate="medium",
        warnings=[],
    )

    monkeypatch.setattr(svc, "detect_with_food_analysis", lambda _img: fake_primary)
    monkeypatch.setattr(svc, "estimate_with_calorieclip", lambda _img, _name: None)

    result = svc.detect_food_nutrition(Image.new("RGB", (640, 480)))
    assert result.dish_name == "Bun bo Hue"
    assert result.calories == 520.0
    assert result.confidence == 0.88
