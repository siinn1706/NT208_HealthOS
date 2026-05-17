"""Configuration for AI worker food analysis."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


_SERVICE_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_MODEL_PATH = (
    _SERVICE_ROOT
    / "models"
    / "yolov10"
    / "YOLOv10b_VietFood67_SGD_new_bigger.pt"
)
_DEFAULT_CLASS_NAMES_PATH = _SERVICE_ROOT / "data" / "class_names.py"


class Settings(BaseSettings):
    """Runtime settings loaded from worker env."""

    model_config = SettingsConfigDict(
        env_file=str(_SERVICE_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "HealthOS AI Worker"
    debug: bool = False

    ai_request_timeout_seconds: float = 30.0
    ai_confidence_threshold: float = 0.45
    ai_yolo_timeout_seconds: float = 15.0
    ai_max_image_size_px: int = 640
    ai_enable_gemini_fallback: bool = True
    ai_gemini_timeout_seconds: float = 20.0

    ai_yolo_model_path: str = str(_DEFAULT_MODEL_PATH)
    ai_class_names_path: str = str(_DEFAULT_CLASS_NAMES_PATH)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash-lite"

    gemini_chat_model: str = "gemini-2.5-flash-lite"
    ai_chat_max_tokens: int = 1024
    ai_chat_temperature: float = 0.6
    ai_chat_timeout_seconds: float = 30.0
    ai_chat_stream_chunk_min_chars: int = 1

    @property
    def yolo_model_path(self) -> Path:
        return Path(self.ai_yolo_model_path).expanduser()

    @property
    def class_names_path(self) -> Path:
        return Path(self.ai_class_names_path).expanduser()


settings = Settings()
