"""Unit tests for the Redis-backed OAuth state flow used by Google Health.

These exercise the failure modes that matter for ``mint_state`` /
``consume_state``:

  1. Round-trip succeeds when the same session re-presents its state once.
  2. A consumed (or expired) nonce cannot be replayed.
  3. A token bound to user A cannot be redeemed by user B (CSRF defence).
  4. A tampered token is rejected before the nonce is touched.

We don't test against a real Google flow — the state token is opaque to
Google; what matters is that ``consume_state`` is one-time-use and that
mismatches blow up clearly.
"""
from __future__ import annotations

import uuid

import pytest

from app.services.wearable_sync import oauth_state


class _FakeRedis:
    """Minimal in-memory Redis stand-in for oauth_state tests."""

    def __init__(self):
        self.store: dict[str, str] = {}

    async def set(self, key: str, value: str, *, ex: int | None = None, nx: bool = False):
        if nx and key in self.store:
            return None
        self.store[key] = value
        return True

    async def getdel(self, key: str):
        return self.store.pop(key, None)


# ─────────────────────────────────────────────────────────────────────
# mint_state / consume_state — Redis-backed one-time-use flow
# ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mint_consume_roundtrip():
    """Happy path — mint a state, consume it once, get the right user back."""
    user_id = uuid.uuid4()
    redis = _FakeRedis()
    token = await oauth_state.mint_state(redis, user_id)
    assert isinstance(token, str) and token
    # The nonce should now be in Redis.
    assert len(redis.store) == 1
    result = await oauth_state.consume_state(redis, token, expected_user_id=user_id)
    assert result == user_id
    # The nonce must be gone after consumption.
    assert redis.store == {}


@pytest.mark.asyncio
async def test_consume_rejects_second_use():
    """A state token must not be reusable — replay protection is the whole
    point of the Redis-backed nonce."""
    user_id = uuid.uuid4()
    redis = _FakeRedis()
    token = await oauth_state.mint_state(redis, user_id)
    await oauth_state.consume_state(redis, token, expected_user_id=user_id)
    with pytest.raises(oauth_state.OAuthStateError, match="already been used"):
        await oauth_state.consume_state(redis, token, expected_user_id=user_id)


@pytest.mark.asyncio
async def test_consume_rejects_when_nonce_expired():
    """If the Redis key expired (simulated by clearing the store) the token
    is treated as consumed/expired — not a valid state."""
    user_id = uuid.uuid4()
    redis = _FakeRedis()
    token = await oauth_state.mint_state(redis, user_id)
    redis.store.clear()  # simulate Redis TTL expiry
    with pytest.raises(oauth_state.OAuthStateError, match="already been used"):
        await oauth_state.consume_state(redis, token, expected_user_id=user_id)


@pytest.mark.asyncio
async def test_consume_rejects_user_mismatch():
    """User B cannot consume a state minted for user A — the sub claim
    is checked after the nonce is atomically consumed."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    redis = _FakeRedis()
    token = await oauth_state.mint_state(redis, user_a)
    with pytest.raises(oauth_state.OAuthStateError):
        await oauth_state.consume_state(redis, token, expected_user_id=user_b)


@pytest.mark.asyncio
async def test_consume_rejects_tampered_token():
    """A tampered JWT is caught by signature verification before any
    Redis lookup — the nonce is never consumed."""
    user_id = uuid.uuid4()
    redis = _FakeRedis()
    token = await oauth_state.mint_state(redis, user_id)
    tampered = token[:-2] + ("A" if token[-2] != "A" else "B") + token[-1]
    with pytest.raises(oauth_state.OAuthStateError):
        await oauth_state.consume_state(redis, tampered, expected_user_id=user_id)
    # Nonce was NOT consumed — the legitimate token still works.
    result = await oauth_state.consume_state(redis, token, expected_user_id=user_id)
    assert result == user_id


@pytest.mark.asyncio
async def test_consume_rejects_empty_token():
    """Guard against None / '' being coerced into the callback."""
    redis = _FakeRedis()
    with pytest.raises(oauth_state.OAuthStateError):
        await oauth_state.consume_state(redis, "", expected_user_id=uuid.uuid4())
