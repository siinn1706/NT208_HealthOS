"""IP-based fixed-window rate limiting dependency for FastAPI endpoints."""
import logging

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from app.adapters.redis_client import get_redis

logger = logging.getLogger(__name__)

# Atomic INCR + EXPIRE on first count — avoids a key without TTL if the process dies
# between separate INCR and EXPIRE calls.
_INCR_WITH_WINDOW_TTL_LUA = """
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return c
"""


def ip_rate_limiter(max_requests: int, window_seconds: int, route_key: str):
    """Return a FastAPI dependency that enforces per-IP rate limits.

    Uses a Redis fixed-window counter keyed by route + client IP.
    Note: fixed-window — up to 2× the limit is possible across a window boundary.
    """

    async def _check_rate_limit(
        request: Request,
        redis: Redis = Depends(get_redis),
    ) -> None:
        # Use the direct connection IP; X-Forwarded-For is only trusted when
        # the service runs behind a known reverse proxy (not configurable yet).
        client_ip = (request.client.host if request.client else "unknown")
        key = f"rate:{route_key}:{client_ip}"
        try:
            count = int(
                await redis.eval(
                    _INCR_WITH_WINDOW_TTL_LUA,
                    1,
                    key,
                    str(window_seconds),
                )
            )
            if count > max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
                    },
                )
        except HTTPException:
            raise
        except Exception:
            logger.warning("Rate limit Redis check failed for %s — allowing request", key)

    return _check_rate_limit


# Pre-built dependencies used in auth endpoints
rate_limit_login = ip_rate_limiter(
    max_requests=10, window_seconds=60, route_key="login"
)
rate_limit_otp_request = ip_rate_limiter(
    max_requests=5, window_seconds=60, route_key="otp_request"
)
rate_limit_availability = ip_rate_limiter(
    max_requests=30, window_seconds=60, route_key="availability"
)
# Stricter limit for MFA verify — 5 attempts per 5-minute window to resist TOTP brute-force
rate_limit_mfa = ip_rate_limiter(
    max_requests=5, window_seconds=300, route_key="mfa_verify"
)
