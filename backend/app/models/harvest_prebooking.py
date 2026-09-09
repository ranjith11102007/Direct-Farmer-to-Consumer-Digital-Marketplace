"""Harvest pre-booking models that let consumers reserve produce before harvest."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class PrebookingStatus(str, enum.Enum):
    PUBLISHED = "published"
    ACCEPTING = "accepting"
    FULL = "full"
    HARVESTED = "harvested"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class ReservationStatus(str, enum.Enum):
    RESERVED = "reserved"
    CONFIRMED = "confirmed"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class HarvestPrebooking(BaseModel):
    __tablename__ = "harvest_prebookings"

    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmer_profiles.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    expected_harvest_date: Mapped[date] = mapped_column(Date, index=True)
    available_quantity: Mapped[float] = mapped_column(Float)
    grade: Mapped[str] = mapped_column(String(20), default="A")
    price_range_min: Mapped[float] = mapped_column(Numeric(12, 2))
    price_range_max: Mapped[float] = mapped_column(Numeric(12, 2))
    description: Mapped[str | None] = mapped_column(Text)
    deposit_required: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[PrebookingStatus] = mapped_column(
        Enum(PrebookingStatus, name="prebooking_status_enum", native_enum=False),
        default=PrebookingStatus.ACCEPTING,
        index=True,
    )

    reservations = relationship(
        "PrebookingReservation",
        back_populates="prebooking",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<HarvestPrebooking id={self.id} product={self.product_id} status={self.status}>"


class PrebookingReservation(BaseModel):
    __tablename__ = "prebooking_reservations"

    prebooking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("harvest_prebookings.id", ondelete="CASCADE"),
        index=True,
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    quantity: Mapped[float] = mapped_column(Float)
    agreed_price: Mapped[float] = mapped_column(Numeric(12, 2))
    deposit_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[ReservationStatus] = mapped_column(
        Enum(ReservationStatus, name="reservation_status_enum", native_enum=False),
        default=ReservationStatus.RESERVED,
        index=True,
    )

    prebooking = relationship("HarvestPrebooking", back_populates="reservations")

    def __repr__(self) -> str:
        return f"<PrebookingReservation id={self.id} buyer={self.buyer_id} qty={self.quantity}>"