"""Redis connection pool — cache, pub/sub, rate-limit."""
import asyncio
import os
from urllib.parse import urlsplit, urlunsplit

from redis.asyncio import Redis, from_url

from app.core.config import settings

_redis: Redis | None = None
_redis_loop: asyncio.AbstractEventLoop | None = None


def _replace_url_hostname(url: str, hostname: str) -> str:
    parsed = urlsplit(url)
    current_hostname = parsed.hostname
    if not current_hostname:
        return url

    host_start = parsed.netloc.lower().rfind(current_hostname.lower())
    if host_start < 0:
        return url

    netloc = (
        parsed.netloc[:host_start]
        + hostname
        + parsed.netloc[host_start + len(current_hostname):]
    )
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))


def _resolve_redis_url() -> str:
    redis_url = os.environ.get("REDIS_URL") or settings.redis_url
    run_mode = os.environ.get("HEALTHOS_RUN_MODE", "").strip().lower()

    try:
        parsed = urlsplit(redis_url)
    except ValueError:
        return redis_url

    if run_mode == "local" and (parsed.hostname or "").lower() == "redis":
        return _replace_url_hostname(redis_url, "localhost")

    return redis_url


async def check_redis_ready(timeout_seconds: float = 1.0) -> None:
    """Ping Redis with a short-lived client for readiness checks."""
    probe = from_url(
        _resolve_redis_url(),
        decode_responses=True,
        socket_timeout=timeout_seconds,
        socket_connect_timeout=timeout_seconds,
        retry_on_timeout=False,
    )
    try:
        await probe.ping()
    finally:
        await probe.aclose()


async def get_redis() -> Redis:
    """FastAPI dependency — returns shared Redis client."""
    global _redis, _redis_loop
    loop = asyncio.get_running_loop()
    if _redis is not None and _redis_loop is not loop:
        _redis = None
        _redis_loop = None

    if _redis is None:
        _redis = from_url(
            _resolve_redis_url(),
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )
        _redis_loop = loop
    return _redis


async def close_redis() -> None:
    global _redis, _redis_loop
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        _redis_loop = None
