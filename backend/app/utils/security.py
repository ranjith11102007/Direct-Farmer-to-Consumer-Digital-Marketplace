"""Security utilities: password hashing, JWT, OTP, idempotency keys."""
from __future__ import annotations

import secrets
import uuid as uuid_module
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        return False


def _create_token(
    subject: str,
    token_type: str,
    expires_minutes: int,
    extra: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "aud": settings.JWT_AUDIENCE,
        "iss": settings.JWT_ISSUER,
        "jti": str(uuid_module.uuid4()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    """Create a short-lived access token."""
    return _create_token(
        subject,
        "access",
        settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        extra,
    )


def create_refresh_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    """Create a long-lived refresh token."""
    return _create_token(
        subject,
        "refresh",
        settings.REFRESH_TOKEN_EXPIRE_MINUTES,
        extra,
    )


def decode_token(token: str, expected_type: str = "access") -> dict[str, Any] | None:
    """Decode and validate a JWT token. Returns the payload or None."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
        )
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP."""
    return "".join(secrets.choice("0123456789") for _ in range(length))


def generate_idempotency_key() -> str:
    """Generate a UUID-based idempotency key for safe payment retries."""
    return str(uuid_module.uuid4())


def generate_secure_random_token(byte_length: int = 32) -> str:
    """Generate a URL-safe random token (used for OTP hashes, reset links)."""
    return secrets.token_urlsafe(byte_length)