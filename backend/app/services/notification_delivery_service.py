from datetime import datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.lich_su_gui_thong_bao import LichSuGuiThongBao
from app.models.nguoi_dung import NguoiDung
from app.models.thong_bao import ThongBao
from app.services import email_service
from app.services.email_service import EmailConfigurationError
from app.services.email_template_service import (
    EmailContent,
    render_generic_notification_email,
)


class EmailDeliveryError(RuntimeError):
    def __init__(
        self,
        message: str,
        delivery_history: LichSuGuiThongBao,
    ) -> None:
        super().__init__(message)
        self.delivery_history = delivery_history


def _safe_error_message(exc: Exception) -> str:
    if isinstance(exc, EmailConfigurationError):
        return str(exc)[:500]
    if isinstance(exc, ValueError):
        return "Không xác định được địa chỉ email người nhận"
    return "Không thể gửi email qua SMTP"


def send_notification_email(
    db: Session,
    notification: ThongBao,
    *,
    email_content: EmailContent | None = None,
) -> LichSuGuiThongBao:
    owner = db.get(NguoiDung, notification.ma_nguoi_dung)
    recipient = (
        owner.email.strip()
        if owner is not None and owner.email
        else "KHONG_XAC_DINH"
    )

    delivery_error: Exception | None = None
    try:
        if recipient == "KHONG_XAC_DINH":
            raise ValueError("Missing recipient email")
        content = email_content or render_generic_notification_email(
            notification.tieu_de,
            notification.noi_dung,
        )
        email_service.send_email(
            to_email=recipient,
            subject=notification.tieu_de,
            body=content.plain_text,
            html_body=content.html,
        )
    except Exception as exc:
        delivery_error = exc

    delivery_history = LichSuGuiThongBao(
        ma_thong_bao=notification.ma_thong_bao,
        kenh_gui="EMAIL",
        nguoi_nhan=recipient,
        trang_thai="THAT_BAI" if delivery_error else "DA_GUI",
        thoi_gian_gui=datetime.now(),
        loi_gui=(
            _safe_error_message(delivery_error)
            if delivery_error is not None
            else None
        ),
    )
    db.add(delivery_history)
    try:
        db.commit()
        db.refresh(delivery_history)
    except SQLAlchemyError:
        db.rollback()
        raise

    if delivery_error is not None:
        raise EmailDeliveryError(
            "Gửi email thất bại",
            delivery_history,
        ) from delivery_error
    return delivery_history
