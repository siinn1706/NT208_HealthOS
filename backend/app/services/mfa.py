"""MFA (Multi-Factor Authentication) service using TOTP."""
from __future__ import annotations

import hmac
import logging
import secrets
from typing import Optional

import bcrypt
import pyotp

logger = logging.getLogger(__name__)


def _get_fernet():
    """Return a Fernet instance for TOTP secret encryption, or None if key not configured."""
    from app.core.config import settings
    if not settings.fernet_key:
        return None
    try:
        from cryptography.fernet import Fernet
        key = settings.fernet_key.encode() if isinstance(settings.fernet_key, str) else settings.fernet_key
        return Fernet(key)
    except Exception:
        logger.warning("Fernet key is invalid — TOTP secrets will NOT be encrypted at rest")
        return None


def encrypt_totp_secret(secret: str) -> str:
    """Encrypt a plaintext TOTP secret before DB storage."""
    f = _get_fernet()
    if f is None:
        return secret
    return f.encrypt(secret.encode()).decode()


def decrypt_totp_secret(stored: str) -> str:
    """Decrypt a stored TOTP secret for use in TOTP verification.

    Falls back to returning the value as-is for backward compatibility
    (pre-encryption plaintext values in existing DB rows).
    """
    f = _get_fernet()
    if f is None:
        return stored
    try:
        return f.decrypt(stored.encode()).decode()
    except Exception:
        # Value is likely unencrypted plaintext from before this change
        return stored


def hash_recovery_code(code: str) -> str:
    """Bcrypt-hash a recovery code for safe DB storage."""
    return bcrypt.hashpw(code.encode(), bcrypt.gensalt(rounds=10)).decode()


def verify_recovery_code_hash(code: str, hashed: str) -> bool:
    """Compare a plaintext recovery code against its stored bcrypt hash."""
    try:
        return bcrypt.checkpw(code.encode(), hashed.encode())
    except Exception:
        return False


class TOTPService:
    """TOTP-based MFA service with Fernet-encrypted secrets and bcrypt-hashed recovery codes."""

    def __init__(self, issuer: str = "HealthOS"):
        self.issuer = issuer

    def generate_secret(self) -> str:
        """Generate a new Base32-encoded TOTP secret (plaintext — encrypt before storing)."""
        return pyotp.random_base32()

    def get_provisioning_uri(self, secret: str, email: str) -> str:
        """Generate the provisioning URI for authenticator apps (expects plaintext secret)."""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=self.issuer)

    def verify(self, stored_secret: str, code: str, valid_window: int = 1) -> bool:
        """Verify a TOTP code against a stored (possibly encrypted) secret."""
        plaintext = decrypt_totp_secret(stored_secret)
        totp = pyotp.TOTP(plaintext)
        return totp.verify(code, valid_window=valid_window)

    def generate_recovery_codes(self, count: int = 8) -> list[str]:
        """Generate plaintext one-time recovery codes.

        Returns the plaintext list; the caller must hash before storing.
        """
        return [secrets.token_hex(8) for _ in range(count)]

    def hash_recovery_codes(self, codes: list[str]) -> list[str]:
        """Return bcrypt-hashed versions of plaintext recovery codes for DB storage."""
        return [hash_recovery_code(c) for c in codes]

    def verify_recovery_code(
        self,
        code: str,
        stored_codes: list[str],
    ) -> tuple[bool, list[str]]:
        """Verify a recovery code and remove it from the stored list.

        Handles both bcrypt-hashed codes (new) and legacy plaintext codes
        (old rows written before this change) for backward compatibility.

        Returns:
            Tuple of (is_valid, remaining_codes_after_removal)
        """
        matched_index: Optional[int] = None

        for i, stored in enumerate(stored_codes):
            # Bcrypt hashes always start with '$2b$' or '$2a$'
            if stored.startswith(("$2b$", "$2a$", "$2y$")):
                if verify_recovery_code_hash(code, stored):
                    matched_index = i
                    break
            else:
                # Legacy plaintext comparison for existing unhashed rows — constant-time
                if hmac.compare_digest(code, stored):
                    matched_index = i
                    break

        if matched_index is None:
            return False, stored_codes

        remaining = stored_codes[:matched_index] + stored_codes[matched_index + 1:]
        return True, remaining


# Singleton instance
totp_service = TOTPService()
