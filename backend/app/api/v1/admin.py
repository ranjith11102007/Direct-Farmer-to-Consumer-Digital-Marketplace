"""Admin API routes: dashboard, verification, moderation, settlements, analytics."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, SessionDep, require_admin
from app.models.ai import Forecast
from app.models.batch import Batch
from app.models.delivery import Delivery, DeliveryStatus
from app.models.farmer import FarmerProfile
from app.models.food_loss import FoodLossAlert
from app.models.order import Order, OrderStatus, Settlement, SettlementStatus
from app.models.product import ProductListing, ListingStatus
from app.models.user import User, UserRole, VerificationStatus
from app.schemas.admin import (
    AnalyticsOut,
    AnalyticsPoint,
    DashboardMetrics,
    MetricCard,
    SettlementAction,
    VerificationAction,
    VerificationQueueItem,
)
from app.schemas.common import ApiResponse
from app.services.settlement import SettlementService

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[require_admin])


@router.get("/dashboard", response_model=ApiResponse[DashboardMetrics])
async def dashboard(db: SessionDep, user: CurrentUser):
    today = datetime.now(timezone.utc).date()
    start_today = today - timedelta(days=1)

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_farmers = (await db.execute(
        select(func.count()).select_from(FarmerProfile)
    )).scalar_one()
    active_listings = (await db.execute(
        select(func.count(ProductListing.id)).where(ProductListing.status == ListingStatus.ACTIVE)
    )).scalar_one()
    orders_today = (await db.execute(
        select(func.count(Order.id)).where(func.date(Order.created_at) == today)
    )).scalar_one()
    orders_pending = (await db.execute(
        select(func.count(Order.id)).where(
            Order.status.in_([OrderStatus.PENDING, OrderStatus.CONFIRMED])
        )
    )).scalar_one()

    gmv = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED])
        )
    )).scalar_one()

    pending_settlements = (await db.execute(
        select(func.coalesce(func.sum(Settlement.net_settlement), 0)).where(
            Settlement.status == SettlementStatus.PENDING
        )
    )).scalar_one()

    delivered = (await db.execute(
        select(func.count(Delivery.id)).where(Delivery.status == DeliveryStatus.DELIVERED)
    )).scalar_one()
    total_deliveries = (await db.execute(select(func.count(Delivery.id)))).scalar_one()
    success_rate = (delivered / total_deliveries * 100) if total_deliveries else 100.0

    forecasts = (await db.execute(select(func.count(Forecast.id)))).scalar_one()
    alerts = (await db.execute(select(func.count(FoodLossAlert.id)).where(FoodLossAlert.status == "active"))).scalar_one()

    cards = [
        MetricCard(label="Total users", value=total_users),
        MetricCard(label="Farmers", value=total_farmers),
        MetricCard(label="Active listings", value=active_listings),
        MetricCard(label="Orders today", value=orders_today),
        MetricCard(label="Pending orders", value=orders_pending),
        MetricCard(label="Gross market value (Rs)", value=float(gmv)),
        MetricCard(label="Pending settlements (Rs)", value=float(pending_settlements)),
        MetricCard(label="Delivery success rate", value=round(success_rate, 2), unit="%"),
        MetricCard(label="Active forecasts", value=forecasts),
        MetricCard(label="Food loss alerts", value=alerts),
    ]
    metrics = DashboardMetrics(
        total_users=total_users,
        total_farmers=total_farmers,
        active_listings=active_listings,
        orders_today=orders_today,
        orders_pending=orders_pending,
        total_gmv=float(gmv),
        pending_settlements=float(pending_settlements),
        delivery_success_rate=round(success_rate, 2),
        active_forecasts=forecasts,
        food_loss_alerts=alerts,
        cards=cards,
    )
    return ApiResponse(data=metrics.model_dump())


# ---------- Verification queue ----------

@router.get("/verifications", response_model=ApiResponse[list[VerificationQueueItem]])
async def verification_queue(
    db: SessionDep,
    user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status"),
):
    stmt = (
        select(User, FarmerProfile.id, FarmerProfile.farm_name, FarmerProfile.district)
        .join(FarmerProfile, FarmerProfile.user_id == User.id)
        .where(
            User.role.in_([UserRole.FARMER, UserRole.FPO_ADMIN]),
        )
        .order_by(User.updated_at.desc())
    )
    if status_filter:
        try:
            VerificationStatus(status_filter)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid status")
        stmt = stmt.where(User.verification_status == status_filter)

    rows = (await db.execute(stmt)).all()
    items = [
        VerificationQueueItem(
            user_id=str(u.id),
            full_name=u.full_name,
            role=u.role.value,
            farmer_profile_id=str(farmer_id) if farmer_id else None,
            farm_name=farm_name,
            verification_status=u.verification_status.value if hasattr(u.verification_status, "value") else u.verification_status,
            district=district,
            submitted_at=u.updated_at,
        )
        for u, farmer_id, farm_name, district in rows
    ]
    return ApiResponse(data=[i.model_dump() for i in items])


@router.post("/verifications/{user_id}", response_model=ApiResponse[dict])
async def handle_verification(user_id: str, payload: VerificationAction, db: SessionDep, user: CurrentUser):
    try:
        status_enum = VerificationStatus(payload.status)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    if status_enum not in (VerificationStatus.VERIFIED, VerificationStatus.REJECTED,
                           VerificationStatus.UNDER_REVIEW, VerificationStatus.RE_VERIFICATION_REQUIRED):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid status for admin action")

    user = (await db.execute(select(User).where(User.id == uuid.UUID(user_id)))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")

    user.verification_status = status_enum
    if status_enum == VerificationStatus.VERIFIED:
        user.is_verified = True
        await db.execute(
            FarmerProfile.__table__.update().where(FarmerProfile.user_id == user.id).values(
                verification_status=VerificationStatus.VERIFIED.value
            )
        )
    elif status_enum == VerificationStatus.REJECTED:
        await db.execute(
            FarmerProfile.__table__.update().where(FarmerProfile.user_id == user.id).values(
                verification_status=VerificationStatus.REJECTED.value
            )
        )

    await db.commit()
    return ApiResponse(data={"user_id": str(user.id), "verification_status": status_enum.value}, message="Verification updated.")


# ---------- Product moderation ----------

@router.get("/listings", response_model=ApiResponse[list])
async def all_listings(db: SessionDep, user: CurrentUser, status_filter: str | None = Query(default=None, alias="status")):
    stmt = select(ProductListing).order_by(ProductListing.created_at.desc())
    if status_filter:
        stmt = stmt.where(ProductListing.status == status_filter)
    rows = (await db.execute(stmt)).scalars().unique().all()
    return ApiResponse(data=[
        {
            "id": str(l.id),
            "product_id": str(l.product_id),
            "producer_id": str(l.producer_id),
            "price_per_unit": float(l.price_per_unit),
            "available_quantity": float(l.available_quantity),
            "status": l.status.value if hasattr(l.status, "value") else l.status,
            "organic_certified": l.organic_certified,
            "location_district": l.location_district,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in rows
    ])


@router.post("/listings/{listing_id}/{action}", response_model=ApiResponse[dict])
async def moderate_listing(listing_id: str, action: str, db: SessionDep, user: CurrentUser):
    listing = (
        await db.execute(select(ProductListing).where(ProductListing.id == uuid.UUID(listing_id)))
    ).scalar_one_or_none()
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Listing not found")

    mapping = {"approve": ListingStatus.ACTIVE, "pause": ListingStatus.PAUSED, "expire": ListingStatus.EXPIRED}
    if action not in mapping:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid action")

    listing.status = mapping[action]
    await db.commit()
    return ApiResponse(data={"listing_id": str(listing.id), "status": listing.status.value}, message="Listing updated.")


# ---------- Settlements ----------

@router.get("/settlements", response_model=ApiResponse[list])
async def all_settlements(db: SessionDep, user: CurrentUser, status_filter: str | None = Query(default=None, alias="status")):
    stmt = select(Settlement).order_by(Settlement.created_at.desc())
    if status_filter:
        stmt = stmt.where(Settlement.status == status_filter)
    rows = (await db.execute(stmt)).scalars().unique().all()
    return ApiResponse(data=[
        {
            "id": str(s.id),
            "order_id": str(s.order_id),
            "farmer_id": str(s.farmer_id),
            "amount": float(s.amount),
            "net_settlement": float(s.net_settlement),
            "status": s.status.value if hasattr(s.status, "value") else s.status,
        }
        for s in rows
    ])


@router.post("/settlements/{settlement_id}", response_model=ApiResponse[dict])
async def handle_settlement(settlement_id: str, payload: SettlementAction, db: SessionDep, user: CurrentUser):
    settlement = (
        await db.execute(select(Settlement).where(Settlement.id == uuid.UUID(settlement_id)))
    ).scalar_one_or_none()
    if settlement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Settlement not found")

    try:
        if payload.action == "settle":
            await SettlementService.mark_paid(db, settlement)
        elif payload.action == "hold":
            await SettlementService.hold(db, settlement)
        elif payload.action == "reverse":
            await SettlementService.update_status(db, settlement, SettlementStatus.REVERSED, settled_at=False)
        else:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid action")
    except Exception as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    return ApiResponse(
        data={"settlement_id": str(settlement.id), "status": settlement.status.value if hasattr(settlement.status, "value") else settlement.status},
        message="Settlement updated.",
    )


@router.post("/settlements/payout-all", response_model=ApiResponse[dict])
async def payout_all(db: SessionDep, user: CurrentUser):
    count = await SettlementService.payout_all_due(db)
    return ApiResponse(data={"settled": count}, message="Bulk payout completed.")


# ---------- Analytics ----------

@router.get("/analytics", response_model=ApiResponse[AnalyticsOut])
async def analytics(
    db: SessionDep,
    user: CurrentUser,
    days: int = Query(default=30, ge=1, le=365),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    revenue_rows = (await db.execute(
        select(func.date_trunc("day", Order.created_at), func.sum(Order.total))
        .where(Order.created_at >= cutoff, Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED]))
        .group_by(func.date_trunc("day", Order.created_at))
        .order_by(func.date_trunc("day", Order.created_at))
    )).all()

    volume_rows = (await db.execute(
        select(func.date_trunc("day", Order.created_at), func.count(Order.id))
        .where(Order.created_at >= cutoff)
        .group_by(func.date_trunc("day", Order.created_at))
        .order_by(func.date_trunc("day", Order.created_at))
    )).all()

    top_products = (await db.execute(
        select(ProductListing.product_id, func.sum(OrderItem.total_price))
        .join(OrderItem, OrderItem.product_listing_id == ProductListing.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= cutoff, Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED]))
        .group_by(ProductListing.product_id)
        .order_by(func.sum(OrderItem.total_price).desc())
        .limit(10)
    )).all()

    top_districts = (await db.execute(
        select(ProductListing.location_district, func.sum(OrderItem.total_price))
        .join(OrderItem, OrderItem.product_listing_id == ProductListing.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= cutoff, Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED]))
        .group_by(ProductListing.location_district)
        .order_by(func.sum(OrderItem.total_price).desc())
        .limit(10)
    )).all()

    farmer_earnings = (await db.execute(
        select(func.coalesce(func.sum(Settlement.net_settlement), 0)).where(
            Settlement.status == SettlementStatus.SETTLED
        )
    )).scalar_one()

    out = AnalyticsOut(
        revenue=[AnalyticsPoint(bucket=str(bucket)[:10], value=float(float(value)) if value else 0.0) for bucket, value in revenue_rows],
        volume=[AnalyticsPoint(bucket=str(bucket)[:10], value=float(value)) for bucket, value in volume_rows],
        top_products=[{"product_id": str(pid), "revenue": float(float(total))} for pid, total in top_products],
        top_districts=[{"district": district, "revenue": float(float(total))} for district, total in top_districts],
        farmer_earnings=float(farmer_earnings),
    )
    return ApiResponse(data=out.model_dump())