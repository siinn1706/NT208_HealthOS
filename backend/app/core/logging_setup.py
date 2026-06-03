"""Logging configuration — JSON or text formatter, idempotent setup."""
import json
import logging
import logging.handlers
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.config import Settings

_CONFIGURED = False

# Fields whose values must never appear in log output.
# The filter replaces values for these keys with the literal "[REDACTED]".
_SENSITIVE_FIELD_NAMES = frozenset({
    "password",
    "passwd",
    "token",
    "secret",
    "authorization",
    "access_token",
    "refresh_token",
    "id_token",
    "api_key",
    "fernet_key",
    "smtp_password",
    "client_secret",
})


class SensitiveFieldFilter(logging.Filter):
    """Strip sensitive keys from structured log records.

    Walks the ``event`` dict attached by event_logging.log_event and the top-level
    LogRecord __dict__ to redact any key that matches _SENSITIVE_FIELD_NAMES.
    This is defence-in-depth — primary protection lives in the allowlist inside
    event_logging.py; this filter catches any future call-site that bypasses it.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Scrub the structured event dict if present
        ev = getattr(record, "event", None)
        if isinstance(ev, dict):
            for key in list(ev):
                if key.lower() in _SENSITIVE_FIELD_NAMES:
                    ev[key] = "[REDACTED]"
        # Scrub any sensitive attributes attached directly to the record
        for key in list(record.__dict__):
            if key.lower() in _SENSITIVE_FIELD_NAMES:
                setattr(record, key, "[REDACTED]")
        return True


class JsonFormatter(logging.Formatter):
    """Emit a single JSON line per record with stable keys."""

    def format(self, record: logging.LogRecord) -> str:
        base: dict = {
            "ts": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        ev = getattr(record, "event", None)
        if ev:
            base.update(ev)
        return json.dumps(base, default=str)


def configure_logging(settings: "Settings") -> None:
    """Attach handlers and filters to the root logger. Safe to call multiple times."""
    global _CONFIGURED
    if _CONFIGURED:
        return
    _CONFIGURED = True

    from app.core.request_context import RequestIdFilter

    root = logging.getLogger()
    root.addFilter(RequestIdFilter())
    root.addFilter(SensitiveFieldFilter())

    # Remove any existing StreamHandlers added by uvicorn/fastapi defaults so we
    # don't double-log. Keep non-stream handlers (e.g. Sentry) untouched.
    for h in list(root.handlers):
        if isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler):
            root.removeHandler(h)

    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())
    handler.addFilter(SensitiveFieldFilter())
    if settings.log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s"
            )
        )

    root.addHandler(handler)

    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    root.setLevel(level)
