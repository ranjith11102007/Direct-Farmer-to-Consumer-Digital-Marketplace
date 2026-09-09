"""User models."""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    Boolean,
    Enum,
    Index,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    CONSUMER = "consumer"
    FARMER = "farmer"
    FPO_ADMIN = "fpo_admin"
    BULK_BUYER = "bulk_buyer"
    DELIVERY_PARTNER = "delivery_partner"
    COLLECTION_CENTER_OPERATOR = "collection_center_operator"
    ADMIN = "admin"


class VerificationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    VERIFIED = "verified"
    REJECTED = "rejected"
    RE_VERIFICATION_REQUIRED = "re_verification_required"


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum", native_enum=False),
        default=UserRole.CONSUMER,
        index=True,
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="ta")
    avatar_url: Mapped[str | None] = mapped_column(Text)

    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(
            VerificationStatus,
            name="verification_status_enum",
            native_enum=False,
        ),
        default=VerificationStatus.DRAFT,
        index=True,
    )

    # Relationships
    addresses = relationship(
        "Address", back_populates="user", cascade="all, delete-orphan"
    )
    farmer_profile = relationship(
        "FarmerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    reviews = relationship(
        "Review", back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_users_role_active", "role", "is_active"),
        Index("ix_users_email_lower", "email"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} full_name={self.full_name!r} role={self.role}>"