"""Common Pydantic schemas: pagination, responses, errors."""
from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    message: str | None = None
    meta: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    code: str | None = None
    details: Any | None = None


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class Coordinates(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class IdResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Any = None