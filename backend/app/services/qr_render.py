"""QR rendering helper for the emergency card.

Wraps the existing `qrcode[pil]` dependency (already in requirements.txt for
MFA TOTP) so the emergency-profile service does not import PIL directly.

Returns a base64 data URL so the BFF can hand it straight to an `<img src=…>`
without a second roundtrip — the QR is small enough (≈1 KB) that this is
preferable to minting a signed MinIO URL for one-shot consumption.
"""
from __future__ import annotations

import base64
import io
import logging
from typing import Final

logger = logging.getLogger(__name__)

# Public-facing constants. Box size 8 + border 2 yields ~250×250 px PNG which
# scans reliably on most phone cameras at arm's length when printed at 4×4 cm.
_QR_BOX_SIZE: Final = 8
_QR_BORDER: Final = 2
# Error correction level "Q" (25%) is the sweet spot for emergency cards —
# survives typical wear on a laminated wallet card without ballooning the
# size to the "H" (30%) tier.
_QR_ERROR_CORRECTION_LEVEL: Final = "Q"


def render_qr_png_bytes(payload: str) -> bytes:
    """Encode `payload` (typically the share URL) as a PNG QR code.

    Raises a clear RuntimeError if `qrcode` is not installed — same
    graceful-degrade pattern as `report_pdf.py` for WeasyPrint.
    """
    try:
        import qrcode
        from qrcode.constants import ERROR_CORRECT_Q
    except ImportError as exc:
        logger.error("qrcode library not installed; QR rendering unavailable")
        raise RuntimeError(
            "qrcode library is not installed. Add 'qrcode[pil]' to requirements.txt."
        ) from exc

    qr = qrcode.QRCode(
        version=None,  # Auto-fit to payload length.
        error_correction=ERROR_CORRECT_Q,
        box_size=_QR_BOX_SIZE,
        border=_QR_BORDER,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def render_qr_data_url(payload: str) -> str:
    """Convenience wrapper — returns a `data:image/png;base64,…` URL."""
    png_bytes = render_qr_png_bytes(payload)
    encoded = base64.b64encode(png_bytes).decode("ascii")
    return f"data:image/png;base64,{encoded}"
