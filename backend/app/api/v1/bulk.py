"""Bulk procurement API routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import (
    CurrentUser,
    SessionDep,
    require_bulk_buyer,
    require_producer,
)
from app.models.bulk import BulkRequirement, PurchaseOrder, Quotation, RequirementStatus
from app.schemas.bulk import (
    BulkRequirementCreate,
    BulkRequirementOut,
    PurchaseOrderOut,
    QuotationAction,
    QuotationCreate,
    QuotationOut,
)
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services.bulk import BulkProcurementService
from app.utils.validators import ValidationError

router = APIRouter(prefix="/bulk", tags=["Bulk Procurement"])


def _err(exc: Exception) -> HTTPException:
    if isinstance(exc, ValidationError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------- Requirements ----------

@router.post("/requirements", response_model=ApiResponse[BulkRequirementOut], dependencies=[require_bulk_buyer])
async def create_requirement(payload: BulkRequirementCreate, db: SessionDep, user: CurrentUser):
    try:
        requirement = await BulkProcurementService.create_requirement(
            db,
            buyer_id=user.id,
            product_id=uuid.UUID(payload.product_id),
            quantity=payload.quantity,
            unit=payload.unit,
            grade=payload.grade,
            delivery_location_json=payload.delivery_location_json,
            schedule_type=payload.schedule_type,
            target_price=payload.target_price,
            packaging_requirements=payload.packaging_requirements,
            quality_specs=payload.quality_specs,
            deadline=payload.deadline,
        )
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=BulkRequirementOut.model_validate(requirement).model_dump(mode="json"), message="Requirement posted.")


@router.get("/requirements", response_model=PaginatedResponse[BulkRequirementOut])
async def list_requirements(
    db: SessionDep,
    user: CurrentUser,
    mine: bool = Query(default=False),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    try:
        status_enum = RequirementStatus(status_filter) if status_filter else None
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    result = await BulkProcurementService.list_requirements(
        db,
        status=status_enum,
        buyer_id=user.id if mine else None,
        page=page,
        page_size=page_size,
    )
    items = [BulkRequirementOut.model_validate(r).model_dump(mode="json") for r in result["items"]]
    return PaginatedResponse[BulkRequirementOut](
        items=items, page=page, page_size=page_size, total=result["total"],
        total_pages=result["total_pages"], has_next=result["has_next"], has_prev=result["has_prev"],
    )


@router.get("/requirements/{requirement_id}", response_model=ApiResponse[BulkRequirementOut])
async def get_requirement(requirement_id: str, db: SessionDep):
    try:
        requirement = await BulkProcurementService.get_requirement(db, uuid.UUID(requirement_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid requirement id")
    if requirement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    data = BulkRequirementOut.model_validate(requirement).model_dump(mode="json")
    quotations = await BulkProcurementService.list_quotations(db, requirement_id=requirement.id)
    data["quotations"] = [QuotationOut.model_validate(q).model_dump(mode="json") for q in quotations]
    return ApiResponse(data=data)


# ---------- Quotations ----------

@router.post("/quotations", response_model=ApiResponse[QuotationOut], dependencies=[require_producer])
async def create_quotation(payload: QuotationCreate, db: SessionDep, user: CurrentUser):
    from app.models.farmer import FarmerProfile

    profile = (
        await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    ).scalar_one_or_none()
    responder_id = profile.id if profile else user.id
    try:
        quotation = await BulkProcurementService.create_quotation(
            db,
            requirement_id=uuid.UUID(payload.requirement_id),
            responder_id=responder_id,
            responder_type="farmer" if profile else "fpo",
            price_per_unit=payload.price_per_unit,
            quantity=payload.quantity,
            delivery_timeline=payload.delivery_timeline,
            quality_notes=payload.quality_notes,
            valid_until=payload.valid_until,
        )
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=QuotationOut.model_validate(quotation).model_dump(mode="json"), message="Quotation submitted.")


@router.post("/quotations/accept", response_model=ApiResponse[PurchaseOrderOut])
async def accept_quotation(payload: QuotationAction, db: SessionDep, user: CurrentUser):
    quotation = (
        await db.execute(select(Quotation).where(Quotation.id == uuid.UUID(payload.quotation_id)))
    ).scalar_one_or_none()
    if quotation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Quotation not found")
    try:
        purchase_order = await BulkProcurementService.accept_quotation(
            db, quotation, buyer_id=user.id, payment_terms=payload.payment_terms
        )
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=PurchaseOrderOut.model_validate(purchase_order).model_dump(mode="json"), message="Quotation accepted.")


@router.post("/quotations/{quotation_id}/reject", response_model=ApiResponse[QuotationOut])
async def reject_quotation(quotation_id: str, db: SessionDep, user: CurrentUser):
    quotation = (
        await db.execute(select(Quotation).where(Quotation.id == uuid.UUID(quotation_id)))
    ).scalar_one_or_none()
    if quotation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Quotation not found")
    try:
        quotation = await BulkProcurementService.reject_quotation(db, quotation)
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=QuotationOut.model_validate(quotation).model_dump(mode="json"), message="Quotation rejected.")


# ---------- Purchase orders ----------

@router.get("/purchase-orders", response_model=PaginatedResponse[PurchaseOrderOut])
async def list_purchase_orders(
    db: SessionDep,
    user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    result = await BulkProcurementService.list_purchase_orders(
        db, buyer_id=user.id, page=page, page_size=page_size
    )
    items = [PurchaseOrderOut.model_validate(p).model_dump(mode="json") for p in result["items"]]
    return PaginatedResponse[PurchaseOrderOut](
        items=items, page=page, page_size=page_size, total=result["total"],
        total_pages=result["total_pages"], has_next=result["has_next"], has_prev=result["has_prev"],
    )


@router.get("/purchase-orders/{po_id}", response_model=ApiResponse[PurchaseOrderOut])
async def get_purchase_order(po_id: str, db: SessionDep):
    try:
        po = await BulkProcurementService.get_purchase_order(db, uuid.UUID(po_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid purchase order id")
    if po is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    return ApiResponse(data=PurchaseOrderOut.model_validate(po).model_dump(mode="json"))