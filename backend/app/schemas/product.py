"""Product-related schemas."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    name_tamil: str | None = None
    slug: str
    icon: str | None = None
    parent_id: str | None = None
    sort_order: int
    is_active: bool


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    name_tamil: str | None = None
    slug: str = Field(min_length=1, max_length=150)
    icon: str | None = None
    parent_id: str | None = None
    sort_order: int = 0
    is_active: bool = True


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    name_tamil: str | None = None
    category_id: str
    description: str | None = None
    image_url: str | None = None
    unit: str
    created_at: datetime | None = None


class ProductCreate(BaseModel):
    name: str
    name_tamil: str | None = None
    category_id: str
    description: str | None = None
    image_url: str | None = None
    unit: str = "kg"


class ListingCreate(BaseModel):
    product_id: str
    price_per_unit: float = Field(gt=0)
    wholesale_price: float | None = Field(default=None, gt=0)
    grade: str = "A"
    available_quantity: float = Field(gt=0)
    min_order_quantity: float = 1.0
    harvest_date: date | None = None
    packing_date: date | None = None
    expiry_date: date | None = None
    collection_center_id: str | None = None
    organic_certified: bool = False
    certification_doc_url: str | None = None
    location_district: str | None = None
    location_state: str | None = None
    producer_type: str = "farmer"
    status: str = "active"


class ListingUpdate(BaseModel):
    price_per_unit: float | None = Field(default=None, gt=0)
    wholesale_price: float | None = Field(default=None, gt=0)
    grade: str | None = None
    available_quantity: float | None = Field(default=None, gt=0)
    min_order_quantity: float | None = Field(default=None, gt=0)
    expiry_date: date | None = None
    organic_certified: bool | None = None
    location_district: str | None = None
    location_state: str | None = None
    status: str | None = None


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: str
    producer_id: str
    producer_type: str
    batch_id: str | None = None
    price_per_unit: float
    wholesale_price: float | None = None
    grade: str
    available_quantity: float
    min_order_quantity: float
    harvest_date: date | None = None
    packing_date: date | None = None
    expiry_date: date | None = None
    collection_center_id: str | None = None
    organic_certified: bool
    certification_doc_url: str | None = None
    location_district: str | None = None
    location_state: str | None = None
    status: str


class SearchParams(BaseModel):
    q: str | None = None
    category_id: str | None = None
    district: str | None = None
    state: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    organic_only: bool = False
    producer_type: str | None = None
    page: int = 1
    page_size: int = 20


class NearbyParams(BaseModel):
    lat: float
    lng: float
    radius_km: float = Field(default=50, ge=1, le=500)
    page: int = 1
    page_size: int = 20