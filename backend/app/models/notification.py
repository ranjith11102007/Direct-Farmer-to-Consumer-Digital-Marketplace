"""Notification model."""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class NotificationType(str, enum.Enum):
    ORDER_UPDATE = "order_update"
    PAYMENT = "payment"
    DELIVERY = "delivery"
    VERIFICATION = "verification"
    FORECAST = "forecast"
    SYSTEM = "system"
    PROMOTION = "promotion"


class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    SMS = "sms"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    PUSH = "push"


class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type_enum", native_enum=False),
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255))
    title_tamil: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    message_tamil: Mapped[str | None] = mapped_column(Text)
    data_json: Mapped[dict | None] = mapped_column(JSON)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel_enum", native_enum=False),
        default=NotificationChannel.IN_APP,
    )
    sent_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    user = relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user={self.user_id} type={self.type}>"