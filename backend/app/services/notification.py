"""Notification service with pluggable providers (in-app, SMS, email, WhatsApp)."""
from __future__ import annotations

import abc
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.notification import (
    Notification,
    NotificationChannel,
    NotificationType,
)
from app.utils.validators import ValidationError


class NotificationProvider(abc.ABC):
    """Abstract provider interface — implement one per channel backend."""

    name: str = "abstract"

    @abc.abstractmethod
    async def send(self, *, to: str, title: str, message: str, data: dict[str, Any] | None = None) -> bool:
        raise NotImplementedError


class ConsoleProvider(NotificationProvider):
    """Logs messages to the console. Default for local development."""

    name = "console"

    async def send(self, *, to: str, title: str, message: str, data: dict[str, Any] | None = None) -> bool:
        print(f"[{self.name}] to={to} title={title} message={message}")
        return True


class MockSMSProvider(NotificationProvider):
    name = "mock_sms"

    async def send(self, *, to: str, title: str, message: str, data: dict[str, Any] | None = None) -> bool:
        print(f"[SMS] -> {to}: {message}")
        return True


class HttpProvider(NotificationProvider):
    """Generic provider that POSTs to a configurable webhook endpoint."""

    name = "http"
    endpoint: str = ""
    api_key: str = ""

    async def send(self, *, to: str, title: str, message: str, data: dict[str, Any] | None = None) -> bool:
        if not self.endpoint:
            return False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    self.endpoint,
                    json={
                        "to": to,
                        "title": title,
                        "message": message,
                        "data": data or {},
                    },
                    headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
                )
                resp.raise_for_status()
                return True
        except Exception as exc:
            print(f"[{self.name}] send failed: {exc}")
            return False


class NotificationService:
    """Delivers notifications across channels with pluggable providers."""

    _providers: dict[str, NotificationProvider] = {
        "in_app": ConsoleProvider(),
        "sms": MockSMSProvider(),
        "email": ConsoleProvider(),
        "whatsapp": ConsoleProvider(),
        "push": ConsoleProvider(),
    }

    @classmethod
    def register_provider(cls, channel: str, provider: NotificationProvider) -> None:
        cls._providers[channel] = provider

    @classmethod
    async def _deliver(cls, *, to: str, channel: str, title: str, message: str, data: dict[str, Any] | None) -> bool:
        provider = cls._providers.get(channel)
        if provider is None:
            return False
        try:
            return await provider.send(to=to, title=title, message=message, data=data)
        except Exception:
            return False

    @classmethod
    async def create_notification(
        cls,
        db: AsyncSession,
        *,
        recipient_id: uuid.UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        channel: NotificationChannel = NotificationChannel.IN_APP,
        title_tamil: str | None = None,
        message_tamil: str | None = None,
        data_json: dict[str, Any] | None = None,
        sent_at: bool = True,
    ) -> Notification:
        notification = Notification(
            user_id=recipient_id,
            type=notification_type,
            title=title,
            title_tamil=title_tamil,
            message=message,
            message_tamil=message_tamil,
            data_json=data_json,
            channel=channel,
            sent_at=datetime.now(timezone.utc) if sent_at else None,
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        # Fire-and-forget delivery to external channels unless it's in-app.
        if channel != NotificationChannel.IN_APP:
            await cls._deliver(
                to=str(recipient_id),
                channel=channel.value,
                title=title,
                message=message,
                data=data_json or {},
            )
        return notification

    @classmethod
    async def send_to_user(
        cls,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        notification_type: str,
        title: str,
        message: str,
        channel: str = "in_app",
        title_tamil: str | None = None,
        message_tamil: str | None = None,
        data_json: dict[str, Any] | None = None,
    ) -> Notification:
        try:
            ntype = NotificationType(notification_type)
        except ValueError:
            ntype = NotificationType.SYSTEM
        try:
            nchannel = NotificationChannel(channel)
        except ValueError:
            nchannel = NotificationChannel.IN_APP

        return await cls.create_notification(
            db,
            recipient_id=user_id,
            notification_type=ntype,
            title=title,
            message=message,
            channel=nchannel,
            title_tamil=title_tamil,
            message_tamil=message_tamil,
            data_json=data_json,
            sent_at=True,
        )

    # ---------- Queries ----------

    @staticmethod
    async def list_for_user(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def mark_read(db: AsyncSession, notification: Notification, *, read: bool = True) -> Notification:
        notification.is_read = read
        await db.commit()
        await db.refresh(notification)
        return notification

    @staticmethod
    async def get(db: AsyncSession, notification_id: uuid.UUID, *, user_id: uuid.UUID | None = None) -> Notification | None:
        stmt = select(Notification).where(Notification.id == notification_id)
        if user_id:
            stmt = stmt.where(Notification.user_id == user_id)
        return (await db.execute(stmt)).scalar_one_or_none()