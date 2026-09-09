"""Location, address, service area and collection center models."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel, IdMixin, TimestampMixin
from app.database import Base


class Address(IdMixin, TimestampMixin, Base):
    __tablename__ = "addresses"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str | None] = mapped_column(String(50), default="Home")
    address_line1: Mapped[str] = mapped_column(String(255))
    address_line2: Mapped[str | None] = mapped_column(String(255))
    village: Mapped[str | None] = mapped_column(String(100))
    town: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100), index=True)
    pincode: Mapped[str] = mapped_column(String(10), index=True)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="addresses")

    def __repr__(self) -> str:
        return f"<Address id={self.id} district={self.district!r} pincode={self.pincode!r}>"


class ServiceArea(BaseModel):
    __tablename__ = "service_areas"

    name: Mapped[str] = mapped_column(String(150), index=True)
    district: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100), index=True)
    pincode_range: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    delivery_fee_base: Mapped[float] = mapped_column(Float, default=35.0)
    estimated_delivery_hours: Mapped[int] = mapped_column(Integer, default=24)

    def __repr__(self) -> str:
        return f"<ServiceArea id={self.id} name={self.name!r}>"


class CollectionCenter(BaseModel):
    __tablename__ = "collection_centers"

    name: Mapped[str] = mapped_column(String(150), index=True)
    fpo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpos.id", ondelete="SET NULL"), index=True
    )
    address_line: Mapped[str | None] = mapped_column(String(255))
    district: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100), index=True)
    pincode: Mapped[str] = mapped_column(String(10), index=True)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    has_cold_storage: Mapped[bool] = mapped_column(Boolean, default=False)
    capacity_kg: Mapped[float | None] = mapped_column(Float)
    operator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    fpo = relationship("FPO")

    def __repr__(self) -> str:
        return f"<CollectionCenter id={self.id} name={self.name!r}>"