"""User / farmer / FPO schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    preferred_language: str | None = None
    avatar_url: str | None = None


class FarmerProfileCreate(BaseModel):
    farm_name: str
    farm_latitude: float | None = Field(default=None, ge=-90, le=90)
    farm_longitude: float | None = Field(default=None, ge=-180, le=180)
    farm_address: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    land_size_acres: float | None = Field(default=None, gt=0)
    crops_grown: list[str] | None = None
    bank_account_number: str | None = None
    bank_ifsc: str | None = None
    bank_name: str | None = None
    identity_doc_url: str | None = None
    land_doc_url: str | None = None


class FarmerProfileUpdate(BaseModel):
    farm_name: str | None = None
    farm_latitude: float | None = Field(default=None, ge=-90, le=90)
    farm_longitude: float | None = Field(default=None, ge=-180, le=180)
    farm_address: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    land_size_acres: float | None = Field(default=None, gt=0)
    crops_grown: list[str] | None = None
    bank_account_number: str | None = None
    bank_ifsc: str | None = None
    bank_name: str | None = None


class FarmerProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    farm_name: str
    farm_latitude: float | None = None
    farm_longitude: float | None = None
    farm_address: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    land_size_acres: float | None = None
    crops_grown: list | None = None
    bank_account_number: str | None = None
    bank_ifsc: str | None = None
    bank_name: str | None = None
    verification_status: str
    rating: float
    total_sales: float


class FPOCreate(BaseModel):
    name: str
    registration_number: str
    district: str | None = None
    state: str | None = None
    address: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    logo_url: str | None = None


class FPOOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    registration_number: str
    district: str | None = None
    state: str | None = None
    address: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    logo_url: str | None = None
    verification_status: str


class VerificationSubmit(BaseModel):
    identity_doc_url: str | None = None
    land_doc_url: str | None = None