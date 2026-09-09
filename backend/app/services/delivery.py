"""Delivery service: assignment, routes, status updates, ETA."""
from __future__ import annotations

import math
import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.delivery import (
    Delivery,
    DeliveryPartner,
    DeliveryStatus,
    Route,
    RouteStatus,
    Vehicle,
)
from app.models.order import Order, OrderStatus
from app.utils.validators import ValidationError

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class DeliveryService:
    """Assign partners, generate routes, update status and estimate ETA."""

    # ---------- Partner & vehicle ----------

    @staticmethod
    async def get_partner_by_user(db: AsyncSession, user_id: uuid.UUID) -> DeliveryPartner | None:
        return (
            await db.execute(select(DeliveryPartner).where(DeliveryPartner.user_id == user_id))
        ).scalar_one_or_none()

    @staticmethod
    async def register_partner(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        vehicle_type: str,
        license_number: str,
        service_areas: list | None = None,
        vehicle_number: str | None = None,
    ) -> DeliveryPartner:
        partner = await DeliveryService.get_partner_by_user(db, user_id)
        if partner is None:
            partner = DeliveryPartner(
                user_id=user_id,
                vehicle_type=vehicle_type,
                license_number=license_number,
                service_areas=service_areas or [],
                vehicle_number=vehicle_number,
            )
            db.add(partner)
            await db.flush()
            vehicle = Vehicle(
                partner_id=partner.id,
                type=vehicle_type,
                number=vehicle_number or "NOT_SET",
                capacity_kg=settings.DEFAULT_VEHICLE_CAPACITY_KG,
                is_active=True,
            )
            db.add(vehicle)
            await db.commit()
            await db.refresh(partner)
        else:
            partner.license_number = license_number
            partner.service_areas = service_areas or partner.service_areas
            if vehicle_number:
                partner.vehicle_number = vehicle_number
            await db.commit()
            await db.refresh(partner)
        return partner

    # ---------- Assignment ----------

    @staticmethod
    async def find_available_partner(
        db: AsyncSession,
        *,
        district: str | None = None,
        exclude_partner_ids: list[uuid.UUID] | None = None,
    ) -> DeliveryPartner | None:
        stmt = select(DeliveryPartner).where(DeliveryPartner.is_active.is_(True))
        partners = (await db.execute(stmt)).scalars().all()
        exclude_ids = {str(i) for i in (exclude_partner_ids or [])}
        for partner in partners:
            if str(partner.id) in exclude_ids:
                continue
            if district:
                areas = partner.service_areas or []
                if areas and district not in [str(a).lower() for a in areas] and district.lower() not in [str(a).lower() for a in areas]:
                    continue
            return partner
        return None

    @staticmethod
    async def create_deliveries_for_dispatch(db: AsyncSession, order_id: uuid.UUID) -> list[Delivery]:
        """Create delivery records for dispatched orders."""
        order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
        if order is None:
            raise ValidationError("Order not found.")
        if order.status != OrderStatus.DISPATCHED:
            order.status = OrderStatus.OUT_FOR_DELIVERY
            await db.commit()

        existing = (await db.execute(select(Delivery).where(Delivery.order_id == order.id))).scalars().first()
        if existing is not None:
            return [existing]

        delivery = Delivery(
            order_id=order.id,
            status=DeliveryStatus.PENDING,
            delivery_address_json=order.delivery_address_json,
            otp_code=DeliveryService._generate_otp(),
        )
        db.add(delivery)
        await db.commit()
        await db.refresh(delivery)
        return [delivery]

    @staticmethod
    def _generate_otp() -> str:
        import random
        return f"{random.randint(0, 999999):06d}"

    # ---------- Routes ----------

    @staticmethod
    async def build_daily_route(
        db: AsyncSession,
        *,
        partner_id: uuid.UUID,
        target_date: date | None = None,
    ) -> tuple[Route, list[Delivery], Exception | None]:
        """Group pending deliveries for a partner into an optimized route."""
        target_date = target_date or date.today()

        deliveries = (
            await db.execute(
                select(Delivery).where(
                    Delivery.partner_id == partner_id,
                    Delivery.status.in_([DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP]),
                )
            )
        ).scalars().all()

        if not deliveries:
            return None, [], ValidationError("No pending deliveries assigned to this partner.")

        stops: list[dict[str, Any]] = []
        for d in deliveries:
            address = d.delivery_address_json or {}
            stop = {
                "delivery_id": str(d.id),
                "order_id": str(d.order_id),
                "lat": address.get("lat"),
                "lng": address.get("lng"),
                "address": address.get("address_line1", ""),
                "type": "drop",
            }
            stops.append(stop)

        # Lat/lng known: nearest-neighbor ordering; otherwise keep creation order.
        known = [s for s in stops if s["lat"] is not None and s["lng"] is not None]
        if known:
            ordered = DeliveryService._nearest_neighbor(known)
            stops = ordered + [s for s in stops if s not in ordered]

        from app.ai.route_optimizer import RouteOptimizer
        optimizer = RouteOptimizer()
        result = optimizer.optimize(
            stops=stops,
            vehicle_capacity_kg=settings.DEFAULT_VEHICLE_CAPACITY_KG,
        )

        route = Route(
            delivery_partner_id=partner_id,
            date=target_date,
            stops_json=result["ordered_stops"],
            total_distance_km=result["total_distance_km"],
            estimated_duration_minutes=result["estimated_time_minutes"],
            status=RouteStatus.PLANNED,
            optimization_score=result["optimization_score"],
        )
        db.add(route)
        await db.flush()

        for d in deliveries:
            d.route_id = route.id

        await db.commit()
        await db.refresh(route)
        return route, list(deliveries), None

    @staticmethod
    def _nearest_neighbor(stops: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not stops:
            return []
        remaining = list(stops)
        ordered = [remaining.pop(0)]
        while remaining:
            last = ordered[-1]
            next_stop = min(remaining, key=lambda s: haversine_km(float(last["lat"]), float(last["lng"]), float(s["lat"]), float(s["lng"])))
            ordered.append(next_stop)
            remaining.remove(next_stop)
        return ordered

    # ---------- Status updates ----------

    @staticmethod
    async def update_delivery_status(
        db: AsyncSession,
        delivery: Delivery,
        status: DeliveryStatus,
        *,
        partner_id: uuid.UUID | None = None,
        notes: str | None = None,
    ) -> Delivery:
        if partner_id and delivery.partner_id and delivery.partner_id != partner_id:
            raise ValidationError("Delivery is assigned to another partner.")

        allowed = {
            DeliveryStatus.PENDING: [DeliveryStatus.ASSIGNED, DeliveryStatus.CANCELLED],
            DeliveryStatus.ASSIGNED: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
            DeliveryStatus.PICKED_UP: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED],
            DeliveryStatus.IN_TRANSIT: [DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.FAILED],
            DeliveryStatus.OUT_FOR_DELIVERY: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
            DeliveryStatus.DELIVERED: [],
            DeliveryStatus.FAILED: [],
            DeliveryStatus.CANCELLED: [],
        }
        if status not in allowed.get(delivery.status, []):
            raise ValidationError(f"Cannot transition delivery from {delivery.status.value} to {status.value}.")

        delivery.status = status
        if notes:
            delivery.notes = (delivery.notes or "") + f"\n[{datetime.now(timezone.utc).isoformat()}] {notes}"

        if status == DeliveryStatus.ASSIGNED:
            delivery.actual_time_minutes = None
        if status == DeliveryStatus.DELIVERED:
            delivery.actual_time_minutes = int(
                (datetime.now(timezone.utc) - delivery.created_at).total_seconds() // 60
            )
            order = (await db.execute(select(Order).where(Order.id == delivery.order_id))).scalar_one_or_none()
            if order is not None and order.status not in (OrderStatus.DELIVERED,):
                from app.services.order import OrderService
                await OrderService.update_status(db, order, OrderStatus.DELIVERED)
                return delivery

        await db.commit()
        await db.refresh(delivery)
        return delivery

    @staticmethod
    async def assign(
        db: AsyncSession,
        delivery: Delivery,
        partner_id: uuid.UUID,
        vehicle_id: uuid.UUID | None = None,
    ) -> Delivery:
        delivery.partner_id = partner_id
        delivery.vehicle_id = vehicle_id
        delivery.status = DeliveryStatus.ASSIGNED
        await db.commit()
        await db.refresh(delivery)
        return delivery

    # ---------- ETA ----------

    @staticmethod
    def estimate_eta(
        *,
        pickup_lat: float | None,
        pickup_lng: float | None,
        drop_lat: float | None,
        drop_lng: float | None,
        avg_speed_kmh: float = 20.0,
    ) -> tuple[float, int]:
        """Return (distance_km, minutes) between pickup and drop."""
        if None in (pickup_lat, pickup_lng, drop_lat, drop_lng):
            return 0.0, 15
        distance = haversine_km(float(pickup_lat), float(pickup_lng), float(drop_lat), float(drop_lng))
        minutes = int((distance / max(avg_speed_kmh, 1.0)) * 60)
        return round(distance, 2), max(minutes, 5)

    @staticmethod
    async def list_for_partner(
        db: AsyncSession,
        partner_id: uuid.UUID,
        *,
        active_only: bool = True,
    ) -> list[Delivery]:
        stmt = select(Delivery).where(Delivery.partner_id == partner_id).order_by(Delivery.created_at.desc())
        if active_only:
            stmt = stmt.where(
                Delivery.status.in_([
                    DeliveryStatus.ASSIGNED,
                    DeliveryStatus.PICKED_UP,
                    DeliveryStatus.IN_TRANSIT,
                    DeliveryStatus.OUT_FOR_DELIVERY,
                ])
            )
        return list((await db.execute(stmt)).scalars().unique().all())