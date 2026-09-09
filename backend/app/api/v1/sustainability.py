"""Sustainability metrics API routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import Order
from app.models.sustainability import SustainabilityRecord
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/sustainability", tags=["Sustainability"])


def _sus_dict(s: SustainabilityRecord) -> dict:
    return {
        "id": str(s.id),
        "order_id": str(s.order_id),
        "food_miles_km": s.food_miles_km,
        "delivery_distance_km": s.delivery_distance_km,
        "vehicle_utilization_percent": s.vehicle_utilization_percent,
        "packaging_type": s.packaging_type,
        "estimated_co2_kg": s.estimated_co2_kg,
        "local_purchase_percent": s.local_purchase_percent,
        "consolidated_delivery": s.consolidated_delivery,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/order/{order_id}", response_model=ApiResponse[dict])
async def order_metrics(order_id: str, db: SessionDep, user: CurrentUser):
    record = (
        await db.execute(
            select(SustainabilityRecord).where(SustainabilityRecord.order_id == uuid.UUID(order_id))
        )
    ).scalar_one_or_none()
    if record is None:
        record = await _build_for_order(db, uuid.UUID(order_id))
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    return ApiResponse(data=_sus_dict(record))


@router.get("/my-impact", response_model=ApiResponse[dict])
async def my_impact(db: SessionDep, user: CurrentUser):
    orders = (
        await db.execute(select(Order.id).where(Order.user_id == user.id))
    ).scalars().all()
    if not orders:
        return ApiResponse(data=_empty_impact())

    records = (
        await db.execute(
            select(SustainabilityRecord).where(SustainabilityRecord.order_id.in_(list(orders)))
        )
    ).scalars().all()

    addressable = len(orders)
    measured = len(records)
    food_miles = sum(r.food_miles_km for r in records)
    co2 = sum(r.estimated_co2_kg for r in records)
    local_pct = sum(r.local_purchase_percent for r in records) / measured if measured else 0
    avg_util = sum(r.vehicle_utilization_percent for r in records) / measured if measured else 0

    # Baseline comparator: fresh produce travels ~150km via conventional supply chain.
    conventional_co2 = food_miles * 0.08 if food_miles else 0
    saved_co2 = max(0.0, conventional_co2 - co2)

    return ApiResponse(data={
        "orders_measured": measured,
        "orders_addressable": addressable,
        "total_food_miles_km": round(food_miles, 2),
        "total_co2_kg": round(co2, 3),
        "co2_saved_kg": round(saved_co2, 3),
        "average_local_purchase_percent": round(local_pct, 2),
        "average_vehicle_utilization_percent": round(avg_util, 2),
        "equivalent_trees": int(saved_co2 / 21),
    })


@router.get("/leaderboard", response_model=ApiResponse[list[dict]])
async def leaderboard(
    db: SessionDep,
    user: CurrentUser,
    limit: int = Query(default=10, ge=1, le=50),
):
    rows = (
        await db.execute(
            select(SustainabilityRecord.order_id, func.sum(SustainabilityRecord.estimated_co2_kg).label("total_co2"))
            .group_by(SustainabilityRecord.order_id)
            .order_by("total_co2")
            .limit(limit)
        )
    ).all()
    items = []
    for row in rows:
        order = (await db.execute(select(Order).where(Order.id == row[0]))).scalar_one_or_none()
        items.append({
            "order_id": str(row[0]),
            "co2_kg": float(row[1]),
            "order_number": order.order_number if order else None,
        })
    return ApiResponse(data=items)


def _empty_impact() -> dict:
    return {
        "orders_measured": 0,
        "orders_addressable": 0,
        "total_food_miles_km": 0.0,
        "total_co2_kg": 0.0,
        "co2_saved_kg": 0.0,
        "average_local_purchase_percent": 100.0,
        "average_vehicle_utilization_percent": 0.0,
        "equivalent_trees": 0,
    }


async def _build_for_order(db, order_id: uuid.UUID) -> SustainabilityRecord | None:
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if order is None:
        return None

    existing = (
        await db.execute(select(SustainabilityRecord).where(SustainabilityRecord.order_id == order_id))
    ).scalar_one_or_none()
    if existing:
        return existing

    delivery = (
        await db.execute(select(Delivery).where(Delivery.order_id == order_id, Delivery.status == DeliveryStatus.DELIVERED))
    ).scalars().first()
    delivery_km = delivery.actual_distance_km or delivery.estimated_distance_km or 0.0

    food_miles = delivery_km + float(order.subtotal) if order.farmer_share_estimate else delivery_km
    co2 = food_miles * 0.08
    record = SustainabilityRecord(
        order_id=order.id,
        food_miles_km=round(food_miles, 2),
        delivery_distance_km=round(delivery_km, 2),
        vehicle_utilization_percent=70.0,
        packaging_type="reusable_crate",
        estimated_co2_kg=round(co2, 4),
        local_purchase_percent=100.0,
        consolidated_delivery=delivery_km > 0,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record