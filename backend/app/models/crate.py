"""Reusable crate tracking for circular packaging."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class CrateStatus(str, enum.Enum):
    IN_USE = "in_use"
    RETURNED = "returned"
    LOST = "lost"
    DAMAGED = "damaged"


class ReusableCrate(BaseModel):
    __tablename__ = "reusable_crates"

    qr_code: Mapped[str] = mapped_column(Text, unique=True, index=True)
    status: Mapped[CrateStatus] = mapped_column(
        Enum(CrateStatus, name="crate_status_enum", native_enum=False),
        default=CrateStatus.IN_USE,
        index=True,
    )
    assigned_batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), index=True
    )
    assigned_delivery_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deliveries.id", ondelete="SET NULL"), index=True
    )
    condition_notes: Mapped[str | None] = mapped_column(Text)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<ReusableCrate id={self.id} qr={self.qr_code} status={self.status}>"