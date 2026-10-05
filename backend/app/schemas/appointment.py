from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AppointmentItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ma_vac_xin: int = Field(gt=0)
    so_thu_tu_mui: int = Field(gt=0)


class AppointmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ma_ho_so: int = Field(gt=0)
    ngay_hen: date
    gio_hen: time
    ghi_chu: str | None = None
    items: list[AppointmentItemCreate] = Field(min_length=1)

    @field_validator("ghi_chu")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized_value = value.strip()
        return normalized_value or None

    @model_validator(mode="after")
    def validate_appointment(self):
        if self.gio_hen.tzinfo is not None:
            raise ValueError("Giờ hẹn không được chứa múi giờ")
        appointment_time = datetime.combine(self.ngay_hen, self.gio_hen)
        if appointment_time <= datetime.now():
            raise ValueError("Thời gian hẹn phải ở trong tương lai")

        item_keys = {
            (item.ma_vac_xin, item.so_thu_tu_mui) for item in self.items
        }
        if len(item_keys) != len(self.items):
            raise ValueError("Không được đăng ký trùng mũi tiêm trong cùng lịch hẹn")
        return self


class AppointmentItemResponse(BaseModel):
    ma_chi_tiet: int
    ma_vac_xin: int
    ten_vac_xin: str
    so_thu_tu_mui: int
    ten_mui: str | None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_lich_hen: int
    ma_ho_so: int
    ngay_hen: date
    gio_hen: time
    trang_thai: str
    ghi_chu: str | None
    ngay_tao: datetime
    ngay_cap_nhat: datetime


class AppointmentDetailResponse(AppointmentResponse):
    items: list[AppointmentItemResponse]
