"""Unit tests for ``app.services.wearable_sync.google_health``.

Cover the pure-OAuth surface (URL building) and the four httpx-backed
helpers (``exchange_code_for_tokens``, ``refresh_access_token``,
``revoke_token``, ``fetch_user_profile``) without hitting the network.

The project has no ``respx`` / ``pytest-httpx`` dependency yet, so we
monkeypatch ``google_health.httpx.AsyncClient`` with a tiny fake that
returns canned responses. Same approach the rest of the wearable_sync
test suite uses (see ``test_sync_task.py``).
"""
from __future__ import annotations

import urllib.parse
from types import SimpleNamespace
from typing import Any

import pytest

from app.services.wearable_sync import google_health


# ──────────────────────────────────────────────────────────────────────
# Fakes
# ──────────────────────────────────────────────────────────────────────


class _FakeResponse:
    def __init__(
        self,
        status_code: int,
        json_payload: dict[str, Any] | None = None,
        text: str = "",
    ) -> None:
        self.status_code = status_code
        self._payload = json_payload or {}
        self.text = text

    def json(self) -> dict[str, Any]:
        return self._payload


class _FakeAsyncClient:
    """Records the last call made through it; returns a class-level
    canned response. The production code instantiates this via
    ``async with httpx.AsyncClient(timeout=...) as client``."""

    next_response: _FakeResponse = _FakeResponse(200, {})
    last_url: str | None = None
    last_data: dict[str, Any] | None = None
    last_params: dict[str, Any] | None = None
    last_headers: dict[str, str] | None = None

    def __init__(self, *_args, **_kwargs) -> None:
        pass

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *_exc) -> None:
        return None

    async def post(
        self, url, *, data=None, params=None, headers=None, **_kw
    ) -> _FakeResponse:
        type(self).last_url = url
        type(self).last_data = data
        type(self).last_params = params
        type(self).last_headers = headers
        return type(self).next_response

    async def get(
        self, url, *, headers=None, params=None, **_kw
    ) -> _FakeResponse:
        type(self).last_url = url
        type(self).last_headers = headers
        type(self).last_params = params
        return type(self).next_response


@pytest.fixture
def patched_creds(monkeypatch):
    """Replace the module-level ``settings`` reference with a plain
    namespace so we don't depend on pydantic-settings mutation rules."""
    fake = SimpleNamespace(
        google_health_client_id="cid",
        google_health_client_secret="csecret",
        google_health_redirect_uri="http://localhost:3000/api/v1/wearables/google/callback",
    )
    monkeypatch.setattr(google_health, "settings", fake)
    return fake


@pytest.fixture
def patched_httpx(monkeypatch):
    """Swap httpx.AsyncClient with the fake and reset its class state
    between tests so leftover values from one test can't leak into the
    next."""
    _FakeAsyncClient.next_response = _FakeResponse(200, {})
    _FakeAsyncClient.last_url = None
    _FakeAsyncClient.last_data = None
    _FakeAsyncClient.last_params = None
    _FakeAsyncClient.last_headers = None
    monkeypatch.setattr(google_health.httpx, "AsyncClient", _FakeAsyncClient)
    return _FakeAsyncClient


# ──────────────────────────────────────────────────────────────────────
# build_oauth_url
# ──────────────────────────────────────────────────────────────────────


def test_build_oauth_url_includes_required_params(patched_creds):
    url = google_health.build_oauth_url("opaque-state")
    parsed = urllib.parse.urlparse(url)
    qs = urllib.parse.parse_qs(parsed.query)

    assert parsed.scheme == "https"
    assert parsed.netloc == "accounts.google.com"
    assert qs["client_id"] == ["cid"]
    assert qs["redirect_uri"] == [patched_creds.google_health_redirect_uri]
    assert qs["response_type"] == ["code"]
    assert qs["state"] == ["opaque-state"]
    assert qs["access_type"] == ["offline"]
    assert qs["prompt"] == ["consent"]
    assert qs["include_granted_scopes"] == ["true"]


def test_build_oauth_url_uses_default_scopes(patched_creds):
    url = google_health.build_oauth_url("s")
    qs = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    scope_str = qs["scope"][0]
    for scope in google_health._DEFAULT_SCOPES:
        assert scope in scope_str


def test_build_oauth_url_respects_custom_scopes(patched_creds):
    custom = ("openid", "email")
    url = google_health.build_oauth_url("s", scopes=custom)
    qs = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    assert qs["scope"] == ["openid email"]


def test_build_oauth_url_raises_when_credentials_missing(monkeypatch):
    monkeypatch.setattr(
        google_health,
        "settings",
        SimpleNamespace(
            google_health_client_id="",
            google_health_client_secret="",
            google_health_redirect_uri="",
        ),
    )
    with pytest.raises(google_health.GoogleHealthError):
        google_health.build_oauth_url("s")


