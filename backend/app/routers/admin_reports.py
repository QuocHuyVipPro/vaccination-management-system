from datetime import date, datetime, time, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Date, case, cast, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_QUAN_TRI_VIEN, require_roles
from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
from app.models.lich_hen_tiem import LichHenTiem
from app.models.lich_su_gui_thong_bao import LichSuGuiThongBao
from app.models.lich_su_tiem import LichSuTiem
from app.models.lo_vac_xin import LoVacXin
from app.models.nguoi_dung import NguoiDung
from app.models.thong_bao import ThongBao
from app.models.vac_xin import VacXin
from app.schemas.admin_report import (
    AdminAppointmentReportResponse,
    AdminDashboardResponse,
    AdminInventoryBatchItem,
    AdminInventoryReportResponse,
    AdminInventoryVaccineItem,
    AdminNotificationReportResponse,
    AdminVaccinationReportResponse,
    AdminVaccinationSeriesItem,
    AdminVaccineStatistic,
)


router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentAdmin = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_QUAN_TRI_VIEN)),
]

APPOINTMENT_STATUSES = (
    "CHO_XAC_NHAN",
    "DA_XAC_NHAN",
    "HOAN_THANH",
    "DA_HUY",
)
DEFAULT_LOW_STOCK_THRESHOLD = 10
DEFAULT_EXPIRY_DAYS = 30


def validate_date_range(tu_ngay: date | None, den_ngay: date | None) -> None:
    if tu_ngay is not None and den_ngay is not None and tu_ngay > den_ngay:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Từ ngày không được sau đến ngày",
        )


def apply_date_range(statement, column, tu_ngay, den_ngay):
    if tu_ngay is not None:
        statement = statement.where(
            column >= datetime.combine(tu_ngay, time.min)
        )
    if den_ngay is not None:
        statement = statement.where(
            column < datetime.combine(den_ngay + timedelta(days=1), time.min)
        )
    return statement


