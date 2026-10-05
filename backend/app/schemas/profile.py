from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


Gender = Literal["NAM", "NU", "KHAC"]


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized_value = value.strip()
    return normalized_value or None


class ProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ho_ten: str = Field(max_length=100)
    ngay_sinh: date
    gioi_tinh: Gender | None = None
    so_dien_thoai: str | None = Field(default=None, max_length=20)
    dia_chi: str | None = Field(default=None, max_length=255)
    nguoi_giam_ho: str | None = Field(default=None, max_length=100)
    moi_quan_he: str | None = Field(default=None, max_length=50)
    di_ung: str | None = None
    ghi_chu_suc_khoe: str | None = None

    @field_validator("ho_ten")
    @classmethod
    def validate_ho_ten(cls, value: str) -> str:
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("Họ tên không được để trống")
        return normalized_value

    @field_validator("ngay_sinh")
    @classmethod
    def validate_ngay_sinh(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Ngày sinh không được ở trong tương lai")
        return value

    @field_validator(
        "so_dien_thoai",
        "dia_chi",
        "nguoi_giam_ho",
        "moi_quan_he",
        "di_ung",
        "ghi_chu_suc_khoe",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ho_ten: str | None = Field(default=None, max_length=100)
    ngay_sinh: date | None = None
    gioi_tinh: Gender | None = None
    so_dien_thoai: str | None = Field(default=None, max_length=20)
    dia_chi: str | None = Field(default=None, max_length=255)
    nguoi_giam_ho: str | None = Field(default=None, max_length=100)
    moi_quan_he: str | None = Field(default=None, max_length=50)
    di_ung: str | None = None
    ghi_chu_suc_khoe: str | None = None

    @field_validator("ho_ten")
    @classmethod
    def validate_ho_ten(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Họ tên không được để trống")
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("Họ tên không được để trống")
        return normalized_value

    @field_validator("ngay_sinh")
    @classmethod
    def validate_ngay_sinh(cls, value: date | None) -> date:
        if value is None:
            raise ValueError("Ngày sinh không được để trống")
        if value > date.today():
            raise ValueError("Ngày sinh không được ở trong tương lai")
        return value

    @field_validator(
        "so_dien_thoai",
        "dia_chi",
        "nguoi_giam_ho",
        "moi_quan_he",
        "di_ung",
        "ghi_chu_suc_khoe",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_ho_so: int
    ma_nguoi_dung: int
    ho_ten: str
    ngay_sinh: date
    gioi_tinh: str | None
    so_dien_thoai: str | None
    dia_chi: str | None
    nguoi_giam_ho: str | None
    moi_quan_he: str | None
    di_ung: str | None
    ghi_chu_suc_khoe: str | None
    ngay_tao: datetime
    ngay_cap_nhat: datetime
