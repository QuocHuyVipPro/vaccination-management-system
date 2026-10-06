from datetime import date, datetime
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


class AdminBatchCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ma_vac_xin: int = Field(gt=0)
    so_lo: str = Field(max_length=100)
    ngay_san_xuat: date | None = None
    han_su_dung: date
    so_luong_nhap: int = Field(gt=0)
    gia_nhap: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    ngay_nhap: date
    trang_thai: str = Field(default="DANG_SU_DUNG", max_length=30)

    @field_validator("so_lo")
    @classmethod
    def validate_batch_number(cls, value: str) -> str:
        return _required_text(value, "Số lô")

    @field_validator("trang_thai")
    @classmethod
    def validate_status(cls, value: str) -> str:
        return _required_text(value, "Trạng thái")

    @model_validator(mode="after")
    def validate_dates(self):
        if self.han_su_dung < date.today():
            raise ValueError("Hạn sử dụng không được ở trong quá khứ")
        if (
            self.ngay_san_xuat is not None
            and self.han_su_dung <= self.ngay_san_xuat
        ):
            raise ValueError("Hạn sử dụng phải sau ngày sản xuất")
        return self


class AdminBatchUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ngay_san_xuat: date | None = None
    han_su_dung: date | None = None
    gia_nhap: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    ngay_nhap: date | None = None
    trang_thai: str | None = Field(default=None, max_length=30)

    @field_validator("han_su_dung", "ngay_nhap")
    @classmethod
    def validate_required_dates(cls, value: date | None) -> date:
        if value is None:
            raise ValueError("Ngày không được để trống")
        return value

    @field_validator("trang_thai")
    @classmethod
    def validate_status(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Trạng thái không được để trống")
        return _required_text(value, "Trạng thái")

    @model_validator(mode="after")
    def require_at_least_one_field(self):
        if not self.model_fields_set:
            raise ValueError("Cần cung cấp ít nhất một trường để cập nhật")
        return self


class AdminBatchRestock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    so_luong: int = Field(gt=0)
    ghi_chu: str | None = None

    @field_validator("ghi_chu")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        return _optional_text(value)


class AdminBatchAdjust(BaseModel):
    model_config = ConfigDict(extra="forbid")

    so_luong_thay_doi: int
    ghi_chu: str

    @field_validator("so_luong_thay_doi")
    @classmethod
    def validate_quantity_change(cls, value: int) -> int:
        if value == 0:
            raise ValueError("Số lượng thay đổi phải khác 0")
        return value

    @field_validator("ghi_chu")
    @classmethod
    def validate_note(cls, value: str) -> str:
        return _required_text(value, "Lý do điều chỉnh")


class AdminBatchResponse(BaseModel):
    ma_lo: int
    ma_vac_xin: int
    ten_vac_xin: str
    so_lo: str
    ngay_san_xuat: date | None
    han_su_dung: date
    so_luong_nhap: int
    so_luong_con: int
    gia_nhap: Decimal | None
    ngay_nhap: date
    trang_thai: str
    ngay_tao: datetime


class AdminInventoryTransactionResponse(BaseModel):
    ma_giao_dich: int
    ma_lo: int
    so_lo: str
    ma_vac_xin: int
    ten_vac_xin: str
    loai_giao_dich: str
    so_luong: int
    loai_tham_chieu: str | None
    ma_tham_chieu: int | None
    nguoi_thuc_hien: int
    ghi_chu: str | None
    ngay_tao: datetime
