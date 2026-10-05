from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_KHACH_HANG, require_roles
from app.models.nguoi_dung import NguoiDung
from app.models.phac_do_tiem import PhacDoTiem
from app.models.vac_xin import VacXin
from app.schemas.vaccine import (
    VaccinationScheduleResponse,
    VaccineDetailResponse,
    VaccineResponse,
)


router = APIRouter(prefix="/vaccines", tags=["Vaccines"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentCustomer = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_KHACH_HANG)),
]


def get_active_vaccine(vaccine_id: int, db: Session) -> VacXin:
    vaccine = db.scalar(
        select(VacXin).where(
            VacXin.ma_vac_xin == vaccine_id,
            VacXin.trang_thai.is_(True),
        )
    )
    if vaccine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy vắc xin",
        )
    return vaccine


def get_vaccination_schedule(
    vaccine_id: int,
    db: Session,
) -> list[PhacDoTiem]:
    return list(
        db.scalars(
            select(PhacDoTiem)
            .where(PhacDoTiem.ma_vac_xin == vaccine_id)
            .order_by(PhacDoTiem.so_thu_tu_mui.asc())
        )
    )


@router.get("", response_model=list[VaccineResponse])
def list_vaccines(
    _current_user: CurrentCustomer,
    db: DatabaseSession,
) -> list[VacXin]:
    return list(
        db.scalars(
            select(VacXin)
            .where(VacXin.trang_thai.is_(True))
            .order_by(VacXin.ten_vac_xin.asc(), VacXin.ma_vac_xin.asc())
        )
    )


@router.get("/{ma_vac_xin}", response_model=VaccineDetailResponse)
def get_vaccine_detail(
    ma_vac_xin: int,
    _current_user: CurrentCustomer,
    db: DatabaseSession,
) -> VaccineDetailResponse:
    vaccine = get_active_vaccine(ma_vac_xin, db)
    schedule = get_vaccination_schedule(vaccine.ma_vac_xin, db)
    return VaccineDetailResponse(
        **VaccineResponse.model_validate(vaccine).model_dump(),
        phac_do_tiem=schedule,
    )


@router.get(
    "/{ma_vac_xin}/schedule",
    response_model=list[VaccinationScheduleResponse],
)
def get_vaccine_schedule(
    ma_vac_xin: int,
    _current_user: CurrentCustomer,
    db: DatabaseSession,
) -> list[PhacDoTiem]:
    vaccine = get_active_vaccine(ma_vac_xin, db)
    return get_vaccination_schedule(vaccine.ma_vac_xin, db)
