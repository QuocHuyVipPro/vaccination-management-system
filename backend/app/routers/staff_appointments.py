from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_NHAN_VIEN, require_roles
from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
from app.models.lich_hen_tiem import LichHenTiem
from app.models.nguoi_dung import NguoiDung
from app.routers.appointments import build_appointment_detail
from app.schemas.staff_appointment import (
    AppointmentStatus,
    StaffAppointmentResponse,
)


router = APIRouter(
    prefix="/staff/appointments",
    tags=["Staff Appointments"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentStaff = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_NHAN_VIEN)),
]


def get_appointment_with_profile(
    appointment_id: int,
    db: Session,
) -> tuple[LichHenTiem, HoSoNguoiTiem]:
    result = db.execute(
        select(LichHenTiem, HoSoNguoiTiem)
        .join(
            HoSoNguoiTiem,
            HoSoNguoiTiem.ma_ho_so == LichHenTiem.ma_ho_so,
        )
        .where(LichHenTiem.ma_lich_hen == appointment_id)
    ).one_or_none()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch hẹn",
        )
    return result


def build_staff_appointment_response(
    appointment: LichHenTiem,
    profile: HoSoNguoiTiem,
    db: Session,
) -> StaffAppointmentResponse:
    appointment_detail = build_appointment_detail(appointment, db)
    return StaffAppointmentResponse(
        ma_lich_hen=appointment.ma_lich_hen,
        ma_ho_so=appointment.ma_ho_so,
        ho_ten=profile.ho_ten,
        ngay_sinh=profile.ngay_sinh,
        gioi_tinh=profile.gioi_tinh,
        so_dien_thoai=profile.so_dien_thoai,
        ngay_hen=appointment.ngay_hen,
        gio_hen=appointment.gio_hen,
        trang_thai=appointment.trang_thai,
        ghi_chu=appointment.ghi_chu,
        ngay_tao=appointment.ngay_tao,
        ngay_cap_nhat=appointment.ngay_cap_nhat,
        items=appointment_detail.items,
    )


@router.get("", response_model=list[StaffAppointmentResponse])
def list_staff_appointments(
    _current_user: CurrentStaff,
    db: DatabaseSession,
    trang_thai: Annotated[AppointmentStatus | None, Query()] = None,
) -> list[StaffAppointmentResponse]:
    statement = select(LichHenTiem, HoSoNguoiTiem).join(
        HoSoNguoiTiem,
        HoSoNguoiTiem.ma_ho_so == LichHenTiem.ma_ho_so,
    )
    if trang_thai is not None:
        statement = statement.where(LichHenTiem.trang_thai == trang_thai)
    statement = statement.order_by(
        LichHenTiem.ngay_hen.asc(),
        LichHenTiem.gio_hen.asc(),
        LichHenTiem.ma_lich_hen.asc(),
    )
    rows = db.execute(statement).all()
    return [
        build_staff_appointment_response(appointment, profile, db)
        for appointment, profile in rows
    ]


@router.get("/{ma_lich_hen}", response_model=StaffAppointmentResponse)
def get_staff_appointment_detail(
    ma_lich_hen: int,
    _current_user: CurrentStaff,
    db: DatabaseSession,
) -> StaffAppointmentResponse:
    appointment, profile = get_appointment_with_profile(ma_lich_hen, db)
    return build_staff_appointment_response(appointment, profile, db)


@router.patch(
    "/{ma_lich_hen}/confirm",
    response_model=StaffAppointmentResponse,
)
def confirm_appointment(
    ma_lich_hen: int,
    _current_user: CurrentStaff,
    db: DatabaseSession,
) -> StaffAppointmentResponse:
    appointment, profile = get_appointment_with_profile(ma_lich_hen, db)
    if appointment.trang_thai != "CHO_XAC_NHAN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Không thể xác nhận lịch hẹn ở trạng thái hiện tại",
        )

    appointment.trang_thai = "DA_XAC_NHAN"
    db.commit()
    db.refresh(appointment)
    return build_staff_appointment_response(appointment, profile, db)
