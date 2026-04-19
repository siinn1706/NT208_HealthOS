"""CR80 wallet-card PDF renderer.

Unlike the multi-page health report (`tasks/report_pdf.py`, queued via
Celery), the wallet card is a single page that fits in <50KB and renders
in well under a second. Rendering it inside the request thread is simpler
and gives the owner an instant download — no MinIO, no signed URLs, no
polling.

F5 — the public surface is now async-friendly: callers should prefer
`render_wallet_card_data_url_async()` which offloads the synchronous
WeasyPrint call to a thread pool via `asyncio.to_thread`, freeing the
event loop. The sync entry points are kept for non-async callers and
for testing.

Falls back gracefully when WeasyPrint or its system dependencies are
unavailable (Cairo / Pango on dev hosts) — same pattern as
`tasks/report_pdf.py`. The endpoint that calls this catches `None` and
surfaces a friendly 503 instead of crashing.
"""
from __future__ import annotations

import asyncio
import base64
import logging
from pathlib import Path
from typing import Any, Optional

from app.schemas.emergency import PublicEmergencyCardDTO
from app.templates.emergency.i18n import i18n_for

logger = logging.getLogger(__name__)


_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "emergency"
_TEMPLATE_NAME = "wallet-card.html.j2"


def _render_html(card: PublicEmergencyCardDTO, qr_data_url: str, locale: str, card_short_id: Optional[str]) -> str:
    """Render the Jinja2 template with the card + QR + i18n strings."""
    from jinja2 import Environment, FileSystemLoader, select_autoescape

    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "j2"]),
    )
    template = env.get_template(_TEMPLATE_NAME)
    # Use mode='json' so dates serialise cleanly for the template.
    return template.render(
        card=card.model_dump(mode="json"),
        qr_data_url=qr_data_url,
        i18n=i18n_for(locale),
        locale=locale,
        card_short_id=card_short_id,
    )


def render_wallet_card_pdf(
    *,
    card: PublicEmergencyCardDTO,
    qr_data_url: str,
    locale: str = "en",
    card_short_id: Optional[str] = None,
) -> Optional[bytes]:
    """Render the wallet card to PDF bytes.

    Returns `None` if WeasyPrint (or its system deps) is not installed.
    The endpoint that uses this should treat `None` as a 503 — clients
    can still print via the browser as a fallback.
    """
    try:
        html = _render_html(card, qr_data_url, locale, card_short_id)
    except Exception:  # pragma: no cover — defensive
        logger.exception("Failed to render wallet-card HTML")
        return None

    try:
        # Defer the heavy import to call time so a missing Cairo / Pango
        # at app boot doesn't take the whole API down.
        from weasyprint import HTML  # type: ignore[import-not-found]
    except ImportError:
        logger.warning(
            "WeasyPrint not installed — wallet-card PDF generation disabled. "
            "Install WeasyPrint and its system deps (Cairo, Pango) to enable."
        )
        return None
    except OSError as exc:  # pragma: no cover — happens on hosts without Cairo
        logger.warning("WeasyPrint system dependencies missing: %s", exc)
        return None

    try:
        return HTML(string=html).write_pdf()
    except Exception:  # pragma: no cover — runtime render error
        logger.exception("Failed to render wallet-card PDF")
        return None


def render_wallet_card_data_url(
    *,
    card: PublicEmergencyCardDTO,
    qr_data_url: str,
    locale: str = "en",
    card_short_id: Optional[str] = None,
) -> Optional[str]:
    """Convenience wrapper — returns a `data:application/pdf;base64,…` URL.

    Used by the mint endpoint to embed the freshly-printed wallet card in
    the same response as the QR PNG. Owner can then download both files
    from the dialog without a second roundtrip.
    """
    pdf = render_wallet_card_pdf(
        card=card, qr_data_url=qr_data_url, locale=locale, card_short_id=card_short_id
    )
    if pdf is None:
        return None
    encoded = base64.b64encode(pdf).decode("ascii")
    return f"data:application/pdf;base64,{encoded}"


def _coerce_card_dict(value: Any) -> PublicEmergencyCardDTO:
    """Helper for callers holding a plain dict (e.g. from a Celery payload)."""
    return PublicEmergencyCardDTO.model_validate(value)


async def render_wallet_card_data_url_async(
    *,
    card: PublicEmergencyCardDTO,
    qr_data_url: str,
    locale: str = "en",
    card_short_id: Optional[str] = None,
) -> Optional[str]:
    """Async wrapper that runs the synchronous WeasyPrint render in a thread.

    F5 — the underlying `write_pdf()` call is CPU-bound and blocks the
    asyncio event loop for the duration. By offloading to `asyncio.to_thread`
    we free the loop to handle other requests concurrently. The thread pool
    is the default `concurrent.futures.ThreadPoolExecutor` so we are bound
    by `os.cpu_count() * 5` parallelism — appropriate for an occasional
    mint flow.
    """
    return await asyncio.to_thread(
        render_wallet_card_data_url,
        card=card,
        qr_data_url=qr_data_url,
        locale=locale,
        card_short_id=card_short_id,
    )
