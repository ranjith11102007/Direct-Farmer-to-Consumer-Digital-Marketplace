"""Inventory ledger model for stock tracking."""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ChangeType(str, enum.Enum):
    RECEIVED = "received"
    SOLD = "sold"
    RESERVED = "reserved"
    RELEASED = "released"
    SPOILED = "spoiled"
    DISPATCHED = "dispatched"
    ADJUSTED = "adjusted"


class InventoryLedger(BaseModel):
    __tablename__ = "inventory_ledger"

    product_listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_listings.id", ondelete="CASCADE"),
        index=True,
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), index=True
    )
    change_type: Mapped[ChangeType] = mapped_column(
        Enum(ChangeType, name="change_type_enum", native_enum=False), index=True
    )
    quantity_change: Mapped[float] = mapped_column(Float)
    quantity_after: Mapped[float] = mapped_column(Float)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), index=True
    )
    reference_type: Mapped[str | None] = mapped_column(String(50), index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    product_listing = relationship(
        "ProductListing", back_populates="inventory_entries"
    )
    batch = relationship("Batch")

    __table_args__ = (
        Index("ix_inventory_listing_type", "product_listing_id", "change_type"),
        Index("ix_inventory_reference", "reference_id", "reference_type"),
    )

    def __repr__(self) -> str:
        return (
            f"<InventoryLedger id={self.id} listing={self.product_listing_id} "
            f"change={self.change_type} quantity={self.quantity_change}>"
        )