"""Twilio SMS client.

Config-gated: when the ``TWILIO_*`` settings are not all present, callers should
treat SMS as *skipped* rather than failed (see ``is_configured``). The platform
runs fine without a provider configured.
"""
from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT_S = 10.0
_BASE_URL = "https://api.twilio.com/2010-04-01"


def is_configured() -> bool:
    return bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_from_number
    )


def send_sms(to_number: str, body: str) -> None:
    """Send an SMS via Twilio's REST API.

    Raises ``RuntimeError`` if not configured and ``httpx.HTTPStatusError`` /
    ``httpx.HTTPError`` on a delivery failure. PHI-safe: never logs the body or
    recipient number.
    """
    if not is_configured():
        raise RuntimeError("Twilio is not configured. Set TWILIO_* env variables.")

    url = f"{_BASE_URL}/Accounts/{settings.twilio_account_sid}/Messages.json"
    resp = httpx.post(
        url,
        data={
            "From": settings.twilio_from_number,
            "To": to_number,
            "Body": body,
        },
        auth=(settings.twilio_account_sid, settings.twilio_auth_token),
        timeout=_TIMEOUT_S,
    )
    resp.raise_for_status()
    logger.info("channel=sms provider=twilio status=delivered")
