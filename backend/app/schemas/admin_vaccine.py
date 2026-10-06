from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


def _required_text(value: str, field_label: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field_label} không được để trống")
    return normalized


def _optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


class AdminVaccineCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ten_vac_xin: str = Field(max_length=150)
    nha_san_xuat: str | None = Field(default=None, max_length=150)
    quoc_gia_san_xuat: str | None = Field(default=None, max_length=100)
    phong_benh: str | None = Field(default=None, max_length=255)
    mo_ta: str | None = None
    gia: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    trang_thai: bool = True

    @field_validator("ten_vac_xin")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _required_text(value, "Tên vắc xin")

    @field_validator(
        "nha_san_xuat",
        "quoc_gia_san_xuat",
        "phong_benh",
        "mo_ta",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _optional_text(value)


class AdminVaccineUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ten_vac_xin: str | None = Field(default=None, max_length=150)
    nha_san_xuat: str | None = Field(default=None, max_length=150)
    quoc_gia_san_xuat: str | None = Field(default=None, max_length=100)
    phong_benh: str | None = Field(default=None, max_length=255)
    mo_ta: str | None = None
    gia: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    trang_thai: bool | None = None

    @field_validator("ten_vac_xin")
    @classmethod
    def validate_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Tên vắc xin không được để trống")
        return _required_text(value, "Tên vắc xin")

    @field_validator(
        "nha_san_xuat",
        "quoc_gia_san_xuat",
        "phong_benh",
        "mo_ta",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @field_validator("trang_thai")
    @classmethod
    def validate_status(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError("Trạng thái không được để trống")
        return value

    @model_validator(mode="after")
    def require_at_least_one_field(self):
        if not self.model_fields_set:
            raise ValueError("Cần cung cấp ít nhất một trường để cập nhật")
        return self


class AdminVaccineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_vac_xin: int
    ten_vac_xin: str
    nha_san_xuat: str | None
    quoc_gia_san_xuat: str | None
    phong_benh: str | None
    mo_ta: str | None
    gia: Decimal | None
    trang_thai: bool
    ngay_tao: datetime
    ngay_cap_nhat: datetime


class AdminScheduleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    so_thu_tu_mui: int = Field(gt=0)
    ten_mui: str | None = Field(default=None, max_length=100)
    khoang_cach_ngay: int = Field(default=0, ge=0)
    mo_ta: str | None = None

    @field_validator("ten_mui", "mo_ta")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _optional_text(value)


class AdminScheduleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    so_thu_tu_mui: int | None = Field(default=None, gt=0)
    ten_mui: str | None = Field(default=None, max_length=100)
    khoang_cach_ngay: int | None = Field(default=None, ge=0)
    mo_ta: str | None = None

    @field_validator("so_thu_tu_mui")
    @classmethod
    def validate_dose_number(cls, value: int | None) -> int:
        if value is None:
            raise ValueError("Số thứ tự mũi không được để trống")
        return value

    @field_validator("khoang_cach_ngay")
    @classmethod
    def validate_interval(cls, value: int | None) -> int:
        if value is None:
            raise ValueError("Khoảng cách ngày không được để trống")
        return value

    @field_validator("ten_mui", "mo_ta")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _optional_text(value)

    @model_validator(mode="after")
    def require_at_least_one_field(self):
        if not self.model_fields_set:
            raise ValueError("Cần cung cấp ít nhất một trường để cập nhật")
        return self


class AdminScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_phac_do: int
    ma_vac_xin: int
    so_thu_tu_mui: int
    ten_mui: str | None
    khoang_cach_ngay: int
    mo_ta: str | None
