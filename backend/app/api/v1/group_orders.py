"""Community group order API routes."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models.group_order import (
    GroupOrder,
    GroupOrderParticipant,
    GroupOrderStatus,
    ParticipantStatus,
)
from app.schemas.common import ApiResponse
from app.utils.validators import ValidationError

router = APIRouter(prefix="/group-orders", tags=["Group Orders"])


class GroupOrderCreate(BaseModel):
    title: str
    description: str | None = None
    delivery_address_json: dict
    delivery_date: datetime | None = None
    minimum_participants: int = Field(default=5, ge=2)
    expires_at: datetime | None = None


class JoinRequest(BaseModel):
    items_json: list = Field(default_factory=list)
    total_amount: float = Field(gt=0)


def _go_dict(g: GroupOrder) -> dict:
    return {
        "id": str(g.id),
        "creator_id": str(g.creator_id),
        "title": g.title,
        "description": g.description,
        "delivery_address_json": g.delivery_address_json,
        "delivery_date": g.delivery_date.isoformat() if g.delivery_date else None,
        "minimum_participants": g.minimum_participants,
        "current_participants": g.current_participants,
        "status": g.status.value if hasattr(g.status, "value") else g.status,
        "expires_at": g.expires_at.isoformat() if g.expires_at else None,
        "created_at": g.created_at.isoformat() if g.created_at else None,
    }


def _part_dict(p: GroupOrderParticipant) -> dict:
    return {
        "id": str(p.id),
        "group_order_id": str(p.group_order_id),
        "user_id": str(p.user_id),
        "items_json": p.items_json,
        "total_amount": float(p.total_amount),
        "status": p.status.value if hasattr(p.status, "value") else p.status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.post("/", response_model=ApiResponse[dict])
async def create_group_order(payload: GroupOrderCreate, db: SessionDep, user: CurrentUser):
    go = GroupOrder(
        creator_id=user.id,
        title=payload.title,
        description=payload.description,
        delivery_address_json=payload.delivery_address_json,
        delivery_date=payload.delivery_date,
        minimum_participants=payload.minimum_participants,
        current_participants=1,
        expires_at=payload.expires_at,
    )
    db.add(go)
    await db.flush()
    creator_participant = GroupOrderParticipant(
        group_order_id=go.id,
        user_id=user.id,
        items_json=[],
        total_amount=0,
        status=ParticipantStatus.JOINED,
    )
    db.add(creator_participant)
    await db.commit()
    await db.refresh(go)
    return ApiResponse(data=_go_dict(go), message="Group order created.")


@router.get("/", response_model=ApiResponse[list[dict]])
async def list_group_orders(db: SessionDep, user: CurrentUser):
    rows = (await db.execute(select(GroupOrder).order_by(GroupOrder.created_at.desc()))).scalars().unique().all()
    return ApiResponse(data=[_go_dict(g) for g in rows])


@router.get("/{group_order_id}", response_model=ApiResponse[dict])
async def get_group_order(group_order_id: str, db: SessionDep, user: CurrentUser):
    go = (await db.execute(select(GroupOrder).where(GroupOrder.id == uuid.UUID(group_order_id)))).scalar_one_or_none()
    if go is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Group order not found")
    participants = (
        await db.execute(select(GroupOrderParticipant).where(GroupOrderParticipant.group_order_id == go.id))
    ).scalars().all()
    data = _go_dict(go)
    data["participants"] = [_part_dict(p) for p in participants]
    return ApiResponse(data=data)


@router.post("/{group_order_id}/join", response_model=ApiResponse[dict])
async def join_group_order(group_order_id: str, payload: JoinRequest, db: SessionDep, user: CurrentUser):
    go = (await db.execute(select(GroupOrder).where(GroupOrder.id == uuid.UUID(group_order_id)))).scalar_one_or_none()
    if go is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Group order not found")
    if go.status != GroupOrderStatus.OPEN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Group order is {go.status.value}.")

    existing = (
        await db.execute(
            select(GroupOrderParticipant).where(
                GroupOrderParticipant.group_order_id == go.id,
                GroupOrderParticipant.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="You already joined this group order.")

    participant = GroupOrderParticipant(
        group_order_id=go.id,
        user_id=user.id,
        items_json=payload.items_json,
        total_amount=payload.total_amount,
        status=ParticipantStatus.JOINED,
    )
    db.add(participant)
    go.current_participants += 1
    if go.current_participants >= go.minimum_participants:
        go.status = GroupOrderStatus.CLOSED
    await db.commit()
    await db.refresh(participant)
    return ApiResponse(data=_part_dict(participant), message="Joined group order.")


@router.post("/{group_order_id}/leave", response_model=ApiResponse[dict])
async def leave_group_order(group_order_id: str, db: SessionDep, user: CurrentUser):
    go = (await db.execute(select(GroupOrder).where(GroupOrder.id == uuid.UUID(group_order_id)))).scalar_one_or_none()
    if go is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Group order not found")

    participant = (
        await db.execute(
            select(GroupOrderParticipant).where(
                GroupOrderParticipant.group_order_id == go.id,
                GroupOrderParticipant.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if participant is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="You have not joined this group order.")

    await db.delete(participant)
    go.current_participants = max(0, go.current_participants - 1)
    if go.current_participants < go.minimum_participants:
        go.status = GroupOrderStatus.OPEN
    await db.commit()
    return ApiResponse(data={"left": True}, message="Left the group order.")


@router.post("/{group_order_id}/confirm", response_model=ApiResponse[dict])
async def confirm_group_order(group_order_id: str, db: SessionDep, user: CurrentUser):
    go = (await db.execute(select(GroupOrder).where(GroupOrder.id == uuid.UUID(group_order_id)))).scalar_one_or_none()
    if go is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Group order not found")
    if go.creator_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only the creator can confirm.")
    if go.current_participants < go.minimum_participants:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Need {go.minimum_participants} participants, have {go.current_participants}.",
        )
    go.status = GroupOrderStatus.CLOSED
    await db.commit()
    await db.refresh(go)
    return ApiResponse(data=_go_dict(go), message="Group order closed and confirmed.")