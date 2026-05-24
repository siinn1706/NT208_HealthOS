"""Logging configuration — JSON or text formatter, idempotent setup."""
import json
import logging
import logging.handlers
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.config import Settings

_CONFIGURED = False


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

    # Remove any existing StreamHandlers added by uvicorn/fastapi defaults so we
    # don't double-log. Keep non-stream handlers (e.g. Sentry) untouched.
    for h in list(root.handlers):
        if isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler):
            root.removeHandler(h)

    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())
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
