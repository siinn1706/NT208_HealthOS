"""Unit tests for ``app.tasks.sync_wearables``.

The full ``_sync_one_device_async`` orchestrates DB + HTTP + Celery and
is best validated as an integration test against real services. Here
we cover the two helpers whose logic is meaningful in isolation:

  * ``_refresh_and_persist`` — proves access tokens get re-encrypted
    on rotation and that an omitted ``refresh_token`` in the response
    leaves the existing one untouched (Google often omits it).

  * ``_mark_error`` — proves the device row gets the right error code
    without touching tokens (matches the M2 fix pattern in health_sync).

We patch the Fernet helper to a passthrough so these tests don't need
``FERNET_KEY`` configured at import time.
"""
from __future__ import annotations

import datetime
import uuid

import pytest

from app.models.core import ConnectedDevice, WearableProviderEnum
from app.tasks import sync_wearables


class _FakeDevice:
    """Stand-in for ConnectedDevice — only the columns the helpers
    actually touch. Avoids dragging in SQLAlchemy session machinery."""

    def __init__(self):
        self.id = uuid.uuid4()
        self.user_id = uuid.uuid4()
        self.provider = WearableProviderEnum.GOOGLE_HEALTH
        self.access_token_encrypted = "old-access-cipher"
        self.refresh_token_encrypted = "old-refresh-cipher"
        self.token_expires_at = datetime.datetime.now(
            datetime.timezone.utc
        ) - datetime.timedelta(minutes=5)  # already expired
        self.last_synced_at = None
        self.last_attempted_at = None
        self.last_sync_status = "ok"
        self.last_sync_error = None
        self.last_sync_count = None


class _FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}
        self.eval_calls: list[tuple[str, str]] = []

    async def set(
        self,
        key: str,
        value: str,
        *,
        nx: bool = False,
        ex: int | None = None,
    ):
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True

    async def eval(self, _script: str, _numkeys: int, key: str, token: str):
        self.eval_calls.append((key, token))
        if self.values.get(key) == token:
            self.values.pop(key, None)
            return 1
        return 0


@pytest.fixture
def passthrough_fernet(monkeypatch):
    """Skip real Fernet so we can read what the helper actually persists.

    The interesting assertion is "did the new ciphertext get stored",
    not "does Fernet round-trip" (that's covered in token_crypto's own
    tests).
    """
    monkeypatch.setattr(
        sync_wearables, "encrypt_token", lambda plain: f"ENC:{plain}"
    )
    yield


@pytest.mark.asyncio
async def test_refresh_persists_new_access_token(passthrough_fernet, monkeypatch):
    """Happy path — Google returns a new access_token + expires_in;
    we re-encrypt and stamp a new expiry."""
    async def fake_refresh(refresh_token):
        assert refresh_token == "current-refresh-plain"
        return {"access_token": "fresh-access", "expires_in": 3600}

    monkeypatch.setattr(
        sync_wearables.google_health, "refresh_access_token", fake_refresh
    )

    device = _FakeDevice()
    new_access = await sync_wearables._refresh_and_persist(
        db=None, device=device, refresh_token="current-refresh-plain"
    )
    assert new_access == "fresh-access"
    assert device.access_token_encrypted == "ENC:fresh-access"
    # Refresh token was NOT rotated → original ciphertext preserved.
    assert device.refresh_token_encrypted == "old-refresh-cipher"
    # New expiry is now() + 3600s, give or take a few ms for the test
    # round-trip. Just check it's well in the future.
    now = datetime.datetime.now(datetime.timezone.utc)
    assert device.token_expires_at > now + datetime.timedelta(minutes=55)


@pytest.mark.asyncio
async def test_refresh_persists_rotated_refresh_token(
    passthrough_fernet, monkeypatch
):
    """Google may rotate the refresh_token; when it does, we must
    re-encrypt and persist it too (or future syncs will fail with
    invalid_grant)."""
    async def fake_refresh(refresh_token):
        return {
            "access_token": "fresh-access",
            "expires_in": 3600,
            "refresh_token": "rotated-refresh",
        }

    monkeypatch.setattr(
        sync_wearables.google_health, "refresh_access_token", fake_refresh
    )

    device = _FakeDevice()
    await sync_wearables._refresh_and_persist(
        db=None, device=device, refresh_token="anything"
    )
    assert device.refresh_token_encrypted == "ENC:rotated-refresh"


@pytest.mark.asyncio
async def test_refresh_missing_access_token_raises(
    passthrough_fernet, monkeypatch
):
    """A response with no access_token is unrecoverable — raise so the
    caller marks the device with the right error code."""
    async def fake_refresh(_):
        return {"expires_in": 3600}  # missing access_token

    monkeypatch.setattr(
        sync_wearables.google_health, "refresh_access_token", fake_refresh
    )

    with pytest.raises(sync_wearables.google_health.GoogleHealthError):
        await sync_wearables._refresh_and_persist(
            db=None, device=_FakeDevice(), refresh_token="x"
        )


@pytest.mark.asyncio
async def test_mark_error_sets_status_without_touching_tokens():
    """The error fields should change; the token ciphertext should not.
    Mirrors the M2 fix in health_sync — a transient failure must never
    cost us a working token."""
    device = _FakeDevice()
    original_access = device.access_token_encrypted
    original_refresh = device.refresh_token_encrypted

    await sync_wearables._mark_error(db=None, device=device, code="REAUTH_REQUIRED")

    assert device.last_sync_status == "error"
    assert device.last_sync_error == "REAUTH_REQUIRED"
    assert device.last_attempted_at is not None
    # Token columns untouched — this is the whole point.
    assert device.access_token_encrypted == original_access
    assert device.refresh_token_encrypted == original_refresh


@pytest.mark.asyncio
async def test_sync_one_device_skips_when_lock_is_already_held(monkeypatch):
    connection_id = uuid.uuid4()
    redis = _FakeRedis()
    redis.values[f"wearable-sync:{connection_id}"] = "someone-else"

    async def fake_get_redis():
        return redis

    class _ShouldNotOpenSession:
        async def __aenter__(self):
            raise AssertionError("DB session should not open when lock is busy")

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(sync_wearables, "get_redis", fake_get_redis)
    monkeypatch.setattr(
        sync_wearables, "AsyncSessionLocal", lambda: _ShouldNotOpenSession()
    )

    result = await sync_wearables._sync_one_device_async(connection_id)
    assert result == {"status": "skipped", "reason": "locked"}


@pytest.mark.asyncio
async def test_sync_one_device_releases_lock_on_exception(monkeypatch):
    connection_id = uuid.uuid4()
    redis = _FakeRedis()

    async def fake_get_redis():
        return redis

    class _BrokenSession:
        async def __aenter__(self):
            raise RuntimeError("boom")

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(sync_wearables, "get_redis", fake_get_redis)
    monkeypatch.setattr(sync_wearables, "AsyncSessionLocal", lambda: _BrokenSession())

    with pytest.raises(RuntimeError, match="boom"):
        await sync_wearables._sync_one_device_async(connection_id)

    assert redis.values == {}
    assert redis.eval_calls