# ──────────────────────────────────────────────────────────────────────
# exchange_code_for_tokens
# ──────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_exchange_code_for_tokens_happy_path(patched_creds, patched_httpx):
    patched_httpx.next_response = _FakeResponse(
        200,
        {
            "access_token": "AT",
            "refresh_token": "RT",
            "expires_in": 3600,
            "scope": "openid email",
            "token_type": "Bearer",
        },
    )
    out = await google_health.exchange_code_for_tokens("good-code")
    assert out["access_token"] == "AT"
    assert out["refresh_token"] == "RT"
    assert out["expires_in"] == 3600

    assert patched_httpx.last_url == google_health._OAUTH_TOKEN_URL
    sent = patched_httpx.last_data
    assert sent["code"] == "good-code"
    assert sent["client_id"] == "cid"
    assert sent["client_secret"] == "csecret"
    assert sent["grant_type"] == "authorization_code"
    assert sent["redirect_uri"] == patched_creds.google_health_redirect_uri


@pytest.mark.asyncio
async def test_exchange_code_for_tokens_400_raises_with_status(
    patched_creds, patched_httpx
):
    patched_httpx.next_response = _FakeResponse(
        400, {"error": "invalid_grant"}, text='{"error":"invalid_grant"}'
    )
    with pytest.raises(google_health.GoogleHealthError) as exc:
        await google_health.exchange_code_for_tokens("bad")
    assert exc.value.status_code == 400


# ──────────────────────────────────────────────────────────────────────
# refresh_access_token
# ──────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refresh_access_token_happy_path(patched_creds, patched_httpx):
    patched_httpx.next_response = _FakeResponse(
        200, {"access_token": "AT2", "expires_in": 3600}
    )
    out = await google_health.refresh_access_token("rt")
    assert out["access_token"] == "AT2"

    sent = patched_httpx.last_data
    assert sent["grant_type"] == "refresh_token"
    assert sent["refresh_token"] == "rt"
    assert sent["client_id"] == "cid"


@pytest.mark.asyncio
async def test_refresh_access_token_400_raises_invalid_grant(
    patched_creds, patched_httpx
):
    """Per Google docs, 400 + error=invalid_grant means the refresh
    token is revoked. The caller (Celery task) marks the device
    REAUTH_REQUIRED on status_code=400 specifically."""
    patched_httpx.next_response = _FakeResponse(
        400, {"error": "invalid_grant"}, text='{"error":"invalid_grant"}'
    )
    with pytest.raises(google_health.GoogleHealthError) as exc:
        await google_health.refresh_access_token("dead-rt")
    assert exc.value.status_code == 400


# ──────────────────────────────────────────────────────────────────────
# revoke_token
# ──────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_revoke_token_returns_none_on_200(patched_httpx):
    patched_httpx.next_response = _FakeResponse(200, {})
    assert await google_health.revoke_token("tok") is None
    assert patched_httpx.last_url == google_health._OAUTH_REVOKE_URL
    assert patched_httpx.last_params == {"token": "tok"}


@pytest.mark.asyncio
async def test_revoke_token_is_idempotent_on_400(patched_httpx):
    """Google returns 400 when the token is already invalid. Treat as
    success — disconnect must not get stuck on a stale token."""
    patched_httpx.next_response = _FakeResponse(
        400, {"error": "invalid_token"}, text='{"error":"invalid_token"}'
    )
    assert await google_health.revoke_token("already-dead") is None


@pytest.mark.asyncio
async def test_revoke_token_raises_on_unexpected_status(patched_httpx):
    patched_httpx.next_response = _FakeResponse(500, {}, text="boom")
    with pytest.raises(google_health.GoogleHealthError) as exc:
        await google_health.revoke_token("tok")
    assert exc.value.status_code == 500


# ──────────────────────────────────────────────────────────────────────
# fetch_user_profile (small sanity check on the OIDC flow)
# ──────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_fetch_user_profile_returns_userinfo_dict(patched_httpx):
    patched_httpx.next_response = _FakeResponse(
        200, {"sub": "google-sub-123", "email": "u@example.com"}
    )
    out = await google_health.fetch_user_profile("AT")
    assert out["sub"] == "google-sub-123"
    assert patched_httpx.last_url == google_health._OAUTH_USERINFO_URL
    assert patched_httpx.last_headers == {"Authorization": "Bearer AT"}


@pytest.mark.asyncio
async def test_fetch_user_profile_raises_on_non_200(patched_httpx):
    patched_httpx.next_response = _FakeResponse(401, {}, text="unauthorized")
    with pytest.raises(google_health.GoogleHealthError) as exc:
        await google_health.fetch_user_profile("expired")
    assert exc.value.status_code == 401
