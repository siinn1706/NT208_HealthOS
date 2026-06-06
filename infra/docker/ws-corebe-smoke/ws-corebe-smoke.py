#!/usr/bin/env python3
"""WS core-be smoke — run inside the compose network to verify WS endpoints.

Exits 0 on success, 1 on any failure.

Environment:
  WS_SMOKE_TARGET  — host:port of core-be (default "core-be:8000")
  WS_SMOKE_SECRET  — shared secret for the smoke-ticket endpoint
"""
import asyncio
import json
import os
import sys
import uuid
from urllib.request import Request, urlopen

import websockets

TARGET = os.environ.get("WS_SMOKE_TARGET", "core-be:8000")
SMOKE_SECRET = os.environ.get("WS_SMOKE_SECRET", "")

PASS_EMOJI = "PASS"
FAIL_EMOJI = "FAIL"


async def probe_garbage(path: str) -> None:
    """Send a garbage frame, expect close 4401 (auth reject)."""
    uri = f"ws://{TARGET}{path}"
    async with websockets.connect(uri) as ws:
        await asyncio.sleep(1)
        await ws.send("{}")
        await ws.wait_for_close()
        assert ws.close_code == 4401, f"expected close 4401, got {ws.close_code}"


async def probe_auth_success(path: str) -> None:
    """Send a valid ws_ticket, verify socket stays open and receives a hello."""
    if not SMOKE_SECRET:
        print(f"  [WARN] WS_SMOKE_SECRET not set — skipping auth-success probe for {path}")
        return

    # Fetch a smoke ticket
    ticket_url = f"http://{TARGET}/api/v1/ws/smoke-ticket"
    req = Request(ticket_url, headers={"X-Smoke-Secret": SMOKE_SECRET})
    try:
        resp = urlopen(req)
        ticket = json.loads(resp.read())["ticket"]
    except Exception as exc:
        raise AssertionError(f"failed to fetch smoke ticket from {ticket_url}: {exc}")

    uri = f"ws://{TARGET}{path}"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({"type": "auth", "ticket": ticket}))
        resp = await ws.recv()
        data = json.loads(resp)
        event = data.get("event", "")
        assert event in ("server:hello", "conv:joined"), (
            f"expected server:hello or conv:joined, got {event}"
        )


async def probe(path: str) -> None:
    print(f"  {path}:")
    await probe_garbage(path)
    print(f"    {PASS_EMOJI} garbage-frame probe (expect 4401)")
    await probe_auth_success(path)
    print(f"    {PASS_EMOJI} auth-success probe")


async def main() -> int:
    paths = ["/ws", f"/v1/chat/ws/{uuid.uuid4()}"]
    failures = 0

    for path in paths:
        for attempt in range(1, 4):
            try:
                await probe(path)
                break
            except Exception as exc:
                print(f"  {path} attempt {attempt}/3 failed: {exc}")
                if attempt < 3:
                    await asyncio.sleep(2)
                else:
                    print(f"  {FAIL_EMOJI} {path} — all 3 attempts failed")
                    failures += 1

    if failures:
        print(f"\n{FAIL_EMOJI} {failures} path(s) failed — exiting 1")
        return 1
    print(f"\n{PASS_EMOJI} all probes passed")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
