"""Shared API dependencies: auth, roles, db, rate limiting."""

import asyncio
import time
import uuid
from collections import defaultdict, deque
from typing import Annotated

import redis.asyncio as redis
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)
SessionDep = Annotated[AsyncSession, Depends(get_db)]

_redis_client: redis.Redis | None = None
_redis_loop: asyncio.AbstractEventLoop | None = None

_memory_rl: dict[str, deque[float]] = defaultdict(deque)
_memory_rl_lock = asyncio.Lock()


def _redis() -> redis.Redis:
    global _redis_client, _redis_loop
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if _redis_client is None or _redis_loop is not loop:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        _redis_loop = loop
    return _redis_client


async def _is_blacklisted(token: str) -> bool:
    try:
        value = await _redis().get(f"{settings.REDIS_PREFIX}:blacklist:{token}")
        return value == "1"
    except Exception:
        return False


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: SessionDep,
) -> User | None:
    if credentials is None:
        return None
    if await _is_blacklisted(credentials.credentials):
        return None
    payload = decode_token(credentials.credentials, expected_type="access")
    if payload is None:
        return None
    user = (
        await db.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return user


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: SessionDep,
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if await _is_blacklisted(credentials.credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please login again.",
        )
    payload = decode_token(credentials.credentials, expected_type="access")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = (
        await db.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account unavailable",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def require_role(*roles: UserRole):
    """Factory for role-guarded dependencies."""

    def _role_checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {[r.value for r in roles]}",
            )
        return user

    return _role_checker


require_admin = Depends(require_role(UserRole.ADMIN))
require_farmer = Depends(require_role(UserRole.FARMER, UserRole.FPO_ADMIN, UserRole.ADMIN))
require_fpo = Depends(require_role(UserRole.FPO_ADMIN, UserRole.ADMIN))
require_producer = Depends(
    require_role(UserRole.FARMER, UserRole.FPO_ADMIN, UserRole.ADMIN)
)
require_delivery_partner = Depends(
    require_role(UserRole.DELIVERY_PARTNER, UserRole.ADMIN)
)
require_bulk_buyer = Depends(
    require_role(UserRole.BULK_BUYER, UserRole.FPO_ADMIN, UserRole.ADMIN)
)


class RateLimiter:
    """Sliding-window rate limiter backed by Redis, with an in-memory
    fallback so auth never fails when Redis is unavailable (e.g. serverless
    runtimes such as Vercel)."""

    def __init__(self, max_calls: int, window_seconds: int = 60) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds

    async def __call__(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        route = request.url.path
        key = f"{settings.REDIS_PREFIX}:rl:{client_ip}:{route}"

        try:
            r = _redis()
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, self.window_seconds)
            if int(count) > self.max_calls:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Try again shortly.",
                )
            return
        except redis.RedisError:
            # Fail open into a process-local sliding window.
            await self._check_memory(key)

    async def _check_memory(self, key: str) -> None:
        now = time.monotonic()
        async with _memory_rl_lock:
            stamps = _memory_rl[key]
            while stamps and now - stamps[0] > self.window_seconds:
                stamps.popleft()
            if len(stamps) >= self.max_calls:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Try again shortly.",
                )
            stamps.append(now)


RateLimitAuth = Depends(RateLimiter(max_calls=settings.RATE_LIMIT_AUTH_PER_MINUTE))
RateLimitDefault = Depends(
    RateLimiter(max_calls=settings.RATE_LIMIT_DEFAULT_PER_MINUTE)
)