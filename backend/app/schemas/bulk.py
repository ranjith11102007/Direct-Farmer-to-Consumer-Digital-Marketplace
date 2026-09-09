"""Bulk procurement schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BulkRequirementCreate(BaseModel):
    product_id: str
    grade: str = "A"
    quantity: float = Field(gt=0)
    unit: str = "kg"
    delivery_location_json: dict | None = None
    schedule_type: str = "one_time"
    target_price: float | None = Field(default=None, gt=0)
    packaging_requirements: str | None = None
    quality_specs: str | None = None
    deadline: datetime | None = None


class BulkRequirementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    buyer_id: str
    product_id: str
    grade: str
    quantity: float
    unit: str
    delivery_location_json: dict | None = None
    schedule_type: str
    target_price: float | None = None
    packaging_requirements: str | None = None
    quality_specs: str | None = None
    deadline: datetime | None = None
    status: str


class QuotationCreate(BaseModel):
    requirement_id: str
    price_per_unit: float = Field(gt=0)
    quantity: float | None = Field(default=None, gt=0)
    delivery_timeline: str | None = None
    quality_notes: str | None = None
    valid_until: datetime | None = None


class QuotationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    requirement_id: str
    responder_id: str
    responder_type: str
    price_per_unit: float
    total_price: float
    delivery_timeline: str | None = None
    quality_notes: str | None = None
    valid_until: datetime | None = None
    status: str


class QuotationAction(BaseModel):
    quotation_id: str
    payment_terms: str | None = None


class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    requirement_id: str
    quotation_id: str
    buyer_id: str
    supplier_id: str
    items_json: list = []
    total_amount: float
    payment_terms: str | None = None
    delivery_schedule: dict | None = None
    status: str


class PurchaseOrderStatusUpdate(BaseModel):
    status: str