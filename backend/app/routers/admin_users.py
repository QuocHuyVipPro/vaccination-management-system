from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import get_db
from app.dependencies.auth import ROLE_QUAN_TRI_VIEN, require_roles
from app.models.nguoi_dung import NguoiDung
from app.schemas.admin_user import (
    AdminPasswordReset,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserRole,
    AdminUserUpdate,
)


router = APIRouter(prefix="/admin/users", tags=["Admin Users"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentAdmin = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_QUAN_TRI_VIEN)),
]


def get_user_or_404(user_id: int, db: Session) -> NguoiDung:
    user = db.get(NguoiDung, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản",
        )
    return user


def ensure_email_available(
    email: str,
    db: Session,
    *,
    exclude_user_id: int | None = None,
) -> None:
    statement = select(NguoiDung.ma_nguoi_dung).where(
        NguoiDung.email == email
    )
    if exclude_user_id is not None:
        statement = statement.where(
            NguoiDung.ma_nguoi_dung != exclude_user_id
        )
    if db.scalar(statement) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng",
        )


@router.get("", response_model=list[AdminUserResponse])
def list_users(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
    vai_tro: Annotated[AdminUserRole | None, Query()] = None,
    trang_thai: Annotated[bool | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=150)] = None,
) -> list[NguoiDung]:
    statement = select(NguoiDung)
    if vai_tro is not None:
        statement = statement.where(NguoiDung.vai_tro == vai_tro)
    if trang_thai is not None:
        statement = statement.where(NguoiDung.trang_thai == trang_thai)
    if search is not None and (normalized_search := search.strip()):
        pattern = f"%{normalized_search}%"
        statement = statement.where(
            or_(
                NguoiDung.ho_ten.ilike(pattern),
                NguoiDung.email.ilike(pattern),
                NguoiDung.so_dien_thoai.ilike(pattern),
            )
        )
    return list(
        db.scalars(statement.order_by(NguoiDung.ma_nguoi_dung.asc()))
    )


@router.post(
    "",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: AdminUserCreate,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> NguoiDung:
    normalized_email = str(payload.email)
    ensure_email_available(normalized_email, db)
    user = NguoiDung(
        ho_ten=payload.ho_ten,
        email=normalized_email,
        so_dien_thoai=payload.so_dien_thoai,
        mat_khau=hash_password(payload.mat_khau),
        vai_tro=payload.vai_tro,
        trang_thai=payload.trang_thai,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng",
        ) from exc
    return user


@router.get("/{ma_nguoi_dung}", response_model=AdminUserResponse)
def get_user_detail(
    ma_nguoi_dung: int,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> NguoiDung:
    return get_user_or_404(ma_nguoi_dung, db)


@router.patch(
    "/{ma_nguoi_dung}",
    response_model=AdminUserResponse,
)
def update_user(
    ma_nguoi_dung: int,
    payload: AdminUserUpdate,
    current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> NguoiDung:
    user = get_user_or_404(ma_nguoi_dung, db)
    changes = payload.model_dump(exclude_unset=True)

    if user.ma_nguoi_dung == current_admin.ma_nguoi_dung:
        if changes.get("trang_thai") is False:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Admin không thể tự vô hiệu hóa tài khoản hiện tại",
            )
        if (
            "vai_tro" in changes
            and changes["vai_tro"] != ROLE_QUAN_TRI_VIEN
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Admin không thể tự thay đổi vai trò hiện tại",
            )

    if "email" in changes:
        ensure_email_available(
            changes["email"],
            db,
            exclude_user_id=user.ma_nguoi_dung,
        )

    for field_name, value in changes.items():
        setattr(user, field_name, value)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng",
        ) from exc
    return user


@router.patch(
    "/{ma_nguoi_dung}/password",
    response_model=AdminUserResponse,
)
def reset_user_password(
    ma_nguoi_dung: int,
    payload: AdminPasswordReset,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> NguoiDung:
    user = get_user_or_404(ma_nguoi_dung, db)
    user.mat_khau = hash_password(payload.mat_khau_moi)
    db.commit()
    db.refresh(user)
    return user
