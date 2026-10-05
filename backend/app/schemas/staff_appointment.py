from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.appointment import AppointmentItemResponse


AppointmentStatus = Literal[
    "CHO_XAC_NHAN",
    "DA_XAC_NHAN",
    "HOAN_THANH",
    "DA_HUY",
]


class StaffAppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_lich_hen: int
    ma_ho_so: int
    ho_ten: str
    ngay_sinh: date
    gioi_tinh: str | None
    so_dien_thoai: str | None
    ngay_hen: date
    gio_hen: time
    trang_thai: str
    ghi_chu: str | None
    ngay_tao: datetime
    ngay_cap_nhat: datetime
    items: list[AppointmentItemResponse]
