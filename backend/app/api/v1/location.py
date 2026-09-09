"""Location API routes: addresses, service areas, collection centers."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models.location import Address, CollectionCenter, ServiceArea
from app.schemas.common import ApiResponse
from app.utils.validators import (
    ValidationError,
    validate_pincode,
)

router = APIRouter(prefix="/location", tags=["Location"])


class AddressCreate(BaseModel):
    label: str | None = "Home"
    address_line1: str
    address_line2: str | None = None
    village: str | None = None
    town: str | None = None
    district: str
    state: str
    pincode: str
    lat: float | None = None
    lng: float | None = None
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    village: str | None = None
    town: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    lat: float | None = None
    lng: float | None = None
    is_default: bool | None = None


def _addr_dict(a: Address) -> dict:
    return {
        "id": str(a.id),
        "label": a.label,
        "address_line1": a.address_line1,
        "address_line2": a.address_line2,
        "village": a.village,
        "town": a.town,
        "district": a.district,
        "state": a.state,
        "pincode": a.pincode,
        "lat": a.lat,
        "lng": a.lng,
        "is_default": a.is_default,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


async def _clear_default_marker(db, user_id: uuid.UUID) -> None:
    addrs = (
        await db.execute(select(Address).where(Address.user_id == user_id, Address.is_default.is_(True)))
    ).scalars().all()
    for addr in addrs:
        addr.is_default = False


async def _get_owned(db, user, address_id_str: str) -> Address:
    try:
        addr = (
            await db.execute(
                select(Address).where(Address.id == uuid.UUID(address_id_str), Address.user_id == user.id)
            )
        ).scalar_one_or_none()
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid address id")
    if addr is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Address not found")
    return addr


@router.get("/addresses", response_model=ApiResponse[list[dict]])
async def list_addresses(db: SessionDep, user: CurrentUser):
    result = (await db.execute(select(Address).where(Address.user_id == user.id).order_by(Address.is_default.desc()))).scalars().all()
    return ApiResponse(data=[_addr_dict(a) for a in result])


@router.post("/addresses", response_model=ApiResponse[dict])
async def create_address(payload: AddressCreate, db: SessionDep, user: CurrentUser):
    try:
        validate_pincode(payload.pincode)
    except ValidationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if payload.is_default:
        await _clear_default_marker(db, user.id)

    address = Address(user_id=user.id, **payload.model_dump())
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return ApiResponse(data=_addr_dict(address), message="Address saved.")


@router.put("/addresses/{address_id}", response_model=ApiResponse[dict])
async def update_address(address_id: str, payload: AddressUpdate, db: SessionDep, user: CurrentUser):
    address = await _get_owned(db, user, address_id)

    if payload.pincode:
        try:
            validate_pincode(payload.pincode)
        except ValidationError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if payload.is_default:
        await _clear_default_marker(db, user.id)
        address.is_default = True
        # patch payload without overriding is_default
        data = payload.model_dump(exclude={"is_default"}, exclude_none=True)
    else:
        data = payload.model_dump(exclude_none=True)

    for key, value in data.items():
        setattr(address, key, value)
    await db.commit()
    await db.refresh(address)
    return ApiResponse(data=_addr_dict(address), message="Address updated.")


@router.delete("/addresses/{address_id}", response_model=ApiResponse[dict])
async def delete_address(address_id: str, db: SessionDep, user: CurrentUser):
    address = await _get_owned(db, user, address_id)
    await db.delete(address)
    await db.commit()
    return ApiResponse(data={"deleted": True}, message="Address deleted.")


# ---------- Service areas ----------

@router.get("/service-areas", response_model=ApiResponse[list])
async def list_service_areas(db: SessionDep, district: str | None = Query(default=None)):
    stmt = select(ServiceArea).where(ServiceArea.is_active.is_(True))
    if district:
        stmt = stmt.where(ServiceArea.district == district)
    rows = (await db.execute(stmt)).scalars().unique().all()
    return ApiResponse(data=[
        {
            "id": str(a.id),
            "name": a.name,
            "district": a.district,
            "state": a.state,
            "pincode_range": a.pincode_range,
            "delivery_fee_base": a.delivery_fee_base,
            "estimated_delivery_hours": a.estimated_delivery_hours,
        }
        for a in rows
    ])


# ---------- Collection centers ----------

@router.get("/collection-centers", response_model=ApiResponse[list])
async def list_collection_centers(
    db: SessionDep,
    district: str | None = Query(default=None),
    state: str | None = Query(default=None),
):
    stmt = select(CollectionCenter).where(CollectionCenter.is_active.is_(True))
    if district:
        stmt = stmt.where(CollectionCenter.district == district)
    if state:
        stmt = stmt.where(CollectionCenter.state == state)
    rows = (await db.execute(stmt)).scalars().unique().all()
    return ApiResponse(data=[
        {
            "id": str(c.id),
            "name": c.name,
            "fpo_id": str(c.fpo_id) if c.fpo_id else None,
            "address_line": c.address_line,
            "district": c.district,
            "state": c.state,
            "pincode": c.pincode,
            "lat": c.lat,
            "lng": c.lng,
            "has_cold_storage": c.has_cold_storage,
            "capacity_kg": c.capacity_kg,
        }
        for c in rows
    ])