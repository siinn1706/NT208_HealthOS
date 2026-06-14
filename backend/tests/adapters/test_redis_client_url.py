"""Redis URL resolution for host-run and Docker-run backend modes."""
from __future__ import annotations

import pytest

from app.adapters import redis_client


def test_resolve_redis_url_prefers_process_env(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:6380/3")
    monkeypatch.setenv("HEALTHOS_RUN_MODE", "local")
    monkeypatch.setattr(redis_client.settings, "redis_url", "redis://redis:6379/0")

    assert redis_client._resolve_redis_url() == "redis://127.0.0.1:6380/3"


def test_resolve_redis_url_rewrites_docker_host_in_local_mode(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setenv("HEALTHOS_RUN_MODE", "local")
    monkeypatch.setattr(redis_client.settings, "redis_url", "redis://redis:6379/0")

    assert redis_client._resolve_redis_url() == "redis://localhost:6379/0"


def test_resolve_redis_url_keeps_docker_host_outside_local_mode(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setenv("HEALTHOS_RUN_MODE", "docker")
    monkeypatch.setattr(redis_client.settings, "redis_url", "redis://redis:6379/0")

    assert redis_client._resolve_redis_url() == "redis://redis:6379/0"


@pytest.mark.asyncio
async def test_check_redis_ready_uses_short_lived_timeout_client(monkeypatch):
    calls: dict[str, object] = {}

    class FakeRedisProbe:
        async def ping(self):
            calls["pinged"] = True

        async def aclose(self):
            calls["closed"] = True

    def fake_from_url(url: str, **kwargs: object):
        calls["url"] = url
        calls["kwargs"] = kwargs
        return FakeRedisProbe()

    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setattr(redis_client, "from_url", fake_from_url)

    await redis_client.check_redis_ready(timeout_seconds=0.25)

    assert calls["url"] == "redis://localhost:6379/0"
    assert calls["pinged"] is True
    assert calls["closed"] is True
    assert calls["kwargs"] == {
        "decode_responses": True,
        "socket_timeout": 0.25,
        "socket_connect_timeout": 0.25,
        "retry_on_timeout": False,
    }
