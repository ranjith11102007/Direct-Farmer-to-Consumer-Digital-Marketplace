"""Subscription API routes."""
from __future__ import annotations

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models.subscription import Subscription, SubscriptionSchedule
from app.schemas.common import ApiResponse
from app.utils.validators import ValidationError

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class SubscriptionCreate(BaseModel):
    product_listing_id: str | None = None
    category_id: str | None = None
    schedule_type: str = "weekly"
    quantity: float = 1.0
    delivery_address_json: dict
    delivery_slot: dict | None = None


class SubscriptionUpdate(BaseModel):
    schedule_type: str | None = None
    quantity: float | None = None
    delivery_address_json: dict | None = None
    delivery_slot: dict | None = None
    is_active: bool | None = None


class SubscriptionPause(BaseModel):
    pause: bool = True


def _sub_dict(s: Subscription) -> dict:
    return {
        "id": str(s.id),
        "user_id": str(s.user_id),
        "product_listing_id": str(s.product_listing_id) if s.product_listing_id else None,
        "category_id": str(s.category_id) if s.category_id else None,
        "schedule_type": s.schedule_type.value if hasattr(s.schedule_type, "value") else s.schedule_type,
        "quantity": s.quantity,
        "delivery_address_json": s.delivery_address_json,
        "delivery_slot": s.delivery_slot,
        "is_active": s.is_active,
        "next_delivery_date": s.next_delivery_date.isoformat() if s.next_delivery_date else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _next_date_for_schedule(schedule: SubscriptionSchedule, from_date: date | None = None) -> date:
    start = from_date or date.today()
    frequency = {
        SubscriptionSchedule.DAILY: 1,
        SubscriptionSchedule.ALTERNATE: 2,
        SubscriptionSchedule.WEEKLY: 7,
        SubscriptionSchedule.BIWEEKLY: 14,
        SubscriptionSchedule.MONTHLY: 30,
    }
    return start + timedelta(days=frequency[schedule])


@router.get("/", response_model=ApiResponse[list[dict]])
async def list_subscriptions(db: SessionDep, user: CurrentUser):
    rows = (
        await db.execute(
            select(Subscription).where(Subscription.user_id == user.id).order_by(Subscription.created_at.desc())
        )
    ).scalars().all()
    return ApiResponse(data=[_sub_dict(s) for s in rows])


@router.post("/", response_model=ApiResponse[dict])
async def create_subscription(payload: SubscriptionCreate, db: SessionDep, user: CurrentUser):
    if not payload.product_listing_id and not payload.category_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Provide a product_listing_id or category_id.")

    try:
        schedule = SubscriptionSchedule(payload.schedule_type)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid schedule type")

    sub = Subscription(
        user_id=user.id,
        product_listing_id=uuid.UUID(payload.product_listing_id) if payload.product_listing_id else None,
        category_id=uuid.UUID(payload.category_id) if payload.category_id else None,
        schedule_type=schedule,
        quantity=payload.quantity,
        delivery_address_json=payload.delivery_address_json,
        delivery_slot=payload.delivery_slot,
        is_active=True,
        next_delivery_date=_next_date_for_schedule(schedule),
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return ApiResponse(data=_sub_dict(sub), message="Subscription created.")


@router.put("/{subscription_id}", response_model=ApiResponse[dict])
async def update_subscription(subscription_id: str, payload: SubscriptionUpdate, db: SessionDep, user: CurrentUser):
    sub = (
        await db.execute(
            select(Subscription).where(Subscription.id == uuid.UUID(subscription_id), Subscription.user_id == user.id)
        )
    ).scalar_one_or_none()
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    for key, value in payload.model_dump(exclude_none=True).items():
        if key == "schedule_type":
            try:
                value = SubscriptionSchedule(value)
                sub.next_delivery_date = _next_date_for_schedule(value, sub.next_delivery_date)
            except ValueError:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid schedule type")
        setattr(sub, key, value)

    await db.commit()
    await db.refresh(sub)
    return ApiResponse(data=_sub_dict(sub), message="Subscription updated.")


@router.post("/{subscription_id}/pause", response_model=ApiResponse[dict])
async def pause_subscription(subscription_id: str, payload: SubscriptionPause, db: SessionDep, user: CurrentUser):
    sub = (
        await db.execute(
            select(Subscription).where(Subscription.id == uuid.UUID(subscription_id), Subscription.user_id == user.id)
        )
    ).scalar_one_or_none()
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    sub.is_active = not payload.pause
    await db.commit()
    await db.refresh(sub)
    return ApiResponse(data=_sub_dict(sub), message="Subscription paused." if not sub.is_active else "Subscription resumed.")


@router.delete("/{subscription_id}", response_model=ApiResponse[dict])
async def cancel_subscription(subscription_id: str, db: SessionDep, user: CurrentUser):
    sub = (
        await db.execute(
            select(Subscription).where(Subscription.id == uuid.UUID(subscription_id), Subscription.user_id == user.id)
        )
    ).scalar_one_or_none()
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    await db.delete(sub)
    await db.commit()
    return ApiResponse(data={"cancelled": True}, message="Subscription cancelled.")


@router.get("/next-due", response_model=ApiResponse[list[dict]])
async def next_due(db: SessionDep, user: CurrentUser):
    """Subscriptions due for the next 3 days."""
    rows = (
        await db.execute(
            select(Subscription).where(
                Subscription.user_id == user.id,
                Subscription.is_active.is_(True),
                Subscription.next_delivery_date <= date.today() + timedelta(days=3),
            )
        )
    ).scalars().all()
    return ApiResponse(data=[_sub_dict(s) for s in rows])