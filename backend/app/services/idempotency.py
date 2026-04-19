"""Redis-backed idempotency replay store.

Implements the api-conventions.md `Idempotency-Key` contract:
  * Mutating routes accept an optional `Idempotency-Key` header (UUID v4).
  * The first request executes; the response envelope is cached for 24h.
  * Replays within the window return the **same** envelope (same status code).

The high-level helper is `acquire_or_wait()` — it does the only correct
sequence: SETNX-acquire, and on contention POLL the slot until either the
peer stores its envelope or the in-flight TTL expires (in which case we
treat the slot as orphaned and return CONFLICT to the caller).

`try_acquire` / `replay` / `store` / `release` remain available as
lower-level primitives for callers that need bespoke flow.

Scope is a per-route bucket (e.g. `"meals.create"`) so two unrelated POSTs
can share the same client-supplied key without colliding.
"""
from __future__ import annotations

import asyncio
import enum
import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

DEFAULT_TTL_S = 24 * 3600  # 24 hours per api-conventions.md
PENDING_TTL_S = 60         # marker for in-flight requests; replaced on store()
PENDING_SENTINEL = "__pending__"

# Polling cadence used by `acquire_or_wait` while another worker is in flight.
_POLL_INTERVAL_S = 0.1
_DEFAULT_WAIT_S = 5.0


class IdempotencyOutcome(enum.Enum):
    """High-level result of `acquire_or_wait`."""

    OWN = "own"          # caller should perform the work then call `store`
    REPLAY = "replay"    # cached envelope returned (return it verbatim)
    CONFLICT = "conflict"  # peer is still in flight past the wait timeout


@dataclass
class IdempotencyResult:
    outcome: IdempotencyOutcome
    payload: Optional[dict[str, Any]] = None  # set when outcome == REPLAY


def _key(key: str, scope: str) -> str:
    return f"idem:{scope}:{key}"


async def try_acquire(redis: Redis, key: str, scope: str) -> bool:
    """Atomically claim the idempotency slot.

    Returns True if this is the first time we've seen this key for this scope
    (caller should run the work and then call `store`). Returns False if the
    slot is already taken — caller should call `replay` to fetch the cached
    envelope (or, if still pending, decide whether to wait or 409).
    """
    storage_key = _key(key, scope)
    set_result = await redis.set(storage_key, PENDING_SENTINEL, nx=True, ex=PENDING_TTL_S)
    return bool(set_result)


async def replay(redis: Redis, key: str, scope: str) -> Optional[dict[str, Any]]:
    """Return the previously stored envelope, or None if not yet stored."""
    raw = await redis.get(_key(key, scope))
    if raw is None or raw == PENDING_SENTINEL:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Corrupted idempotency entry for %s/%s; discarding", scope, key)
        return None


async def store(
    redis: Redis,
    key: str,
    scope: str,
    payload: dict[str, Any],
    ttl_s: int = DEFAULT_TTL_S,
) -> None:
    """Persist the response envelope under the idempotency key for `ttl_s`."""
    await redis.set(_key(key, scope), json.dumps(payload), ex=ttl_s)


async def release(redis: Redis, key: str, scope: str) -> None:
    """Drop a pending claim (e.g. when the work failed and we want a retry)."""
    await redis.delete(_key(key, scope))


async def acquire_or_wait(
    redis: Redis,
    key: str,
    scope: str,
    *,
    wait_s: float = _DEFAULT_WAIT_S,
    poll_interval_s: float = _POLL_INTERVAL_S,
) -> IdempotencyResult:
    """Race-free idempotency entry point.

    Resolves the three possible states in one call:
      * OWN     — this caller acquired the slot; perform the work, then
                  call `store(redis, key, scope, envelope)`.
      * REPLAY  — a previous successful response is in the cache; return
                  `result.payload` verbatim.
      * CONFLICT — another caller has been holding the slot for longer than
                  `wait_s` (slow upstream, or crashed worker that never
                  cleared the marker). Surface 409 to the caller; the
                  pending TTL on the slot will expire on its own.
    """
    # 1. Already-stored response? Return it.
    cached = await replay(redis, key, scope)
    if cached is not None:
        return IdempotencyResult(IdempotencyOutcome.REPLAY, payload=cached)

    # 2. Try to acquire the slot ourselves.
    if await try_acquire(redis, key, scope):
        return IdempotencyResult(IdempotencyOutcome.OWN)

    # 3. Slot is taken — poll until the peer stores its envelope or we time out.
    deadline = asyncio.get_event_loop().time() + wait_s
    while asyncio.get_event_loop().time() < deadline:
        await asyncio.sleep(poll_interval_s)
        cached = await replay(redis, key, scope)
        if cached is not None:
            return IdempotencyResult(IdempotencyOutcome.REPLAY, payload=cached)

    return IdempotencyResult(IdempotencyOutcome.CONFLICT)
