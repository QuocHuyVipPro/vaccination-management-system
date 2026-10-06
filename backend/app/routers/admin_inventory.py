from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_QUAN_TRI_VIEN, require_roles
from app.models.giao_dich_kho import GiaoDichKho
from app.models.lo_vac_xin import LoVacXin
from app.models.nguoi_dung import NguoiDung
from app.models.vac_xin import VacXin
from app.schemas.admin_inventory import (
    AdminBatchAdjust,
    AdminBatchCreate,
    AdminBatchResponse,
    AdminBatchRestock,
    AdminBatchUpdate,
    AdminInventoryTransactionResponse,
)


router = APIRouter(prefix="/admin/inventory", tags=["Admin Inventory"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentAdmin = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_QUAN_TRI_VIEN)),
]


def batch_response(batch: LoVacXin, vaccine_name: str) -> AdminBatchResponse:
    return AdminBatchResponse(
        ma_lo=batch.ma_lo,
        ma_vac_xin=batch.ma_vac_xin,
        ten_vac_xin=vaccine_name,
        so_lo=batch.so_lo,
        ngay_san_xuat=batch.ngay_san_xuat,
        han_su_dung=batch.han_su_dung,
        so_luong_nhap=batch.so_luong_nhap,
        so_luong_con=batch.so_luong_con,
        gia_nhap=batch.gia_nhap,
        ngay_nhap=batch.ngay_nhap,
        trang_thai=batch.trang_thai,
        ngay_tao=batch.ngay_tao,
    )


def transaction_response(
    transaction: GiaoDichKho,
    batch: LoVacXin,
    vaccine_name: str,
) -> AdminInventoryTransactionResponse:
    return AdminInventoryTransactionResponse(
        ma_giao_dich=transaction.ma_giao_dich,
        ma_lo=transaction.ma_lo,
        so_lo=batch.so_lo,
        ma_vac_xin=batch.ma_vac_xin,
        ten_vac_xin=vaccine_name,
        loai_giao_dich=transaction.loai_giao_dich,
        so_luong=transaction.so_luong,
        loai_tham_chieu=transaction.loai_tham_chieu,
        ma_tham_chieu=transaction.ma_tham_chieu,
        nguoi_thuc_hien=transaction.nguoi_thuc_hien,
        ghi_chu=transaction.ghi_chu,
        ngay_tao=transaction.ngay_tao,
    )


def get_batch_row_or_404(
    batch_id: int,
    db: Session,
    *,
    lock: bool = False,
) -> tuple[LoVacXin, VacXin]:
    statement = (
        select(LoVacXin, VacXin)
        .join(VacXin, VacXin.ma_vac_xin == LoVacXin.ma_vac_xin)
        .where(LoVacXin.ma_lo == batch_id)
    )
    if lock:
        statement = statement.with_for_update(of=LoVacXin)
    row = db.execute(statement).one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lô vắc xin",
        )
    return row[0], row[1]


def ensure_restock_allowed(batch: LoVacXin, vaccine: VacXin) -> None:
    if batch.han_su_dung < date.today():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Không thể nhập thêm cho lô đã hết hạn",
        )
    if batch.trang_thai != "DANG_SU_DUNG":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lô vắc xin không ở trạng thái đang sử dụng",
        )
    if not vaccine.trang_thai:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Không thể nhập thêm cho vắc xin đã ngừng hoạt động",
        )


