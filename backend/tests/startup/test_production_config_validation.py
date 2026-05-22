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
        "bff_shared_secret": "bff-shared-secret-prod",
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

    with pytest.raises(ValidationError, match="BFF_SHARED_SECRET must be set in production"):
        Settings(_env_file=None, **kwargs)
