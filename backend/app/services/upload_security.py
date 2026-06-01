"""Upload safety helpers shared by API endpoints."""
from __future__ import annotations

import re
from typing import Protocol


class AsyncUpload(Protocol):
    async def read(self, size: int = -1) -> bytes: ...


class UploadTooLargeError(ValueError):
    pass


async def read_upload_bounded(upload: AsyncUpload, max_bytes: int) -> bytes:
    """Read at most max_bytes + 1 so oversized files are rejected early."""
    payload = await upload.read(max_bytes + 1)
    if len(payload) > max_bytes:
        raise UploadTooLargeError(f"Maximum {max_bytes} bytes exceeded.")
    return payload


def normalize_content_type(value: str | None) -> str:
    return (value or "").split(";")[0].strip().lower()


def detect_image_mime(payload: bytes) -> str | None:
    if payload.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if payload.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if len(payload) >= 12 and payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return "image/webp"
    return None


def detect_prescription_mime(payload: bytes, declared: str | None) -> str:
    if payload.startswith(b"%PDF-"):
        return "application/pdf"
    detected_image = detect_image_mime(payload)
    if detected_image:
        return detected_image
    _ = declared
    return "application/octet-stream"


def detect_document_mime(payload: bytes, declared: str | None) -> str:
    """Detect supported PHI document uploads without trusting client mime."""
    return detect_prescription_mime(payload, declared)


def extension_for_mime(mime_type: str, fallback: str = "bin") -> str:
    return {
        "application/pdf": "pdf",
        "image/gif": "gif",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }.get(mime_type, fallback)


def sanitize_response_filename(filename: str | None, fallback: str = "download") -> str:
    """Return a header-safe basename with CR/LF, quotes, and path parts removed."""
    raw = (filename or "").replace("\\", "/").split("/")[-1].strip()
    safe = re.sub(r"[\x00-\x1f\x7f\r\n\"]+", "_", raw)
    safe = re.sub(r"[^A-Za-z0-9._ -]+", "_", safe).strip(" ._-")
    if not safe:
        return fallback
    return safe[:128]
