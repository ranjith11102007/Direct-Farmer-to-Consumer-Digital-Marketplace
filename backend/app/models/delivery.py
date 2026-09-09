"""Delivery partner, vehicle, delivery and route models."""
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
    Integer,
    Numeric,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class DeliveryStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


class VehicleType(str, enum.Enum):
    BIKE = "bike"
    AUTO = "auto"
    VAN = "van"
    TRUCK = "truck"


class RouteStatus(str, enum.Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DeliveryPartner(BaseModel):
    __tablename__ = "delivery_partners"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    vehicle_type: Mapped[VehicleType] = mapped_column(
        Enum(VehicleType, name="vehicle_type_enum", native_enum=False),
        default=VehicleType.BIKE,
    )
    vehicle_number: Mapped[str | None] = mapped_column(String(30))
    license_number: Mapped[str | None] = mapped_column(String(50))
    service_areas: Mapped[list | None] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=0.0)

    vehicles = relationship(
        "Vehicle", back_populates="partner", cascade="all, delete-orphan"
    )
    deliveries = relationship("Delivery", back_populates="partner")

    def __repr__(self) -> str:
        return f"<DeliveryPartner id={self.id} user={self.user_id}>"


class Vehicle(BaseModel):
    __tablename__ = "vehicles"

    partner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delivery_partners.id", ondelete="CASCADE"),
        index=True,
    )
    type: Mapped[VehicleType] = mapped_column(
        Enum(VehicleType, name="vehicle_type_enum", native_enum=False)
    )
    number: Mapped[str] = mapped_column(String(30))
    capacity_kg: Mapped[float] = mapped_column(Float, default=100)
    cold_chain_capable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    partner = relationship("DeliveryPartner", back_populates="vehicles")

    def __repr__(self) -> str:
        return f"<Vehicle id={self.id} number={self.number!r}>"


class Delivery(BaseModel):
    __tablename__ = "deliveries"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delivery_partners.id", ondelete="SET NULL"),
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus, name="delivery_status_enum", native_enum=False),
        default=DeliveryStatus.PENDING,
        index=True,
    )
    pickup_address_json: Mapped[dict | None] = mapped_column(JSON)
    delivery_address_json: Mapped[dict] = mapped_column(JSON)
    estimated_distance_km: Mapped[float | None] = mapped_column(Float)
    actual_distance_km: Mapped[float | None] = mapped_column(Float)
    estimated_time_minutes: Mapped[int | None] = mapped_column(Integer)
    actual_time_minutes: Mapped[int | None] = mapped_column(Integer)
    route_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("routes.id", ondelete="SET NULL"), index=True
    )
    otp_code: Mapped[str | None] = mapped_column(String(10))
    qr_code_data: Mapped[str | None] = mapped_column(Text)
    proof_of_delivery_url: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    partner = relationship("DeliveryPartner", back_populates="deliveries")
    order = relationship("Order")
    vehicle = relationship("Vehicle")

    def __repr__(self) -> str:
        return f"<Delivery id={self.id} order={self.order_id} status={self.status}>"


class Route(BaseModel):
    __tablename__ = "routes"

    delivery_partner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delivery_partners.id", ondelete="CASCADE"),
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, index=True)
    stops_json: Mapped[list] = mapped_column(JSON, default=list)
    total_distance_km: Mapped[float] = mapped_column(Float, default=0)
    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[RouteStatus] = mapped_column(
        Enum(RouteStatus, name="route_status_enum", native_enum=False),
        default=RouteStatus.PLANNED,
        index=True,
    )
    optimization_score: Mapped[float | None] = mapped_column(Float)

    deliveries = relationship("Delivery", foreign_keys=[Delivery.route_id])

    def __repr__(self) -> str:
        return f"<Route id={self.id} partner={self.delivery_partner_id} date={self.date}>"