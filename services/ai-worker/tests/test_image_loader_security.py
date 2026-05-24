"""Security tests for image_loader SSRF + DoS guards."""
from __future__ import annotations

import socket
from io import BytesIO
from typing import Any, Generator
from unittest.mock import patch

import httpx
import pytest
from PIL import Image

from app.core.config import settings
from app.services.image_loader import ImageLoadError, load_image_from_url


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_png_bytes(width: int = 10, height: int = 10) -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _mock_transport_200(body: bytes, content_type: str = "image/png") -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=body, headers={"content-type": content_type})
    return httpx.MockTransport(handler)


def _mock_transport_redirect(location: str) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host in ("127.0.0.1", "localhost", "::1"):
            return httpx.Response(200, content=_make_png_bytes(), headers={"content-type": "image/png"})
        return httpx.Response(302, headers={"location": location})
    return httpx.MockTransport(handler)


def _addrinfo_for(ip: str) -> list[tuple[Any, Any, Any, Any, tuple[str, int]]]:
    """Return fake getaddrinfo result pointing to a single IP."""
    return [(socket.AF_INET, socket.SOCK_STREAM, 0, "", (ip, 0))]


# ── SSRF: private/loopback/metadata IPs ──────────────────────────────────────

def test_rejects_localhost_url(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_block_private_networks", True)
    with pytest.raises(ImageLoadError):
        load_image_from_url("http://localhost/x.jpg", timeout_seconds=5.0)


def test_rejects_loopback_ip_literal(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_block_private_networks", True)
    with pytest.raises(ImageLoadError):
        load_image_from_url("http://127.0.0.1/x.jpg", timeout_seconds=5.0)


def test_rejects_metadata_ip(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_block_private_networks", True)
    with pytest.raises(ImageLoadError):
        load_image_from_url("http://169.254.169.254/latest/meta-data/", timeout_seconds=5.0)


def test_rejects_private_ipv4(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_block_private_networks", True)
    with pytest.raises(ImageLoadError):
        load_image_from_url("http://10.0.0.5/x.jpg", timeout_seconds=5.0)


def test_rejects_ipv6_loopback(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_block_private_networks", True)
    with pytest.raises(ImageLoadError):
        load_image_from_url("http://[::1]/x.jpg", timeout_seconds=5.0)


def test_rejects_cgnat_ip(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_block_private_networks", True)
    with pytest.raises(ImageLoadError):
        load_image_from_url("http://100.64.0.1/x.jpg", timeout_seconds=5.0)


# ── SSRF: scheme allowlist ────────────────────────────────────────────────────

def test_rejects_disallowed_scheme_file(monkeypatch: Any) -> None:
    with pytest.raises(ImageLoadError, match="scheme"):
        load_image_from_url("file:///etc/passwd", timeout_seconds=5.0)


def test_rejects_disallowed_scheme_gopher(monkeypatch: Any) -> None:
    with pytest.raises(ImageLoadError, match="scheme"):
        load_image_from_url("gopher://evil.example.com/x", timeout_seconds=5.0)


# ── SSRF: host allowlist ──────────────────────────────────────────────────────

def test_rejects_host_not_in_allowlist(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_allowed_image_hosts", "cdn.example.com")
    monkeypatch.setattr(settings, "ai_block_private_networks", False)
    with pytest.raises(ImageLoadError, match="allowed"):
        load_image_from_url("https://evil.example.com/x.jpg", timeout_seconds=5.0)


def test_accepts_allowed_host(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_allowed_image_hosts", "cdn.example.com")
    monkeypatch.setattr(settings, "ai_block_private_networks", False)
    monkeypatch.setattr(
        "app.services.image_loader.socket.getaddrinfo",
        lambda *a, **kw: _addrinfo_for("93.184.216.34"),
    )
    png = _make_png_bytes()
    with patch("app.services.image_loader.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_response = mock_client.stream.return_value.__enter__.return_value
        mock_response.is_redirect = False
        mock_response.raise_for_status.return_value = None
        mock_response.headers = {"content-type": "image/png"}
        mock_response.iter_bytes.return_value = [png]
        result = load_image_from_url("https://cdn.example.com/food.jpg", timeout_seconds=5.0)
    assert result is not None


# ── DoS: oversized response ───────────────────────────────────────────────────

def test_rejects_oversized_response(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_allowed_image_hosts", "cdn.example.com")
    monkeypatch.setattr(settings, "ai_block_private_networks", False)
    monkeypatch.setattr(settings, "ai_max_image_download_bytes", 100)
    monkeypatch.setattr(
        "app.services.image_loader.socket.getaddrinfo",
        lambda *a, **kw: _addrinfo_for("93.184.216.34"),
    )
    big_chunk = b"x" * 200

    with patch("app.services.image_loader.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_response = mock_client.stream.return_value.__enter__.return_value
        mock_response.is_redirect = False
        mock_response.raise_for_status.return_value = None
        mock_response.headers = {"content-type": "image/png"}
        mock_response.iter_bytes.return_value = [big_chunk]
        with pytest.raises(ImageLoadError, match="maximum download size"):
            load_image_from_url("https://cdn.example.com/huge.jpg", timeout_seconds=5.0)


# ── DoS: non-image content-type ───────────────────────────────────────────────

def test_rejects_non_image_content_type(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_allowed_image_hosts", "cdn.example.com")
    monkeypatch.setattr(settings, "ai_block_private_networks", False)
    monkeypatch.setattr(
        "app.services.image_loader.socket.getaddrinfo",
        lambda *a, **kw: _addrinfo_for("93.184.216.34"),
    )
    with patch("app.services.image_loader.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_response = mock_client.stream.return_value.__enter__.return_value
        mock_response.is_redirect = False
        mock_response.raise_for_status.return_value = None
        mock_response.headers = {"content-type": "text/html"}
        mock_response.iter_bytes.return_value = [b"<html>"]
        with pytest.raises(ImageLoadError, match="content-type"):
            load_image_from_url("https://cdn.example.com/page.html", timeout_seconds=5.0)


# ── DoS: PIL decompression bomb ───────────────────────────────────────────────

def test_rejects_decompression_bomb(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_allowed_image_hosts", "cdn.example.com")
    monkeypatch.setattr(settings, "ai_block_private_networks", False)
    monkeypatch.setattr(
        "app.services.image_loader.socket.getaddrinfo",
        lambda *a, **kw: _addrinfo_for("93.184.216.34"),
    )

    def boom(*args: Any, **kwargs: Any) -> None:
        raise Image.DecompressionBombError("too big")

    with patch("app.services.image_loader.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_response = mock_client.stream.return_value.__enter__.return_value
        mock_response.is_redirect = False
        mock_response.raise_for_status.return_value = None
        mock_response.headers = {"content-type": "image/png"}
        mock_response.iter_bytes.return_value = [_make_png_bytes()]
        with patch("app.services.image_loader.Image.open", boom):
            with pytest.raises(ImageLoadError, match="dimensions exceed"):
                load_image_from_url("https://cdn.example.com/bomb.jpg", timeout_seconds=5.0)


# ── SSRF: redirect to private IP blocked ─────────────────────────────────────

def test_redirect_to_private_blocked(monkeypatch: Any) -> None:
    monkeypatch.setattr(settings, "ai_allowed_image_hosts", "")
    monkeypatch.setattr(settings, "ai_block_private_networks", True)

    call_count = 0

    def fake_getaddrinfo(host: str, port: Any, *args: Any, **kwargs: Any) -> list[Any]:
        nonlocal call_count
        call_count += 1
        if host == "cdn.example.com":
            return _addrinfo_for("93.184.216.34")
        # redirect target is a private IP hostname — let _validate_url catch it
        return _addrinfo_for("127.0.0.1")

    monkeypatch.setattr("app.services.image_loader.socket.getaddrinfo", fake_getaddrinfo)

    with patch("app.services.image_loader.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_response = mock_client.stream.return_value.__enter__.return_value
        mock_response.is_redirect = True
        mock_response.headers = {"location": "http://127.0.0.1/x.jpg"}
        with pytest.raises(ImageLoadError):
            load_image_from_url("https://cdn.example.com/food.jpg", timeout_seconds=5.0)
