import logging
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from backend.app.core.redis_client import cache_manager
from backend.app.core.auth import get_current_user
from backend.app.models.user import User

logger = logging.getLogger("abms.rate_limiter")

def check_rate_limit(key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
    """
    Atomic rate limit counter using Redis.
    Returns (is_allowed, retry_after_seconds).
    Falls back gracefully if Redis is unavailable.
    """
    try:
        client = cache_manager.client
        if client is None:
            return True, 0

        # Atomic pipeline increment + TTL
        pipe = client.pipeline()
        pipe.incr(key)
        pipe.ttl(key)
        results = pipe.execute()

        current_count = results[0]
        ttl = results[1]

        # First request in window: establish expiry
        if current_count == 1 or ttl is None or ttl < 0:
            client.expire(key, window_seconds)
            ttl = window_seconds

        if current_count > limit:
            retry_after = max(1, ttl)
            return False, retry_after

        return True, 0

    except Exception as e:
        logger.warning(f"[-] Redis rate limiter check failed ({e}). Bypassing rate limit gracefully.")
        return True, 0


def get_client_ip(request: Request) -> str:
    """Extracts client IP considering X-Forwarded-For if behind a reverse proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


async def check_global_ip_rate_limit(request: Request):
    """
    Global rate limiter: maximum 100 requests per minute per IP address.
    """
    client_ip = get_client_ip(request)
    key = f"rate:global:{client_ip}"
    allowed, retry_after = check_rate_limit(key, limit=100, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Global IP rate limit exceeded: maximum 100 requests per minute. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )


async def check_transfer_rate_limit(current_user: User = Depends(get_current_user)):
    """
    Financial transfer rate limiter: maximum 10 transfers per minute per authenticated user.
    """
    key = f"rate:transfer:{current_user.id}"
    allowed, retry_after = check_rate_limit(key, limit=10, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Transfer rate limit exceeded: maximum 10 transfers per minute. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
    return current_user


def check_login_rate_limit_helper(request: Request, username: str):
    """
    Login rate limiter: maximum 5 attempts per minute per IP + username.
    """
    client_ip = get_client_ip(request)
    normalized_user = username.strip().lower()
    key = f"rate:login:{client_ip}:{normalized_user}"
    allowed, retry_after = check_rate_limit(key, limit=5, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts: maximum 5 per minute. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
