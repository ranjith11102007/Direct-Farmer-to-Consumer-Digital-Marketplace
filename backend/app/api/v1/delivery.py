"""Delivery partner API routes."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import (
    CurrentUser,
    SessionDep,
    require_delivery_partner,
)
from app.models.delivery import Delivery, DeliveryPartner, DeliveryStatus, Route
from app.schemas.delivery import (
    DeliveryOut,
    DeliveryStatusUpdate,
    PartnerOut,
    PartnerRegisterRequest,
    RouteOut,
)
from app.schemas.common import ApiResponse
from app.services.delivery import DeliveryService
from app.utils.validators import ValidationError

router = APIRouter(prefix="/delivery", tags=["Delivery"])


def _err(exc: Exception) -> HTTPException:
    if isinstance(exc, ValidationError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


async def _partner_for_user(db, user) -> DeliveryPartner | None:
    return await DeliveryService.get_partner_by_user(db, user.id)


@router.post("/partner/register", response_model=ApiResponse[PartnerOut], dependencies=[require_delivery_partner])
async def register_partner(payload: PartnerRegisterRequest, db: SessionDep, user: CurrentUser):
    try:
        partner = await DeliveryService.register_partner(
            db,
            user_id=user.id,
            vehicle_type=payload.vehicle_type,
            license_number=payload.license_number,
            service_areas=payload.service_areas,
            vehicle_number=payload.vehicle_number,
        )
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=PartnerOut.model_validate(partner).model_dump(mode="json"), message="Partner registered.")


@router.get("/partner/profile", response_model=ApiResponse[PartnerOut], dependencies=[require_delivery_partner])
async def partner_profile(db: SessionDep, user: CurrentUser):
    partner = await _partner_for_user(db, user)
    if partner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Register as a delivery partner first.")
    return ApiResponse(data=PartnerOut.model_validate(partner).model_dump(mode="json"))


@router.get("/assigned", response_model=ApiResponse[list[DeliveryOut]], dependencies=[require_delivery_partner])
async def assigned_deliveries(db: SessionDep, user: CurrentUser):
    partner = await _partner_for_user(db, user)
    if partner is None:
        return ApiResponse(data=[])
    deliveries = await DeliveryService.list_for_partner(db, partner.id, active_only=True)
    return ApiResponse(data=[DeliveryOut.model_validate(d).model_dump(mode="json") for d in deliveries])


@router.get("/assigned/{delivery_id}", response_model=ApiResponse[DeliveryOut], dependencies=[require_delivery_partner])
async def delivery_detail(delivery_id: str, db: SessionDep, user: CurrentUser):
    partner = await _partner_for_user(db, user)
    try:
        delivery = (
            await db.execute(
                select(Delivery).where(
                    Delivery.id == uuid.UUID(delivery_id),
                    Delivery.partner_id == (partner.id if partner else uuid.UUID(int=0)),
                )
            )
        ).scalar_one_or_none()
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid delivery id")
    if delivery is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Delivery not found or not assigned to you")
    return ApiResponse(data=DeliveryOut.model_validate(delivery).model_dump(mode="json"))


@router.post("/{delivery_id}/status", response_model=ApiResponse[DeliveryOut], dependencies=[require_delivery_partner])
async def update_status(delivery_id: str, payload: DeliveryStatusUpdate, db: SessionDep, user: CurrentUser):
    partner = await _partner_for_user(db, user)
    if partner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Partner profile not found")
    delivery = (
        await db.execute(select(Delivery).where(Delivery.id == uuid.UUID(delivery_id)))
    ).scalar_one_or_none()
    if delivery is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Delivery not found")

    try:
        delivery = await DeliveryService.update_delivery_status(
            db,
            delivery,
            DeliveryStatus(payload.status),
            partner_id=partner.id,
            notes=payload.notes,
        )
    except ValueError as exc:
        raise _err(ValidationError(str(exc)))
    return ApiResponse(data=DeliveryOut.model_validate(delivery).model_dump(mode="json"), message="Status updated.")


@router.post("/route/build", response_model=ApiResponse[RouteOut], dependencies=[require_delivery_partner])
async def build_route(
    db: SessionDep,
    user: CurrentUser,
    target_date: date | None = Query(default=None),
):
    partner = await _partner_for_user(db, user)
    if partner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Partner profile not found")
    route, deliveries, error = await DeliveryService.build_daily_route(
        db, partner_id=partner.id, target_date=target_date
    )
    if error:
        raise _err(error)
    return ApiResponse(data=RouteOut.model_validate(route).model_dump(mode="json"), message="Route generated.")


@router.get("/route/today", response_model=ApiResponse[RouteOut | None], dependencies=[require_delivery_partner])
async def today_route(db: SessionDep, user: CurrentUser):
    partner = await _partner_for_user(db, user)
    if partner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Partner profile not found")
    route = (
        await db.execute(
            select(Route)
            .where(Route.delivery_partner_id == partner.id, Route.date == date.today())
            .order_by(Route.created_at.desc())
        )
    ).scalars().first()
    if route is None:
        return ApiResponse(data=None, message="No route yet for today.")
    return ApiResponse(data=RouteOut.model_validate(route).model_dump(mode="json"))


@router.post("/confirm-pickup/{delivery_id}", response_model=ApiResponse[DeliveryOut], dependencies=[require_delivery_partner])
async def confirm_pickup(delivery_id: str, db: SessionDep, user: CurrentUser):
    partner = await _partner_for_user(db, user)
    if partner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Partner profile not found")
    delivery = (
        await db.execute(select(Delivery).where(Delivery.id == uuid.UUID(delivery_id)))
    ).scalar_one_or_none()
    if delivery is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Delivery not found")
    try:
        delivery = await DeliveryService.update_delivery_status(
            db, delivery, DeliveryStatus.PICKED_UP, partner_id=partner.id, notes="Picked up from farmer/CC."
        )
    except (ValueError, ValidationError) as exc:
        raise _err(exc)
    return ApiResponse(data=DeliveryOut.model_validate(delivery).model_dump(mode="json"), message="Pickup confirmed.")


@router.post("/confirm-delivery/{delivery_id}", response_model=ApiResponse[DeliveryOut], dependencies=[require_delivery_partner])
async def confirm_delivery(delivery_id: str, db: SessionDep, user: CurrentUser):
    partner = await _partner_for_user(db, user)
    if partner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Partner profile not found")
    delivery = (
        await db.execute(select(Delivery).where(Delivery.id == uuid.UUID(delivery_id)))
    ).scalar_one_or_none()
    if delivery is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Delivery not found")
    try:
        delivery = await DeliveryService.update_delivery_status(
            db, delivery, DeliveryStatus.DELIVERED, partner_id=partner.id, notes="Delivered."
        )
    except (ValueError, ValidationError) as exc:
        raise _err(exc)
    return ApiResponse(data=DeliveryOut.model_validate(delivery).model_dump(mode="json"), message="Delivery confirmed.")