@router.get("/batches", response_model=list[AdminBatchResponse])
def list_batches(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
    ma_vac_xin: Annotated[int | None, Query(gt=0)] = None,
    trang_thai: Annotated[str | None, Query(max_length=30)] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    con_hang: Annotated[bool | None, Query()] = None,
    sap_het_han: Annotated[bool | None, Query()] = None,
) -> list[AdminBatchResponse]:
    statement = select(LoVacXin, VacXin.ten_vac_xin).join(VacXin)
    if ma_vac_xin is not None:
        statement = statement.where(LoVacXin.ma_vac_xin == ma_vac_xin)
    if trang_thai is not None and (normalized_status := trang_thai.strip()):
        statement = statement.where(LoVacXin.trang_thai == normalized_status)
    if search is not None and (normalized_search := search.strip()):
        statement = statement.where(
            LoVacXin.so_lo.ilike(f"%{normalized_search}%")
        )
    if con_hang is True:
        statement = statement.where(LoVacXin.so_luong_con > 0)
    elif con_hang is False:
        statement = statement.where(LoVacXin.so_luong_con <= 0)
    if sap_het_han is True:
        statement = statement.where(
            LoVacXin.han_su_dung >= date.today(),
            LoVacXin.han_su_dung <= date.today() + timedelta(days=30),
        )
    elif sap_het_han is False:
        statement = statement.where(
            or_(
                LoVacXin.han_su_dung < date.today(),
                LoVacXin.han_su_dung > date.today() + timedelta(days=30),
            )
        )
    rows = db.execute(
        statement.order_by(
            LoVacXin.han_su_dung.asc(),
            LoVacXin.ma_lo.asc(),
        )
    ).all()
    return [batch_response(row[0], row[1]) for row in rows]


@router.post(
    "/batches",
    response_model=AdminBatchResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_batch(
    payload: AdminBatchCreate,
    current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> AdminBatchResponse:
    vaccine = db.get(VacXin, payload.ma_vac_xin)
    if vaccine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy vắc xin",
        )
    if not vaccine.trang_thai:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Không thể tạo lô cho vắc xin đã ngừng hoạt động",
        )
    if db.scalar(select(LoVacXin.ma_lo).where(LoVacXin.so_lo == payload.so_lo)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Số lô đã tồn tại",
        )

    batch = LoVacXin(
        **payload.model_dump(),
        so_luong_con=payload.so_luong_nhap,
    )
    db.add(batch)
    try:
        db.flush()
        db.add(
            GiaoDichKho(
                ma_lo=batch.ma_lo,
                loai_giao_dich="NHAP",
                so_luong=payload.so_luong_nhap,
                loai_tham_chieu="LO_VAC_XIN",
                ma_tham_chieu=batch.ma_lo,
                nguoi_thuc_hien=current_admin.ma_nguoi_dung,
                ghi_chu="Nhập kho khi tạo lô vắc xin",
            )
        )
        db.commit()
        db.refresh(batch)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Số lô đã tồn tại",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo lô vắc xin",
        ) from exc
    return batch_response(batch, vaccine.ten_vac_xin)


@router.get(
    "/transactions",
    response_model=list[AdminInventoryTransactionResponse],
)
def list_transactions(
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
    ma_lo: Annotated[int | None, Query(gt=0)] = None,
    ma_vac_xin: Annotated[int | None, Query(gt=0)] = None,
    loai_giao_dich: Annotated[str | None, Query(max_length=30)] = None,
) -> list[AdminInventoryTransactionResponse]:
    statement = (
        select(GiaoDichKho, LoVacXin, VacXin.ten_vac_xin)
        .join(LoVacXin, LoVacXin.ma_lo == GiaoDichKho.ma_lo)
        .join(VacXin, VacXin.ma_vac_xin == LoVacXin.ma_vac_xin)
    )
    if ma_lo is not None:
        statement = statement.where(GiaoDichKho.ma_lo == ma_lo)
    if ma_vac_xin is not None:
        statement = statement.where(LoVacXin.ma_vac_xin == ma_vac_xin)
    if loai_giao_dich is not None and (
        normalized_type := loai_giao_dich.strip()
    ):
        statement = statement.where(
            GiaoDichKho.loai_giao_dich == normalized_type
        )
    rows = db.execute(
        statement.order_by(
            GiaoDichKho.ngay_tao.desc(),
            GiaoDichKho.ma_giao_dich.desc(),
        )
    ).all()
    return [transaction_response(row[0], row[1], row[2]) for row in rows]


