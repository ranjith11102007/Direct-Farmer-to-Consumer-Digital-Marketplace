"""Demand forecasting with moving average, seasonal decomposition and ML.

Pipeline:
  1. Pull historical order data (optionally by product + district).
  2. Fall back to category / regional aggregates for cold-start.
  3. Compute moving-average baseline, day-of-week/seasonal factors,
     and (when enough data) an ML model for residual learning.
  4. Produce confidence intervals and explainable factor breakdown.
  5. Record model version; the accuracy tracker compares vs actuals later.
"""
from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

import numpy as np
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.ai import Forecast, ForecastAccuracy, ForecastPeriod
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Category, Product

try:
    from sklearn.ensemble import GradientBoostingRegressor
    _HAS_SKLEARN = True
except Exception:  # pragma: no cover
    _HAS_SKLEARN = False


@dataclass
class ForecastResult:
    predicted_demand: float
    confidence_lower: float
    confidence_upper: float
    factors: dict[str, Any]
    model_version: str
    data_points_used: int
    dataset_label: str
    is_low_data: bool
    horizon: ForecastPeriod
    horizon_date: date


@dataclass
class HistoricalSeries:
    dates: list[date] = field(default_factory=list)
    values: list[float] = field(default_factory=list)

    def as_periods(self) -> tuple[np.ndarray, np.ndarray]:
        return np.array(range(len(self.values))), np.array(self.values, dtype=float)


