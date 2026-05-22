"""Core configuration — reads from .env via pydantic-settings."""
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

_config_logger = logging.getLogger(__name__)

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_ROOT / ".env"

PRODUCTION_BLOCKED_SECRET_KEYS = {
    "dev-secret-key-change-in-production",
    "dev-secret-key-change-in-production-min-32-chars",
}
PRODUCTION_BLOCKED_STORAGE_CREDENTIALS = {
    "minioadmin",
    "change-me",
    "changeme",
}


def _is_production() -> bool:
    """Check if running in production mode."""
    env = os.environ.get("APP_ENV", os.environ.get("NODE_ENV", "")).lower()
    return env == "production"


def is_production() -> bool:
    """Public helper for production-only guards across modules."""
    return _is_production()


class Settings(BaseSettings):
    # App
    app_name: str = "HealthOS API"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "info"
    app_env: str = "development"
    node_env: str = ""

    # Database
    database_url: str = ""

    # Redis — put credentials in REDIS_URL (e.g. redis://:secret@host:6379/0) when Redis requires AUTH.
    redis_url: str = "redis://localhost:6379/0"
    # Accepted so .env files with a stray key do not break Settings; not applied to redis_url (local Redis often has no password).
    redis_password: str | None = None

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

    # Fernet key for symmetric encryption of TOTP secrets at rest.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    fernet_key: str = ""

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]

    # BFF shared secret — gates /v1/auth/token so only the BFF can mint tokens.
    # Must be a non-empty string in production/staging.
    bff_shared_secret: str = ""

    # Service URLs
    ai_worker_url: str = "http://localhost:8001"
    celery_broker_url: str = "redis://localhost:6379/2"

    # Public-facing FE URL — used to build emergency-card share URLs (the
    # QR code encodes "{app_url}/e/<token>"). Defaults to dev port; in
    # production this MUST be the canonical https origin so paramedics
    # don't end up with broken http:// QRs.
    app_url: str = "http://localhost:3000"
    # ── AI chat orchestrator ──────────────────────────────────────────────
    ai_worker_timeout_seconds: float = 30.0
    ai_context_max_messages: int = 20
    ai_chat_max_user_message_chars: int = 2000
    ai_chat_user_rate_per_minute: int = 10
    ai_chat_max_concurrent_per_user: int = 1
    ai_chat_streaming_enabled: bool = True
    ai_bot_email: str = "ai-bot@healthos.local"
    # Group conversation invite acceptance gate.
    # True  = non-creator members start with is_accepted=False (safe default for test/dev).
    # False = legacy behaviour (all members auto-accepted) — set in production until
    #         the FE invite-acceptance surface ships.
    group_conv_require_accept: bool = True

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8")

    def resolved_runtime_env(self) -> str:
        app_value = self.app_env.strip().lower()
        if app_value:
            return app_value
        node_value = self.node_env.strip().lower()
        if node_value:
            return node_value
        return "development"

    def model_post_init(self, __context: Any) -> None:
        # Accept common legacy env keys.
        if self.smtp_password is None and self.smtp_pass is not None:
            self.smtp_password = self.smtp_pass
        if self.smtp_from is None and self.from_email is not None:
            self.smtp_from = self.from_email
        runtime_env = self.resolved_runtime_env()
        # Warn in non-production if FERNET_KEY is unset — TOTP secrets will be stored unencrypted
        if runtime_env not in {"production", "staging"} and not self.fernet_key:
            _config_logger.warning(
                "FERNET_KEY is not set — TOTP secrets will NOT be encrypted at rest. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Validate required secrets in production mode."""
        runtime_env = self.resolved_runtime_env()
        if runtime_env in {"production", "staging"} and not self.bff_shared_secret.strip():
            raise ValueError(
                "BFF_SHARED_SECRET must be set in production/staging. "
                "Generate a strong random secret and configure both BFF and Core BE."
            )
        if runtime_env == "production":
            if not self.secret_key:
                raise ValueError("SECRET_KEY must be set in production")
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
            if self.secret_key.strip().lower() in PRODUCTION_BLOCKED_SECRET_KEYS:
                raise ValueError(
                    "SECRET_KEY uses an insecure development default in production. "
                    "Set a unique high-entropy value."
                )
            if not self.database_url:
                raise ValueError("DATABASE_URL must be set in production")
            if not self.storage_access_key:
                raise ValueError("STORAGE_ACCESS_KEY must be set in production")
            if self.storage_access_key.strip().lower() in PRODUCTION_BLOCKED_STORAGE_CREDENTIALS:
                raise ValueError(
                    "STORAGE_ACCESS_KEY uses insecure default credentials in production. "
                    "Set a unique storage access key."
                )
            if not self.storage_secret_key:
                raise ValueError("STORAGE_SECRET_KEY must be set in production")
            if self.storage_secret_key.strip().lower() in PRODUCTION_BLOCKED_STORAGE_CREDENTIALS:
                raise ValueError(
                    "STORAGE_SECRET_KEY uses insecure default credentials in production. "
                    "Set a unique storage secret key."
                )
            if not self.fernet_key:
                raise ValueError(
                    "FERNET_KEY must be set in production to encrypt TOTP secrets at rest. "
                    "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
                )
            # H4: CORS production defaults validation
            if self.allowed_origins == ["http://localhost:3000"]:
                raise ValueError("ALLOWED_ORIGINS must be explicitly set in production (not localhost default)")
            # M14: SMTP config validation for OTP email delivery
            if not self.smtp_host or not self.smtp_user or not self.smtp_password:
                raise ValueError("SMTP_HOST, SMTP_USER, SMTP_PASSWORD must be set in production for OTP email delivery")
        # H5: Fernet key format validation (when set)
        if self.fernet_key:
            try:
                from cryptography.fernet import Fernet
                Fernet(self.fernet_key.encode())
            except Exception as e:
                raise ValueError(f"FERNET_KEY is not a valid Fernet key: {e}")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
