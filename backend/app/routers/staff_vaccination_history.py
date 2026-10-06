from datetime import date, datetime, time, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_NHAN_VIEN, require_roles
from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
from app.models.lich_su_tiem import LichSuTiem
from app.models.lo_vac_xin import LoVacXin
from app.models.nguoi_dung import NguoiDung
from app.models.vac_xin import VacXin
from app.schemas.staff_vaccination_history import (
    StaffVaccinationHistoryResponse,
)


router = APIRouter(
    prefix="/staff/vaccination-history",
    tags=["Staff Vaccination History"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentStaff = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_NHAN_VIEN)),
]


def staff_history_statement():
    return (
        select(
            LichSuTiem.ma_lich_su,
            LichSuTiem.ma_ho_so,
            HoSoNguoiTiem.ho_ten.label("ho_ten_nguoi_tiem"),
            HoSoNguoiTiem.ngay_sinh,
            HoSoNguoiTiem.gioi_tinh,
            HoSoNguoiTiem.so_dien_thoai,
            LichSuTiem.ma_chi_tiet_lich_hen,
            LichSuTiem.ma_vac_xin,
            VacXin.ten_vac_xin,
            LichSuTiem.so_thu_tu_mui,
            LichSuTiem.ma_lo,
            LoVacXin.so_lo,
            LichSuTiem.ma_nhan_vien,
            NguoiDung.ho_ten.label("ho_ten_nhan_vien"),
            LichSuTiem.ngay_tiem,
            LichSuTiem.ngay_du_kien_mui_tiep,
            LichSuTiem.phan_ung_sau_tiem,
            LichSuTiem.ghi_chu,
        )
        .join(
            HoSoNguoiTiem,
            HoSoNguoiTiem.ma_ho_so == LichSuTiem.ma_ho_so,
        )
        .join(VacXin, VacXin.ma_vac_xin == LichSuTiem.ma_vac_xin)
        .join(LoVacXin, LoVacXin.ma_lo == LichSuTiem.ma_lo)
        .join(
            NguoiDung,
            NguoiDung.ma_nguoi_dung == LichSuTiem.ma_nhan_vien,
        )
    )


def build_staff_history_response(
    row: Any,
) -> StaffVaccinationHistoryResponse:
    return StaffVaccinationHistoryResponse.model_validate(row._mapping)


def newest_first(statement):
    return statement.order_by(
        LichSuTiem.ngay_tiem.desc(),
        LichSuTiem.ma_lich_su.desc(),
    )


@router.get("", response_model=list[StaffVaccinationHistoryResponse])
def list_staff_vaccination_history(
    _current_staff: CurrentStaff,
    db: DatabaseSession,
    ma_ho_so: Annotated[int | None, Query(gt=0)] = None,
    ma_vac_xin: Annotated[int | None, Query(gt=0)] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    tu_ngay: Annotated[date | None, Query()] = None,
    den_ngay: Annotated[date | None, Query()] = None,
) -> list[StaffVaccinationHistoryResponse]:
    if tu_ngay is not None and den_ngay is not None and tu_ngay > den_ngay:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Từ ngày không được sau đến ngày",
        )

    statement = staff_history_statement()
    if ma_ho_so is not None:
        statement = statement.where(LichSuTiem.ma_ho_so == ma_ho_so)
    if ma_vac_xin is not None:
        statement = statement.where(LichSuTiem.ma_vac_xin == ma_vac_xin)
    if search is not None and (normalized_search := search.strip()):
        pattern = f"%{normalized_search}%"
        statement = statement.where(
            or_(
                HoSoNguoiTiem.ho_ten.ilike(pattern),
                HoSoNguoiTiem.so_dien_thoai.ilike(pattern),
            )
        )
    if tu_ngay is not None:
        statement = statement.where(
            LichSuTiem.ngay_tiem >= datetime.combine(tu_ngay, time.min)
        )
    if den_ngay is not None:
        statement = statement.where(
            LichSuTiem.ngay_tiem
            < datetime.combine(den_ngay + timedelta(days=1), time.min)
        )

    rows = db.execute(newest_first(statement)).all()
    return [build_staff_history_response(row) for row in rows]


@router.get(
    "/profile/{ma_ho_so}",
    response_model=list[StaffVaccinationHistoryResponse],
)
def list_staff_profile_vaccination_history(
    ma_ho_so: int,
    _current_staff: CurrentStaff,
    db: DatabaseSession,
) -> list[StaffVaccinationHistoryResponse]:
    if db.get(HoSoNguoiTiem, ma_ho_so) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ người tiêm",
        )
    rows = db.execute(
        newest_first(
            staff_history_statement().where(
                LichSuTiem.ma_ho_so == ma_ho_so
            )
        )
    ).all()
    return [build_staff_history_response(row) for row in rows]


@router.get(
    "/{ma_lich_su}",
    response_model=StaffVaccinationHistoryResponse,
)
def get_staff_vaccination_history_detail(
    ma_lich_su: int,
    _current_staff: CurrentStaff,
    db: DatabaseSession,
) -> StaffVaccinationHistoryResponse:
    row = db.execute(
        staff_history_statement().where(
            LichSuTiem.ma_lich_su == ma_lich_su
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch sử tiêm",
        )
    return build_staff_history_response(row)
