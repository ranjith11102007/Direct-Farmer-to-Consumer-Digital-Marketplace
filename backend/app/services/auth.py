"""Authentication service: register, OTP, login, refresh, logout."""
from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as redis
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User, UserRole, VerificationStatus
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_password,
    verify_password,
)
from app.utils.validators import (
    ValidationError,
    validate_email,
    validate_password_strength,
    validate_phone,
)

redis_client: redis.Redis | None = None
_redis_loop: asyncio.AbstractEventLoop | None = None


def _get_redis() -> redis.Redis:
    global redis_client, _redis_loop
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if redis_client is None or _redis_loop is not loop:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        _redis_loop = loop
    return redis_client


async def _otp_key(phone: str) -> str:
    return f"{settings.REDIS_PREFIX}:otp:{phone}"


async def _otp_attempt_key(phone: str) -> str:
    return f"{settings.REDIS_PREFIX}:otp_attempts:{phone}"


async def _store_otp(phone: str, otp: str, hashed: str) -> None:
    r = _get_redis()
    await r.set(
        await _otp_key(phone),
        hashed,
        ex=settings.OTP_EXPIRE_SECONDS,
    )


class AuthService:
    """Handles user registration, OTP login and token lifecycle."""

    @staticmethod
    async def register(
        db: AsyncSession,
        *,
        email: str,
        phone: str,
        password: str,
        full_name: str,
        role: UserRole = UserRole.CONSUMER,
        preferred_language: str = "ta",
    ) -> tuple[dict[str, Any], Exception | None]:
        try:
            normalized_email = validate_email(email) if email else None
            normalized_phone = validate_phone(phone)
            validate_password_strength(password)
        except ValidationError as exc:
            return {}, exc

        match_clauses: list[Any] = [User.phone == normalized_phone]
        if normalized_email:
            match_clauses.append(User.email == normalized_email)
        existing = (await db.execute(
            select(User).where(or_(*match_clauses))
        )).scalar_one_or_none()
        if existing:
            return {}, ValidationError("An account with this email or phone already exists.")

        user = User(
            email=normalized_email,
            phone=normalized_phone,
            password_hash=hash_password(password),
            full_name=full_name.strip(),
            role=role,
            preferred_language=preferred_language,
            is_verified=False,
            is_active=True,
            verification_status=VerificationStatus.DRAFT,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        tokens = AuthService._issue_tokens(str(user.id), {"role": role.value})
        return {
            "user": AuthService._user_dict(user),
            **tokens,
        }, None

    @staticmethod
    async def send_otp(db: AsyncSession, phone: str) -> tuple[dict[str, Any], Exception | None]:
        try:
            normalized_phone = validate_phone(phone)
        except ValidationError as exc:
            return {}, exc

        user = (await db.execute(
            select(User).where(User.phone == normalized_phone)
        )).scalar_one_or_none()
        if user is None or not user.is_active:
            return {}, ValidationError("No active account found for this phone number.")

        otp = generate_otp()
        hashed = hashlib.sha256(otp.encode()).hexdigest()
        await _store_otp(normalized_phone, otp, hashed)
        await _get_redis().delete(await _otp_attempt_key(normalized_phone))

        # In production this hooks into SMS/WhatsApp providers.
        from app.services.notification import NotificationService
        await NotificationService.send_to_user(
            db,
            user_id=user.id,
            notification_type="verification",
            title="Vaikkal OTP",
            title_tamil="வைகால் OTP",
            message=f"Your Vaikkal OTP is {otp}. Valid for {settings.OTP_EXPIRE_SECONDS // 60} minutes.",
            message_tamil=f"உங்கள் வைகால் OTP: {otp}",
            channel="sms",
        )

        return {
            "message": "OTP sent successfully.",
            "expires_in_seconds": settings.OTP_EXPIRE_SECONDS,
        }, None

    @staticmethod
    async def verify_otp(
        db: AsyncSession,
        phone: str,
        otp: str,
        *,
        register_if_missing: bool = False,
        full_name: str | None = None,
        preferred_language: str = "ta",
    ) -> tuple[dict[str, Any], Exception | None]:
        try:
            normalized_phone = validate_phone(phone)
        except ValidationError as exc:
            return {}, exc

        r = _get_redis()
        attempt_key = await _otp_attempt_key(normalized_phone)
        attempts = int(await r.get(attempt_key) or "0")
        if attempts >= settings.OTP_MAX_ATTEMPTS:
            return {}, ValidationError("Too many OTP attempts. Please request a new OTP.")

        stored_hash = await r.get(await _otp_key(normalized_phone))
        if not stored_hash:
            return {}, ValidationError("OTP expired or not requested.")

        supplied_hash = hashlib.sha256(str(otp).strip().encode()).hexdigest()
        if supplied_hash != stored_hash:
            await r.incr(attempt_key)
            return {}, ValidationError("Incorrect OTP.")

        await r.delete(await _otp_key(normalized_phone))
        await r.delete(attempt_key)

        user = (await db.execute(
            select(User).where(User.phone == normalized_phone)
        )).scalar_one_or_none()

        if user is None:
            if not register_if_missing:
                return {}, ValidationError("No account found for this phone. Please register first.")
            user = User(
                email=None,
                phone=normalized_phone,
                password_hash="",
                full_name=(full_name or "Guest").strip() or "Guest",
                role=UserRole.CONSUMER,
                preferred_language=preferred_language,
                is_verified=True,
                is_active=True,
                verification_status=VerificationStatus.DRAFT,
            )
            db.add(user)
        else:
            user.is_verified = True

        await db.commit()
        await db.refresh(user)

        tokens = AuthService._issue_tokens(str(user.id), {"role": user.role.value})
        return {"user": AuthService._user_dict(user), **tokens}, None

    @staticmethod
    async def login(db: AsyncSession, *, identifier: str, password: str) -> tuple[dict[str, Any], Exception | None]:
        identifier = identifier.strip().lower()
        user = (
            await db.execute(
                select(User).where((User.email == identifier) | (User.phone == identifier))
            )
        ).scalar_one_or_none()

        if user is None or not user.is_active:
            return {}, ValidationError("Invalid credentials.")
        if not verify_password(password, user.password_hash):
            return {}, ValidationError("Invalid credentials.")

        tokens = AuthService._issue_tokens(str(user.id), {"role": user.role.value})
        return {"user": AuthService._user_dict(user), **tokens}, None

    @staticmethod
    async def refresh_token(
        db: AsyncSession, refresh_token: str
    ) -> tuple[dict[str, Any], Exception | None]:
        payload = decode_token(refresh_token, expected_type="refresh")
        if payload is None:
            return {}, ValidationError("Invalid or expired refresh token.")

        user = (await db.execute(
            select(User).where(User.id == uuid.UUID(payload["sub"]))
        )).scalar_one_or_none()
        if user is None or not user.is_active:
            return {}, ValidationError("Account unavailable.")

        tokens = AuthService._issue_tokens(str(user.id), {"role": user.role.value})
        return tokens, None

    @staticmethod
    async def logout(db: AsyncSession, token: str) -> None:
        """Best-effort logout: we rely on short expiry; optionally blacklist."""
        try:
            r = _get_redis()
            await r.set(
                f"{settings.REDIS_PREFIX}:blacklist:{token}",
                "1",
                ex=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            )
        except Exception:
            pass

    @staticmethod
    def _issue_tokens(user_id: str, extra: dict[str, Any]) -> dict[str, str]:
        return {
            "access_token": create_access_token(user_id, extra),
            "refresh_token": create_refresh_token(user_id, extra),
            "token_type": "bearer",
        }

    @staticmethod
    def _user_dict(user: User) -> dict[str, Any]:
        return {
            "id": str(user.id),
            "email": user.email,
            "phone": user.phone,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_verified": user.is_verified,
            "is_active": user.is_active,
            "preferred_language": user.preferred_language,
            "avatar_url": user.avatar_url,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }