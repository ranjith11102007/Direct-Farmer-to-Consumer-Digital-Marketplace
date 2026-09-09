"""Community group ordering models."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class GroupOrderStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    FULFILLED = "fulfilled"


class ParticipantStatus(str, enum.Enum):
    JOINED = "joined"
    CONFIRMED = "confirmed"
    PAID = "paid"
    DELIVERED = "delivered"


class GroupOrder(BaseModel):
    __tablename__ = "group_orders"

    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    delivery_address_json: Mapped[dict] = mapped_column(JSON)
    delivery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    minimum_participants: Mapped[int] = mapped_column(Integer, default=5)
    current_participants: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[GroupOrderStatus] = mapped_column(
        Enum(GroupOrderStatus, name="group_order_status_enum", native_enum=False),
        default=GroupOrderStatus.OPEN,
        index=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    participants = relationship(
        "GroupOrderParticipant",
        back_populates="group_order",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<GroupOrder id={self.id} title={self.title!r} status={self.status}>"


class GroupOrderParticipant(BaseModel):
    __tablename__ = "group_order_participants"

    group_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("group_orders.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    items_json: Mapped[list] = mapped_column(JSON, default=list)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[ParticipantStatus] = mapped_column(
        Enum(ParticipantStatus, name="participant_status_enum", native_enum=False),
        default=ParticipantStatus.JOINED,
        index=True,
    )

    group_order = relationship("GroupOrder", back_populates="participants")

    def __repr__(self) -> str:
        return f"<GroupOrderParticipant id={self.id} group={self.group_order_id} user={self.user_id}>"