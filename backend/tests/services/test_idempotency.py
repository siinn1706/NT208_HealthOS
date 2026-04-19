"""Unit tests for the Redis idempotency replay store (B7 review P0-1)."""
from __future__ import annotations

import asyncio

import pytest

from app.services.idempotency import (
    IdempotencyOutcome,
    PENDING_SENTINEL,
    acquire_or_wait,
    replay,
    store,
    try_acquire,
)


class _FakeRedis:
    """Minimal in-memory Redis fake supporting the calls the helper makes."""

    def __init__(self):
        self.values: dict[str, str] = {}

    async def get(self, key: str):
        return self.values.get(key)

    async def set(self, key: str, value: str, *, nx: bool = False, ex: int | None = None):
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True

    async def delete(self, key: str) -> int:
        return 1 if self.values.pop(key, None) is not None else 0


@pytest.mark.asyncio
async def test_acquire_or_wait_returns_own_for_first_caller():
    redis = _FakeRedis()
    result = await acquire_or_wait(redis, "key-1", "meals.create")
    assert result.outcome is IdempotencyOutcome.OWN
    assert result.payload is None
    assert redis.values["idem:meals.create:key-1"] == PENDING_SENTINEL


@pytest.mark.asyncio
async def test_acquire_or_wait_returns_replay_when_envelope_already_stored():
    redis = _FakeRedis()
    envelope = {"data": {"id": "abc"}}
    await store(redis, "key-1", "meals.create", envelope)
    result = await acquire_or_wait(redis, "key-1", "meals.create")
    assert result.outcome is IdempotencyOutcome.REPLAY
    assert result.payload == envelope


@pytest.mark.asyncio
async def test_acquire_or_wait_two_concurrent_callers_one_owns_other_replays():
    """The TOCTOU race the previous code had: both callers used to proceed.
    With `acquire_or_wait`, only the OWN caller does the work; the second
    caller waits and gets the cached envelope back."""
    redis = _FakeRedis()
    envelope = {"data": {"id": "deadbeef"}}

    async def worker_a():
        result = await acquire_or_wait(redis, "race-key", "meals.create")
        if result.outcome is IdempotencyOutcome.OWN:
            # Simulate doing the work then storing the envelope.
            await asyncio.sleep(0.05)
            await store(redis, "race-key", "meals.create", envelope)
        return result.outcome

    async def worker_b():
        # Slight delay so worker_a wins the SETNX; then b polls for the result.
        await asyncio.sleep(0.01)
        result = await acquire_or_wait(redis, "race-key", "meals.create")
        return result

    a_outcome, b_result = await asyncio.gather(worker_a(), worker_b())
    assert a_outcome is IdempotencyOutcome.OWN
    assert b_result.outcome is IdempotencyOutcome.REPLAY
    assert b_result.payload == envelope


@pytest.mark.asyncio
async def test_acquire_or_wait_returns_conflict_when_peer_never_completes():
    """Peer crashed mid-request — the slot stays at the pending sentinel.
    After `wait_s`, we surface CONFLICT so the caller can return 409 instead
    of hanging the user's request indefinitely."""
    redis = _FakeRedis()
    # Pre-set the slot to pending — simulates a peer that already won SETNX.
    await try_acquire(redis, "stuck-key", "meals.create")
    result = await acquire_or_wait(
        redis,
        "stuck-key",
        "meals.create",
        wait_s=0.1,
        poll_interval_s=0.02,
    )
    assert result.outcome is IdempotencyOutcome.CONFLICT


@pytest.mark.asyncio
async def test_replay_skips_pending_sentinel():
    """`replay` must not return the in-flight sentinel as a real envelope."""
    redis = _FakeRedis()
    await try_acquire(redis, "k", "scope")
    assert await replay(redis, "k", "scope") is None
