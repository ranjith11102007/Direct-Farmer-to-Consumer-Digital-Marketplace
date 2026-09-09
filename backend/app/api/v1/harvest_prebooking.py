"""Harvest pre-booking API routes."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep, require_farmer
from app.models.farmer import FarmerProfile
from app.models.harvest_prebooking import (
    HarvestPrebooking,
    PrebookingReservation,
    PrebookingStatus,
    ReservationStatus,
)
from app.schemas.common import ApiResponse
from app.utils.validators import ValidationError

router = APIRouter(prefix="/prebookings", tags=["Harvest Prebooking"])


class PrebookingCreate(BaseModel):
    product_id: str
    expected_harvest_date: date
    available_quantity: float = Field(gt=0)
    grade: str = "A"
    price_range_min: float = Field(gt=0)
    price_range_max: float = Field(gt=0)
    description: str | None = None
    deposit_required: bool = False


class ReservationCreate(BaseModel):
    prebooking_id: str
    quantity: float = Field(gt=0)
    agreed_price: float = Field(gt=0)


def _pb_dict(p: HarvestPrebooking) -> dict:
    return {
        "id": str(p.id),
        "farmer_id": str(p.farmer_id),
        "product_id": str(p.product_id),
        "expected_harvest_date": p.expected_harvest_date.isoformat(),
        "available_quantity": p.available_quantity,
        "grade": p.grade,
        "price_range_min": float(p.price_range_min),
        "price_range_max": float(p.price_range_max),
        "description": p.description,
        "deposit_required": p.deposit_required,
        "status": p.status.value if hasattr(p.status, "value") else p.status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _res_dict(r: PrebookingReservation) -> dict:
    return {
        "id": str(r.id),
        "prebooking_id": str(r.prebooking_id),
        "buyer_id": str(r.buyer_id),
        "quantity": r.quantity,
        "agreed_price": float(r.agreed_price),
        "deposit_paid": r.deposit_paid,
        "status": r.status.value if hasattr(r.status, "value") else r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/", response_model=ApiResponse[list[dict]])
async def list_prebookings(db: SessionDep, user: CurrentUser):
    rows = (await db.execute(select(HarvestPrebooking).order_by(HarvestPrebooking.expected_harvest_date))).scalars().unique().all()
    return ApiResponse(data=[_pb_dict(p) for p in rows])


@router.post("/", response_model=ApiResponse[dict], dependencies=[require_farmer])
async def create_prebooking(payload: PrebookingCreate, db: SessionDep, user: CurrentUser):
    profile = (
        await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create a farmer profile first.")
    if payload.price_range_min > payload.price_range_max:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="price_range_min exceeds price_range_max.")

    pb = HarvestPrebooking(
        farmer_id=profile.id,
        product_id=uuid.UUID(payload.product_id),
        expected_harvest_date=payload.expected_harvest_date,
        available_quantity=payload.available_quantity,
        grade=payload.grade,
        price_range_min=payload.price_range_min,
        price_range_max=payload.price_range_max,
        description=payload.description,
        deposit_required=payload.deposit_required,
    )
    db.add(pb)
    await db.commit()
    await db.refresh(pb)
    return ApiResponse(data=_pb_dict(pb), message="Pre-booking published.")


@router.get("/{prebooking_id}", response_model=ApiResponse[dict])
async def get_prebooking(prebooking_id: str, db: SessionDep, user: CurrentUser):
    pb = (await db.execute(select(HarvestPrebooking).where(HarvestPrebooking.id == uuid.UUID(prebooking_id)))).scalar_one_or_none()
    if pb is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Pre-booking not found")
    reserved = (
        await db.execute(select(PrebookingReservation).where(PrebookingReservation.prebooking_id == pb.id))
    ).scalars().all()
    data = _pb_dict(pb)
    data["reservations"] = [_res_dict(r) for r in reserved]
    return ApiResponse(data=data)


@router.post("/reserve", response_model=ApiResponse[dict])
async def reserve(payload: ReservationCreate, db: SessionDep, user: CurrentUser):
    pb = (await db.execute(select(HarvestPrebooking).where(HarvestPrebooking.id == uuid.UUID(payload.prebooking_id)))).scalar_one_or_none()
    if pb is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Pre-booking not found")

    statuses = {"accepting", "published"}
    current_status = pb.status.value if hasattr(pb.status, "value") else pb.status
    if current_status not in statuses:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Pre-booking is {current_status}.")

    existing_slots = (await db.execute(
        select(PrebookingReservation).where(PrebookingReservation.prebooking_id == pb.id)
    )).scalars().all()
    reserved_total = sum(r.quantity for r in existing_slots)
    if reserved_total + payload.quantity > pb.available_quantity:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Only {pb.available_quantity - reserved_total:g}kg remaining.",
        )
    if payload.agreed_price < float(pb.price_range_min) or payload.agreed_price > float(pb.price_range_max):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Agreed price must be between Rs {float(pb.price_range_min)} and Rs {float(pb.price_range_max)}.",
        )

    reservation = PrebookingReservation(
        prebooking_id=pb.id,
        buyer_id=user.id,
        quantity=payload.quantity,
        agreed_price=payload.agreed_price,
        deposit_paid=pb.deposit_required,
    )
    db.add(reservation)
    if reserved_total + payload.quantity >= pb.available_quantity:
        pb.status = PrebookingStatus.FULL
    await db.commit()
    await db.refresh(reservation)
    return ApiResponse(data=_res_dict(reservation), message="Reserved. Deposit " + ("paid." if pb.deposit_required else "not required."))


@router.post("/reservations/{reservation_id}/cancel", response_model=ApiResponse[dict])
async def cancel_reservation(reservation_id: str, db: SessionDep, user: CurrentUser):
    reservation = (
        await db.execute(
            select(PrebookingReservation).where(
                PrebookingReservation.id == uuid.UUID(reservation_id),
                PrebookingReservation.buyer_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if reservation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    if reservation.status in (ReservationStatus.FULFILLED, ReservationStatus.CANCELLED):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Reservation is {reservation.status.value}.")

    reservation.status = ReservationStatus.CANCELLED
    pb = (await db.execute(select(HarvestPrebooking).where(HarvestPrebooking.id == reservation.prebooking_id))).scalar_one()
    pb.status = PrebookingStatus.ACCEPTING
    await db.commit()
    await db.refresh(reservation)
    return ApiResponse(data=_res_dict(reservation), message="Reservation cancelled.")