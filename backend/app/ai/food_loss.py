"""Food-loss early warning system.

Scores inventory for spoilage risk based on:
  - shelf-life remaining vs delivery lead time
  - demand forecast vs available quantity (surplus)
  - dispatch/pickup delays
  - active delivery bottlenecks
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.ai import Forecast
from app.models.batch import Batch, BatchStatus
from app.models.food_loss import (
    AlertStatus,
    AlertType,
    FoodLossAlert,
    SeverityLevel,
)
from app.models.product import ListingStatus, ProductListing


@dataclass
class RiskAssessment:
    listing_id: uuid.UUID
    alert_type: AlertType
    severity: SeverityLevel
    score: float
    reasons: list[str] = field(default_factory=list)
    recommended_actions: list[str] = field(default_factory=list)


class FoodLossDetector:
    """Evaluate listings and batches for near-term loss risk."""

    SHELF_LIFE_LEAD_OVERHEAD_DAYS = 2.0

    async def detect(
        self,
        db: AsyncSession,
        *,
        district: str | None = None,
        max_records: int = 200,
    ) -> list[RiskAssessment]:
        stmt = (
            select(ProductListing)
            .where(ProductListing.status == ListingStatus.ACTIVE)
            .order_by(ProductListing.expiry_date.asc())
            .limit(max_records)
        )
        if district:
            stmt = select(ProductListing).where(
                ProductListing.status == ListingStatus.ACTIVE,
                ProductListing.location_district == district,
            ).order_by(ProductListing.expiry_date.asc()).limit(max_records)

        listings = list((await db.execute(stmt)).scalars().unique().all())
        assessments: list[RiskAssessment] = []

        for listing in listings:
            risk = await self._assess_listing(db, listing)
            if risk is not None:
                assessments.append(risk)

        batch_risks = await self._assess_batches(db)
        assessments.extend(batch_risks)
        return assessments

    async def _assess_listing(self, db: AsyncSession, listing: ProductListing) -> RiskAssessment | None:
        reasons: list[str] = []
        actions: list[str] = []
        score = 0.0
        alert_type = AlertType.DELIVERY_BOTTLENECK
        severity = SeverityLevel.LOW

        # 1. Shelf-life window.
        if listing.expiry_date:
            days_remaining = (listing.expiry_date - date.today()).days
            if days_remaining <= 1:
                score += 40 if days_remaining <= 0 else 30
                alert_type = AlertType.LOW_SHELF_LIFE
                reasons.append(f"Expires in {days_remaining} day(s)")
                actions.append("Flash-sale or donate surplus immediately.")
            elif days_remaining <= 3:
                score += 15
                reasons.append(f"Only {days_remaining} days of shelf life remain")
                actions.append("Increase discount tier and prioritize dispatch.")

        # 2. Surplus vs forecast.
        forecast_value = await self._latest_forecast(db, listing.product_id, listing.location_district)
        stock = float(listing.available_quantity)
        if forecast_value and stock > forecast_value * 1.5:
            score += 20
            alert_type = AlertType.SURPLUS_PREDICTED
            reasons.append(f"Stock ({stock:g}kg) is >50% above forecast ({forecast_value:g}kg)")
            actions.append("Reduce price to accelerate demand or offer bulk deals.")

        # 3. Slow moving (high stock + old listing).
        if stock > 20 and listing.created_at.date() < date.today() - timedelta(days=5):
            score += 8
            reasons.append("Listing has not moved in 5+ days")
            actions.append("Feature banner + bundle with in-demand items.")

        # 4. Demand drop signal (via forecast).
        if forecast_value and stock < forecast_value * 2 and stock > forecast_value:
            score += 3

        if not reasons:
            return None

        severity = self._severity_for_score(score)
        return RiskAssessment(
            listing_id=listing.id,
            alert_type=alert_type,
            severity=severity,
            score=round(min(score, 100), 2),
            reasons=reasons,
            recommended_actions=actions,
        )

    async def _assess_batches(self, db: AsyncSession) -> list[RiskAssessment]:
        stale_batches = (
            await db.execute(
                select(Batch).where(
                    Batch.status.in_([BatchStatus.CREATED, BatchStatus.INSPECTED]),
                    Batch.created_at < datetime.now(timezone.utc) - timedelta(days=2),
                )
            )
        ).scalars().all()

        assessments: list[RiskAssessment] = []
        for batch in stale_batches:
            assessments.append(
                RiskAssessment(
                    listing_id=batch.id,
                    alert_type=AlertType.DELAYED_PICKUP,
                    severity=SeverityLevel.HIGH,
                    score=55.0,
                    reasons=["Batch unsold for 2+ days after creation"],
                    recommended_actions=["Dispatch to a collection center", "Reduce listing price"],
                )
            )
        return assessments

    @staticmethod
    async def _latest_forecast(db: AsyncSession, product_id: uuid.UUID, district: str | None) -> float | None:
        stmt = (
            select(Forecast)
            .where(Forecast.product_id == product_id)
            .order_by(Forecast.generated_at.desc())
        )
        if district:
            stmt = stmt.where(Forecast.district == district)
        forecast = (await db.execute(stmt.limit(3))).scalars().first()
        return float(forecast.predicted_demand) if forecast else None

    @staticmethod
    def _severity_for_score(score: float) -> SeverityLevel:
        if score >= 60:
            return SeverityLevel.CRITICAL
        if score >= 35:
            return SeverityLevel.HIGH
        if score >= 15:
            return SeverityLevel.MEDIUM
        return SeverityLevel.LOW


class FoodLossService:
    """Persist and manage food-loss alerts."""

    @staticmethod
    async def run_detection(
        db: AsyncSession,
        *,
        district: str | None = None,
    ) -> list[FoodLossAlert]:
        detector = FoodLossDetector()
        assessments = await detector.detect(db, district=district)

        created: list[FoodLossAlert] = []
        for a in assessments:
            alert = FoodLossAlert(
                product_listing_id=a.listing_id,
                alert_type=a.alert_type,
                severity=a.severity,
                recommended_actions=[*a.recommended_actions, {"reasons": a.reasons, "score": a.score}],
                status=AlertStatus.ACTIVE,
                expires_at=datetime.now(timezone.utc) + timedelta(days=3),
            )
            db.add(alert)
            created.append(alert)

        if created:
            await db.commit()
            for alert in created:
                await db.refresh(alert)
        return created

    @staticmethod
    async def list_alerts(
        db: AsyncSession,
        *,
        status: AlertStatus | None = None,
        severity: SeverityLevel | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = select(FoodLossAlert).order_by(FoodLossAlert.created_at.desc())
        if status:
            stmt = stmt.where(FoodLossAlert.status == status)
        if severity:
            stmt = stmt.where(FoodLossAlert.severity == severity)
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def update_status(
        db: AsyncSession,
        alert: FoodLossAlert,
        status: AlertStatus,
    ) -> FoodLossAlert:
        alert.status = status
        await db.commit()
        await db.refresh(alert)
        return alert