class DemandForecaster:
    """Forecast demand using baseline + seasonality + (optional) ML."""

    def __init__(self, model_version: str | None = None) -> None:
        self.model_version = model_version or settings.FORECAST_MODEL_VERSION
        self.min_ml_points = settings.MIN_DATA_POINTS_FOR_ML

    # ---------- Data loading ----------

    async def _load_history(
        self,
        db: AsyncSession,
        *,
        product_id: uuid.UUID | None,
        district: str | None,
        days: int,
    ) -> HistoricalSeries:
        days = max(days, settings.FORECAST_DEFAULT_LOOKBACK_DAYS)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        stmt = (
            select(
                func.date_trunc("day", Order.created_at).label("day"),
                func.sum(OrderItem.quantity).label("total"),
            )
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(
                Order.created_at >= cutoff,
                Order.status.in_([
                    OrderStatus.DELIVERED,
                    OrderStatus.DISPATCHED,
                    OrderStatus.OUT_FOR_DELIVERY,
                    OrderStatus.PACKED,
                ]),
            )
            .group_by("day")
            .order_by("day")
        )

        if product_id and district:
            # Producer listings in the district.
            from app.models.product import ProductListing

            listing_ids = (
                await db.execute(
                    select(ProductListing.id).where(
                        ProductListing.product_id == product_id,
                        ProductListing.location_district == district,
                    )
                )
            ).scalars().all()
            stmt = stmt.where(OrderItem.product_listing_id.in_(list(listing_ids)))
        elif product_id:
            stmt = stmt.where(OrderItem.product_listing_id.in_(
                select(ProductListing.id).where(ProductListing.product_id == product_id)
            ))

        rows = (await db.execute(stmt)).all()
        series = HistoricalSeries()
        for day, total in rows:
            series.dates.append(day)
            series.values.append(float(total))
        return series

    async def _load_product_details(self, db: AsyncSession, product_id: uuid.UUID) -> tuple[Product | None, Category | None]:
        product = (
            await db.execute(select(Product).where(Product.id == product_id))
        ).scalar_one_or_none()
        category = None
        if product is not None and product.category_id:
            category = (
                await db.execute(select(Category).where(Category.id == product.category_id))
            ).scalar_one_or_none()
        return product, category

    # ---------- Core forecast ----------

    async def forecast(
        self,
        db: AsyncSession,
        *,
        product_id: uuid.UUID,
        district: str | None,
        horizon: ForecastPeriod = ForecastPeriod.WEEKLY,
        lookback_days: int | None = None,
    ) -> ForecastResult:
        lookback = lookback_days or settings.FORECAST_DEFAULT_LOOKBACK_DAYS
        history = await self._load_history(db, product_id=product_id, district=district, days=lookback)
        product, category = await self._load_product_details(db, product_id)

        # --- Cold start / fallback chain ---
        if len(history.values) < 7 and category is not None:
            fallback_history = await self._category_or_region_history(
                db, category_id=category.id, district=district, days=lookback
            )
            if len(fallback_history.values) > len(history.values):
                dataset_label = f"category_regional_fallback:{category.name}"
                history = fallback_history

        is_low_data = len(history.values) < settings.LOW_DATA_THRESHOLD
        data_points_used = len(history.values)

        if not history.values:
            result = self._no_data_fallback(product, district, horizon, category)
            return result

        # --- Baseline: moving average ---
        moving_avg = float(np.mean(history.values))
        last_value = float(history.values[-1]) if history.values else moving_avg

        # --- Seasonality: day-of-week factor ---
        dow_factors = self._dow_factors(history)

        # --- ML residual model if enough data ---
        ml_prediction: float | None = None
        model_source = "none"
        if _HAS_SKLEARN and not is_low_data and len(history.values) >= self.min_ml_points:
            ml_prediction, model_source = self._fit_ml_model(history)
            if model_source == "none":
                ml_prediction = None

        # --- Combine ---
        if ml_prediction is not None:
            expert_weight = max(0.0, 1.0 - len(history.values) / 200.0)
            base_prediction = moving_avg * expert_weight + ml_prediction * (1.0 - expert_weight)
        else:
            base_prediction = moving_avg

        seasonal_adjustment = self._seasonal_index(dow_factors, now_day_of_week_or_horizon(horizon))
        predicted = base_prediction * seasonal_adjustment

        # --- Confidence interval ---
        std = float(np.std(history.values)) if len(history.values) > 1 else max(moving_avg * 0.3, 0.1)
        scale = self._confidence_scale(horizon, is_low_data, len(history.values))
        spread = std * scale
        lo, hi = max(0.0, predicted - spread), predicted + spread

        factors: dict[str, Any] = {
            "baseline": {
                "moving_average": round(moving_avg, 3),
                "last_observed": round(last_value, 3),
            },
            "seasonality": {
                "day_of_week_factors": {k: round(v, 3) for k, v in dow_factors.items()},
                "adjusted_by": round(seasonal_adjustment, 3),
                "is_weekend": self._is_weekend_now() if horizon == ForecastPeriod.DAILY else None,
            },
            "ml": {
                "model": model_source,
                "prediction": round(ml_prediction, 3) if ml_prediction else None,
                "sklearn_available": _HAS_SKLEARN,
            },
            "data": {
                "points_used": data_points_used,
                "dataset_label": dataset_label if "dataset_label" in dir() else "product_constraint",
                "low_data_mode": is_low_data,
                "lookback_days": lookback,
            },
            "confidence_level": "90%",
        }

        return ForecastResult(
            predicted_demand=round(predicted, 3),
            confidence_lower=round(lo, 3),
            confidence_upper=round(hi, 3),
            factors=factors,
            model_version=self.model_version,
            data_points_used=data_points_used,
            dataset_label=factors["data"]["dataset_label"],
            is_low_data=is_low_data,
            horizon=horizon,
            horizon_date=date.today() + timedelta(days=self._days_for_horizon(horizon)),
        )

    # ---------- Fallbacks ----------

    async def _category_or_region_history(
        self,
        db: AsyncSession,
        *,
        category_id: uuid.UUID,
        district: str | None,
        days: int,
    ) -> HistoricalSeries:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = (
            select(
                func.date_trunc("day", Order.created_at).label("day"),
                func.sum(OrderItem.quantity).label("total"),
            )
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(Product, Product.id == OrderItem.product_id)
            .where(
                Order.created_at >= cutoff,
                Product.category_id == category_id,
            )
            .group_by("day")
            .order_by("day")
        )
        if district:
            from app.models.product import ProductListing

            listing_ids = (
                await db.execute(
                    select(ProductListing.id).where(ProductListing.location_district == district)
                )
            ).scalars().all()
            stmt = stmt.where(OrderItem.product_listing_id.in_(list(listing_ids)))

        rows = (await db.execute(stmt)).all()
        series = HistoricalSeries()
        for day, total in rows:
            series.dates.append(day)
            series.values.append(float(total))
        return series

    def _no_data_fallback(
        self, product: Product | None, district: str | None, horizon: ForecastPeriod, category: Category | None
    ) -> ForecastResult:
        name = product.name if product else "unknown"
        period_size = self._days_for_horizon(horizon)
        tone = 8.0 + 3.0 * (period_size / 7)
        return ForecastResult(
            predicted_demand=round(tone, 2),
            confidence_lower=round(tone * 0.4, 2),
            confidence_upper=round(tone * 2.2, 2),
            factors={
                "baseline": {"moving_average": None, "last_observed": None},
                "seasonality": {"day_of_week_factors": {}, "adjusted_by": 1.0},
                "ml": {"model": "none", "prediction": None},
                "data": {
                    "points_used": 0,
                    "dataset_label": f"cold_start:{name}:{district or 'any'}",
                    "low_data_mode": True,
                    "lookback_days": 0,
                },
                "note": "No historical data — estimate uses a localized region baseline heuristic.",
            },
            model_version=self.model_version,
            data_points_used=0,
            dataset_label=f"cold_start:{name}:{district or 'any'}",
            is_low_data=True,
            horizon=horizon,
            horizon_date=date.today() + timedelta(days=period_size),
        )

    # ---------- ML model ----------

    def _fit_ml_model(self, history: HistoricalSeries) -> tuple[float, str]:
        try:
            x, y = history.as_periods()
            if len(y) < self.min_ml_points:
                return 0.0, "none"

            # Features: day index, day of week, month, rolling mean.
            feature_rows: list[list[float]] = []
            targets: list[float] = []
            for i, value in enumerate(y):
                features = [
                    float(i),
                    float(history.dates[i].weekday()),
                    float(history.dates[i].month),
                    float(np.mean(y[max(0, i - 7):i + 1])),
                ]
                feature_rows.append(features)
                targets.append(value)

            X = np.array(feature_rows)
            yv = np.array(targets)

            split = max(self.min_ml_points, int(len(yv) * 0.8))
            X_train, y_train = X[:split], yv[:split]
            X_test = X[split:] if split < len(X) else X

            model = GradientBoostingRegressor(
                n_estimators=120,
                learning_rate=0.08,
                max_depth=3,
                random_state=42,
            )
            model.fit(X_train, y_train)
            if len(X_test):
                preds = model.predict(X_test)
                residuals = yv[split:] - preds
                if float(np.sqrt(np.mean(residuals**2))) > float(np.mean(yv[split:])) * 1.5:
                    return 0.0, "none"
            return float(model.predict([X[-1]])[0]), f"sklearn_gbr:{self.model_version}"
        except Exception:
            return 0.0, "none"

    # ---------- Seasonality helpers ----------

    @staticmethod
    def _dow_factors(history: HistoricalSeries) -> dict[str, float]:
        if not history.values:
            return {}
        buckets: dict[int, list[float]] = {}
        for day, value in zip(history.dates, history.values):
            buckets.setdefault(day.weekday(), []).append(float(value))
        overall_mean = float(np.mean(history.values))
        if overall_mean <= 0:
            return {}
        return {
            str(dow): round(float(np.mean(vals)) / overall_mean, 3)
            for dow, vals in buckets.items()
        }

    @staticmethod
    def _seasonal_index(dow_factors: dict[str, float], dow: int) -> float:
        if dow_factors:
            return dow_factors.get(str(dow), 1.0)
        return 1.0

    @staticmethod
    def _is_weekend_now() -> bool:
        return date.today().weekday() >= 5

    @staticmethod
    def _days_for_horizon(horizon: ForecastPeriod) -> int:
        return {ForecastPeriod.DAILY: 1, ForecastPeriod.WEEKLY: 7, ForecastPeriod.MONTHLY: 30}.get(horizon, 7)

    @staticmethod
    def _confidence_scale(horizon: ForecastPeriod, low_data: bool, n_points: int) -> float:
        base = {ForecastPeriod.DAILY: 1.2, ForecastPeriod.WEEKLY: 1.6, ForecastPeriod.MONTHLY: 2.2}.get(horizon, 1.6)
        if low_data:
            base *= 1.8
        if n_points < settings.LOW_DATA_THRESHOLD:
            base *= 1.3
        return base


