from typing import Any

from PIL import Image

from app.services import calorieclip_detector as detector


def test_calorieclip_skips_windows_native_runtime_by_default(
    monkeypatch: Any,
    tmp_path,
) -> None:
    monkeypatch.setattr(detector.settings, "ai_calorieclip_enabled", True)
    monkeypatch.setattr(detector.settings, "ai_calorieclip_allow_windows", False)
    monkeypatch.setattr(detector.settings, "ai_calorieclip_model_path", str(tmp_path))
    monkeypatch.setattr(detector.platform, "system", lambda: "Windows")

    def fail_if_loaded() -> None:
        raise AssertionError("CalorieCLIP should not load on Windows unless explicitly allowed")

    monkeypatch.setattr(detector, "_load_calorieclip", fail_if_loaded)

    result = detector.estimate_with_calorieclip(Image.new("RGB", (2, 2)), "Photo meal")

    assert result is None


def test_calorieclip_can_be_forced_on_windows(
    monkeypatch: Any,
    tmp_path,
) -> None:
    monkeypatch.setattr(detector.settings, "ai_calorieclip_enabled", True)
    monkeypatch.setattr(detector.settings, "ai_calorieclip_allow_windows", True)
    monkeypatch.setattr(detector.settings, "ai_calorieclip_model_path", str(tmp_path))
    monkeypatch.setattr(detector.platform, "system", lambda: "Windows")
    monkeypatch.setattr(detector.settings, "ai_calorieclip_timeout_seconds", 1.0)

    class Model:
        def predict(self, _image: Image.Image) -> float:
            return 123.0

    monkeypatch.setattr(detector, "_load_calorieclip", lambda: Model())

    result = detector.estimate_with_calorieclip(Image.new("RGB", (2, 2)), "Photo meal")

    assert result is not None
    assert result.calories == 123.0
