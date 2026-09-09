"""Farmer profile model."""
from __future__ import annotations

import uuid

from sqlalchemy import (
    Float,
    JSON,
    Numeric,
    String,
    Text,
    ForeignKey,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.user import VerificationStatus


class FarmerProfile(BaseModel):
    __tablename__ = "farmer_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    farm_name: Mapped[str] = mapped_column(String(255))
    farm_latitude: Mapped[float | None] = mapped_column(Float)
    farm_longitude: Mapped[float | None] = mapped_column(Float)
    farm_address: Mapped[str | None] = mapped_column(Text)
    district: Mapped[str | None] = mapped_column(String(100), index=True)
    state: Mapped[str | None] = mapped_column(String(100), index=True)
    pincode: Mapped[str | None] = mapped_column(String(10), index=True)
    land_size_acres: Mapped[float | None] = mapped_column(Float)
    crops_grown: Mapped[list | None] = mapped_column(JSON, default=list)
    bank_account_number: Mapped[str | None] = mapped_column(String(50))
    bank_ifsc: Mapped[str | None] = mapped_column(String(20))
    bank_name: Mapped[str | None] = mapped_column(String(100))
    identity_doc_url: Mapped[str | None] = mapped_column(Text)
    land_doc_url: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        String(30), default=VerificationStatus.DRAFT.value, index=True
    )
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=0.0)
    total_sales: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)

    # Relationships
    user = relationship("User", back_populates="farmer_profile")
    listings = relationship(
        "ProductListing",
        foreign_keys="ProductListing.producer_id",
        back_populates="producer",
    )
    fpo_memberships = relationship(
        "FPOMember", back_populates="farmer", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<FarmerProfile id={self.id} farm_name={self.farm_name!r} farmer={self.user_id}>"