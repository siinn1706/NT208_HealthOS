"""Core configuration — reads from .env via pydantic-settings."""
from functools import lru_cache
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App
    app_name: str = "HealthOS API"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "info"

    # Database
    database_url: str = "postgresql+asyncpg://healthos:healthos_dev_pass@localhost:5432/healthos"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Object Storage (MinIO / S3)
    storage_endpoint: str = "http://localhost:9000"
    storage_access_key: str = "minioadmin"
    storage_secret_key: str = "minioadmin"
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
    secret_key: str = "dev-secret-key-change-in-production"
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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    def model_post_init(self, __context: Any) -> None:
        # Accept common legacy env keys.
        if self.smtp_password is None and self.smtp_pass is not None:
            self.smtp_password = self.smtp_pass
        if self.smtp_from is None and self.from_email is not None:
            self.smtp_from = self.from_email


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
