"""Image loading helpers for remote meal images."""
from __future__ import annotations

from io import BytesIO

import httpx
from PIL import Image, UnidentifiedImageError


class ImageLoadError(RuntimeError):
    """Raised when an image cannot be downloaded or decoded."""


def load_image_from_url(image_url: str, timeout_seconds: float) -> Image.Image:
    """Download and decode an image URL into a PIL RGB image."""
    try:
        with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
            response = client.get(image_url)
            response.raise_for_status()
    except httpx.HTTPError as exc:  # pragma: no cover - network dependent
        raise ImageLoadError(f"Failed to download image: {exc}") from exc

    content_type = response.headers.get("content-type", "")
    if content_type and "image" not in content_type.lower():
        raise ImageLoadError(f"URL content-type is not image: {content_type}")

    try:
        image = Image.open(BytesIO(response.content))
        return image.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageLoadError("Failed to decode image bytes.") from exc
