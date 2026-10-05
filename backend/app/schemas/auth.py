from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ho_ten: str
    email: EmailStr
    so_dien_thoai: str | None = None
    mat_khau: str = Field(min_length=8)

    @field_validator("ho_ten")
    @classmethod
    def validate_ho_ten(cls, value: str) -> str:
        stripped_value = value.strip()
        if not stripped_value:
            raise ValueError("Họ tên không được để trống.")
        return stripped_value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    mat_khau: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_nguoi_dung: int
    ho_ten: str
    email: EmailStr
    so_dien_thoai: str | None
    vai_tro: str
    trang_thai: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserResponse
