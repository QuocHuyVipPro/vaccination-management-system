from datetime import datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.thong_bao import ThongBao


VALID_NOTIFICATION_TYPES = frozenset(
    {"LICH_TIEM", "MUI_TIEP_THEO", "HE_THONG"}
)


def create_notification(
    db: Session,
    ma_nguoi_dung: int,
    tieu_de: str,
    noi_dung: str,
    loai_thong_bao: str,
    thoi_gian_gui_du_kien: datetime | None = None,
    *,
    commit: bool = True,
) -> ThongBao:
    normalized_title = tieu_de.strip()
    normalized_content = noi_dung.strip()
    if not normalized_title:
        raise ValueError("Tiêu đề thông báo không được để trống")
    if not normalized_content:
        raise ValueError("Nội dung thông báo không được để trống")
    if loai_thong_bao not in VALID_NOTIFICATION_TYPES:
        raise ValueError("Loại thông báo không hợp lệ")

    notification = ThongBao(
        ma_nguoi_dung=ma_nguoi_dung,
        tieu_de=normalized_title,
        noi_dung=normalized_content,
        loai_thong_bao=loai_thong_bao,
        thoi_gian_gui_du_kien=thoi_gian_gui_du_kien,
        da_doc=False,
    )
    db.add(notification)

    try:
        if commit:
            db.commit()
            db.refresh(notification)
        else:
            db.flush()
    except SQLAlchemyError:
        db.rollback()
        raise

    return notification