@router.get(
    "/batches/{ma_lo}/transactions",
    response_model=list[AdminInventoryTransactionResponse],
)
def list_batch_transactions(
    ma_lo: int,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> list[AdminInventoryTransactionResponse]:
    batch, vaccine = get_batch_row_or_404(ma_lo, db)
    transactions = db.scalars(
        select(GiaoDichKho)
        .where(GiaoDichKho.ma_lo == ma_lo)
        .order_by(
            GiaoDichKho.ngay_tao.desc(),
            GiaoDichKho.ma_giao_dich.desc(),
        )
    ).all()
    return [
        transaction_response(item, batch, vaccine.ten_vac_xin)
        for item in transactions
    ]


@router.get("/batches/{ma_lo}", response_model=AdminBatchResponse)
def get_batch_detail(
    ma_lo: int,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> AdminBatchResponse:
    batch, vaccine = get_batch_row_or_404(ma_lo, db)
    return batch_response(batch, vaccine.ten_vac_xin)


@router.patch("/batches/{ma_lo}", response_model=AdminBatchResponse)
def update_batch(
    ma_lo: int,
    payload: AdminBatchUpdate,
    _current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> AdminBatchResponse:
    batch, vaccine = get_batch_row_or_404(ma_lo, db, lock=True)
    changes = payload.model_dump(exclude_unset=True)
    production_date = changes.get("ngay_san_xuat", batch.ngay_san_xuat)
    expiration_date = changes.get("han_su_dung", batch.han_su_dung)
    if production_date is not None and expiration_date <= production_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Hạn sử dụng phải sau ngày sản xuất",
        )
    for field_name, value in changes.items():
        setattr(batch, field_name, value)
    try:
        db.commit()
        db.refresh(batch)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật lô vắc xin",
        ) from exc
    return batch_response(batch, vaccine.ten_vac_xin)


@router.post("/batches/{ma_lo}/restock", response_model=AdminBatchResponse)
def restock_batch(
    ma_lo: int,
    payload: AdminBatchRestock,
    current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> AdminBatchResponse:
    try:
        batch, vaccine = get_batch_row_or_404(ma_lo, db, lock=True)
        ensure_restock_allowed(batch, vaccine)
        batch.so_luong_con += payload.so_luong
        db.add(
            GiaoDichKho(
                ma_lo=batch.ma_lo,
                loai_giao_dich="NHAP",
                so_luong=payload.so_luong,
                loai_tham_chieu="LO_VAC_XIN",
                ma_tham_chieu=batch.ma_lo,
                nguoi_thuc_hien=current_admin.ma_nguoi_dung,
                ghi_chu=payload.ghi_chu or "Nhập thêm tồn kho",
            )
        )
        db.commit()
        db.refresh(batch)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể nhập thêm tồn kho",
        ) from exc
    return batch_response(batch, vaccine.ten_vac_xin)


@router.post("/batches/{ma_lo}/adjust", response_model=AdminBatchResponse)
def adjust_batch(
    ma_lo: int,
    payload: AdminBatchAdjust,
    current_admin: CurrentAdmin,
    db: DatabaseSession,
) -> AdminBatchResponse:
    try:
        batch, vaccine = get_batch_row_or_404(ma_lo, db, lock=True)
        new_quantity = batch.so_luong_con + payload.so_luong_thay_doi
        if new_quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Điều chỉnh sẽ làm tồn kho nhỏ hơn 0",
            )
        batch.so_luong_con = new_quantity
        transaction_type = (
            "DIEU_CHINH_TANG"
            if payload.so_luong_thay_doi > 0
            else "DIEU_CHINH_GIAM"
        )
        db.add(
            GiaoDichKho(
                ma_lo=batch.ma_lo,
                loai_giao_dich=transaction_type,
                so_luong=abs(payload.so_luong_thay_doi),
                loai_tham_chieu="LO_VAC_XIN",
                ma_tham_chieu=batch.ma_lo,
                nguoi_thuc_hien=current_admin.ma_nguoi_dung,
                ghi_chu=payload.ghi_chu,
            )
        )
        db.commit()
        db.refresh(batch)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể điều chỉnh tồn kho",
        ) from exc
    return batch_response(batch, vaccine.ten_vac_xin)
