from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_KHACH_HANG, require_roles
from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
from app.models.lich_hen_tiem import LichHenTiem
from app.models.lich_su_tiem import LichSuTiem
from app.models.nguoi_dung import NguoiDung
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate


router = APIRouter(prefix="/profiles", tags=["Profiles"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentCustomer = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_KHACH_HANG)),
]


def get_owned_profile(
    profile_id: int,
    user_id: int,
    db: Session,
) -> HoSoNguoiTiem:
    profile = db.scalar(
        select(HoSoNguoiTiem).where(
            HoSoNguoiTiem.ma_ho_so == profile_id,
            HoSoNguoiTiem.ma_nguoi_dung == user_id,
        )
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ người tiêm",
        )
    return profile


@router.post(
    "",
    response_model=ProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_profile(
    payload: ProfileCreate,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> HoSoNguoiTiem:
    profile = HoSoNguoiTiem(
        **payload.model_dump(),
        ma_nguoi_dung=current_user.ma_nguoi_dung,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=list[ProfileResponse])
def list_profiles(
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> list[HoSoNguoiTiem]:
    return list(
        db.scalars(
            select(HoSoNguoiTiem)
            .where(
                HoSoNguoiTiem.ma_nguoi_dung
                == current_user.ma_nguoi_dung
            )
            .order_by(HoSoNguoiTiem.ma_ho_so.asc())
        )
    )


@router.get("/{ma_ho_so}", response_model=ProfileResponse)
def get_profile(
    ma_ho_so: int,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> HoSoNguoiTiem:
    return get_owned_profile(ma_ho_so, current_user.ma_nguoi_dung, db)


@router.put("/{ma_ho_so}", response_model=ProfileResponse)
def update_profile(
    ma_ho_so: int,
    payload: ProfileUpdate,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> HoSoNguoiTiem:
    profile = get_owned_profile(ma_ho_so, current_user.ma_nguoi_dung, db)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field_name, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{ma_ho_so}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    ma_ho_so: int,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> Response:
    profile = get_owned_profile(ma_ho_so, current_user.ma_nguoi_dung, db)

    has_appointments = db.scalar(
        select(exists().where(LichHenTiem.ma_ho_so == profile.ma_ho_so))
    )
    has_vaccination_history = db.scalar(
        select(exists().where(LichSuTiem.ma_ho_so == profile.ma_ho_so))
    )
    if has_appointments or has_vaccination_history:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể xóa hồ sơ đã có dữ liệu tiêm chủng hoặc lịch hẹn"
            ),
        )

    db.delete(profile)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể xóa hồ sơ đã có dữ liệu tiêm chủng hoặc lịch hẹn"
            ),
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
