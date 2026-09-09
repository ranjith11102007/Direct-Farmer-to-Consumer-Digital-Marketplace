"""Sustainability / climate impact tracking per order."""
from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    String,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class SustainabilityRecord(BaseModel):
    __tablename__ = "sustainability_records"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True
    )
    food_miles_km: Mapped[float] = mapped_column(Float, default=0)
    delivery_distance_km: Mapped[float] = mapped_column(Float, default=0)
    vehicle_utilization_percent: Mapped[float] = mapped_column(Float, default=0)
    packaging_type: Mapped[str] = mapped_column(String(50), default="reusable_crate")
    estimated_co2_kg: Mapped[float] = mapped_column(Float, default=0)
    local_purchase_percent: Mapped[float] = mapped_column(Float, default=100)
    consolidated_delivery: Mapped[bool] = mapped_column(Boolean, default=False)

    def __repr__(self) -> str:
        return f"<SustainabilityRecord id={self.id} order={self.order_id} co2={self.estimated_co2_kg}>"