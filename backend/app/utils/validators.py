"""Input validators for Phone, Email, Pincode, GST, prices, quantities."""
from __future__ import annotations

import re
from typing import Any

from app.utils.helpers import clamp

_PHONE_RE = re.compile(r"^(\+91[\s\-]?)?[6-9]\d{9}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PINCODE_RE = re.compile(r"^\d{6}$")
_GST_RE = re.compile(
    r"^[0-9A-Z]{2}[0-9A-Z]{10}[0-9A-Z]{3}$"
)
_IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")


class ValidationError(ValueError):
    """Raised when a value fails validation."""


def validate_phone(value: str) -> str:
    """Return a normalized Indian phone number or raise."""
    cleaned = re.sub(r"[\s\-()]", "", str(value))
    if not _PHONE_RE.match(cleaned):
        raise ValidationError("Invalid phone number. Use a valid Indian mobile number.")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    return cleaned


def validate_email(value: str) -> str:
    cleaned = str(value).strip().lower()
    if not _EMAIL_RE.match(cleaned) or len(cleaned) > 254:
        raise ValidationError("Invalid email address.")
    return cleaned


def validate_pincode(value: str) -> str:
    cleaned = str(value).strip()
    if not _PINCODE_RE.match(cleaned):
        raise ValidationError("Pincode must be a 6-digit Indian postal code.")
    return cleaned


def validate_ifsc(value: str) -> str:
    cleaned = str(value).strip().upper()
    if not _IFSC_RE.match(cleaned):
        raise ValidationError("Invalid IFSC code.")
    return cleaned


def validate_gst(value: str) -> str:
    cleaned = str(value).strip().upper()
    if not _GST_RE.match(cleaned):
        raise ValidationError("Invalid GST number.")
    return cleaned


def validate_price(value: Any, field: str = "price") -> float:
    try:
        price = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{field} must be a number.")
    if price < 0:
        raise ValidationError(f"{field} cannot be negative.")
    if price > 1_000_000_000:
        raise ValidationError(f"{field} is unreasonably large.")
    return round(price, 2)


def validate_quantity(value: Any, field: str = "quantity") -> float:
    try:
        qty = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{field} must be a number.")
    if qty <= 0:
        raise ValidationError(f"{field} must be greater than zero.")
    if qty > 100_000:
        raise ValidationError(f"{field} is unreasonably large.")
    return round(qty, 3)


def validate_rating(value: Any) -> int:
    try:
        rating = int(value)
    except (TypeError, ValueError):
        raise ValidationError("Rating must be an integer.")
    if not 1 <= rating <= 5:
        raise ValidationError("Rating must be between 1 and 5.")
    return rating


def validate_password_strength(password: str) -> None:
    from app.config import settings

    if len(password) < settings.PASSWORD_MIN_LENGTH:
        raise ValidationError(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long.")


def normalize_mobile_for_search(value: str) -> str:
    """Normalize a phone to its last-10 digits for safe lookups."""
    digits = re.sub(r"\D", "", value)
    return digits[-10:] if digits else ""


def is_valid_coordinate(lat: float | None, lng: float | None) -> bool:
    if lat is None or lng is None:
        return False
    return (-90.0 <= float(lat) <= 90.0) and (-180.0 <= float(lng) <= 180.0)


def clamp_percent(value: float) -> float:
    return clamp(float(value), 0.0, 100.0)