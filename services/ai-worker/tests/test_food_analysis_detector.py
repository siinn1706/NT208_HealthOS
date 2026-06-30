from typing import Any

from PIL import Image

from app.services import food_analysis_detector as detector


def test_primary_food_analysis_skips_cpu_only_host_by_default(
    monkeypatch: Any,
    tmp_path,
) -> None:
    monkeypatch.setattr(detector.settings, "ai_food_analysis_enabled", True)
    monkeypatch.setattr(detector.settings, "ai_food_analysis_allow_cpu_primary", False)
    monkeypatch.setattr(detector.settings, "ai_food_analysis_model_path", str(tmp_path))
    monkeypatch.setattr(detector, "_cuda_available", lambda: False)

    def fail_if_loaded() -> None:
        raise AssertionError("CPU-only host should use lighter fallbacks by default")

    monkeypatch.setattr(detector, "_load_food_analysis_runtime", fail_if_loaded)

    result = detector.detect_with_food_analysis(Image.new("RGB", (2, 2)))

    assert result is None


def test_primary_food_analysis_can_be_forced_on_cpu(
    monkeypatch: Any,
    tmp_path,
) -> None:
    monkeypatch.setattr(detector.settings, "ai_food_analysis_enabled", True)
    monkeypatch.setattr(detector.settings, "ai_food_analysis_allow_cpu_primary", True)
    monkeypatch.setattr(detector.settings, "ai_food_analysis_model_path", str(tmp_path))
    monkeypatch.setattr(detector, "_cuda_available", lambda: False)
    monkeypatch.setattr(detector.settings, "ai_food_analysis_timeout_seconds", 1.0)
    monkeypatch.setattr(detector, "_parse_payload", lambda _text: None)

    class Runtime:
        pass

    monkeypatch.setattr(detector, "_load_food_analysis_runtime", lambda: Runtime())
    monkeypatch.setattr(detector, "_generate", lambda _runtime, _image: "{}")

    result = detector.detect_with_food_analysis(Image.new("RGB", (2, 2)))

    assert result is None
