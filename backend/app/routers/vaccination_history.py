from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_KHACH_HANG, require_roles
from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
from app.models.lich_su_tiem import LichSuTiem
from app.models.lo_vac_xin import LoVacXin
from app.models.nguoi_dung import NguoiDung
from app.models.vac_xin import VacXin
from app.schemas.vaccination_history import VaccinationHistoryResponse


router = APIRouter(
    prefix="/vaccination-history",
    tags=["Vaccination History"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentCustomer = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_KHACH_HANG)),
]


def vaccination_history_statement():
    return (
        select(
            LichSuTiem.ma_lich_su,
            LichSuTiem.ma_ho_so,
            HoSoNguoiTiem.ho_ten.label("ho_ten_nguoi_tiem"),
            LichSuTiem.ma_chi_tiet_lich_hen,
            LichSuTiem.ma_vac_xin,
            VacXin.ten_vac_xin,
            LichSuTiem.so_thu_tu_mui,
            LichSuTiem.ma_lo,
            LoVacXin.so_lo,
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
    )


def build_history_response(row: Any) -> VaccinationHistoryResponse:
    return VaccinationHistoryResponse.model_validate(row._mapping)


@router.get("", response_model=list[VaccinationHistoryResponse])
def list_vaccination_history(
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> list[VaccinationHistoryResponse]:
    rows = db.execute(
        vaccination_history_statement()
        .where(
            HoSoNguoiTiem.ma_nguoi_dung
            == current_user.ma_nguoi_dung
        )
        .order_by(
            LichSuTiem.ngay_tiem.desc(),
            LichSuTiem.ma_lich_su.desc(),
        )
    ).all()
    return [build_history_response(row) for row in rows]


@router.get(
    "/profile/{ma_ho_so}",
    response_model=list[VaccinationHistoryResponse],
)
def list_profile_vaccination_history(
    ma_ho_so: int,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> list[VaccinationHistoryResponse]:
    owned_profile_id = db.scalar(
        select(HoSoNguoiTiem.ma_ho_so).where(
            HoSoNguoiTiem.ma_ho_so == ma_ho_so,
            HoSoNguoiTiem.ma_nguoi_dung
            == current_user.ma_nguoi_dung,
        )
    )
    if owned_profile_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ người tiêm",
        )

    rows = db.execute(
        vaccination_history_statement()
        .where(LichSuTiem.ma_ho_so == owned_profile_id)
        .order_by(
            LichSuTiem.ngay_tiem.desc(),
            LichSuTiem.ma_lich_su.desc(),
        )
    ).all()
    return [build_history_response(row) for row in rows]


@router.get(
    "/{ma_lich_su}",
    response_model=VaccinationHistoryResponse,
)
def get_vaccination_history_detail(
    ma_lich_su: int,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> VaccinationHistoryResponse:
    row = db.execute(
        vaccination_history_statement().where(
            LichSuTiem.ma_lich_su == ma_lich_su,
            HoSoNguoiTiem.ma_nguoi_dung
            == current_user.ma_nguoi_dung,
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch sử tiêm",
        )
    return build_history_response(row)
