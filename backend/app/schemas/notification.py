from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


NotificationType = Literal["LICH_TIEM", "MUI_TIEP_THEO", "HE_THONG"]


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_thong_bao: int
    tieu_de: str
    noi_dung: str
    loai_thong_bao: NotificationType | None
    thoi_gian_gui_du_kien: datetime | None
    da_doc: bool
    ngay_tao: datetime


class ReadAllNotificationsResponse(BaseModel):
    updated: int


class DeliveryHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_gui: int
    ma_thong_bao: int
    kenh_gui: str
    nguoi_nhan: str
    trang_thai: str
    thoi_gian_gui: datetime | None
    loi_gui: str | None


class ReminderRunResponse(BaseModel):
    checked: int
    created: int
    sent: int
    failed: int
    skipped: int
