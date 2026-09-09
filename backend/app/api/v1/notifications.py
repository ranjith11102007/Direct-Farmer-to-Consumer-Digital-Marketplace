"""Notification API routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models.notification import Notification
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services.notification import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _serialize(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "user_id": str(n.user_id),
        "type": n.type.value if hasattr(n.type, "value") else n.type,
        "title": n.title,
        "title_tamil": n.title_tamil,
        "message": n.message,
        "message_tamil": n.message_tamil,
        "data_json": n.data_json,
        "is_read": n.is_read,
        "channel": n.channel.value if hasattr(n.channel, "value") else n.channel,
        "sent_at": n.sent_at.isoformat() if n.sent_at else None,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("/", response_model=ApiResponse[list[dict]])
async def list_notifications(
    db: SessionDep,
    user: CurrentUser,
    unread_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    result = await NotificationService.list_for_user(
        db, user_id=user.id, unread_only=unread_only, page=page, page_size=page_size
    )
    return ApiResponse(data=[_serialize(n) for n in result["items"]], meta={
        "page": page, "page_size": page_size, "total": result["total"],
    })


@router.post("/{notification_id}/read", response_model=ApiResponse[dict])
async def mark_read(notification_id: str, db: SessionDep, user: CurrentUser):
    notification = await NotificationService.get(db, uuid.UUID(notification_id), user_id=user.id)
    if notification is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Notification not found")
    await NotificationService.mark_read(db, notification, read=True)
    return ApiResponse(data={"id": str(notification.id), "is_read": True}, message="Marked as read.")


@router.post("/read-all", response_model=ApiResponse[dict])
async def mark_all_read(db: SessionDep, user: CurrentUser):
    result = (await db.execute(select(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False)))).scalars().all()
    for n in result:
        n.is_read = True
    await db.commit()
    return ApiResponse(data={"marked": len(result)}, message="All notifications marked as read.")


@router.get("/preferences", response_model=ApiResponse[dict])
async def preferences(user: CurrentUser):
    preferences = {
        "in_app": True,
        "sms": user.phone is not None,
        "email": user.email is not None,
        "whatsapp": False,
        "push": False,
    }
    return ApiResponse(data=preferences)