"""Endpoint contract tests for the Google Health wearables router.

The deeper "tokens land in the DB" assertions belong to integration
tests with real Postgres; here we exercise the surface that doesn't
need persistence:

  * ``POST /wearables/google/connect`` builds an authorize URL that
    embeds our client_id and a signed state.
  * ``POST /wearables/google/connect`` 503s when credentials are unset.
  * ``GET  /wearables/google/callback`` rejects a mismatched state.
  * ``POST /wearables/google/webhook`` rejects bad signatures with 401.
  * ``POST /wearables/google/webhook`` 503s when the secret is unset.

We override ``get_current_user`` for the auth-gated routes and patch
``settings`` at the right time so the credential-presence branches
flip cleanly.
"""
from __future__ import annotations

import hashlib
import hmac
import urllib.parse
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.database import engine
from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.core.config import settings
from app.core.security import get_current_user
from app.main import app
from app.services.wearable_sync import google_health, oauth_state


class _FakeRedis:
    """In-memory Redis stand-in for endpoint tests.

    Supports ``set`` (with ``ex`` TTL, ignored — TTL isn't checked in unit
    tests), ``getdel``, and the Lua-based ``eval`` the per-user rate limiter
    on /connect and /callback runs.  Keeps a plain dict so tests can inspect
    state directly.
    """

    def __init__(self):
        self.store: dict[str, str] = {}

    async def set(self, key: str, value: str, *, ex: int | None = None, nx: bool = False):
        if nx and key in self.store:
            return None
        self.store[key] = value
        return True

    async def getdel(self, key: str):
        return self.store.pop(key, None)

    async def eval(self, _script: str, _numkeys: int, key: str, *_args):
        # The rate limiter's Lua is INCR + first-call EXPIRE; a unit test only
        # needs a monotonic per-key counter, so TTL is irrelevant here.
        cur = int(self.store.get(key, "0")) + 1
        self.store[key] = str(cur)
        return cur


@pytest.fixture(autouse=True)
def fake_redis_override():
    """Inject an in-memory Redis for every test in this module.

    All wearables endpoints that use ``get_redis`` (connect, callback) will
    receive this fake — no real Redis connection required.  Tests that need
    to pre-populate state (e.g. mint_state) can request the fixture by name
    to get the same instance the endpoint will see.
    """
    redis = _FakeRedis()

    async def _get_fake():
        return redis

    app.dependency_overrides[get_redis] = _get_fake
    yield redis
    app.dependency_overrides.pop(get_redis, None)


@pytest.fixture
def authenticated_user():
    return type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "test@example.com", "hashed_password": "fake"},
    )()


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    # See test_devices_ingest.py — the asyncpg pool is bound to the
    # event loop the engine was created on, and pytest-asyncio mints
    # a fresh loop per test. Dispose so the next test gets new conns.
    await engine.dispose()


@pytest_asyncio.fixture
async def authenticated_client(authenticated_user):
    async def override():
        return authenticated_user

    app.dependency_overrides[get_current_user] = override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    await engine.dispose()


# ─────────────────────────────────────────────────────────────────────
# POST /wearables/google/connect
# ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_connect_requires_auth(async_client):
    """No session → 401 before we burn a credential check."""
    res = await async_client.post("/v1/wearables/google/connect")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_connect_503s_when_credentials_missing(
    authenticated_client, monkeypatch
):
    """Operator forgot to set GOOGLE_HEALTH_CLIENT_ID → user-facing
    503, not a 500. The BFF can then show a "Coming soon" banner."""
    monkeypatch.setattr(settings, "google_health_client_id", "")
    monkeypatch.setattr(settings, "google_health_client_secret", "")
    res = await authenticated_client.post("/v1/wearables/google/connect")
    assert res.status_code == 503
    body = res.json()
    assert "WEARABLE_NOT_CONFIGURED" in str(body)


@pytest.mark.asyncio
async def test_connect_returns_authorize_url(authenticated_client, monkeypatch):
    """Happy path — URL contains client_id and a state token bound to
    the authenticated user."""
    monkeypatch.setattr(settings, "google_health_client_id", "test-client-id")
    monkeypatch.setattr(settings, "google_health_client_secret", "test-secret")
    monkeypatch.setattr(
        settings,
        "google_health_redirect_uri",
        "http://localhost:3000/api/v1/wearables/google/callback",
    )
    res = await authenticated_client.post("/v1/wearables/google/connect")
    assert res.status_code == 200
    url = res.json()["authorization_url"]
    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(parsed.query)
    assert parsed.netloc == "accounts.google.com"
    assert params["client_id"] == ["test-client-id"]
    # Signed state must be present and decodable.
    state = params["state"][0]
    # We don't know the test user id from here — just confirm it parses.
    from jose import jwt
    decoded = jwt.decode(
        state,
        settings.secret_key,
        algorithms=[settings.algorithm],
        options={"verify_aud": False, "verify_iss": False},
    )
    assert decoded["typ"] == "oauth_state"


