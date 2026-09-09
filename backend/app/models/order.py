"""Order, cart, payment and settlement models."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime, timedelta

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

from app.models.base import BaseModel, IdMixin, TimestampMixin
from app.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PRODUCER_ACCEPTED = "producer_accepted"
    PRODUCE_COLLECTED = "produce_collected"
    QUALITY_CHECKED = "quality_checked"
    PACKED = "packed"
    DISPATCHED = "dispatched"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    UPI = "upi"
    CARD = "card"
    NETBANKING = "netbanking"
    WALLET = "wallet"
    COD = "cod"
    CREDIT = "credit"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class SettlementStatus(str, enum.Enum):
    PENDING = "pending"
    HELD = "held"
    PARTIALLY_SETTLED = "partially_settled"
    SETTLED = "settled"
    FAILED = "failed"
    DISPUTED = "disputed"
    REVERSED = "reversed"


class Cart(IdMixin, TimestampMixin, Base):
    __tablename__ = "carts"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    session_id: Mapped[str | None] = mapped_column(String(255), index=True)

    items = relationship(
        "CartItem", back_populates="cart", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Cart id={self.id} user={self.user_id}>"


class CartItem(IdMixin, TimestampMixin, Base):
    __tablename__ = "cart_items"

    cart_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"), index=True
    )
    product_listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_listings.id", ondelete="CASCADE"),
        index=True,
    )
    quantity: Mapped[float] = mapped_column(Float, default=1)

    cart = relationship("Cart", back_populates="items")
    product_listing = relationship("ProductListing")

    def __repr__(self) -> str:
        return f"<CartItem id={self.id} listing={self.product_listing_id} qty={self.quantity}>"


class Order(BaseModel):
    __tablename__ = "orders"

    order_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status_enum", native_enum=False),
        default=OrderStatus.PENDING,
        index=True,
    )
    delivery_address_json: Mapped[dict] = mapped_column(JSON)
    delivery_slot_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivery_slot_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    delivery_charge: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    packaging_charge: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    platform_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tax: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    farmer_share_estimate: Mapped[float | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)

    items = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    payments = relationship(
        "Payment", back_populates="order", cascade="all, delete-orphan"
    )
    settlement = relationship(
        "Settlement", back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
    user = relationship("User")

    __table_args__ = (Index("ix_orders_user_status", "user_id", "status"),)

    def __repr__(self) -> str:
        return f"<Order id={self.id} order_number={self.order_number!r} status={self.status}>"


class OrderItem(BaseModel):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    product_listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_listings.id", ondelete="CASCADE")
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), index=True
    )
    producer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True
    )
    quantity: Mapped[float] = mapped_column(Float)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2))
    total_price: Mapped[float] = mapped_column(Numeric(12, 2))
    quality_grade: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), default="confirmed")

    order = relationship("Order", back_populates="items")
    product_listing = relationship("ProductListing")

    def __repr__(self) -> str:
        return f"<OrderItem id={self.id} order={self.order_id} qty={self.quantity}>"


class Payment(BaseModel):
    __tablename__ = "payments"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method_enum", native_enum=False), index=True
    )
    provider: Mapped[str] = mapped_column(String(50), default="mock")
    provider_reference: Mapped[str | None] = mapped_column(String(255), index=True)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum", native_enum=False),
        default=PaymentStatus.PENDING,
        index=True,
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order = relationship("Order", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} order={self.order_id} amount={self.amount} status={self.status}>"


class Settlement(BaseModel):
    __tablename__ = "settlements"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmer_profiles.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    platform_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    logistics_deduction: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    net_settlement: Mapped[float] = mapped_column(Numeric(12, 2))
    status: Mapped[SettlementStatus] = mapped_column(
        Enum(SettlementStatus, name="settlement_status_enum", native_enum=False),
        default=SettlementStatus.PENDING,
        index=True,
    )
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order = relationship("Order", back_populates="settlement")
    farmer = relationship("FarmerProfile")

    def __repr__(self) -> str:
        return f"<Settlement id={self.id} farmer={self.farmer_id} net={self.net_settlement} status={self.status}>"