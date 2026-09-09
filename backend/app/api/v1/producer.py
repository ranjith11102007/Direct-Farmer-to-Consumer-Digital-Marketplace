"""Producer (farmer / FPO) API routes: profile, verification, listings, batches, settlements."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import (
    CurrentUser,
    SessionDep,
    require_farmer,
    require_producer,
)
from app.models.batch import Batch, BatchEvent, BatchEventType
from app.models.farmer import FarmerProfile
from app.models.order import Order, OrderItem, Payment, Settlement
from app.models.product import ProductListing, ListingStatus
from app.models.user import VerificationStatus
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.user import (
    FarmerProfileCreate,
    FarmerProfileOut,
    FarmerProfileUpdate,
    VerificationSubmit,
)
from app.schemas.order import OrderOut, SettlementOut
from app.services.settlement import SettlementService
from app.utils.helpers import generate_batch_number
from app.utils.validators import ValidationError, validate_ifsc

router = APIRouter(prefix="/producer", tags=["Producer"])


def _err(exc: Exception) -> HTTPException:
    if isinstance(exc, ValidationError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


async def _get_profile(db, user) -> FarmerProfile | None:
    return (
        await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    ).scalar_one_or_none()


# ---------- Profile ----------

@router.get("/profile", response_model=ApiResponse[FarmerProfileOut], dependencies=[require_farmer])
async def get_profile(db: SessionDep, user: CurrentUser):
    profile = await _get_profile(db, user)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return ApiResponse(data=FarmerProfileOut.model_validate(profile).model_dump(mode="json"))


@router.post("/profile", response_model=ApiResponse[FarmerProfileOut], dependencies=[require_farmer])
async def create_profile(payload: FarmerProfileCreate, db: SessionDep, user: CurrentUser):
    existing = await _get_profile(db, user)
    if existing is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Profile already exists")

    if payload.bank_ifsc:
        try:
            validate_ifsc(payload.bank_ifsc)
        except ValidationError as exc:
            raise _err(exc)

    profile = FarmerProfile(
        user_id=user.id,
        farm_name=payload.farm_name,
        farm_latitude=payload.farm_latitude,
        farm_longitude=payload.farm_longitude,
        farm_address=payload.farm_address,
        district=payload.district,
        state=payload.state,
        pincode=payload.pincode,
        land_size_acres=payload.land_size_acres,
        crops_grown=payload.crops_grown or [],
        bank_account_number=payload.bank_account_number,
        bank_ifsc=payload.bank_ifsc,
        bank_name=payload.bank_name,
        identity_doc_url=payload.identity_doc_url,
        land_doc_url=payload.land_doc_url,
        verification_status=VerificationStatus.DRAFT,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return ApiResponse(data=FarmerProfileOut.model_validate(profile).model_dump(mode="json"), message="Profile created.")


@router.put("/profile", response_model=ApiResponse[FarmerProfileOut], dependencies=[require_farmer])
async def update_profile(payload: FarmerProfileUpdate, db: SessionDep, user: CurrentUser):
    profile = await _get_profile(db, user)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Profile not found")

    if payload.bank_ifsc:
        try:
            validate_ifsc(payload.bank_ifsc)
        except ValidationError as exc:
            raise _err(exc)

    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return ApiResponse(data=FarmerProfileOut.model_validate(profile).model_dump(mode="json"), message="Profile updated.")


@router.post("/verification/submit", response_model=ApiResponse[FarmerProfileOut], dependencies=[require_farmer])
async def submit_verification(payload: VerificationSubmit, db: SessionDep, user: CurrentUser):
    profile = await _get_profile(db, user)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Create your profile first.")

    if payload.identity_doc_url:
        profile.identity_doc_url = payload.identity_doc_url
    if payload.land_doc_url:
        profile.land_doc_url = payload.land_doc_url

    if not profile.identity_doc_url or not profile.farm_name or not profile.bank_ifsc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Bank details and identity document are required.")

    profile.verification_status = VerificationStatus.SUBMITTED
    user.verification_status = VerificationStatus.SUBMITTED
    await db.commit()
    await db.refresh(profile)
    return ApiResponse(data=FarmerProfileOut.model_validate(profile).model_dump(mode="json"), message="Documents submitted for review.")


# ---------- Listings ----------

@router.get("/listings", response_model=PaginatedResponse[dict], dependencies=[require_farmer])
async def producer_listings(
    db: SessionDep,
    user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    from app.schemas.product import ListingOut

    profile = await _get_profile(db, user)
    if profile is None:
        return PaginatedResponse[dict](items=[], page=page, page_size=page_size, total=0, total_pages=0, has_next=False, has_prev=False)

    stmt = select(ProductListing).where(ProductListing.producer_id == profile.id).order_by(ProductListing.created_at.desc())
    from app.utils.helpers import paginate_query
    result = await paginate_query(db, stmt, page=page, page_size=page_size)
    items = [ListingOut.model_validate(l).model_dump(mode="json") for l in result["items"]]
    return PaginatedResponse[dict](items=items, page=page, page_size=page_size, total=result["total"],
                                   total_pages=result["total_pages"], has_next=result["has_next"], has_prev=result["has_prev"])


# ---------- Batches ----------

@router.post("/batches", response_model=ApiResponse[dict], dependencies=[require_farmer])
async def create_batch(db: SessionDep, user: CurrentUser, body: dict):
    profile = await _get_profile(db, user)
    if profile is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Profile required")

    product_id = body.get("product_id")
    if not product_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="product_id required")

    batch = Batch(
        batch_number=generate_batch_number(),
        product_id=uuid.UUID(str(product_id)),
        producer_ids=[str(profile.id)],
        grade=body.get("grade", "A"),
        quantity_received=float(body.get("quantity_received", 0)),
        quantity_accepted=float(body.get("quantity_accepted", 0)),
        quantity_rejected=float(body.get("quantity_rejected", 0)),
        weight_after_packing=body.get("weight_after_packing"),
        harvest_date=body.get("harvest_date"),
        packing_date=body.get("packing_date"),
        quality_inspection_notes=body.get("quality_inspection_notes"),
    )
    db.add(batch)
    await db.flush()
    db.add(BatchEvent(
        batch_id=batch.id,
        event_type=BatchEventType.CREATED,
        actor_id=user.id,
        notes="Batch created by producer",
        metadata_json={},
        timestamp=datetime.now(timezone.utc),
    ))
    await db.commit()
    await db.refresh(batch)
    return ApiResponse(data={"id": str(batch.id), "batch_number": batch.batch_number}, message="Batch created.")


@router.get("/batches", response_model=ApiResponse[list], dependencies=[require_farmer])
async def producer_batches(db: SessionDep, user: CurrentUser):
    profile = await _get_profile(db, user)
    if profile is None:
        return ApiResponse(data=[])
    result = await db.execute(
        select(Batch).where(Batch.producer_ids.contains([str(profile.id)])).order_by(Batch.created_at.desc())
    )
    batches = result.scalars().unique().all()
    return ApiResponse(data=[
        {
            "id": str(b.id),
            "batch_number": b.batch_number,
            "product_id": str(b.product_id),
            "grade": b.grade,
            "quantity_received": b.quantity_received,
            "quantity_accepted": b.quantity_accepted,
            "status": b.status.value if hasattr(b.status, "value") else b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in batches
    ])


# ---------- Settlements ----------

@router.get("/settlements", response_model=PaginatedResponse[SettlementOut], dependencies=[require_farmer])
async def producer_settlements(
    db: SessionDep,
    user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    profile = await _get_profile(db, user)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Profile not found")
    result = await SettlementService.list_for_farmer(db, farmer_id=profile.id, page=page, page_size=page_size)
    items = [SettlementOut.model_validate(s).model_dump(mode="json") for s in result["items"]]
    return PaginatedResponse[SettlementOut](items=items, page=page, page_size=page_size, total=result["total"],
                                            total_pages=result["total_pages"], has_next=result["has_next"], has_prev=result["has_prev"])


@router.get("/settlements/summary", response_model=ApiResponse[dict], dependencies=[require_farmer])
async def settlement_summary(db: SessionDep, user: CurrentUser):
    profile = await _get_profile(db, user)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Profile not found")
    totals = await SettlementService.totals_for_farmer(db, profile.id)
    return ApiResponse(data=totals)


# ---------- Orders ----------

@router.get("/orders", response_model=PaginatedResponse[OrderOut], dependencies=[require_farmer])
async def producer_orders(
    db: SessionDep,
    user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    profile = await _get_profile(db, user)
    if profile is None:
        return PaginatedResponse[OrderOut](items=[], page=page, page_size=page_size, total=0, total_pages=0, has_next=False, has_prev=False)

    item_ids = (await db.execute(select(OrderItem.order_id).where(OrderItem.producer_id == profile.id))).scalars().all()
    if not item_ids:
        return PaginatedResponse[OrderOut](items=[], page=page, page_size=page_size, total=0, total_pages=0, has_next=False, has_prev=False)

    from sqlalchemy.orm import selectinload
    from app.utils.helpers import paginate_query
    stmt = select(Order).options(selectinload(Order.items)).where(Order.id.in_(list(set(item_ids)))).order_by(Order.created_at.desc())
    result = await paginate_query(db, stmt, page=page, page_size=page_size)
    items = [OrderOut.model_validate(o).model_dump(mode="json") for o in result["items"]]
    return PaginatedResponse[OrderOut](items=items, page=page, page_size=page_size, total=result["total"],
                                       total_pages=result["total_pages"], has_next=result["has_next"], has_prev=result["has_prev"])