from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_KHACH_HANG, require_roles
from app.models.nguoi_dung import NguoiDung
from app.models.thong_bao import ThongBao
from app.schemas.notification import (
    NotificationResponse,
    ReadAllNotificationsResponse,
)


router = APIRouter(prefix="/notifications", tags=["Notifications"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentCustomer = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_KHACH_HANG)),
]


def get_owned_notification(
    notification_id: int,
    user_id: int,
    db: Session,
) -> ThongBao:
    notification = db.scalar(
        select(ThongBao).where(
            ThongBao.ma_thong_bao == notification_id,
            ThongBao.ma_nguoi_dung == user_id,
        )
    )
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo",
        )
    return notification


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    current_user: CurrentCustomer,
    db: DatabaseSession,
    unread_only: Annotated[bool, Query()] = False,
) -> list[ThongBao]:
    statement = select(ThongBao).where(
        ThongBao.ma_nguoi_dung == current_user.ma_nguoi_dung
    )
    if unread_only:
        statement = statement.where(ThongBao.da_doc.is_(False))
    return list(
        db.scalars(
            statement.order_by(
                ThongBao.ngay_tao.desc(),
                ThongBao.ma_thong_bao.desc(),
            )
        )
    )


@router.patch(
    "/read-all",
    response_model=ReadAllNotificationsResponse,
)
def mark_all_notifications_as_read(
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> ReadAllNotificationsResponse:
    try:
        result = db.execute(
            update(ThongBao)
            .where(
                ThongBao.ma_nguoi_dung == current_user.ma_nguoi_dung,
                ThongBao.da_doc.is_(False),
            )
            .values(da_doc=True)
        )
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể đánh dấu thông báo đã đọc",
        ) from exc
    return ReadAllNotificationsResponse(updated=result.rowcount)


@router.get("/{ma_thong_bao}", response_model=NotificationResponse)
def get_notification_detail(
    ma_thong_bao: int,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> ThongBao:
    return get_owned_notification(
        ma_thong_bao,
        current_user.ma_nguoi_dung,
        db,
    )


@router.patch(
    "/{ma_thong_bao}/read",
    response_model=NotificationResponse,
)
def mark_notification_as_read(
    ma_thong_bao: int,
    current_user: CurrentCustomer,
    db: DatabaseSession,
) -> ThongBao:
    notification = get_owned_notification(
        ma_thong_bao,
        current_user.ma_nguoi_dung,
        db,
    )
    if notification.da_doc:
        return notification

    notification.da_doc = True
    try:
        db.commit()
        db.refresh(notification)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể đánh dấu thông báo đã đọc",
        ) from exc
    return notification
