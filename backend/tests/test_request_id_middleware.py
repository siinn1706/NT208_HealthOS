"""Tests for Phase 2: X-Request-ID middleware."""
from __future__ import annotations

import asyncio
import re

import pytest
from fastapi.testclient import TestClient


UUID_HEX_RE = re.compile(r"^[0-9a-f]{32}$")


def _get_app():
    from app.main import app
    return app


def test_request_id_echoed_when_provided():
    app = _get_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        resp = c.get("/health", headers={"X-Request-ID": "abc123"})
    assert resp.headers.get("x-request-id") == "abc123"


def test_request_id_generated_when_missing():
    app = _get_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        resp = c.get("/health")
    rid = resp.headers.get("x-request-id", "")
    assert UUID_HEX_RE.match(rid), f"Expected 32-char hex, got: {rid!r}"


def test_malformed_request_id_replaced():
    app = _get_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        resp = c.get("/health", headers={"X-Request-ID": "$(rm -rf)bad\nINJECT"})
    rid = resp.headers.get("x-request-id", "")
    assert rid != "$(rm -rf)bad\nINJECT"
    assert len(rid) > 0


def test_concurrent_requests_do_not_leak_ids():
    """Two concurrent requests must have distinct IDs in their responses."""
    import httpx
    from app.main import app

    ids: list[str] = []

    async def hit(client: httpx.AsyncClient, rid: str):
        resp = await client.get("/health", headers={"X-Request-ID": rid})
        ids.append(resp.headers.get("x-request-id", ""))

    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            await asyncio.gather(hit(c, "id-aaa"), hit(c, "id-bbb"))

    asyncio.get_event_loop().run_until_complete(run())
    assert set(ids) == {"id-aaa", "id-bbb"}
