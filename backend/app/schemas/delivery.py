"""Delivery schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PartnerRegisterRequest(BaseModel):
    vehicle_type: str = "bike"
    license_number: str
    service_areas: list[str] | None = None
    vehicle_number: str | None = None


class PartnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    vehicle_type: str
    vehicle_number: str | None = None
    license_number: str | None = None
    service_areas: list | None = None
    is_active: bool
    rating: float


class DeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str
    partner_id: str | None = None
    vehicle_id: str | None = None
    status: str
    pickup_address_json: dict | None = None
    delivery_address_json: dict
    estimated_distance_km: float | None = None
    actual_distance_km: float | None = None
    estimated_time_minutes: int | None = None
    actual_time_minutes: int | None = None
    route_id: str | None = None
    otp_code: str | None = None
    qr_code_data: str | None = None
    proof_of_delivery_url: str | None = None
    notes: str | None = None
    created_at: datetime | None = None


class DeliveryStatusUpdate(BaseModel):
    status: str
    notes: str | None = None


class RouteBuildRequest(BaseModel):
    start_time: str | None = None
    vehicle_capacity_kg: float | None = None


class RouteStop(BaseModel):
    id: str
    type: str = "drop"
    lat: float | None = None
    lng: float | None = None
    capacity_kg: float = 0.0
    earliest: str | None = None
    latest: str | None = None
    labels: dict = {}


class RouteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    delivery_partner_id: str
    date: datetime | None = None
    stops_json: list = []
    total_distance_km: float
    estimated_duration_minutes: int
    status: str
    optimization_score: float | None = None


class RouteOptimizeRequest(BaseModel):
    stops: list[RouteStop]
    vehicle_capacity_kg: float = Field(default=500, gt=0)
    start_time: str | None = None
    depot: tuple[float, float] | None = None


class RouteOptimizeResponse(BaseModel):
    ordered_stops: list[dict]
    total_distance_km: float
    estimated_time_minutes: int
    capacity_utilization: float
    optimization_score: float
    unassigned_reasons: list[str] = []