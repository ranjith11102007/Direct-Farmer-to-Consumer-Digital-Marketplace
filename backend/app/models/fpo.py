"""FPO (Farmer Producer Organization) models."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import BaseModel, TimestampMixin, IdMixin
from app.models.user import VerificationStatus


class FPO(BaseModel):
    __tablename__ = "fpos"

    name: Mapped[str] = mapped_column(String(255), index=True)
    registration_number: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    district: Mapped[str | None] = mapped_column(String(100), index=True)
    state: Mapped[str | None] = mapped_column(String(100), index=True)
    address: Mapped[str | None] = mapped_column(Text)
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    logo_url: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        String(30), default=VerificationStatus.DRAFT.value, index=True
    )

    members = relationship(
        "FPOMember", back_populates="fpo", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<FPO id={self.id} name={self.name!r}>"


class FPOMember(IdMixin, TimestampMixin, Base):
    __tablename__ = "fpo_members"

    fpo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpos.id", ondelete="CASCADE"), index=True
    )
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmer_profiles.id", ondelete="CASCADE"), index=True
    )
    role_in_fpo: Mapped[str] = mapped_column(String(100), default="member")
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    fpo = relationship("FPO", back_populates="members")
    farmer = relationship("FarmerProfile", back_populates="fpo_memberships")

    def __repr__(self) -> str:
        return f"<FPOMember fpo={self.fpo_id} farmer={self.farmer_id}>"