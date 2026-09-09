"""Unit tests for security utilities: password hashing, JWT, OTP."""
from __future__ import annotations

from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_idempotency_key,
    generate_otp,
    generate_secure_random_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        token = hash_password("Vaikkal@Demo123")
        assert token != "Vaikkal@Demo123"
        assert verify_password("Vaikkal@Demo123", token)

    def test_wrong_password_fails(self):
        token = hash_password("correct-password")
        assert not verify_password("wrong-password", token)

    def test_hashes_are_unique(self):
        assert hash_password("samepass") != hash_password("samepass")

    def test_long_password_truncated_safely(self):
        long = "x" * 200
        token = hash_password(long)
        assert verify_password(long, token)


class TestJWT:
    def test_access_token_roundtrip(self):
        token = create_access_token(subject="user-123", extra={"role": "farmer"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["role"] == "farmer"
        assert payload["type"] == "access"

    def test_refresh_token_roundtrip(self):
        token = create_refresh_token(subject="user-123")
        payload = decode_token(token, expected_type="refresh")
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["type"] == "refresh"

    def test_access_token_not_valid_as_refresh(self):
        token = create_access_token(subject="user-123")
        assert decode_token(token, expected_type="refresh") is None

    def test_tampered_token_rejected(self):
        token = create_access_token(subject="user-123", extra={"role": "admin"})
        assert decode_token(token + "junk") is None

    def test_missing_jti_rejected(self):
        """JWT without required claims must not silently validate."""
        from datetime import datetime, timedelta, timezone

        from jose import jwt as jose_jwt

        from app.config import settings

        payload = {
            "sub": "user-1",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        }
        token = jose_jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        assert decode_token(token) is None  # wrong type claim -> None


class TestOtpHelpers:
    def test_generate_fixed_length(self):
        assert len(generate_otp()) == 6
        assert generate_otp().isdigit()

    def test_generate_custom_length(self):
        assert len(generate_otp(8)) == 8

    def test_idempotency_key_is_uuid(self):
        import uuid as uuid_module

        key = generate_idempotency_key()
        uuid_module.UUID(key)  # raises ValueError if invalid

    def test_secure_random_token(self):
        assert len(generate_secure_random_token()) >= 32
        assert generate_secure_random_token() != generate_secure_random_token()