def inventory_batch_item(row) -> AdminInventoryBatchItem:
    return AdminInventoryBatchItem(
        ma_lo=row.ma_lo,
        so_lo=row.so_lo,
        ma_vac_xin=row.ma_vac_xin,
        ten_vac_xin=row.ten_vac_xin,
        so_luong_con=row.so_luong_con,
        han_su_dung=row.han_su_dung,
        trang_thai=row.trang_thai,
    )


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_dashboard(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> AdminDashboardResponse:
    today = date.today()
    expiry_limit = today + timedelta(days=DEFAULT_EXPIRY_DAYS)
    return AdminDashboardResponse(
        tong_nguoi_dung=db.scalar(
            select(func.count()).select_from(NguoiDung)
        ) or 0,
        tong_ho_so_nguoi_tiem=db.scalar(
            select(func.count()).select_from(HoSoNguoiTiem)
        ) or 0,
        tong_vac_xin=db.scalar(
            select(func.count()).select_from(VacXin)
        ) or 0,
        tong_lo_vac_xin=db.scalar(
            select(func.count()).select_from(LoVacXin)
        ) or 0,
        tong_lich_hen=db.scalar(
            select(func.count()).select_from(LichHenTiem)
        ) or 0,
        tong_mui_tiem_da_thuc_hien=db.scalar(
            select(func.count()).select_from(LichSuTiem)
        ) or 0,
        tong_ton_kho=db.scalar(
            select(func.coalesce(func.sum(LoVacXin.so_luong_con), 0))
        ) or 0,
        lich_hen_hom_nay=db.scalar(
            select(func.count()).select_from(LichHenTiem).where(
                LichHenTiem.ngay_hen == today
            )
        ) or 0,
        mui_tiem_hom_nay=db.scalar(
            select(func.count()).select_from(LichSuTiem).where(
                cast(LichSuTiem.ngay_tiem, Date) == today
            )
        ) or 0,
        vaccine_sap_het_han=db.scalar(
            select(func.count(func.distinct(LoVacXin.ma_vac_xin))).where(
                LoVacXin.trang_thai == "DANG_SU_DUNG",
                LoVacXin.han_su_dung >= today,
                LoVacXin.han_su_dung <= expiry_limit,
            )
        ) or 0,
        lo_sap_het_hang=db.scalar(
            select(func.count()).select_from(LoVacXin).where(
                LoVacXin.trang_thai == "DANG_SU_DUNG",
                LoVacXin.so_luong_con <= DEFAULT_LOW_STOCK_THRESHOLD,
            )
        ) or 0,
        thong_bao_chua_doc=db.scalar(
            select(func.count()).select_from(ThongBao).where(
                ThongBao.da_doc.is_(False)
            )
        ) or 0,
    )


@router.get(
    "/appointments",
    response_model=AdminAppointmentReportResponse,
)
def get_appointment_report(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
    tu_ngay: Annotated[date | None, Query()] = None,
    den_ngay: Annotated[date | None, Query()] = None,
) -> AdminAppointmentReportResponse:
    validate_date_range(tu_ngay, den_ngay)
    statement = select(
        LichHenTiem.trang_thai,
        func.count(LichHenTiem.ma_lich_hen),
    )
    if tu_ngay is not None:
        statement = statement.where(LichHenTiem.ngay_hen >= tu_ngay)
    if den_ngay is not None:
        statement = statement.where(LichHenTiem.ngay_hen <= den_ngay)
    rows = db.execute(statement.group_by(LichHenTiem.trang_thai)).all()
    status_counts = {item: 0 for item in APPOINTMENT_STATUSES}
    status_counts.update({row[0]: row[1] for row in rows})
    return AdminAppointmentReportResponse(
        tu_ngay=tu_ngay,
        den_ngay=den_ngay,
        tong=sum(status_counts.values()),
        theo_trang_thai=status_counts,
    )


@router.get(
    "/vaccinations",
    response_model=AdminVaccinationReportResponse,
)
def get_vaccination_report(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
    tu_ngay: Annotated[date | None, Query()] = None,
    den_ngay: Annotated[date | None, Query()] = None,
    group_by: Annotated[Literal["day", "month"], Query()] = "day",
) -> AdminVaccinationReportResponse:
    validate_date_range(tu_ngay, den_ngay)
    period_expression = (
        cast(LichSuTiem.ngay_tiem, Date)
        if group_by == "day"
        else func.date_trunc("month", LichSuTiem.ngay_tiem)
    )
    statement = select(
        period_expression.label("period"),
        func.count(LichSuTiem.ma_lich_su).label("so_mui_tiem"),
    ).select_from(LichSuTiem)
    statement = apply_date_range(
        statement,
        LichSuTiem.ngay_tiem,
        tu_ngay,
        den_ngay,
    )
    rows = db.execute(
        statement.group_by(period_expression).order_by(period_expression.asc())
    ).all()
    series = [
        AdminVaccinationSeriesItem(
            period=(
                row.period.isoformat()
                if group_by == "day"
                else row.period.strftime("%Y-%m")
            ),
            so_mui_tiem=row.so_mui_tiem,
        )
        for row in rows
    ]
    return AdminVaccinationReportResponse(
        tu_ngay=tu_ngay,
        den_ngay=den_ngay,
        group_by=group_by,
        tong_mui_tiem=sum(item.so_mui_tiem for item in series),
        series=series,
    )


@router.get("/vaccines", response_model=list[AdminVaccineStatistic])
def get_vaccine_report(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> list[AdminVaccineStatistic]:
    vaccination_totals = (
        select(
            LichSuTiem.ma_vac_xin.label("ma_vac_xin"),
            func.count(LichSuTiem.ma_lich_su).label("so_mui_da_tiem"),
        )
        .group_by(LichSuTiem.ma_vac_xin)
        .subquery()
    )
    inventory_totals = (
        select(
            LoVacXin.ma_vac_xin.label("ma_vac_xin"),
            func.coalesce(func.sum(LoVacXin.so_luong_con), 0).label(
                "ton_kho_hien_tai"
            ),
            func.count(LoVacXin.ma_lo).label("so_lo_dang_co"),
            func.sum(case((LoVacXin.so_luong_con > 0, 1), else_=0)).label(
                "so_lo_con_hang"
            ),
        )
        .group_by(LoVacXin.ma_vac_xin)
        .subquery()
    )
    rows = db.execute(
        select(
            VacXin.ma_vac_xin,
            VacXin.ten_vac_xin,
            func.coalesce(vaccination_totals.c.so_mui_da_tiem, 0).label(
                "so_mui_da_tiem"
            ),
            func.coalesce(inventory_totals.c.ton_kho_hien_tai, 0).label(
                "ton_kho_hien_tai"
            ),
            func.coalesce(inventory_totals.c.so_lo_dang_co, 0).label(
                "so_lo_dang_co"
            ),
            func.coalesce(inventory_totals.c.so_lo_con_hang, 0).label(
                "so_lo_con_hang"
            ),
        )
        .outerjoin(
            vaccination_totals,
            vaccination_totals.c.ma_vac_xin == VacXin.ma_vac_xin,
        )
        .outerjoin(
            inventory_totals,
            inventory_totals.c.ma_vac_xin == VacXin.ma_vac_xin,
        )
        .order_by(
            func.coalesce(vaccination_totals.c.so_mui_da_tiem, 0).desc(),
            VacXin.ma_vac_xin.asc(),
        )
    ).all()
    return [AdminVaccineStatistic.model_validate(row._mapping) for row in rows]


@router.get("/inventory", response_model=AdminInventoryReportResponse)
def get_inventory_report(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
    low_stock_threshold: Annotated[int, Query(ge=0)] = (
        DEFAULT_LOW_STOCK_THRESHOLD
    ),
    expiry_days: Annotated[int, Query(ge=0)] = DEFAULT_EXPIRY_DAYS,
) -> AdminInventoryReportResponse:
    inventory_rows = db.execute(
        select(
            VacXin.ma_vac_xin,
            VacXin.ten_vac_xin,
            func.coalesce(func.sum(LoVacXin.so_luong_con), 0).label(
                "ton_kho_hien_tai"
            ),
            func.count(LoVacXin.ma_lo).label("so_lo"),
            func.sum(case((LoVacXin.so_luong_con > 0, 1), else_=0)).label(
                "so_lo_con_hang"
            ),
        )
        .outerjoin(LoVacXin, LoVacXin.ma_vac_xin == VacXin.ma_vac_xin)
        .group_by(VacXin.ma_vac_xin, VacXin.ten_vac_xin)
        .order_by(VacXin.ten_vac_xin.asc(), VacXin.ma_vac_xin.asc())
    ).all()
    batch_statement = (
        select(
            LoVacXin.ma_lo,
            LoVacXin.so_lo,
            LoVacXin.ma_vac_xin,
            VacXin.ten_vac_xin,
            LoVacXin.so_luong_con,
            LoVacXin.han_su_dung,
            LoVacXin.trang_thai,
        )
        .join(VacXin, VacXin.ma_vac_xin == LoVacXin.ma_vac_xin)
        .where(LoVacXin.trang_thai == "DANG_SU_DUNG")
    )
    today = date.today()
    expiring_rows = db.execute(
        batch_statement.where(
            LoVacXin.han_su_dung >= today,
            LoVacXin.han_su_dung <= today + timedelta(days=expiry_days),
        ).order_by(LoVacXin.han_su_dung.asc(), LoVacXin.ma_lo.asc())
    ).all()
    low_stock_rows = db.execute(
        batch_statement.where(
            LoVacXin.so_luong_con <= low_stock_threshold
        ).order_by(LoVacXin.so_luong_con.asc(), LoVacXin.ma_lo.asc())
    ).all()
    return AdminInventoryReportResponse(
        tong_ton_kho=sum(row.ton_kho_hien_tai for row in inventory_rows),
        low_stock_threshold=low_stock_threshold,
        expiry_days=expiry_days,
        theo_vac_xin=[
            AdminInventoryVaccineItem.model_validate(row._mapping)
            for row in inventory_rows
        ],
        lo_sap_het_han=[inventory_batch_item(row) for row in expiring_rows],
        lo_sap_het_hang=[inventory_batch_item(row) for row in low_stock_rows],
    )


@router.get(
    "/notifications",
    response_model=AdminNotificationReportResponse,
)
def get_notification_report(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> AdminNotificationReportResponse:
    notification_counts = db.execute(
        select(
            func.count(ThongBao.ma_thong_bao).label("tong"),
            func.sum(case((ThongBao.da_doc.is_(True), 1), else_=0)).label(
                "da_doc"
            ),
            func.sum(case((ThongBao.da_doc.is_(False), 1), else_=0)).label(
                "chua_doc"
            ),
        )
    ).one()
    delivery_counts = db.execute(
        select(
            func.count(LichSuGuiThongBao.ma_gui).label("tong"),
            func.sum(
                case((LichSuGuiThongBao.trang_thai == "DA_GUI", 1), else_=0)
            ).label("thanh_cong"),
            func.sum(
                case((LichSuGuiThongBao.trang_thai == "THAT_BAI", 1), else_=0)
            ).label("that_bai"),
        )
    ).one()
    type_rows = db.execute(
        select(ThongBao.loai_thong_bao, func.count(ThongBao.ma_thong_bao))
        .group_by(ThongBao.loai_thong_bao)
        .order_by(ThongBao.loai_thong_bao.asc())
    ).all()
    return AdminNotificationReportResponse(
        tong_thong_bao=notification_counts.tong,
        da_doc=notification_counts.da_doc or 0,
        chua_doc=notification_counts.chua_doc or 0,
        tong_lan_gui=delivery_counts.tong,
        gui_thanh_cong=delivery_counts.thanh_cong or 0,
        gui_that_bai=delivery_counts.that_bai or 0,
        theo_loai_thong_bao={
            notification_type or "KHONG_XAC_DINH": count
            for notification_type, count in type_rows
        },
    )
