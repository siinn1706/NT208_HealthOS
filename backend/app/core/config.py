"""Core configuration — reads from .env via pydantic-settings."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Any

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

    # Security / JWT
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]
    
    # Service URLs
    ai_worker_url: str = "http://localhost:8001"
    celery_broker_url: str = "redis://localhost:6379/2"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
