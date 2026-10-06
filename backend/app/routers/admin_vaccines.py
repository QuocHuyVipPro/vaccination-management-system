from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_QUAN_TRI_VIEN, require_roles
from app.models.nguoi_dung import NguoiDung
from app.models.phac_do_tiem import PhacDoTiem
from app.models.vac_xin import VacXin
from app.schemas.admin_vaccine import (
    AdminScheduleCreate,
    AdminScheduleResponse,
    AdminScheduleUpdate,
    AdminVaccineCreate,
    AdminVaccineResponse,
    AdminVaccineUpdate,
)


router = APIRouter(prefix="/admin/vaccines", tags=["Admin Vaccines"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentAdmin = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_QUAN_TRI_VIEN)),
]


def get_vaccine_or_404(vaccine_id: int, db: Session) -> VacXin:
    vaccine = db.get(VacXin, vaccine_id)
    if vaccine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy vắc xin",
        )
    return vaccine


def get_schedule_or_404(
    vaccine_id: int,
    schedule_id: int,
    db: Session,
) -> PhacDoTiem:
    schedule = db.scalar(
        select(PhacDoTiem).where(
            PhacDoTiem.ma_phac_do == schedule_id,
            PhacDoTiem.ma_vac_xin == vaccine_id,
        )
    )
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy mũi trong phác đồ",
        )
    return schedule


def ensure_dose_number_available(
    vaccine_id: int,
    dose_number: int,
    db: Session,
    *,
    exclude_schedule_id: int | None = None,
) -> None:
    statement = select(PhacDoTiem.ma_phac_do).where(
        PhacDoTiem.ma_vac_xin == vaccine_id,
        PhacDoTiem.so_thu_tu_mui == dose_number,
    )
    if exclude_schedule_id is not None:
        statement = statement.where(
            PhacDoTiem.ma_phac_do != exclude_schedule_id
        )
    if db.scalar(statement) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Số thứ tự mũi đã tồn tại trong phác đồ",
        )


@router.get("", response_model=list[AdminVaccineResponse])
def list_admin_vaccines(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
    trang_thai: Annotated[bool | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=150)] = None,
) -> list[VacXin]:
    statement = select(VacXin)
    if trang_thai is not None:
        statement = statement.where(VacXin.trang_thai == trang_thai)
    if search is not None and (normalized_search := search.strip()):
        pattern = f"%{normalized_search}%"
        statement = statement.where(
            or_(
                VacXin.ten_vac_xin.ilike(pattern),
                VacXin.nha_san_xuat.ilike(pattern),
            )
        )
    return list(
        db.scalars(
            statement.order_by(
                VacXin.ten_vac_xin.asc(),
                VacXin.ma_vac_xin.asc(),
            )
        )
    )


@router.post(
    "",
    response_model=AdminVaccineResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_vaccine(
    payload: AdminVaccineCreate,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> VacXin:
    vaccine = VacXin(**payload.model_dump())
    db.add(vaccine)
    try:
        db.commit()
        db.refresh(vaccine)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo vắc xin",
        ) from exc
    return vaccine


@router.get("/{ma_vac_xin}", response_model=AdminVaccineResponse)
def get_admin_vaccine_detail(
    ma_vac_xin: int,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> VacXin:
    return get_vaccine_or_404(ma_vac_xin, db)


@router.patch("/{ma_vac_xin}", response_model=AdminVaccineResponse)
def update_vaccine(
    ma_vac_xin: int,
    payload: AdminVaccineUpdate,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> VacXin:
    vaccine = get_vaccine_or_404(ma_vac_xin, db)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(vaccine, field_name, value)
    try:
        db.commit()
        db.refresh(vaccine)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật vắc xin",
        ) from exc
    return vaccine


@router.get(
    "/{ma_vac_xin}/schedule",
    response_model=list[AdminScheduleResponse],
)
def get_admin_vaccine_schedule(
    ma_vac_xin: int,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> list[PhacDoTiem]:
    get_vaccine_or_404(ma_vac_xin, db)
    return list(
        db.scalars(
            select(PhacDoTiem)
            .where(PhacDoTiem.ma_vac_xin == ma_vac_xin)
            .order_by(
                PhacDoTiem.so_thu_tu_mui.asc(),
                PhacDoTiem.ma_phac_do.asc(),
            )
        )
    )


@router.post(
    "/{ma_vac_xin}/schedule",
    response_model=AdminScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_schedule(
    ma_vac_xin: int,
    payload: AdminScheduleCreate,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> PhacDoTiem:
    get_vaccine_or_404(ma_vac_xin, db)
    ensure_dose_number_available(
        ma_vac_xin,
        payload.so_thu_tu_mui,
        db,
    )
    schedule = PhacDoTiem(
        ma_vac_xin=ma_vac_xin,
        **payload.model_dump(),
    )
    db.add(schedule)
    try:
        db.commit()
        db.refresh(schedule)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Số thứ tự mũi đã tồn tại trong phác đồ",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo mũi trong phác đồ",
        ) from exc
    return schedule


@router.patch(
    "/{ma_vac_xin}/schedule/{ma_phac_do}",
    response_model=AdminScheduleResponse,
)
def update_schedule(
    ma_vac_xin: int,
    ma_phac_do: int,
    payload: AdminScheduleUpdate,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> PhacDoTiem:
    get_vaccine_or_404(ma_vac_xin, db)
    schedule = get_schedule_or_404(ma_vac_xin, ma_phac_do, db)
    changes = payload.model_dump(exclude_unset=True)
    if "so_thu_tu_mui" in changes:
        ensure_dose_number_available(
            ma_vac_xin,
            changes["so_thu_tu_mui"],
            db,
            exclude_schedule_id=schedule.ma_phac_do,
        )
    for field_name, value in changes.items():
        setattr(schedule, field_name, value)
    try:
        db.commit()
        db.refresh(schedule)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Số thứ tự mũi đã tồn tại trong phác đồ",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật phác đồ",
        ) from exc
    return schedule
