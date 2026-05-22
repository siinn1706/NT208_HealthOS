from types import SimpleNamespace
import uuid

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import auth as auth_endpoints
from app.core.config import Settings
from app.schemas.auth import AuthToken, OAuthProfile


class _FakeDb:
    def __init__(self):
        self.commits = 0

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        return None


def _fake_request(headers: dict[str, str] | None = None):
    return SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        headers=headers or {"user-agent": "pytest"},
    )


def _fake_user():
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="oauth-user@example.com",
        username="oauth-user",
        display_name="OAuth User",
        onboarding_status="pending",
        profile=SimpleNamespace(avatar_url=None),
    )


def _production_required_kwargs(*, app_env: str, bff_shared_secret: str):
    return {
        "app_env": app_env,
        "node_env": "",
        "bff_shared_secret": bff_shared_secret,
        "secret_key": "x" * 32,
        "database_url": "postgresql+asyncpg://healthos:healthos@localhost:5432/healthos",
        "storage_access_key": "prod-access-key",
        "storage_secret_key": "prod-secret-key",
        "fernet_key": "",
        "allowed_origins": ["https://healthos.example"],
        "smtp_host": "smtp.example.com",
        "smtp_user": "mailer",
        "smtp_password": "mailer-password",
    }


def test_verify_bff_secret_returns_config_error_when_missing(monkeypatch):
    monkeypatch.setattr(auth_endpoints, "settings", SimpleNamespace(bff_shared_secret=""))

    with pytest.raises(HTTPException) as exc_info:
        auth_endpoints.verify_bff_secret(_fake_request({"X-BFF-Secret": "anything"}))

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail["code"] == "CONFIG_ERROR"


def test_verify_bff_secret_rejects_wrong_header(monkeypatch):
    monkeypatch.setattr(auth_endpoints, "settings", SimpleNamespace(bff_shared_secret="expected-secret"))

    with pytest.raises(HTTPException) as exc_info:
        auth_endpoints.verify_bff_secret(_fake_request({"X-BFF-Secret": "wrong-secret"}))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_correct_bff_secret_allows_token_exchange(monkeypatch):
    fake_user = _fake_user()
    fake_db = _FakeDb()
    request = _fake_request({"X-BFF-Secret": "expected-secret", "user-agent": "pytest"})

    async def _get_or_create_user_from_oauth(_body, _db):
        return fake_user

    async def _issue_auth_token(**_kwargs):
        return AuthToken(
            access_token="access-token",
            refresh_token="refresh-token",
            user_id=str(fake_user.id),
            email=fake_user.email,
            username=fake_user.username,
            display_name=fake_user.display_name,
            avatar_url=None,
            onboarding_status=fake_user.onboarding_status,
        )

    monkeypatch.setattr(auth_endpoints, "settings", SimpleNamespace(bff_shared_secret="expected-secret"))
    monkeypatch.setattr(auth_endpoints, "get_or_create_user_from_oauth", _get_or_create_user_from_oauth)
    monkeypatch.setattr(auth_endpoints, "_issue_auth_token", _issue_auth_token)

    auth_endpoints.verify_bff_secret(request)
    response = await auth_endpoints.exchange_oauth_profile_for_token(
        body=OAuthProfile(
            provider="google",
            provider_account_id="provider-account-id",
            email="oauth-user@example.com",
            name="OAuth User",
            avatar_url=None,
        ),
        request=request,
        db=fake_db,
        _bff=None,
    )

    assert response.data.access_token == "access-token"
    assert response.data.refresh_token == "refresh-token"
    assert fake_db.commits == 1


@pytest.mark.parametrize("app_env", ["production", "staging"])
def test_settings_require_bff_secret_in_production_and_staging(app_env):
    kwargs = _production_required_kwargs(app_env=app_env, bff_shared_secret="")
    with pytest.raises(ValueError, match="BFF_SHARED_SECRET must be set in production/staging"):
        Settings(_env_file=None, **kwargs)


def test_settings_allow_missing_bff_secret_in_development():
    settings = Settings(_env_file=None, app_env="development", node_env="", bff_shared_secret="")
    assert settings.bff_shared_secret == ""
