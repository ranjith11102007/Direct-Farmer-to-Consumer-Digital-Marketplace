"""Order, cart, payment and settlement schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CartItemAdd(BaseModel):
    product_listing_id: str
    quantity: float = Field(gt=0)


class CartItemUpdate(BaseModel):
    quantity: float = Field(gt=0)


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_listing_id: str
    quantity: float


class CartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    session_id: str | None = None
    items: list[CartItemOut] = []


class CheckoutRequest(BaseModel):
    delivery_address_json: dict
    delivery_slot_start: datetime | None = None
    delivery_slot_end: datetime | None = None
    notes: str | None = None
    payment_method: str = "upi"
    idempotency_key: str | None = None


class PaymentCompleteRequest(BaseModel):
    payment_id: str
    provider_reference: str | None = None


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_listing_id: str
    batch_id: str | None = None
    producer_id: str
    quantity: float
    unit_price: float
    total_price: float
    quality_grade: str | None = None
    status: str


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_number: str
    user_id: str
    status: str
    delivery_address_json: dict
    delivery_slot_start: datetime | None = None
    delivery_slot_end: datetime | None = None
    subtotal: float
    delivery_charge: float
    packaging_charge: float
    platform_fee: float
    tax: float
    discount: float
    total: float
    farmer_share_estimate: float | None = None
    notes: str | None = None
    created_at: datetime | None = None
    items: list[OrderItemOut] = []


class OrderCreateOut(BaseModel):
    order: OrderOut
    payment: dict
    payment_provider: str


class OrderStatusUpdate(BaseModel):
    status: str


class CancelOrderRequest(BaseModel):
    reason: str | None = None


class ConfirmDeliveryRequest(BaseModel):
    otp_code: str | None = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str
    amount: float
    method: str
    provider: str
    provider_reference: str | None = None
    status: str
    paid_at: datetime | None = None


class SettlementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str
    farmer_id: str
    amount: float
    platform_fee: float
    logistics_deduction: float
    net_settlement: float
    status: str
    settled_at: datetime | None = None
    created_at: datetime | None = None