"""Fernet wrapper for OAuth tokens stored on ``connected_devices``.

Deliberately stricter than ``services/mfa.py``'s helper: if no Fernet
key is configured, this module **raises**. That helper falls through
to plaintext for backward compatibility with TOTP secrets stored before
encryption was introduced; there is no such legacy data for OAuth
tokens (the columns are new in migration 030), so silently storing
plaintext refresh tokens would be a security regression with no upside.

The single ``settings.fernet_key`` is shared with MFA — adding a second
key would double the operational burden (rotation, backup) for zero
benefit, since both secrets have equivalent sensitivity.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenCryptoUnavailableError(RuntimeError):
    """Raised when ``settings.fernet_key`` is missing or malformed.

    Surfaced to OAuth-connect endpoints as a 500 so the operator notices
    immediately; a misconfigured key would otherwise let the system
    silently persist plaintext refresh tokens.
    """


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    """Return a cached Fernet instance, or raise if the key is unusable.

    Cached because Fernet construction does a base64 decode + length check
    on every call — wasteful when we encrypt one token per OAuth flow.
    """
    key = settings.fernet_key
    if not key:
        raise TokenCryptoUnavailableError(
            "FERNET_KEY is not set; OAuth tokens cannot be persisted safely."
        )
    try:
        key_bytes = key.encode() if isinstance(key, str) else key
        return Fernet(key_bytes)
    except Exception as exc:
        # Malformed key — surface loudly. Do NOT fall through to plaintext.
        logger.error("FERNET_KEY is invalid; OAuth token encryption disabled")
        raise TokenCryptoUnavailableError(
            "FERNET_KEY is malformed; cannot initialise token encryption."
        ) from exc


def encrypt_token(plain: str) -> str:
    """Encrypt an OAuth access/refresh token for DB storage."""
    if not plain:
        raise ValueError("Cannot encrypt an empty token.")
    return _get_fernet().encrypt(plain.encode()).decode()


def decrypt_token(stored: str) -> str:
    """Decrypt a previously-stored token. Raises if the ciphertext is bad.

    Unlike the TOTP helper, we do not fall back to returning the input
    unchanged on failure — a corrupt token here means the OAuth flow
    is broken and the caller should surface a re-authentication CTA
    rather than silently passing garbage to the upstream API.
    """
    if not stored:
        raise ValueError("Cannot decrypt an empty token.")
    try:
        return _get_fernet().decrypt(stored.encode()).decode()
    except InvalidToken as exc:
        raise TokenCryptoUnavailableError(
            "Stored OAuth token is corrupt or was encrypted with a different key."
        ) from exc
