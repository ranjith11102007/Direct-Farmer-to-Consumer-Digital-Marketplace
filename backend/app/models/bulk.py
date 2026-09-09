"""Bulk procurement models: requirements, quotations, purchase orders."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ScheduleType(str, enum.Enum):
    ONE_TIME = "one_time"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class RequirementStatus(str, enum.Enum):
    OPEN = "open"
    QUOTED = "quoted"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class QuotationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class BulkRequirement(BaseModel):
    __tablename__ = "bulk_requirements"

    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    grade: Mapped[str] = mapped_column(String(20), default="A")
    quantity: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20), default="kg")
    delivery_location_json: Mapped[dict | None] = mapped_column(JSON)
    schedule_type: Mapped[ScheduleType] = mapped_column(
        Enum(ScheduleType, name="schedule_type_enum", native_enum=False),
        default=ScheduleType.ONE_TIME,
    )
    target_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    packaging_requirements: Mapped[str | None] = mapped_column(Text)
    quality_specs: Mapped[str | None] = mapped_column(Text)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[RequirementStatus] = mapped_column(
        Enum(RequirementStatus, name="requirement_status_enum", native_enum=False),
        default=RequirementStatus.OPEN,
        index=True,
    )

    quotations = relationship(
        "Quotation", back_populates="requirement", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<BulkRequirement id={self.id} product={self.product_id} status={self.status}>"


class Quotation(BaseModel):
    __tablename__ = "quotations"

    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bulk_requirements.id", ondelete="CASCADE"),
        index=True,
    )
    responder_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True
    )
    responder_type: Mapped[str] = mapped_column(String(20), default="farmer")
    price_per_unit: Mapped[float] = mapped_column(Numeric(12, 2))
    total_price: Mapped[float] = mapped_column(Numeric(12, 2))
    delivery_timeline: Mapped[str | None] = mapped_column(String(100))
    quality_notes: Mapped[str | None] = mapped_column(Text)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[QuotationStatus] = mapped_column(
        Enum(QuotationStatus, name="quotation_status_enum", native_enum=False),
        default=QuotationStatus.PENDING,
        index=True,
    )

    requirement = relationship("BulkRequirement", back_populates="quotations")

    def __repr__(self) -> str:
        return f"<Quotation id={self.id} requirement={self.requirement_id} status={self.status}>"


class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_orders"

    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bulk_requirements.id", ondelete="CASCADE"),
        index=True,
    )
    quotation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), index=True
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    items_json: Mapped[list] = mapped_column(JSON, default=list)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    payment_terms: Mapped[str | None] = mapped_column(String(255))
    delivery_schedule: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        Enum(
            PurchaseOrderStatus,
            name="purchase_order_status_enum",
            native_enum=False,
        ),
        default=PurchaseOrderStatus.DRAFT,
        index=True,
    )

    requirement = relationship("BulkRequirement")
    quotation = relationship("Quotation")

    def __repr__(self) -> str:
        return f"<PurchaseOrder id={self.id} amount={self.total_amount} status={self.status}>"