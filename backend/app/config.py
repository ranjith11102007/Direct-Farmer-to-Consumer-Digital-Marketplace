"""Application configuration using pydantic-settings.

Values can be overridden through environment variables or the .env file.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "Vaikkal Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://vaikkal:vaikkal@localhost:5432/vaikkal"
    )
    DATABASE_ECHO: bool = False

    # Redis / Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PREFIX: str = "vaikkal"
    CACHE_TTL_SECONDS: int = 300

    # Security
    SECRET_KEY: str = "change-me-in-production-please-use-a-secure-random-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    OTP_EXPIRE_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 5
    PASSWORD_MIN_LENGTH: int = 8
    BCRYPT_ROUNDS: int = 12

    # JWT audience / issuer
    JWT_AUDIENCE: str = "vaikkal-app"
    JWT_ISSUER: str = "vaikkal-auth"

    # CORS
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "https://app.vaikkal.in",
        ]
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_SIZE_MB: int = 5
    MAX_DOCUMENT_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: List[str] = Field(
        default_factory=lambda: ["image/jpeg", "image/png", "image/webp"]
    )
    ALLOWED_DOCUMENT_TYPES: List[str] = Field(
        default_factory=lambda: ["application/pdf", "image/jpeg", "image/png"]
    )

    # Payments
    PAYMENT_PROVIDER: str = "mock"  # mock | razorpay | payu
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    PLATFORM_FEE_PERCENT: float = 3.0
    DELIVERY_CHARGE_FLAT: float = 35.0
    PACKAGING_CHARGE_PERCENT: float = 1.5
    MIN_ORDER_VALUE_FREE_DELIVERY: float = 499.0

    # SMS / Email / WhatsApp providers
    SMS_PROVIDER: str = "mock"  # mock | msg91 | twilio
    EMAIL_PROVIDER: str = "console"  # console | smtp
    WHATSAPP_PROVIDER: str = "mock"  # mock | twilio | gupshup
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "no-reply@vaikkal.in"
    SMTP_FROM_NAME: str = "Vaikkal"

    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Rate limiting
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 60
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10

    # AI / ML
    FORECAST_MODEL_VERSION: str = "v1.0.0"
    FORECAST_DEFAULT_LOOKBACK_DAYS: int = 90
    MIN_DATA_POINTS_FOR_ML: int = 30
    LOW_DATA_THRESHOLD: int = 14

    # Delivery
    DEFAULT_VEHICLE_CAPACITY_KG: float = 500.0
    MAX_ROUTE_STOPS: int = 25

    # Storage / backend
    BACKEND_URL: str = ""  # e.g. gcs://bucket | s3://bucket | "" for local

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()