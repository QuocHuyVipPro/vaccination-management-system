from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_KHACH_HANG, require_roles
from app.models.chi_tiet_lich_hen import ChiTietLichHen
from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
from app.models.lich_hen_tiem import LichHenTiem
from app.models.nguoi_dung import NguoiDung
from app.models.phac_do_tiem import PhacDoTiem
from app.models.vac_xin import VacXin
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDetailResponse,
    AppointmentItemResponse,
    AppointmentResponse,
)


router = APIRouter(prefix="/appointments", tags=["Appointments"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentCustomer = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_KHACH_HANG)),
]

CANCELLABLE_STATUSES = frozenset({"CHO_XAC_NHAN", "DA_XAC_NHAN"})


def get_owned_profile(profile_id: int, user_id: int, db: Session) -> HoSoNguoiTiem:
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


def get_owned_appointment(
    appointment_id: int,
    user_id: int,
    db: Session,
) -> LichHenTiem:
    appointment = db.scalar(
        select(LichHenTiem)
        .join(
            HoSoNguoiTiem,
            HoSoNguoiTiem.ma_ho_so == LichHenTiem.ma_ho_so,
        )
        .where(
            LichHenTiem.ma_lich_hen == appointment_id,
            HoSoNguoiTiem.ma_nguoi_dung == user_id,
        )
    )
    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch hẹn",
        )
    return appointment


def build_appointment_detail(
    appointment: LichHenTiem,
    db: Session,
) -> AppointmentDetailResponse:
    rows = db.execute(
        select(
            ChiTietLichHen.ma_chi_tiet,
            ChiTietLichHen.ma_vac_xin,
            VacXin.ten_vac_xin,
            ChiTietLichHen.so_thu_tu_mui,
            PhacDoTiem.ten_mui,
        )
        .join(VacXin, VacXin.ma_vac_xin == ChiTietLichHen.ma_vac_xin)
        .outerjoin(
            PhacDoTiem,
            and_(
                PhacDoTiem.ma_vac_xin == ChiTietLichHen.ma_vac_xin,
                PhacDoTiem.so_thu_tu_mui
                == ChiTietLichHen.so_thu_tu_mui,
            ),
        )
        .where(ChiTietLichHen.ma_lich_hen == appointment.ma_lich_hen)
        .order_by(
            ChiTietLichHen.ma_vac_xin.asc(),
            ChiTietLichHen.so_thu_tu_mui.asc(),
            ChiTietLichHen.ma_chi_tiet.asc(),
        )
    ).all()
    items = [
        AppointmentItemResponse(
            ma_chi_tiet=row.ma_chi_tiet,
            ma_vac_xin=row.ma_vac_xin,
            ten_vac_xin=row.ten_vac_xin,
            so_thu_tu_mui=row.so_thu_tu_mui,
            ten_mui=row.ten_mui,
        )
        for row in rows
    ]
    return AppointmentDetailResponse(
        **AppointmentResponse.model_validate(appointment).model_dump(),
        items=items,
    )


@router.post(
    "",
    response_model=AppointmentDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    payload: AppointmentCreate,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> AppointmentDetailResponse:
    get_owned_profile(payload.ma_ho_so, current_user.ma_nguoi_dung, db)

    for item in payload.items:
        vaccine = db.scalar(
            select(VacXin).where(
                VacXin.ma_vac_xin == item.ma_vac_xin,
                VacXin.trang_thai.is_(True),
            )
        )
        if vaccine is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy vắc xin",
            )

        schedule_exists = db.scalar(
            select(PhacDoTiem.ma_phac_do).where(
                PhacDoTiem.ma_vac_xin == item.ma_vac_xin,
                PhacDoTiem.so_thu_tu_mui == item.so_thu_tu_mui,
            )
        )
        if schedule_exists is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Mũi tiêm không hợp lệ với phác đồ vắc xin",
            )

    appointment = LichHenTiem(
        ma_ho_so=payload.ma_ho_so,
        ngay_hen=payload.ngay_hen,
        gio_hen=payload.gio_hen,
        trang_thai="CHO_XAC_NHAN",
        ghi_chu=payload.ghi_chu,
    )
    try:
        db.add(appointment)
        db.flush()
        for item in payload.items:
            db.add(
                ChiTietLichHen(
                    ma_lich_hen=appointment.ma_lich_hen,
                    ma_vac_xin=item.ma_vac_xin,
                    so_thu_tu_mui=item.so_thu_tu_mui,
                )
            )
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo lịch hẹn",
        ) from exc

    db.refresh(appointment)
    return build_appointment_detail(appointment, db)


@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> list[LichHenTiem]:
    return list(
        db.scalars(
            select(LichHenTiem)
            .join(
                HoSoNguoiTiem,
                HoSoNguoiTiem.ma_ho_so == LichHenTiem.ma_ho_so,
            )
            .where(
                HoSoNguoiTiem.ma_nguoi_dung
                == current_user.ma_nguoi_dung
            )
            .order_by(
                LichHenTiem.ngay_hen.desc(),
                LichHenTiem.gio_hen.desc(),
                LichHenTiem.ma_lich_hen.desc(),
            )
        )
    )


@router.get("/{ma_lich_hen}", response_model=AppointmentDetailResponse)
def get_appointment_detail(
    ma_lich_hen: int,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> AppointmentDetailResponse:
    appointment = get_owned_appointment(
        ma_lich_hen,
        current_user.ma_nguoi_dung,
        db,
    )
    return build_appointment_detail(appointment, db)


@router.patch(
    "/{ma_lich_hen}/cancel",
    response_model=AppointmentDetailResponse,
)
def cancel_appointment(
    ma_lich_hen: int,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> AppointmentDetailResponse:
    appointment = get_owned_appointment(
        ma_lich_hen,
        current_user.ma_nguoi_dung,
        db,
    )
    if appointment.trang_thai not in CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Không thể hủy lịch hẹn ở trạng thái hiện tại",
        )

    appointment.trang_thai = "DA_HUY"
    db.commit()
    db.refresh(appointment)
    return build_appointment_detail(appointment, db)
