"""MFA (Multi-Factor Authentication) service using TOTP."""
from __future__ import annotations

import secrets
from typing import Optional

import pyotp


class TOTPService:
    """TOTP-based MFA service."""

    def __init__(self, issuer: str = "HealthOS"):
        self.issuer = issuer

    def generate_secret(self) -> str:
        """Generate a new TOTP secret.

        Returns:
            Base32-encoded secret
        """
        return pyotp.random_base32()

    def get_provisioning_uri(self, secret: str, email: str) -> str:
        """Generate the provisioning URI for authenticator apps.

        Args:
            secret: Base32-encoded TOTP secret
            email: User's email address

        Returns:
            URI for QR code generation
        """
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=self.issuer)

    def verify(self, secret: str, code: str, valid_window: int = 1) -> bool:
        """Verify a TOTP code.

        Args:
            secret: Base32-encoded TOTP secret
            code: 6-digit TOTP code
            valid_window: Number of time steps to accept (±1 default)

        Returns:
            True if code is valid
        """
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=valid_window)

    def generate_recovery_codes(self, count: int = 8) -> list[str]:
        """Generate one-time recovery codes.

        Args:
            count: Number of recovery codes to generate

        Returns:
            List of recovery codes
        """
        return [secrets.token_hex(8) for _ in range(count)]

    def verify_recovery_code(
        self,
        code: str,
        stored_codes: list[str],
    ) -> tuple[bool, list[str]]:
        """Verify a recovery code and remove it from the list.

        Args:
            code: Recovery code to verify
            stored_codes: List of stored (hashed) recovery codes

        Returns:
            Tuple of (is_valid, remaining_codes)
        """
        # Find the code (compare directly since codes are stored in plaintext for simplicity)
        # In production, you'd want to hash these too
        remaining = [c for c in stored_codes if c != code]

        # If any code was removed, the provided code was valid
        is_valid = len(remaining) < len(stored_codes)

        return is_valid, remaining


# Singleton instance
totp_service = TOTPService()
