"""Traceability API routes: batch passports and QR scanning."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select

from app.api.deps import SessionDep
from app.models.batch import Batch
from app.models.traceability import TraceabilityPassport
from app.schemas.common import ApiResponse
from app.services.traceability import QRService, TraceabilityService
from app.utils.validators import ValidationError

router = APIRouter(prefix="/traceability", tags=["Traceability"])


@router.post("/passport/{batch_id}", response_model=ApiResponse[dict])
async def create_passport(batch_id: str, db: SessionDep):
    try:
        passport = await TraceabilityService.create_passport(db, batch_id=uuid.UUID(batch_id))
    except (ValidationError, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ApiResponse(data={
        "id": str(passport.id),
        "batch_id": str(passport.batch_id),
        "qr_code_data": passport.qr_code_data,
        "passport_data": passport.passport_data_json,
        "generated_at": passport.generated_at.isoformat() if passport.generated_at else None,
        "scan_count": passport.scan_count,
    }, message="Passport generated.")


@router.get("/passport/{batch_id}", response_model=ApiResponse[dict])
async def get_passport(batch_id: str, db: SessionDep):
    batch = (await db.execute(select(Batch).where(Batch.id == uuid.UUID(batch_id)))).scalar_one_or_none()
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Batch not found")

    passport = (
        await db.execute(select(TraceabilityPassport).where(TraceabilityPassport.batch_id == batch.id))
    ).scalar_one_or_none()
    if passport is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Passport not generated yet.")

    return ApiResponse(data={
        "id": str(passport.id),
        "batch_id": str(passport.batch_id),
        "batch_number": batch.batch_number,
        "qr_code_data": passport.qr_code_data,
        "passport_data": passport.passport_data_json,
        "generated_at": passport.generated_at.isoformat() if passport.generated_at else None,
        "scan_count": passport.scan_count,
        "last_scanned_at": passport.last_scanned_at.isoformat() if passport.last_scanned_at else None,
    })


@router.get("/qrcode/{batch_id}", response_class=Response)
async def qrcode_image(batch_id: str, db: SessionDep):
    try:
        png = await QRService.generate_for_batch(db, batch_id=uuid.UUID(batch_id))
    except (ValidationError, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return Response(
        content=png,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="passport-{batch_id}.png"'},
    )


@router.get("/scan/{qr_data:path}", response_model=ApiResponse[dict])
async def scan_qr(qr_data: str, db: SessionDep):
    """Scan endpoint. Accepts the full 'vaikkal://bp/...' payload or a batch id."""
    passport: TraceabilityPassport | None = None

    if qr_data.startswith("vaikkal://"):
        entity_id = qr_data.split("/")[-1].split("?")[0]
        passport = (
            await db.execute(select(TraceabilityPassport).where(TraceabilityPassport.qr_code_data == qr_data))
        ).scalar_one_or_none()
        if passport is None:
            passport = (
                await db.execute(select(TraceabilityPassport).where(TraceabilityPassport.batch_id == uuid.UUID(str(entity_id))))
            ).scalar_one_or_none()
    else:
        try:
            passport = (
                await db.execute(select(TraceabilityPassport).where(TraceabilityPassport.batch_id == uuid.UUID(qr_data)))
            ).scalar_one_or_none()
        except ValueError:
            passport = None

    if passport is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Passport not found.")

    passport.scan_count = (passport.scan_count or 0) + 1
    from datetime import datetime, timezone
    passport.last_scanned_at = datetime.now(timezone.utc)
    await db.commit()

    from app.models.batch import Batch
    batch = (await db.execute(select(Batch).where(Batch.id == passport.batch_id))).scalar_one_or_none()
    return ApiResponse(data={
        "passport_id": str(passport.id),
        "batch_number": batch.batch_number if batch else None,
        "scanned_at": passport.last_scanned_at.isoformat() if passport.last_scanned_at else None,
        "scan_count": passport.scan_count,
        "passport_data": passport.passport_data_json,
    }, message="Scan recorded.")