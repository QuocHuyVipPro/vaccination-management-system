from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


AdminUserRole = Literal["KHACH_HANG", "NHAN_VIEN", "QUAN_TRI_VIEN"]


def _normalize_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("Họ tên không được để trống")
    return normalized


def _normalize_phone(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


class AdminUserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ho_ten: str = Field(max_length=100)
    email: EmailStr = Field(max_length=150)
    so_dien_thoai: str | None = Field(default=None, max_length=20)
    mat_khau: str = Field(min_length=8)
    vai_tro: AdminUserRole
    trang_thai: bool = True

    @field_validator("ho_ten")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _normalize_name(value)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()

    @field_validator("so_dien_thoai")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        return _normalize_phone(value)


class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ho_ten: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = Field(default=None, max_length=150)
    so_dien_thoai: str | None = Field(default=None, max_length=20)
    vai_tro: AdminUserRole | None = None
    trang_thai: bool | None = None

    @field_validator("ho_ten")
    @classmethod
    def validate_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Họ tên không được để trống")
        return _normalize_name(value)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr | None) -> str:
        if value is None:
            raise ValueError("Email không được để trống")
        return str(value).lower()

    @field_validator("so_dien_thoai")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        return _normalize_phone(value)

    @field_validator("vai_tro")
    @classmethod
    def validate_role(cls, value: AdminUserRole | None) -> AdminUserRole:
        if value is None:
            raise ValueError("Vai trò không được để trống")
        return value

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


class AdminPasswordReset(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mat_khau_moi: str = Field(min_length=8)


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_nguoi_dung: int
    ho_ten: str
    email: EmailStr
    so_dien_thoai: str | None
    vai_tro: AdminUserRole
    trang_thai: bool
    ngay_tao: datetime
    ngay_cap_nhat: datetime
