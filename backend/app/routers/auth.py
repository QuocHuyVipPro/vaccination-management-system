from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.dependencies.auth import (
    ROLE_KHACH_HANG,
    ROLE_NHAN_VIEN,
    ROLE_QUAN_TRI_VIEN,
    get_current_user,
    require_roles,
)
from app.models.nguoi_dung import NguoiDung
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> NguoiDung:
    existing_user = db.scalar(
        select(NguoiDung).where(NguoiDung.email == str(payload.email))
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng",
        )

    user = NguoiDung(
        ho_ten=payload.ho_ten,
        email=str(payload.email),
        so_dien_thoai=payload.so_dien_thoai,
        mat_khau=hash_password(payload.mat_khau),
        vai_tro="KHACH_HANG",
        trang_thai=True,
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng",
        ) from exc

    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(
        select(NguoiDung).where(NguoiDung.email == str(payload.email))
    )
    if user is None or not verify_password(payload.mat_khau, user.mat_khau):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.trang_thai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa",
        )

    access_token = create_access_token(
        subject=user.ma_nguoi_dung,
        extra_claims={"role": user.vai_tro},
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: NguoiDung = Depends(get_current_user)) -> NguoiDung:
    return current_user


@router.get("/test/customer")
def test_customer(
    current_user: NguoiDung = Depends(require_roles(ROLE_KHACH_HANG)),
) -> dict[str, str]:
    return {"status": "ok", "role": current_user.vai_tro}


@router.get("/test/staff")
def test_staff(
    current_user: NguoiDung = Depends(require_roles(ROLE_NHAN_VIEN)),
) -> dict[str, str]:
    return {"status": "ok", "role": current_user.vai_tro}


@router.get("/test/admin")
def test_admin(
    current_user: NguoiDung = Depends(require_roles(ROLE_QUAN_TRI_VIEN)),
) -> dict[str, str]:
    return {"status": "ok", "role": current_user.vai_tro}


@router.get("/test/staff-or-admin")
def test_staff_or_admin(
    current_user: NguoiDung = Depends(
        require_roles(ROLE_NHAN_VIEN, ROLE_QUAN_TRI_VIEN)
    ),
) -> dict[str, str]:
    return {"status": "ok", "role": current_user.vai_tro}
