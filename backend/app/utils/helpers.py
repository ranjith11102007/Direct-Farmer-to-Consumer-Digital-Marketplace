"""General helpers: UUID, order/batch numbers, pagination, formatting."""
from __future__ import annotations

import random
import string
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


def generate_uuid() -> uuid.UUID:
    return uuid.uuid4()


def _random_alpha_numeric(length: int) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=length))


def generate_order_number() -> str:
    """Human-friendly order reference, e.g. VK-20260909-AB12CD."""
    today_prefix = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"VK-{today_prefix}-{_random_alpha_numeric(6)}"


def generate_batch_number() -> str:
    """Batch reference, e.g. BTC-2026-385291."""
    year = datetime.now(timezone.utc).strftime("%Y")
    return f"BTC-{year}-{random.randint(100000, 999999)}"


def generate_qr_code_data(entity_type: str, entity_id: str) -> str:
    """Deterministic QR payload for a passport:
    vaikkal://bp/<entity_id>?type=<entity_type>&c=<random>
    """
    return f"vaikkal://bp/{entity_id}?type={entity_type}&c={_random_alpha_numeric(6)}"


async def paginate_query(
    db: AsyncSession,
    stmt: Any,
    page: int = 1,
    page_size: int = 20,
    count_stmt: Any | None = None,
) -> dict[str, Any]:
    """Apply pagination to a select statement and return a paginated response.

    Returns:
        {
          "items": [...],
          "page": int, "page_size": int,
          "total": int, "total_pages": int,
          "has_next": bool, "has_prev": bool
        }
    """
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    count_query = count_stmt if count_stmt is not None else select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(stmt.offset(offset).limit(page_size))
    items = list(result.scalars().unique().all())

    total_pages = (total + page_size - 1) // page_size if total else 0
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


def format_response(
    data: Any,
    message: str | None = None,
    success: bool = True,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Standard API envelope."""
    payload: dict[str, Any] = {"success": success, "data": data}
    if message:
        payload["message"] = message
    if meta:
        payload["meta"] = meta
    return payload


def format_error(
    message: str,
    code: str | None = None,
    details: Any | None = None,
) -> dict[str, Any]:
    """Standard error envelope."""
    payload: dict[str, Any] = {"success": False, "message": message}
    if code:
        payload["code"] = code
    if details is not None:
        payload["details"] = details
    return payload


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso_format(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return value.isoformat()


def start_of_today_utc() -> datetime:
    return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def add_days(days: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def serialize_rows(rows: Sequence[Any]) -> list[dict[str, Any]]:
    """Convert ORM rows to dictionaries with ISO datetimes."""
    out: list[dict[str, Any]] = []
    for row in rows:
        d = dict(row)
        for key, val in list(d.items()):
            if isinstance(val, (date, datetime)):
                d[key] = iso_format(val)
        out.append(d)
    return out