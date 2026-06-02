"""HaveIBeenPwned (HIBP) integration using k-anonymity API.

The API: https://api.pwnedpasswords.com/range/{first5}
Sends SHA-1(prefix) and receives all hashes starting with that prefix.
"""
from __future__ import annotations

import hashlib
import logging
import httpx
from typing import Tuple

logger = logging.getLogger(__name__)

HIBP_API_URL = "https://api.pwnedpasswords.com/range"


async def check_password_breach(password: str) -> Tuple[bool, int]:
    """Check if a password appears in known data breaches via HIBP k-anonymity API.

    Args:
        password: The password to check

    Returns:
        Tuple of (is_breached, breach_count) where count is how many times
        the password appears in breaches. Returns (False, 0) on API errors.
    """
    # SHA-1 hash the password
    sha1_hash = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1_hash[:5], sha1_hash[5:]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{HIBP_API_URL}/{prefix}",
                headers={"User-Agent": "HealthOS-Auth"},
            )

            if response.status_code != 200:
                # API error — fail open (don't block registration)
                return False, 0

            # Parse response: each line is "SUFFIX:COUNT"
            for line in response.text.splitlines():
                parts = line.split(":")
                if len(parts) == 2 and parts[0].strip().upper() == suffix:
                    count = int(parts[1].strip())
                    return True, count

            return False, 0

    except Exception:
        logger.warning("HIBP check failed (network/parse error); failing open", exc_info=True)
        return False, 0


def is_password_breached_sync(password: str) -> Tuple[bool, int]:
    """Synchronous version for use in non-async contexts."""
    sha1_hash = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1_hash[:5], sha1_hash[5:]

    try:
        import requests
        response = requests.get(
            f"{HIBP_API_URL}/{prefix}",
            headers={"User-Agent": "HealthOS-Auth"},
            timeout=10,
        )
        if response.status_code != 200:
            return False, 0

        for line in response.text.splitlines():
            parts = line.split(":")
            if len(parts) == 2 and parts[0].strip().upper() == suffix:
                count = int(parts[1].strip())
                return True, count

        return False, 0
    except Exception:
        logger.warning("HIBP sync check failed (network/parse error); failing open", exc_info=True)
        return False, 0
