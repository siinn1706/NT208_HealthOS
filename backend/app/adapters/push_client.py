"""Expo push-notification client.

Config-gated: when ``EXPO_PUSH_ENABLED`` is false, callers should treat push as
*skipped* rather than failed. Targets are ExpoPushTokens registered by the
mobile app; there is no server-side token store yet, so push currently only
fires when tokens are passed in explicitly.
"""
from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT_S = 10.0
_EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def is_configured() -> bool:
    return bool(settings.expo_push_enabled)


def send_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> None:
    """Send an Expo push to one or more ExpoPushTokens.

    Raises ``RuntimeError`` if push is disabled, ``ValueError`` if no tokens are
    given, and ``httpx.HTTPError`` on a transport/HTTP failure.
    """
    if not is_configured():
        raise RuntimeError("Push is not enabled. Set EXPO_PUSH_ENABLED=true.")
    if not tokens:
        raise ValueError("no push tokens to deliver to")

    messages = [
        {"to": token, "title": title, "body": body, **({"data": data} if data else {})}
        for token in tokens
    ]
    headers = {"Content-Type": "application/json"}
    if settings.expo_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_access_token}"

    resp = httpx.post(_EXPO_PUSH_URL, json=messages, headers=headers, timeout=_TIMEOUT_S)
    resp.raise_for_status()
    logger.info("channel=push provider=expo status=delivered count=%d", len(tokens))
