"""Customer complaints and resolution tracking."""
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
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class ComplaintType(str, enum.Enum):
    QUALITY = "quality"
    MISSING_ITEM = "missing_item"
    LATE_DELIVERY = "late_delivery"
    WRONG_ITEM = "wrong_item"
    REFUND = "refund"
    OTHER = "other"


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    CLOSED = "closed"


class Complaint(BaseModel):
    __tablename__ = "complaints"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), index=True
    )
    type: Mapped[ComplaintType] = mapped_column(
        Enum(ComplaintType, name="complaint_type_enum", native_enum=False), index=True
    )
    description: Mapped[str | None] = mapped_column(Text)
    evidence_urls: Mapped[list | None] = mapped_column(JSON, default=list)
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status_enum", native_enum=False),
        default=ComplaintStatus.OPEN,
        index=True,
    )
    resolution_notes: Mapped[str | None] = mapped_column(Text)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<Complaint id={self.id} type={self.type} status={self.status}>"