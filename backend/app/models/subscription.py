"""Subscription models for recurring household deliveries."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class SubscriptionSchedule(str, enum.Enum):
    DAILY = "daily"
    ALTERNATE = "alternate"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class Subscription(BaseModel):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    product_listing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_listings.id", ondelete="SET NULL"),
        index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    schedule_type: Mapped[SubscriptionSchedule] = mapped_column(
        Enum(SubscriptionSchedule, name="subscription_schedule_enum"),
        default=SubscriptionSchedule.WEEKLY,
        index=True,
    )
    quantity: Mapped[float] = mapped_column(Float, default=1)
    delivery_address_json: Mapped[dict] = mapped_column(JSON)
    delivery_slot: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    next_delivery_date: Mapped[date | None] = mapped_column(Date, index=True)

    def __repr__(self) -> str:
        return f"<Subscription id={self.id} user={self.user_id} schedule={self.schedule_type}>"