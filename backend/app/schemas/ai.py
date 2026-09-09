"""AI / forecast / recommendation schemas."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ForecastRequest(BaseModel):
    product_id: str
    district: str | None = None
    horizon: str = "weekly"
    lookback_days: int | None = None


class ForecastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: str
    district: str
    forecast_date: date
    period: str
    predicted_demand: float
    confidence_lower: float
    confidence_upper: float
    factors_json: dict | None = None
    model_version: str
    generated_at: datetime | None = None


class ForecastResultOut(BaseModel):
    predicted_demand: float
    confidence_lower: float
    confidence_upper: float
    factors: dict
    model_version: str
    data_points_used: int
    dataset_label: str
    is_low_data: bool
    horizon: str
    horizon_date: date


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    type: str
    title: str
    title_tamil: str | None = None
    message: str
    message_tamil: str | None = None
    data_json: dict | None = None
    confidence: float
    location_district: str | None = None
    product_id: str | None = None
    is_read: bool
    is_dismissed: bool
    expires_at: datetime | None = None


class RouteOptimizeRequest(BaseModel):
    stops: list[dict]
    vehicle_capacity_kg: float = Field(default=500, gt=0)
    start_time: str | None = None
    depot: tuple[float, float] | None = None
    max_stops: int = Field(default=25, ge=1, le=100)


class RouteOptimizeOutput(BaseModel):
    ordered_stops: list[dict]
    total_distance_km: float
    estimated_time_minutes: int
    capacity_utilization: float
    optimization_score: float
    unassigned_reasons: list[str] = []


class PriceSimulateRequest(BaseModel):
    product_id: str
    quantity: float = Field(gt=0)


class PriceQuoteOut(BaseModel):
    channel: str
    name: str
    farmer_settlement_per_kg: float
    logistics_cost_per_kg: float
    consumer_price_per_kg: float
    platform_fee_per_kg: float
    total_farmer_settlement: float
    notes: list[str] | None = None


class PriceSimulationOut(BaseModel):
    product_id: str
    quantity_kg: float
    baseline_price_per_kg: float
    quotes: list[PriceQuoteOut]
    best_channel: PriceQuoteOut
    summary: str
    simulation_id: str | None = None


class FoodLossAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_listing_id: str | None = None
    batch_id: str | None = None
    alert_type: str
    severity: str
    recommended_actions: list = []
    status: str
    created_at: datetime | None = None
    expires_at: datetime | None = None


class FoodLossAlertUpdate(BaseModel):
    status: str