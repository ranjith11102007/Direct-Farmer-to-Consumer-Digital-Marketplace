"""Auth API routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.encoders import jsonable_encoder

from app.api.deps import CurrentUser, RateLimitAuth, SessionDep
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    OtpSendOut,
    RefreshRequest,
    RegisterRequest,
    SendOtpRequest,
    TokenOut,
    UserOut,
    VerifyOtpRequest,
)
from app.schemas.common import ApiResponse
from app.models.farmer import FarmerProfile
from app.services.auth import AuthService
from app.models.user import UserRole
from app.utils.validators import ValidationError
import uuid

router = APIRouter(prefix="/auth", tags=["Auth"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ValidationError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Internal server error",
    )


_ROLE_ALIASES: dict[str, UserRole] = {
    "consumer": UserRole.CONSUMER,
    "farmer": UserRole.FARMER,
    "fpo": UserRole.FPO_ADMIN,
    "fpo_admin": UserRole.FPO_ADMIN,
    "bulk_buyer": UserRole.BULK_BUYER,
    "delivery_partner": UserRole.DELIVERY_PARTNER,
    "delivery": UserRole.DELIVERY_PARTNER,
    "collection_center_operator": UserRole.COLLECTION_CENTER_OPERATOR,
    "admin": UserRole.ADMIN,
}


@router.post(
    "/register",
    response_model=ApiResponse[TokenOut],
    dependencies=[RateLimitAuth],
)
async def register(payload: RegisterRequest, db: SessionDep):
    role = _ROLE_ALIASES.get(payload.role.lower(), UserRole.CONSUMER)
    data, error = await AuthService.register(
        db,
        email=payload.email or "",
        phone=payload.phone,
        password=payload.password,
        full_name=payload.full_name,
        role=role,
        preferred_language=payload.preferred_language,
    )
    if error:
        raise _http_error(error)
    if role in (UserRole.FARMER, UserRole.FPO_ADMIN):
        user_id = uuid.UUID(data["user"]["id"])
        profile = FarmerProfile(
            user_id=user_id,
            farm_name=payload.full_name,
            district="",
            state="",
            verification_status="draft",
        )
        db.add(profile)
        await db.commit()
    return ApiResponse(data=jsonable_encoder(data), message="Registration successful.")


@router.post(
    "/send-otp",
    response_model=ApiResponse[OtpSendOut],
    dependencies=[RateLimitAuth],
)
async def send_otp(payload: SendOtpRequest, db: SessionDep):
    data, error = await AuthService.send_otp(db, payload.phone)
    if error:
        raise _http_error(error)
    return ApiResponse(data=data, message="OTP sent.")


@router.post(
    "/verify-otp",
    response_model=ApiResponse[TokenOut],
    dependencies=[RateLimitAuth],
)
async def verify_otp(payload: VerifyOtpRequest, db: SessionDep):
    data, error = await AuthService.verify_otp(
        db,
        phone=payload.phone,
        otp=payload.otp,
        register_if_missing=payload.register_if_missing,
        full_name=payload.full_name,
        preferred_language=payload.preferred_language,
    )
    if error:
        raise _http_error(error)
    return ApiResponse(data=jsonable_encoder(data), message="OTP verified.")


@router.post(
    "/login",
    response_model=ApiResponse[TokenOut],
    dependencies=[RateLimitAuth],
)
async def login(payload: LoginRequest, db: SessionDep):
    data, error = await AuthService.login(db, identifier=payload.identifier, password=payload.password)
    if error:
        raise _http_error(error)
    return ApiResponse(data=jsonable_encoder(data), message="Login successful.")


@router.post(
    "/refresh",
    response_model=ApiResponse[dict],
    dependencies=[RateLimitAuth],
)
async def refresh(payload: RefreshRequest, db: SessionDep):
    data, error = await AuthService.refresh_token(db, payload.refresh_token)
    if error:
        raise _http_error(error)
    return ApiResponse(data=data, message="Token refreshed.")


@router.post("/logout", response_model=ApiResponse[dict])
async def logout(payload: LogoutRequest, db: SessionDep):
    await AuthService.logout(db, payload.access_token)
    return ApiResponse(data={"logged_out": True}, message="Logged out.")


@router.get(
    "/me",
    response_model=ApiResponse[UserOut],
)
async def me(user: CurrentUser):
    return ApiResponse(
        data=UserOut.model_validate(user).model_dump(mode="json"),
        message="Current user profile.",
    )