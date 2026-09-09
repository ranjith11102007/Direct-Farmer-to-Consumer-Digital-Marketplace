"""AI/ML models: demand forecasts and recommendations."""
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
    Index,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ForecastPeriod(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class RecommendationType(str, enum.Enum):
    DEMAND_ALERT = "demand_alert"
    SHORTAGE_RISK = "shortage_risk"
    RESTOCK = "restock"
    ROUTE_OPTIMIZATION = "route_optimization"
    HARVEST_RESCUE = "harvest_rescue"
    PROCUREMENT_PLAN = "procurement_plan"


class Forecast(BaseModel):
    __tablename__ = "forecasts"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    district: Mapped[str] = mapped_column(String(100), index=True)
    forecast_date: Mapped[date] = mapped_column(Date, index=True)
    period: Mapped[ForecastPeriod] = mapped_column(
        Enum(ForecastPeriod, name="forecast_period_enum", native_enum=False),
        default=ForecastPeriod.WEEKLY,
        index=True,
    )
    predicted_demand: Mapped[float] = mapped_column(Float)
    confidence_lower: Mapped[float] = mapped_column(Float)
    confidence_upper: Mapped[float] = mapped_column(Float)
    factors_json: Mapped[dict | None] = mapped_column(JSON)
    model_version: Mapped[str] = mapped_column(String(30), index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    accuracy = relationship(
        "ForecastAccuracy", back_populates="forecast", uselist=False
    )

    __table_args__ = (
        Index("ix_forecast_product_district_date", "product_id", "district", "forecast_date"),
    )

    def __repr__(self) -> str:
        return f"<Forecast id={self.id} product={self.product_id} demand={self.predicted_demand}>"


class ForecastAccuracy(BaseModel):
    __tablename__ = "forecast_accuracy"

    forecast_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("forecasts.id", ondelete="CASCADE"), index=True
    )
    actual_demand: Mapped[float] = mapped_column(Float)
    mae: Mapped[float] = mapped_column(Float, default=0)
    rmse: Mapped[float] = mapped_column(Float, default=0)
    mape: Mapped[float] = mapped_column(Float, default=0)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    forecast = relationship("Forecast", back_populates="accuracy")

    def __repr__(self) -> str:
        return f"<ForecastAccuracy id={self.id} forecast={self.forecast_id} mape={self.mape}>"


class Recommendation(BaseModel):
    __tablename__ = "recommendations"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[RecommendationType] = mapped_column(
        Enum(RecommendationType, name="recommendation_type_enum", native_enum=False),
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255))
    title_tamil: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    message_tamil: Mapped[str | None] = mapped_column(Text)
    data_json: Mapped[dict | None] = mapped_column(JSON)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    location_district: Mapped[str | None] = mapped_column(String(100), index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<Recommendation id={self.id} type={self.type} title={self.title!r}>"