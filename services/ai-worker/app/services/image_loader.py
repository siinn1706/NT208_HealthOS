"""Image loading helpers for remote meal images."""
from __future__ import annotations

import ipaddress
import logging
import socket
from io import BytesIO
from urllib.parse import urlparse

import httpx
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

logger = logging.getLogger(__name__)

_ALLOWED_SCHEMES = frozenset({"http", "https"})
_MAX_REDIRECTS = 3
# RFC 6598 Shared Address Space — not marked private by Python's ipaddress but
# reachable as internal infrastructure in some cloud environments (e.g. AWS).
_CGNAT_NETWORK = ipaddress.IPv4Network("100.64.0.0/10")


class ImageLoadError(RuntimeError):
    """Raised when an image cannot be downloaded or decoded."""


# ── SSRF helpers ──────────────────────────────────────────────────────────────

def _is_private_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
        or (isinstance(ip, ipaddress.IPv4Address) and ip in _CGNAT_NETWORK)
    )


def _resolve_safe_ips(host: str, block_private: bool) -> list[str]:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise ImageLoadError("Image host could not be resolved.") from exc
    ips = sorted({info[4][0] for info in infos})
    if not ips:
        raise ImageLoadError("Image host did not resolve to any address.")
    if block_private:
        for ip_str in ips:
            ip = ipaddress.ip_address(ip_str)
            if _is_private_ip(ip):
                raise ImageLoadError("Image host resolves to a disallowed network.")
    return ips


def _is_trusted_image_host(host_lower: str, port: int | None) -> bool:
    host_with_port = f"{host_lower}:{port}" if port is not None else host_lower
    trusted = settings.trusted_image_hosts_set
    return host_lower in trusted or host_with_port in trusted


def _validate_url(url: str) -> tuple[str, str, bool]:
    """Return (scheme, host_lower, trusted_private_host). Raise on policy violation."""
    try:
        parsed = urlparse(url)
    except Exception as exc:
        raise ImageLoadError("Malformed image URL.") from exc

    scheme = (parsed.scheme or "").lower()
    if scheme not in _ALLOWED_SCHEMES:
        raise ImageLoadError("Image URL scheme not allowed.")

    host = parsed.hostname or ""
    if not host:
        raise ImageLoadError("Image URL has no host.")
    if parsed.username or parsed.password:
        raise ImageLoadError("Image URL must not contain credentials.")

    host_lower = host.lower()
    try:
        port = parsed.port
    except ValueError as exc:
        raise ImageLoadError("Invalid image URL port.") from exc
    host_with_port = f"{host_lower}:{port}" if port else host_lower
    trusted_private_host = _is_trusted_image_host(host_lower, port)

    allowed = settings.allowed_image_hosts_set
    if allowed:
        if host_lower not in allowed and host_with_port not in allowed and not trusted_private_host:
            raise ImageLoadError("Image host not in allowed list.")

    # Reject literal private IPs immediately (no DNS involved)
    try:
        ip_obj = ipaddress.ip_address(host_lower)
        if settings.ai_block_private_networks and not trusted_private_host and _is_private_ip(ip_obj):
            raise ImageLoadError("Image host resolves to a disallowed network.")
        return scheme, host_lower, trusted_private_host
    except ValueError:
        pass  # not a literal IP — proceed to DNS resolution

    return scheme, host_lower, trusted_private_host


# ── Main loader ───────────────────────────────────────────────────────────────

def load_image_from_url(image_url: str, timeout_seconds: float) -> Image.Image:
    """Download and decode an image URL into a PIL RGB image.

    Raises ImageLoadError on SSRF/DoS policy violation or decode failure.
    Public signature is unchanged from pre-hardening version.
    """
    current_url = image_url
    hops = 0

    while True:
        _, host, trusted_private_host = _validate_url(current_url)
        parsed = urlparse(current_url)
        raw_host = parsed.hostname or host

        # Skip DNS resolution for literal IPs (already checked in _validate_url)
        try:
            ipaddress.ip_address(raw_host)
        except ValueError:
            _resolve_safe_ips(
                raw_host,
                settings.ai_block_private_networks and not trusted_private_host,
            )

        try:
            with httpx.Client(timeout=timeout_seconds, follow_redirects=False) as client:
                with client.stream("GET", current_url) as response:
                    if response.is_redirect:
                        if hops >= _MAX_REDIRECTS:
                            raise ImageLoadError("Too many redirects.")
                        location = response.headers.get("location", "")
                        if not location:
                            raise ImageLoadError("Redirect with no Location header.")
                        logger.debug("Image redirect hop %d to location (redacted)", hops + 1)
                        current_url = location
                        hops += 1
                        continue

                    response.raise_for_status()

                    content_type = response.headers.get("content-type", "").lower()
                    if content_type and not content_type.startswith("image/"):
                        raise ImageLoadError("Unexpected response content-type.")

                    buf = bytearray()
                    limit = settings.ai_max_image_download_bytes
                    for chunk in response.iter_bytes():
                        buf.extend(chunk)
                        if len(buf) > limit:
                            raise ImageLoadError("Image exceeds maximum download size.")

        except ImageLoadError:
            raise
        except httpx.HTTPError as exc:
            logger.debug("Image download failed: %s", exc)
            raise ImageLoadError("Failed to download image.") from exc

        break

    # PIL decode — DecompressionBombError fires here if pixel count exceeds cap
    Image.MAX_IMAGE_PIXELS = settings.ai_max_image_pixels
    try:
        image = Image.open(BytesIO(bytes(buf)))
        image.load()
    except Image.DecompressionBombError as exc:
        raise ImageLoadError("Image dimensions exceed safety limit.") from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageLoadError("Failed to decode image bytes.") from exc

    w, h = image.size
    if w <= 0 or h <= 0 or w * h > settings.ai_max_image_pixels:
        raise ImageLoadError("Image dimensions out of allowed range.")

    return image.convert("RGB")
