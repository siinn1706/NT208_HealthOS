"""Core configuration — reads from .env via pydantic-settings."""
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_ROOT / ".env"


def _is_production() -> bool:
    """Check if running in production mode."""
    env = os.environ.get("APP_ENV", os.environ.get("NODE_ENV", "")).lower()
    return env == "production"


class Settings(BaseSettings):
    # App
    app_name: str = "HealthOS API"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "info"

    # Database
    database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Object Storage (MinIO / S3)
    storage_endpoint: str = "http://localhost:9000"
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_bucket_meals: str = "meals"
    storage_bucket_docs: str = "medical-docs"
    storage_use_ssl: bool = False

    # Email (SMTP) for OTP and notifications
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True
    # Backwards-compatible aliases (e.g. other repos / old .env keys)
    smtp_pass: str | None = None  # SMTP_PASS
    from_email: str | None = None  # FROM_EMAIL

    # Security / JWT
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    auth_issuer: str = "healthos-core"
    auth_audience: str = "healthos-clients"

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]

    # Service URLs
    ai_worker_url: str = "http://localhost:8001"
    celery_broker_url: str = "redis://localhost:6379/2"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        enable_decoding=False,
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: Any) -> str:
        """Normalize DATABASE_URL to asyncpg format and fail fast on invalid values."""
        if v is None:
            raise ValueError(
                "DATABASE_URL is required. Expected format: "
                "postgresql+asyncpg://user:password@host:5432/dbname"
            )

        url = str(v).strip().strip('"').strip("'")
        if not url:
            raise ValueError(
                "DATABASE_URL is empty. Expected format: "
                "postgresql+asyncpg://user:password@host:5432/dbname"
            )

        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql+psycopg2://"):
            url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)

        if not url.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must use async driver. "
                "Use: postgresql+asyncpg://user:password@host:5432/dbname"
            )

        return url

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Any) -> list[str]:
        """Accept JSON array or comma-separated ALLOWED_ORIGINS values."""
        if v is None:
            return ["http://localhost:3000"]

        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]

        raw = str(v).strip()
        if not raw:
            return ["http://localhost:3000"]

        if raw.startswith("["):
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
            raise ValueError("ALLOWED_ORIGINS JSON must be a list")

        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    def model_post_init(self, __context: Any) -> None:
        # Accept common legacy env keys.
        if self.smtp_password is None and self.smtp_pass is not None:
            self.smtp_password = self.smtp_pass
        if self.smtp_from is None and self.from_email is not None:
            self.smtp_from = self.from_email

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Validate required secrets in production mode."""
        if _is_production():
            if not self.secret_key:
                raise ValueError("SECRET_KEY must be set in production")
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
            if not self.database_url:
                raise ValueError("DATABASE_URL must be set in production")
            if not self.storage_access_key:
                raise ValueError("STORAGE_ACCESS_KEY must be set in production")
            if not self.storage_secret_key:
                raise ValueError("STORAGE_SECRET_KEY must be set in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
