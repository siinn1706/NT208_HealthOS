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


def sign_state(user_id: uuid.UUID) -> str:
    """Mint a signed state token for ``user_id``.

    Includes a fresh ``nonce`` so two concurrent connect attempts from
    the same user produce distinct strings (defence against the unlikely
    case where Google caches the state on its side).
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(seconds=_STATE_TTL_SECONDS)).timestamp()),
        "typ": _STATE_TYP,
        # 128 bits of entropy. Not used for verification — its only job
        # is to make the encoded string unique per call.
        "nonce": secrets.token_urlsafe(16),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def verify_state(token: str, *, expected_user_id: uuid.UUID) -> uuid.UUID:
    """Validate a state token and return the embedded user id.

    Raises ``OAuthStateError`` if:
      * the token is missing/malformed/expired/tampered,
      * the embedded ``typ`` is not ``oauth_state`` (i.e. someone tried
        to pass a regular access token through this verifier),
      * the embedded ``sub`` doesn't match the authenticated session.

    The match against ``expected_user_id`` is what closes the CSRF hole;
    a JWT alone proves the issuer signed *something*, not that it was
    minted for the user currently sitting in front of the browser.
    """
    if not token:
        raise OAuthStateError("Missing OAuth state token.")
    try:
        # `verify_aud=False` because the state token is internal — no
        # audience claim, unlike the access tokens minted in security.py.
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

    raw_sub = payload.get("sub")
    if not raw_sub:
        raise OAuthStateError("OAuth state token is missing subject.")
    try:
        signed_user_id = uuid.UUID(raw_sub)
    except (TypeError, ValueError) as exc:
        raise OAuthStateError("OAuth state token has malformed subject.") from exc

    # Constant-time compare on the raw bytes — UUID equality is already
    # constant-time in CPython, but be explicit so the intent is clear
    # to anyone auditing this file.
    if not secrets.compare_digest(signed_user_id.bytes, expected_user_id.bytes):
        logger.warning(
            "OAuth state subject mismatch (signed=%s, session=%s)",
            signed_user_id, expected_user_id,
        )
        raise OAuthStateError("OAuth state does not match authenticated user.")

    return signed_user_id
