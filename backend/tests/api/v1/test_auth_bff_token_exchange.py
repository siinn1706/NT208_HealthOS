from types import SimpleNamespace
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone

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


class _FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}

    async def set(self, key: str, value: str, *, nx: bool = False, ex: int | None = None):
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True


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
        "metrics_token": "metrics-token-0123456789abcdef",
    }


def _signed_profile(
    *,
    secret: str,
    issuer: str = "healthos-bff",
    audience: str = "healthos-core",
    expires_at: str | None = None,
    nonce: str = "nonce-0123456789abcdef",
) -> OAuthProfile:
    profile = OAuthProfile(
        provider="google",
        provider_account_id="provider-account-id",
        email="oauth-user@example.com",
        name="OAuth User",
        avatar_url=None,
        exchange_issuer=issuer,
        exchange_audience=audience,
        exchange_expires_at=expires_at
        or (datetime.now(timezone.utc) + timedelta(minutes=1)).isoformat(),
        exchange_nonce=nonce,
        exchange_signature="0" * 64,
    )
    payload = {
        "avatar_url": profile.avatar_url,
        "email": str(profile.email),
        "exchange_audience": profile.exchange_audience,
        "exchange_expires_at": profile.exchange_expires_at,
        "exchange_issuer": profile.exchange_issuer,
        "exchange_nonce": profile.exchange_nonce,
        "name": profile.name,
        "provider": profile.provider,
        "provider_account_id": profile.provider_account_id,
    }
    signature = hmac.new(
        secret.encode("utf-8"),
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return profile.model_copy(update={"exchange_signature": signature})


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
        redis=_FakeRedis(),
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


@pytest.mark.parametrize(
    "secret",
    [
        "dev-bff-secret-change-in-production",
        "short-secret",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ],
)
def test_settings_reject_default_or_weak_bff_secret_in_protected_envs(secret):
    kwargs = _production_required_kwargs(app_env="production", bff_shared_secret=secret)

    with pytest.raises(ValueError, match="BFF_SHARED_SECRET"):
        Settings(_env_file=None, **kwargs)


@pytest.mark.asyncio
async def test_bff_exchange_rejects_expired_payload(monkeypatch):
    secret = "0123456789abcdef0123456789abcdef"
    monkeypatch.setattr(
        auth_endpoints,
        "settings",
        SimpleNamespace(
            bff_shared_secret=secret,
            bff_exchange_issuer="healthos-bff",
            bff_exchange_audience="healthos-core",
            bff_exchange_max_age_seconds=300,
            bff_exchange_signing_required=True,
        ),
    )
    profile = _signed_profile(
        secret=secret,
        expires_at=(datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_endpoints.verify_bff_exchange_payload(profile, _FakeRedis())

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "BFF_EXCHANGE_EXPIRED"


@pytest.mark.asyncio
async def test_bff_exchange_rejects_mismatched_audience(monkeypatch):
    secret = "0123456789abcdef0123456789abcdef"
    monkeypatch.setattr(
        auth_endpoints,
        "settings",
        SimpleNamespace(
            bff_shared_secret=secret,
            bff_exchange_issuer="healthos-bff",
            bff_exchange_audience="healthos-core",
            bff_exchange_max_age_seconds=300,
            bff_exchange_signing_required=True,
        ),
    )
    profile = _signed_profile(secret=secret, audience="other-core")

    with pytest.raises(HTTPException) as exc_info:
        await auth_endpoints.verify_bff_exchange_payload(profile, _FakeRedis())

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "BFF_EXCHANGE_CLAIMS_INVALID"


@pytest.mark.asyncio
async def test_bff_exchange_rejects_replayed_nonce(monkeypatch):
    secret = "0123456789abcdef0123456789abcdef"
    redis = _FakeRedis()
    monkeypatch.setattr(
        auth_endpoints,
        "settings",
        SimpleNamespace(
            bff_shared_secret=secret,
            bff_exchange_issuer="healthos-bff",
            bff_exchange_audience="healthos-core",
            bff_exchange_max_age_seconds=300,
            bff_exchange_signing_required=True,
        ),
    )
    profile = _signed_profile(secret=secret)

    await auth_endpoints.verify_bff_exchange_payload(profile, redis)
    with pytest.raises(HTTPException) as exc_info:
        await auth_endpoints.verify_bff_exchange_payload(profile, redis)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "BFF_EXCHANGE_REPLAYED"
