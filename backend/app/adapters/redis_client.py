"""Redis connection pool — cache, pub/sub, rate-limit."""
import asyncio

from redis.asyncio import Redis, from_url

from app.core.config import settings

_redis: Redis | None = None
_redis_loop: asyncio.AbstractEventLoop | None = None


async def get_redis() -> Redis:
    """FastAPI dependency — returns shared Redis client."""
    global _redis, _redis_loop
    loop = asyncio.get_running_loop()
    if _redis is not None and _redis_loop is not loop:
        _redis = None
        _redis_loop = None

    if _redis is None:
        _redis = from_url(
            settings.redis_url,
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
