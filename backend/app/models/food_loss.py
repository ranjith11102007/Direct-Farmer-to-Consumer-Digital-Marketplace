"""Food loss early-warning system models."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    String,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AlertType(str, enum.Enum):
    SURPLUS_PREDICTED = "surplus_predicted"
    LOW_SHELF_LIFE = "low_shelf_life"
    DEMAND_DROP = "demand_drop"
    DELAYED_PICKUP = "delayed_pickup"
    DELIVERY_BOTTLENECK = "delivery_bottleneck"


class SeverityLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    EXPIRED = "expired"


class FoodLossAlert(BaseModel):
    __tablename__ = "food_loss_alerts"

    product_listing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_listings.id", ondelete="CASCADE"),
        index=True,
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), index=True
    )
    alert_type: Mapped[AlertType] = mapped_column(
        Enum(AlertType, name="food_loss_alert_type_enum", native_enum=False), index=True
    )
    severity: Mapped[SeverityLevel] = mapped_column(
        Enum(SeverityLevel, name="severity_level_enum", native_enum=False),
        default=SeverityLevel.MEDIUM,
        index=True,
    )
    recommended_actions: Mapped[list | None] = mapped_column(JSON, default=list)
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status_enum", native_enum=False),
        default=AlertStatus.ACTIVE,
        index=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<FoodLossAlert id={self.id} type={self.alert_type} severity={self.severity}>"