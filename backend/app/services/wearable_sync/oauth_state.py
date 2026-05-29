"""CSRF protection for the Google Health OAuth round-trip.

Google sends the user back to ``/wearables/google/callback`` with whatever
``state`` we put in the authorize URL. Without a signed state, a malicious
site can prep an authorization URL bound to *its* Google account and
trick a logged-in HealthOS user into completing the callback — pinning
the attacker's Google data onto the victim's HealthOS account.

We mint a short-lived JWT (``typ=oauth_state``) keyed by the initiating
user's id, and the callback rejects any state whose ``sub`` does not
match ``current_user.id``. 10 minutes is enough for a normal consent
flow (most users finish in under a minute) and short enough that a
stolen state token is useless by the time anyone tries to replay it.

We deliberately reuse ``settings.secret_key`` rather than introducing a
dedicated state-signing secret: the threat model is identical to other
short-lived session tokens (replayable only by someone who could already
have stolen a full access token).
"""
from __future__ import annotations

import datetime
import logging
import secrets
import uuid
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)


_STATE_TYP = "oauth_state"
_STATE_TTL_SECONDS = 600  # 10 min — comfortable for consent flow, short for replay


class OAuthStateError(RuntimeError):
    """Raised when the state token is missing, expired, tampered, or mints
    a user-id that doesn't match the authenticated session.

    The endpoint turns this into a 400 — never a 500 — because every
    failure mode here is "the client sent us garbage", not an internal
    error worth paging on.
    """


async def mint_state(redis: Any, user_id: uuid.UUID) -> str:
    """Mint a one-time-use OAuth state token backed by Redis.

    Stores the nonce in Redis with ``_STATE_TTL_SECONDS`` TTL.
    ``consume_state`` atomically removes it — a second presentation of
    the same token raises ``OAuthStateError`` even if the JWT is still
    within its ``exp`` window.
    """
    nonce = secrets.token_urlsafe(16)
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(seconds=_STATE_TTL_SECONDS)).timestamp()),
        "typ": _STATE_TYP,
        "nonce": nonce,
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    await redis.set(f"oauth:state:{nonce}", "1", ex=_STATE_TTL_SECONDS)
    return token


async def consume_state(
    redis: Any,
    token: str,
    *,
    expected_user_id: uuid.UUID,
) -> uuid.UUID:
    """Validate and atomically consume a one-time OAuth state token.

    The nonce embedded in the JWT is GETDEL'd from Redis — the operation
    is atomic so two concurrent callbacks racing on the same state can
    only succeed once.  Any second call (or a call after Redis TTL expiry)
    will find the nonce absent and raise ``OAuthStateError``.

    Raises ``OAuthStateError`` if:
      * the token is missing / malformed / expired / tampered,
      * the nonce has already been consumed or its TTL elapsed,
      * the embedded subject does not match ``expected_user_id``.
    """
    if not token:
        raise OAuthStateError("Missing OAuth state token.")
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            options={"verify_aud": False, "verify_iss": False},
        )
    except JWTError as exc:
        logger.info("OAuth state rejected: %s", exc)
        raise OAuthStateError("Invalid or expired OAuth state token.") from exc

    if payload.get("typ") != _STATE_TYP:
        raise OAuthStateError("OAuth state token has wrong type.")

    nonce = payload.get("nonce")
    if not nonce:
        raise OAuthStateError("OAuth state token missing nonce.")

    # Atomically consume the nonce.  Returns None if already deleted or
    # never stored (i.e. token was signed without mint_state).
    existing = await redis.getdel(f"oauth:state:{nonce}")
    if existing is None:
        raise OAuthStateError("OAuth state token has already been used or expired.")

    raw_sub = payload.get("sub")
    if not raw_sub:
        raise OAuthStateError("OAuth state token is missing subject.")
    try:
        signed_user_id = uuid.UUID(raw_sub)
    except (TypeError, ValueError) as exc:
        raise OAuthStateError("OAuth state token has malformed subject.") from exc

    if not secrets.compare_digest(signed_user_id.bytes, expected_user_id.bytes):
        logger.warning(
            "OAuth state subject mismatch (signed=%s, session=%s)",
            signed_user_id,
            expected_user_id,
        )
        raise OAuthStateError("OAuth state does not match authenticated user.")

    return signed_user_id
