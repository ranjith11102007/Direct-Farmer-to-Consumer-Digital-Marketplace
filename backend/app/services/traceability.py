"""Traceability service: batch passports, QR generation, event recording."""
from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone
from typing import Any

import qrcode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.batch import Batch, BatchEvent, BatchEventType
from app.models.product import Product, ProductListing
from app.models.traceability import TraceabilityPassport
from app.utils.helpers import generate_qr_code_data
from app.utils.validators import ValidationError


class TraceabilityService:
    """Generate and manage batch traceability passports."""

    @staticmethod
    async def create_passport(db: AsyncSession, *, batch_id: uuid.UUID) -> TraceabilityPassport:
        batch = (await db.execute(select(Batch).where(Batch.id == batch_id))).scalar_one_or_none()
        if batch is None:
            raise ValidationError("Batch not found.")

        existing = (
            await db.execute(select(TraceabilityPassport).where(TraceabilityPassport.batch_id == batch.id))
        ).scalar_one_or_none()
        if existing is not None:
            return existing

        product = (await db.execute(select(Product).where(Product.id == batch.product_id))).scalar_one_or_none()
        listings = (
            await db.execute(select(ProductListing).where(ProductListing.batch_id == batch.id))
        ).scalars().all()

        qr_data = generate_qr_code_data("batch", str(batch.id))
        passport_data = await TraceabilityService._build_passport_data(db, batch, product, listings)

        passport = TraceabilityPassport(
            batch_id=batch.id,
            qr_code_data=qr_data,
            passport_data_json=passport_data,
            generated_at=datetime.now(timezone.utc),
            scan_count=0,
        )
        db.add(passport)
        await db.commit()
        await db.refresh(passport)
        return passport

    @staticmethod
    async def _build_passport_data(
        db: AsyncSession,
        batch: Batch,
        product: Product | None,
        listings: list[ProductListing],
    ) -> dict[str, Any]:
        events = (
            await db.execute(
                select(BatchEvent)
                .where(BatchEvent.batch_id == batch.id)
                .order_by(BatchEvent.timestamp.asc())
            )
        ).scalars().all()

        prices = []
        for listing in listings:
            prices.append({
                "listing_id": str(listing.id),
                "price_per_unit": float(listing.price_per_unit),
                "grade": listing.grade,
                "available_quantity": float(listing.available_quantity),
                "organic_certified": listing.organic_certified,
            })

        return {
            "schema_version": "1.0",
            "batch_number": batch.batch_number,
            "batch_id": str(batch.id),
            "product": {
                "id": str(product.id) if product else None,
                "name": product.name if product else None,
                "name_tamil": product.name_tamil if product else None,
            },
            "grade": batch.grade,
            "quantity_received": batch.quantity_received,
            "quantity_accepted": batch.quantity_accepted,
            "quantity_rejected": batch.quantity_rejected,
            "weight_after_packing": batch.weight_after_packing,
            "harvest_date": batch.harvest_date.isoformat() if batch.harvest_date else None,
            "packing_date": batch.packing_date.isoformat() if batch.packing_date else None,
            "quality_inspection_notes": batch.quality_inspection_notes,
            "collection_center_id": str(batch.collection_center_id) if batch.collection_center_id else None,
            "producer_ids": [str(p) for p in (batch.producer_ids or [])],
            "status": batch.status.value if hasattr(batch.status, "value") else batch.status,
            "listings": prices,
            "events": [
                {
                    "event_type": e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
                    "timestamp": e.timestamp.isoformat(),
                    "notes": e.notes,
                    "metadata": e.metadata_json,
                }
                for e in events
            ],
            "trace_url": f"{settings.FRONTEND_URL}/trace/{qr_code_short(batch.id)}",
        }


def qr_code_short(batch_id: uuid.UUID) -> str:
    return str(batch_id).replace("-", "")[:10]


class QRService:
    """QR code image generation for passports and crates."""

    @staticmethod
    def generate_png(data: str, *, box_size: int = 10, border: int = 4) -> bytes:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=box_size,
            border=border,
        )
        qr.add_data(data)
        qr.make(fit=True)
        image = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    @staticmethod
    async def generate_for_batch(db: AsyncSession, *, batch_id: uuid.UUID) -> bytes:
        passport = await TraceabilityService.create_passport(db, batch_id=batch_id)
        return QRService.generate_png(passport.qr_code_data)