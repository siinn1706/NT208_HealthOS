"""Configuration for AI worker food analysis."""
from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


_SERVICE_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_MODEL_PATH = (
    _SERVICE_ROOT
    / "models"
    / "yolov10"
    / "YOLOv10b_VietFood67_SGD_new_bigger.pt"
)
_DEFAULT_FOOD_ANALYSIS_MODEL_PATH = _SERVICE_ROOT / "models" / "food-analysis"
_DEFAULT_CALORIECLIP_MODEL_PATH = _SERVICE_ROOT / "models" / "calorieclip"
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
    ai_food_analysis_enabled: bool = True
    ai_food_analysis_timeout_seconds: float = 30.0
    ai_calorieclip_enabled: bool = True
    ai_calorieclip_timeout_seconds: float = 15.0
    ai_calorie_range_ratio: float = 0.18
    ai_max_image_size_px: int = 640

    # Image download security
    ai_max_image_download_bytes: int = 10 * 1024 * 1024  # 10 MiB, matches backend upload cap
    ai_max_image_pixels: int = 24_000_000  # ~24 MP, PIL decompression-bomb threshold
    ai_allowed_image_hosts: str = ""  # comma-separated; empty = any non-private host
    ai_image_download_timeout_seconds: float = 15.0
    ai_block_private_networks: bool = True
    storage_endpoint: str = "http://localhost:9000"

    ai_yolo_model_path: str = str(_DEFAULT_MODEL_PATH)
    ai_food_analysis_model_path: str = str(_DEFAULT_FOOD_ANALYSIS_MODEL_PATH)
    ai_calorieclip_model_path: str = str(_DEFAULT_CALORIECLIP_MODEL_PATH)
    ai_food_analysis_repo_id: str = "Ateeqq/food-analysis"
    ai_calorieclip_repo_id: str = "jc-builds/CalorieCLIP"
    ai_class_names_path: str = str(_DEFAULT_CLASS_NAMES_PATH)
    ai_proxy_base_url: str = "http://localhost:20128/v1"
    ai_proxy_model: str = "oc/deepseek-v4-flash-free"
    ai_proxy_api_key: str = ""
    ai_proxy_thinking_mode: str = "disabled"
    ai_proxy_reasoning_effort: str = "high"
    ai_chat_max_tokens: int = 2048
    ai_chat_temperature: float = 0.6
    ai_chat_timeout_seconds: float = 30.0
    ai_chat_stream_chunk_min_chars: int = 1
    ai_embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    ai_embedding_dimension: int = 384
    ai_embedding_timeout_seconds: float = 30.0

    @property
    def allowed_image_hosts_set(self) -> frozenset[str]:
        raw = (self.ai_allowed_image_hosts or "").strip()
        if not raw:
            return frozenset()
        return frozenset(h.strip().lower() for h in raw.split(",") if h.strip())

    @property
    def storage_image_hosts_set(self) -> frozenset[str]:
        parsed = urlparse((self.storage_endpoint or "").strip())
        host = (parsed.hostname or "").lower()
        if not host:
            return frozenset()
        if parsed.port is not None:
            return frozenset({f"{host}:{parsed.port}"})
        return frozenset({host})

    @property
    def trusted_image_hosts_set(self) -> frozenset[str]:
        return self.storage_image_hosts_set

    @property
    def yolo_model_path(self) -> Path:
        return Path(self.ai_yolo_model_path).expanduser()

    @property
    def food_analysis_model_path(self) -> Path:
        return Path(self.ai_food_analysis_model_path).expanduser()

    @property
    def calorieclip_model_path(self) -> Path:
        return Path(self.ai_calorieclip_model_path).expanduser()

    @property
    def class_names_path(self) -> Path:
        return Path(self.ai_class_names_path).expanduser()

    @property
    def ai_proxy_base_url_normalized(self) -> str:
        return self.ai_proxy_base_url.rstrip("/")


settings = Settings()
