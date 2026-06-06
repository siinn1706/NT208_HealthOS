"""Core configuration — reads from .env via pydantic-settings."""
import logging
import os
import re
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
PROTECTED_RUNTIME_ENVS = {"production", "staging"}
BFF_SHARED_SECRET_MIN_LENGTH = 32
BFF_SHARED_SECRET_BLOCKLIST = {
    "dev-bff-secret-change-in-production",
    "change-me-strong-random-secret",
    "bff-shared-secret-prod",
}
METRICS_TOKEN_MIN_LENGTH = 16


def _is_production() -> bool:
    """Check if running in production mode."""
    app_env = os.environ.get("APP_ENV")
    node_env = os.environ.get("NODE_ENV")
    env = (app_env if app_env and app_env.strip() else node_env or "").strip().lower()
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
    # DEBUG controls logging/docs; DB pooling is disabled only by explicit opt-in.
    db_disable_pool: bool = False

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
    # BFF OAuth exchange signing. Production/staging require signed short-lived
    # payloads by default so Core can reject forged or replayed BFF profiles.
    bff_exchange_issuer: str = "healthos-bff"
    bff_exchange_audience: str = "healthos-core"
    bff_exchange_max_age_seconds: int = 300
    bff_exchange_signing_required: bool | None = None

    # Metrics endpoint access control (Phase 1)
    # METRICS_TOKEN: when set, callers must send X-Metrics-Token: <value>
    # METRICS_ALLOW_LOCAL: dev-only local bypass; ignored in staging/production.
    metrics_token: str | None = None
    metrics_allow_local: bool = True

    # Logging format: "text" (dev) or "json" (prod/structured) (Phase 3)
    log_format: str = "text"

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
    ai_chat_reply_max_tokens: int = 2048
    ai_chat_max_user_message_chars: int = 2000
    ai_chat_user_rate_per_minute: int = 10
    ai_chat_max_concurrent_per_user: int = 1
    ai_chat_streaming_enabled: bool = True
    medical_rag_enabled: bool = True
    medical_rag_top_k: int = 3
    medical_rag_candidate_limit: int = 200
    ai_bot_email: str = "ai-bot@healthos.local"
    # Group conversation invite acceptance gate.
    # True  = non-creator members start with is_accepted=False (safe default for test/dev).
    # False = legacy behaviour (all members auto-accepted) — set in production until
    #         the FE invite-acceptance surface ships.
    group_conv_require_accept: bool = True

    # ── WS smoke test secret ─────────────────────────────────────────────
    # Shared secret for the ws-corebe-smoke auth-success probe.
    # The smoke script sends this as X-Smoke-Secret to GET /api/v1/ws/smoke-ticket
    # to obtain a short-lived ws_ticket for a well-known test user.
    # If unset, the endpoint returns 403 and the auth-success probe is skipped
    # with a warning (smoke runs in degraded-but-not-failing mode).
    ws_smoke_secret: str = ""

    # ── Wearable sync — Google Health API (Luồng B) ───────────────────────
    # Obtain client_id + client_secret from https://console.cloud.google.com/
    # (APIs & Services → Credentials → OAuth 2.0 Client ID, Web app type).
    # `redirect_uri` MUST be registered in the Cloud Console exactly as
    # configured here. Empty strings disable the connect flow (the
    # endpoints will 503 with a helpful message); useful for local dev
    # without a Google project.
    google_health_client_id: str = ""
    google_health_client_secret: str = ""
    google_health_redirect_uri: str = (
        "http://localhost:3000/api/v1/wearables/google/callback"
    )
    # HMAC secret used to verify push notifications, when Google Health
    # webhook support is available. Empty disables webhook validation
    # (the receiver endpoint then rejects every incoming request).
    google_health_webhook_secret: str = ""
    # How often the Celery Beat poller drains pending Google Health data
    # for every active connection. 15 min is a balance between freshness
    # on the dashboard and burning quota / 429s from Google.
    wearable_sync_interval_minutes: int = 15

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8")

    def resolved_runtime_env(self) -> str:
        app_value = self.app_env.strip().lower()
        node_value = self.node_env.strip().lower()

        # APP_ENV is authoritative only when explicitly provided. Otherwise
        # deploy platforms that set NODE_ENV=production must still trigger
        # production/staging guardrails instead of falling through to the
        # development default.
        if "app_env" in self.model_fields_set and app_value:
            return app_value
        if "node_env" in self.model_fields_set and node_value:
            return node_value

        env_app = os.environ.get("APP_ENV")
        if env_app and env_app.strip():
            return env_app.strip().lower()
        env_node = os.environ.get("NODE_ENV")
        if env_node and env_node.strip():
            return env_node.strip().lower()

        return app_value or "development"

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

    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url_scheme(cls, v: str) -> str:
        """When DATABASE_URL is provided it must use a supported scheme."""
        if not v:
            return v  # empty is allowed in dev; production guard is in model_validator
        stripped = v.strip()
        if not (
            stripped.startswith("postgresql")
            or stripped.startswith("sqlite")
        ):
            raise ValueError(
                "DATABASE_URL must start with 'postgresql' or 'sqlite'; "
                f"got scheme from value starting with: {stripped[:30]!r}"
            )
        return stripped

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Validate required secrets in production mode."""
        runtime_env = self.resolved_runtime_env()
        protected_env = runtime_env in PROTECTED_RUNTIME_ENVS
        if protected_env:
            self._validate_protected_runtime_basics(runtime_env)
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
            # Structured logging is required in production so log aggregators
            # receive parseable JSON rather than raw text lines.
            if self.log_format.strip().lower() != "json":
                raise ValueError(
                    "LOG_FORMAT must be 'json' in production for structured logging. "
                    "Set LOG_FORMAT=json in your production environment."
                )
            # DEBUG=true in production exposes OTP codes in API responses and
            # enables SQL echo — reject immediately rather than warn at runtime.
            if self.debug:
                raise ValueError(
                    "DEBUG must be False (or unset) in production. "
                    "Set DEBUG=false in your production environment."
                )
        # H5: Fernet key format validation (when set)
        if self.fernet_key:
            try:
                from cryptography.fernet import Fernet
                Fernet(self.fernet_key.encode())
            except Exception as e:
                raise ValueError(f"FERNET_KEY is not a valid Fernet key: {e}")
        return self

    def _validate_protected_runtime_basics(self, runtime_env: str) -> None:
        """Guardrails shared by staging and production runtimes."""
        bff_secret = self.bff_shared_secret.strip()
        if not bff_secret:
            raise ValueError(
                "BFF_SHARED_SECRET must be set in production/staging. "
                "Generate a strong random secret and configure both BFF and Core BE."
            )
        if bff_secret.lower() in BFF_SHARED_SECRET_BLOCKLIST:
            raise ValueError(
                "BFF_SHARED_SECRET uses an insecure development/default value in production/staging. "
                "Generate a unique high-entropy value."
            )
        if len(bff_secret) < BFF_SHARED_SECRET_MIN_LENGTH:
            raise ValueError(
                f"BFF_SHARED_SECRET must be at least {BFF_SHARED_SECRET_MIN_LENGTH} characters in production/staging"
            )
        character_classes = sum(
            bool(re.search(pattern, bff_secret))
            for pattern in (r"[a-z]", r"[A-Z]", r"\d", r"[^A-Za-z0-9]")
        )
        if character_classes < 2:
            raise ValueError(
                "BFF_SHARED_SECRET must include at least two character classes in production/staging"
            )

        if not self.secret_key:
            raise ValueError(f"SECRET_KEY must be set in {runtime_env}")
        if len(self.secret_key) < 32:
            raise ValueError(f"SECRET_KEY must be at least 32 characters in {runtime_env}")
        if self.secret_key.strip().lower() in PRODUCTION_BLOCKED_SECRET_KEYS:
            raise ValueError(
                "SECRET_KEY uses an insecure development default in production/staging. "
                "Set a unique high-entropy value."
            )

        if (
            self.allowed_origins == ["http://localhost:3000"]
            or any(origin.strip() == "*" for origin in self.allowed_origins)
        ):
            raise ValueError(
                "ALLOWED_ORIGINS must be explicitly set without localhost defaults or wildcards in production/staging"
            )

        metrics_token = (self.metrics_token or "").strip()
        if not metrics_token:
            raise ValueError(
                "METRICS_TOKEN must be set in production/staging; local/private IP trust is dev-only."
            )
        if len(metrics_token) < METRICS_TOKEN_MIN_LENGTH:
            raise ValueError(
                f"METRICS_TOKEN must be at least {METRICS_TOKEN_MIN_LENGTH} characters in production/staging"
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
