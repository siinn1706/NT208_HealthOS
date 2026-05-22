"""Structured operational event log — thin wrapper over stdlib logging.

PHI policy: only fields in _ALLOWED are permitted. Unknown fields raise in
debug mode (catches leaks at review time) and are silently dropped in prod.
"""
import hashlib
import logging
from typing import Any

from app.core.request_context import request_id_var

_ALLOWED = {
    "user_id",
    "email_hash",
    "provider",
    "ip",
    "ua_class",
    "route",
    "status",
    "duration_ms",
    "exception_class",
    "mfa",
    "new_device",
    "reused_jti",
}

_log = logging.getLogger("healthos.events")


def hash_email(email: str | None) -> str | None:
    """Return first 12 hex chars of sha256(lower(strip(email))), or None."""
    if not email:
        return None
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()[:12]


def log_event(category: str, action: str, outcome: str, **fields: Any) -> None:
    """Emit a single structured log record.

    Enforces the _ALLOWED field allowlist — no PHI ever reaches the log stream.
    """
    bad = set(fields) - _ALLOWED
    if bad:
        from app.core.config import settings
        if settings.debug:
            raise ValueError(f"unsafe log fields passed to log_event: {bad}")
        for k in list(bad):
            fields.pop(k, None)

    rec = {
        "category": category,
        "action": action,
        "outcome": outcome,
        "request_id": request_id_var.get() or "-",
        **fields,
    }
    _log.info("event", extra={"event": rec})