# ─────────────────────────────────────────────────────────────────────
# GET /wearables/google/callback
# ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_callback_rejects_missing_code(authenticated_client):
    """FastAPI validates `code` as required — bad request without it."""
    res = await authenticated_client.get(
        "/v1/wearables/google/callback?state=anything"
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_callback_rejects_bad_state(authenticated_client):
    """A garbage state token is the most likely failure mode in the
    wild (expired link, replay, CSRF probe). Must be a clean 400 with
    INVALID_STATE so the BFF can show a "Try connecting again" CTA."""
    res = await authenticated_client.get(
        "/v1/wearables/google/callback?code=fakecode&state=not-a-real-jwt"
    )
    assert res.status_code == 400
    assert "INVALID_STATE" in str(res.json())


@pytest.mark.asyncio
async def test_callback_rejects_state_for_other_user(
    authenticated_client, authenticated_user, fake_redis_override
):
    """State minted for user A is presented by user B → 400."""
    # `authenticated_user` is user B (the one logged in). Mint a state
    # for a DIFFERENT user into the SAME fake Redis the endpoint reads, so
    # the nonce check passes and we actually exercise the subject-mismatch
    # rejection rather than the "nonce absent" branch.
    other = uuid.uuid4()
    assert other != authenticated_user.id
    state = await oauth_state.mint_state(fake_redis_override, other)
    res = await authenticated_client.get(
        f"/v1/wearables/google/callback?code=fakecode&state={state}"
    )
    assert res.status_code == 400
    assert "INVALID_STATE" in str(res.json())


@pytest.mark.asyncio
async def test_callback_rejects_google_account_owned_by_other_user(
    authenticated_client, authenticated_user, monkeypatch, fake_redis_override
):
    class _ScalarResult:
        def __init__(self, value):
            self._value = value

        def scalar_one_or_none(self):
            return self._value

    class _DuplicateDb:
        async def execute(self, _stmt):
            return _ScalarResult(uuid.uuid4())

    async def override_db():
        return _DuplicateDb()

    async def fake_exchange(_code: str):
        return {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "expires_in": 3600,
            "scope": "scope-a scope-b",
        }

    async def fake_profile(_access_token: str):
        return {"sub": "google-sub-123"}

    monkeypatch.setattr(google_health, "exchange_code_for_tokens", fake_exchange)
    monkeypatch.setattr(google_health, "fetch_user_profile", fake_profile)
    app.dependency_overrides[get_db] = override_db

    # Use mint_state so the nonce is stored in the same fake Redis the
    # callback endpoint will call consume_state against.
    state = await oauth_state.mint_state(fake_redis_override, authenticated_user.id)
    res = await authenticated_client.get(
        f"/v1/wearables/google/callback?code=fakecode&state={state}"
    )
    assert res.status_code == 409
    assert "ACCOUNT_ALREADY_LINKED" in str(res.json())
    app.dependency_overrides.pop(get_db, None)


# ─────────────────────────────────────────────────────────────────────
# POST /wearables/google/webhook
# ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_503s_when_secret_missing(async_client, monkeypatch):
    """No secret configured → reject everything. Prefer noisy 503 over
    silently accepting unsigned pushes."""
    monkeypatch.setattr(settings, "google_health_webhook_secret", "")
    res = await async_client.post(
        "/v1/wearables/google/webhook", content=b"{}"
    )
    assert res.status_code == 503


@pytest.mark.asyncio
async def test_webhook_rejects_bad_signature(async_client, monkeypatch):
    """Wrong HMAC → 401, never leak how close the signature was."""
    monkeypatch.setattr(
        settings, "google_health_webhook_secret", "shared-secret"
    )
    res = await async_client.post(
        "/v1/wearables/google/webhook",
        content=b'{"sub":"abc"}',
        headers={"X-Goog-Signature": "wrong"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_webhook_accepts_valid_signature_unknown_sub(
    async_client, monkeypatch
):
    """Valid HMAC but no matching ConnectedDevice — 204 (don't make
    Google retry indefinitely on unknown subjects)."""
    secret = "shared-secret"
    body = b'{"sub":"someone-not-in-db"}'
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    monkeypatch.setattr(settings, "google_health_webhook_secret", secret)
    res = await async_client.post(
        "/v1/wearables/google/webhook",
        content=body,
        headers={"X-Goog-Signature": sig},
    )
    assert res.status_code == 204


# ─────────────────────────────────────────────────────────────────────
# fix 9: minimize wearable identifier exposure
# ───────────────────────────────────────────────────────��─────────────


def test_connected_device_dto_redacts_external_account_id():
    """external_account_id must serialize as null regardless of the stored
    value so the Google OAuth sub never appears in API responses."""
    from app.schemas.devices import ConnectedDeviceDTO

    dto = ConnectedDeviceDTO(
        id=uuid.uuid4(),
        provider="google_health",
        name="Google Health",
        connected=True,
        external_account_id="google-sub-12345",
    )
    serialized = dto.model_dump()
    assert serialized["external_account_id"] is None

    json_str = dto.model_dump_json()
    assert "google-sub-12345" not in json_str


def test_wearables_device_to_dto_does_not_expose_account_id():
    """_device_to_dto must also emit null for external_account_id."""
    from app.api.v1.endpoints.wearables import _device_to_dto
    from app.models.core import ConnectedDevice, WearableProviderEnum

    device = ConnectedDevice(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        provider=WearableProviderEnum.GOOGLE_HEALTH,
        external_account_id="google-sub-secret",
        device_label="Google Health",
        last_sync_status="ok",
    )
    dto = _device_to_dto(device)
    serialized = dto.model_dump()
    assert serialized["external_account_id"] is None
