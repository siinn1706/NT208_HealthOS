from cryptography.fernet import Fernet
import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _production_base_kwargs() -> dict:
    return {
        "debug": False,
        "database_url": "postgresql+asyncpg://healthos:strong-pass@db:5432/healthos",
        "secret_key": "this-is-a-long-production-secret-key-1234567890",
        "storage_access_key": "prod-storage-access",
        "storage_secret_key": "prod-storage-secret",
        "fernet_key": Fernet.generate_key().decode(),
        "allowed_origins": ["https://app.healthos.example"],
        "smtp_host": "smtp.example.com",
        "smtp_user": "mailer",
        "smtp_password": "smtp-password",
        "bff_shared_secret": "0123456789abcdef0123456789abcdef",
        "metrics_token": "metrics-token-0123456789abcdef",
    }


def test_production_rejects_default_secret_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    kwargs = _production_base_kwargs()
    kwargs["secret_key"] = "dev-secret-key-change-in-production"

    with pytest.raises(ValidationError, match="SECRET_KEY uses an insecure development default in production"):
        Settings(_env_file=None, **kwargs)


def test_production_rejects_default_storage_credentials(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    kwargs = _production_base_kwargs()
    kwargs["storage_access_key"] = "minioadmin"
    kwargs["storage_secret_key"] = "minioadmin"

    with pytest.raises(ValidationError, match="STORAGE_ACCESS_KEY uses insecure default credentials in production"):
        Settings(_env_file=None, **kwargs)


def test_production_requires_bff_shared_secret(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    kwargs = _production_base_kwargs()
    kwargs["bff_shared_secret"] = "   "

    with pytest.raises(ValidationError, match="BFF_SHARED_SECRET must be set in production/staging"):
        Settings(_env_file=None, **kwargs)


def test_node_env_production_runs_production_validation_without_app_env(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    kwargs = _production_base_kwargs()
    kwargs.pop("secret_key")

    with pytest.raises(ValidationError, match="SECRET_KEY must be set in production"):
        Settings(_env_file=None, node_env="production", **kwargs)


def test_node_env_production_accepts_complete_production_config(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    kwargs = _production_base_kwargs()

    settings = Settings(_env_file=None, node_env="production", **kwargs)

    assert settings.resolved_runtime_env() == "production"


def test_explicit_app_env_development_wins_over_node_env_production(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    settings = Settings(
        _env_file=None,
        app_env="development",
        node_env="production",
        bff_shared_secret="",
    )

    assert settings.resolved_runtime_env() == "development"


def test_staging_requires_metrics_token(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    kwargs = _production_base_kwargs()
    kwargs["metrics_token"] = ""

    with pytest.raises(ValidationError, match="METRICS_TOKEN must be set in production/staging"):
        Settings(_env_file=None, app_env="staging", **kwargs)


def test_production_rejects_wildcard_cors(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    kwargs = _production_base_kwargs()
    kwargs["allowed_origins"] = ["*"]

    with pytest.raises(ValidationError, match="ALLOWED_ORIGINS"):
        Settings(_env_file=None, **kwargs)
