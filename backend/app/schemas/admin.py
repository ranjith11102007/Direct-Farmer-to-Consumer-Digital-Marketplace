"""Admin dashboard schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MetricCard(BaseModel):
    label: str
    value: float | int
    change_percent: float | None = None
    unit: str | None = None


class DashboardMetrics(BaseModel):
    total_users: int
    total_farmers: int
    active_listings: int
    orders_today: int
    orders_pending: int
    total_gmv: float
    pending_settlements: float
    delivery_success_rate: float
    active_forecasts: int
    food_loss_alerts: int
    cards: list[MetricCard]


class VerificationQueueItem(BaseModel):
    user_id: str
    full_name: str
    role: str
    farmer_profile_id: str | None = None
    farm_name: str | None = None
    verification_status: str
    district: str | None = None
    submitted_at: datetime | None = None


class VerificationAction(BaseModel):
    user_id: str
    status: str
    notes: str | None = None


class AdminProductAction(BaseModel):
    listing_id: str
    action: str  # approve | pause | expire
    note: str | None = None


class SettlementAction(BaseModel):
    settlement_id: str
    action: str  # settle | hold | reverse
    note: str | None = None


class AnalyticsQuery(BaseModel):
    from_date: datetime | None = None
    to_date: datetime | None = None
    group_by: str = "day"  # day | week | month


class AnalyticsPoint(BaseModel):
    bucket: str
    value: float


class AnalyticsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    revenue: list[AnalyticsPoint] = []
    volume: list[AnalyticsPoint] = []
    top_products: list[dict] = []
    top_districts: list[dict] = []
    farmer_earnings: float = 0.0