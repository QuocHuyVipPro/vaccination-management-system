from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_QUAN_TRI_VIEN, require_roles
from app.models.lich_su_gui_thong_bao import LichSuGuiThongBao
from app.models.nguoi_dung import NguoiDung
from app.models.thong_bao import ThongBao
from app.schemas.notification import DeliveryHistoryResponse
from app.services.notification_delivery_service import (
    EmailDeliveryError,
    send_notification_email,
)


router = APIRouter(
    prefix="/admin/notifications",
    tags=["Admin Notifications"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentAdmin = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_QUAN_TRI_VIEN)),
]


@router.post(
    "/{ma_thong_bao}/send-email",
    response_model=DeliveryHistoryResponse,
)
def send_notification_by_email(
    ma_thong_bao: int,
    _current_user: CurrentAdmin,
    db: DatabaseSession,
) -> LichSuGuiThongBao:
    notification = db.get(ThongBao, ma_thong_bao)
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo",
        )
    try:
        return send_notification_email(db, notification)
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể lưu lịch sử gửi thông báo",
        ) from exc