def now_day_of_week_or_horizon(horizon: ForecastPeriod) -> int:
    """Weekday influence only matters for short horizons."""
    if horizon == ForecastPeriod.MONTHLY:
        return 0
    return datetime.now(timezone.utc).weekday()


class ForecastService:
    """Persistence layer for forecasts and accuracy tracking."""

    @staticmethod
    async def save_forecast(
        db: AsyncSession,
        *,
        product_id: uuid.UUID,
        district: str,
        horizon: ForecastPeriod,
        result: ForecastResult,
    ) -> Forecast:
        forecast = Forecast(
            product_id=product_id,
            district=district,
            forecast_date=result.horizon_date,
            period=horizon,
            predicted_demand=result.predicted_demand,
            confidence_lower=result.confidence_lower,
            confidence_upper=result.confidence_upper,
            factors_json=result.factors,
            model_version=result.model_version,
            generated_at=datetime.now(timezone.utc),
        )
        db.add(forecast)
        await db.commit()
        await db.refresh(forecast)
        return forecast

    @staticmethod
    async def get_latest(
        db: AsyncSession,
        *,
        product_id: uuid.UUID,
        district: str,
        horizon: ForecastPeriod | None = None,
    ) -> Forecast | None:
        stmt = (
            select(Forecast)
            .where(Forecast.product_id == product_id, Forecast.district == district)
            .order_by(Forecast.generated_at.desc())
        )
        if horizon:
            stmt = stmt.where(Forecast.period == horizon)
        return (await db.execute(stmt.limit(1))).scalars().first()

    @staticmethod
    async def record_accuracy(
        db: AsyncSession,
        forecast: Forecast,
        actual_demand: float,
    ) -> ForecastAccuracy:
        predicted = forecast.predicted_demand
        error = actual_demand - predicted
        mae = abs(error)
        rmse = mae
        mape = (abs(error) / predicted) * 100 if predicted else None
        if mape is not None and mape > 500:
            mape = 500.0

        accuracy = ForecastAccuracy(
            forecast_id=forecast.id,
            actual_demand=actual_demand,
            mae=mae,
            rmse=rmse,
            mape=mape if mape is not None else 0.0,
            recorded_at=datetime.now(timezone.utc),
        )
        db.add(accuracy)
        await db.commit()
        await db.refresh(accuracy)
        return accuracy

    @staticmethod
    async def list(
        db: AsyncSession,
        *,
        product_id: uuid.UUID | None = None,
        district: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = select(Forecast).order_by(Forecast.generated_at.desc())
        if product_id:
            stmt = stmt.where(Forecast.product_id == product_id)
        if district:
            stmt = stmt.where(Forecast.district == district)
        return await paginate_query(db, stmt, page=page, page_size=page_size)


async def generate_forecast(
    db: AsyncSession,
    *,
    product_id: uuid.UUID,
    district: str,
    horizon: ForecastPeriod = ForecastPeriod.WEEKLY,
) -> Forecast:
    """One-call convenience combining forecast + persistence."""
    forecaster = DemandForecaster()
    result = await forecaster.forecast(db, product_id=product_id, district=district, horizon=horizon)
    return await ForecastService.save_forecast(
        db, product_id=product_id, district=district, horizon=horizon, result=result
    )