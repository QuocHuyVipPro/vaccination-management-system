from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_NHAN_VIEN, require_roles
from app.models.chi_tiet_lich_hen import ChiTietLichHen
from app.models.giao_dich_kho import GiaoDichKho
from app.models.lich_hen_tiem import LichHenTiem
from app.models.lich_su_tiem import LichSuTiem
from app.models.lo_vac_xin import LoVacXin
from app.models.nguoi_dung import NguoiDung
from app.models.phac_do_tiem import PhacDoTiem
from app.models.vac_xin import VacXin
from app.schemas.staff_vaccination import (
    StaffAvailableBatchResponse,
    StaffVaccinationCreate,
    StaffVaccinationResponse,
)


router = APIRouter(
    prefix="/staff/vaccinations",
    tags=["Staff Vaccinations"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentStaff = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_NHAN_VIEN)),
]


@router.get(
    "/available-batches",
    response_model=list[StaffAvailableBatchResponse],
)
def list_available_batches(
    _current_staff: CurrentStaff,
    db: DatabaseSession,
    ma_vac_xin: Annotated[int, Query(gt=0)],
) -> list[LoVacXin]:
    return list(
        db.scalars(
            select(LoVacXin)
            .where(
                LoVacXin.ma_vac_xin == ma_vac_xin,
                LoVacXin.trang_thai == "DANG_SU_DUNG",
                LoVacXin.han_su_dung >= date.today(),
                LoVacXin.so_luong_con > 0,
            )
            .order_by(
                LoVacXin.han_su_dung.asc(),
                LoVacXin.ma_lo.asc(),
            )
        )
    )


@router.post(
    "",
    response_model=StaffVaccinationResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_vaccination(
    payload: StaffVaccinationCreate,
    current_user: CurrentStaff,
    db: DatabaseSession,
) -> StaffVaccinationResponse:
    try:
        detail = db.scalar(
            select(ChiTietLichHen)
            .where(
                ChiTietLichHen.ma_chi_tiet
                == payload.ma_chi_tiet_lich_hen
            )
            .with_for_update()
        )
        if detail is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy chi tiết lịch hẹn",
            )

        appointment = db.scalar(
            select(LichHenTiem)
            .where(LichHenTiem.ma_lich_hen == detail.ma_lich_hen)
            .with_for_update()
        )
        if appointment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lịch hẹn",
            )
        if appointment.trang_thai != "DA_XAC_NHAN":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Không thể ghi nhận tiêm ở trạng thái lịch hẹn hiện tại",
            )

        existing_history = db.scalar(
            select(LichSuTiem.ma_lich_su).where(
                LichSuTiem.ma_chi_tiet_lich_hen == detail.ma_chi_tiet
            )
        )
        if existing_history is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mũi tiêm này đã được ghi nhận",
            )

        vaccine = db.get(VacXin, detail.ma_vac_xin)
        batch = db.scalar(
            select(LoVacXin)
            .where(LoVacXin.ma_lo == payload.ma_lo)
            .with_for_update()
        )
        if batch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lô vắc xin",
            )
        if batch.ma_vac_xin != detail.ma_vac_xin:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Lô vắc xin không phù hợp với vắc xin của lịch hẹn",
            )
        if (
            batch.trang_thai != "DANG_SU_DUNG"
            or batch.han_su_dung < date.today()
            or batch.so_luong_con <= 0
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Lô vắc xin không còn đủ điều kiện sử dụng",
            )

        vaccination_time = datetime.now()
        next_schedule = db.scalar(
            select(PhacDoTiem).where(
                PhacDoTiem.ma_vac_xin == detail.ma_vac_xin,
                PhacDoTiem.so_thu_tu_mui
                == detail.so_thu_tu_mui + 1,
            )
        )
        next_dose_date = None
        if next_schedule is not None:
            next_dose_date = vaccination_time.date() + timedelta(
                days=next_schedule.khoang_cach_ngay
            )

        history = LichSuTiem(
            ma_ho_so=appointment.ma_ho_so,
            ma_chi_tiet_lich_hen=detail.ma_chi_tiet,
            ma_vac_xin=detail.ma_vac_xin,
            ma_lo=batch.ma_lo,
            ma_nhan_vien=current_user.ma_nguoi_dung,
            so_thu_tu_mui=detail.so_thu_tu_mui,
            ngay_tiem=vaccination_time,
            ngay_du_kien_mui_tiep=next_dose_date,
            phan_ung_sau_tiem=payload.phan_ung_sau_tiem,
            ghi_chu=payload.ghi_chu,
        )
        db.add(history)
        db.flush()

        batch.so_luong_con -= 1
        db.add(
            GiaoDichKho(
                ma_lo=batch.ma_lo,
                loai_giao_dich="XUAT_TIEM",
                so_luong=1,
                loai_tham_chieu="LICH_SU_TIEM",
                ma_tham_chieu=history.ma_lich_su,
                nguoi_thuc_hien=current_user.ma_nguoi_dung,
                ghi_chu="Xuất kho cho tiêm chủng",
            )
        )
        db.flush()

        appointment_detail_ids = set(
            db.scalars(
                select(ChiTietLichHen.ma_chi_tiet).where(
                    ChiTietLichHen.ma_lich_hen
                    == appointment.ma_lich_hen
                )
            )
        )
        recorded_detail_ids = set(
            db.scalars(
                select(LichSuTiem.ma_chi_tiet_lich_hen).where(
                    LichSuTiem.ma_chi_tiet_lich_hen.in_(
                        appointment_detail_ids
                    )
                )
            )
        )
        if appointment_detail_ids and appointment_detail_ids <= recorded_detail_ids:
            appointment.trang_thai = "HOAN_THANH"

        db.commit()
        db.refresh(history)
        db.refresh(appointment)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể ghi nhận mũi tiêm",
        ) from exc

    return StaffVaccinationResponse(
        ma_lich_su=history.ma_lich_su,
        ma_ho_so=history.ma_ho_so,
        ma_chi_tiet_lich_hen=history.ma_chi_tiet_lich_hen,
        ma_vac_xin=history.ma_vac_xin,
        ten_vac_xin=vaccine.ten_vac_xin,
        ma_lo=history.ma_lo,
        so_lo=batch.so_lo,
        ma_nhan_vien=history.ma_nhan_vien,
        so_thu_tu_mui=history.so_thu_tu_mui,
        ngay_tiem=history.ngay_tiem,
        ngay_du_kien_mui_tiep=history.ngay_du_kien_mui_tiep,
        phan_ung_sau_tiem=history.phan_ung_sau_tiem,
        ghi_chu=history.ghi_chu,
        trang_thai_lich_hen=appointment.trang_thai,
    )
