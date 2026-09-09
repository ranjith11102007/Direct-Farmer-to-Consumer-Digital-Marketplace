"""Batch and batch-event models for traceability and quality."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class BatchStatus(str, enum.Enum):
    CREATED = "created"
    INSPECTED = "inspected"
    PACKED = "packed"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    EXPIRED = "expired"


class BatchEventType(str, enum.Enum):
    CREATED = "created"
    QUALITY_CHECK = "quality_check"
    PACKED = "packed"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    INSPECTED = "inspected"
    REJECTED = "rejected"
    STATUS_CHANGED = "status_changed"


class Batch(BaseModel):
    __tablename__ = "batches"

    batch_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    producer_ids: Mapped[list] = mapped_column(JSON, default=list)
    fpo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpos.id", ondelete="SET NULL"), index=True
    )
    collection_center_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("collection_centers.id", ondelete="SET NULL"),
        index=True,
    )
    grade: Mapped[str] = mapped_column(String(20), default="A", index=True)
    quantity_received: Mapped[float] = mapped_column(Float, default=0)
    quantity_accepted: Mapped[float] = mapped_column(Float, default=0)
    quantity_rejected: Mapped[float] = mapped_column(Float, default=0)
    weight_after_packing: Mapped[float | None] = mapped_column(Float)
    harvest_date: Mapped[date | None] = mapped_column(Date)
    packing_date: Mapped[date | None] = mapped_column(Date)
    quality_inspection_notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[BatchStatus] = mapped_column(
        Enum(BatchStatus, name="batch_status_enum", native_enum=False),
        default=BatchStatus.CREATED,
        index=True,
    )

    events = relationship(
        "BatchEvent", back_populates="batch", cascade="all, delete-orphan"
    )
    passport = relationship(
        "TraceabilityPassport",
        back_populates="batch",
        uselist=False,
        cascade="all, delete-orphan",
    )
    listings = relationship("ProductListing", back_populates="batch")

    def __repr__(self) -> str:
        return f"<Batch id={self.id} batch_number={self.batch_number!r} status={self.status}>"


class BatchEvent(BaseModel):
    __tablename__ = "batch_events"

    batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[BatchEventType] = mapped_column(
        Enum(BatchEventType, name="batch_event_type_enum", native_enum=False),
        index=True,
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    notes: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    batch = relationship("Batch", back_populates="events")

    __table_args__ = (Index("ix_batch_events_batch_timestamp", "batch_id", "timestamp"),)

    def __repr__(self) -> str:
        return f"<BatchEvent batch={self.batch_id} type={self.event_type}>"