"""Regression tests for the single-accept WS fix (Phase 01) and Origin validation.

NOTE (Red Team F2): Starlette TestClient may NOT surface a RuntimeError from
the second ws.accept() — the WS transport layer handles accept differently in
the test harness.  If all tests here pass, the real regression gate is the
Phase 02 ws-corebe-smoke auth-success probe (real ASGI server).

Origin validation semantics (CSWSH defense-in-depth):
  - Origin header present AND not in allowed_origins → close 4403.
  - Origin header absent → allowed (non-browser clients / test harnesses don't
    send Origin; browsers ALWAYS send it so CSWSH is still blocked for browsers).

Tests:
  1. Auth-success path — valid ticket → server:hello or conv:joined event.
  2. Auth-reject path — garbage frame → close 4401.
  3. Per-user cap — 2nd socket same user → error frame + close 4008.
  4. Global cap — 2nd socket different user → close 1013.
  5. Origin validation — disallowed present → close 4403; allowed → proceeds.
"""
from __future__ import annotations

import json
import uuid

import pytest
from starlette.testclient import TestClient

from app.core.config import settings
from app.core.security import create_ws_ticket
from app.main import app
from app.ws.handlers import manager


def _valid_ticket() -> str:
    return create_ws_ticket(subject=str(uuid.uuid4()))


# ── Test 1: Auth-success (single-accept proves message loop starts) ──────────

def test_ws_auth_success_receives_server_hello():
    """Send valid ticket, expect server:hello — proves connect() reached message loop."""
    ticket = _valid_ticket()
    with TestClient(app).websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "auth", "ticket": ticket}))
        resp = json.loads(ws.receive_text())
        event = resp.get("event", "")
        assert event in ("server:hello", "conv:joined"), (
            f"expected server:hello or conv:joined, got {event!r}"
        )


# ── Test 2: Auth-reject (invalid frame) ──────────────────────────────────────

def test_ws_auth_reject_close_4401():
    """Send garbage frame, expect close code 4401 (auth rejected)."""
    import time
    with TestClient(app).websocket_connect("/ws") as ws:
        ws.send_text("{}")
        time.sleep(1)
        assert ws.close_code == 4401, (
            f"expected close 4401, got {ws.close_code}"
        )


# ── Test 3: Per-user connection cap ──────────────────────────────────────────

def test_ws_per_user_cap():
    """Patch MAX_CONNECTIONS_PER_USER=1; 2nd socket → error frame + close 4008."""
    original = manager.MAX_CONNECTIONS_PER_USER
    manager.MAX_CONNECTIONS_PER_USER = 1
    ticket_a = _valid_ticket()
    try:
        with TestClient(app).websocket_connect("/ws") as ws1:
            ws1.send_text(json.dumps({"type": "auth", "ticket": ticket_a}))
            hello = json.loads(ws1.receive_text())
            assert hello.get("event") in ("server:hello", "conv:joined")

            with TestClient(app).websocket_connect("/ws") as ws2:
                ws2.send_text(json.dumps({"type": "auth", "ticket": ticket_a}))
                error = json.loads(ws2.receive_text())
                assert error.get("event") == "error"
                assert error.get("payload", {}).get("code") == "TOO_MANY_CONNECTIONS"
                import time
                time.sleep(0.5)
                assert ws2.close_code == 4008, (
                    f"expected close 4008, got {ws2.close_code}"
                )
    finally:
        manager.MAX_CONNECTIONS_PER_USER = original


# ── Test 4: Global cap ───────────────────────────────────────────────────────

def test_ws_global_cap():
    """Patch MAX_GLOBAL_CONNECTIONS=1; 2nd socket (different user) → close 1013."""
    original = manager.MAX_GLOBAL_CONNECTIONS
    manager.MAX_GLOBAL_CONNECTIONS = 1
    ticket_a = create_ws_ticket(subject=str(uuid.uuid4()))
    ticket_b = create_ws_ticket(subject=str(uuid.uuid4()))
    try:
        with TestClient(app).websocket_connect("/ws") as ws1:
            ws1.send_text(json.dumps({"type": "auth", "ticket": ticket_a}))
            hello = json.loads(ws1.receive_text())
            assert hello.get("event") in ("server:hello", "conv:joined")

            with TestClient(app).websocket_connect("/ws") as ws2:
                ws2.send_text(json.dumps({"type": "auth", "ticket": ticket_b}))
                import time
                time.sleep(0.5)
                assert ws2.close_code == 1013, (
                    f"expected close 1013, got {ws2.close_code}"
                )
    finally:
        manager.MAX_GLOBAL_CONNECTIONS = original


# ── Test 5: Origin validation (CSWSH defense-in-depth) ───────────────────────

def test_ws_origin_disallowed():
    """Disallowed Origin header → close 4403."""
    with TestClient(app).websocket_connect(
        "/ws",
        headers=[("origin", "https://evil.example.com")],
    ) as ws:
        assert ws.close_code == 4403, (
            f"expected close 4403 for disallowed Origin, got {ws.close_code}"
        )


def test_ws_origin_allowed_proceeds():
    """Allowed Origin → auth proceeds normally (no 4403)."""
    allowed = settings.allowed_origins[0]
    ticket = _valid_ticket()
    with TestClient(app).websocket_connect(
        "/ws",
        headers=[("origin", allowed)],
    ) as ws:
        ws.send_text(json.dumps({"type": "auth", "ticket": ticket}))
        resp = json.loads(ws.receive_text())
        event = resp.get("event", "")
        assert event in ("server:hello", "conv:joined"), (
            f"expected server:hello or conv:joined, got {event!r}"
        )

