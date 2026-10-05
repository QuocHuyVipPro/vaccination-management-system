from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StaffVaccinationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ma_chi_tiet_lich_hen: int = Field(gt=0)
    ma_lo: int = Field(gt=0)
    phan_ung_sau_tiem: str | None = None
    ghi_chu: str | None = None

    @field_validator("phan_ung_sau_tiem", "ghi_chu")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized_value = value.strip()
        return normalized_value or None


class StaffVaccinationResponse(BaseModel):
    ma_lich_su: int
    ma_ho_so: int
    ma_chi_tiet_lich_hen: int
    ma_vac_xin: int
    ten_vac_xin: str
    ma_lo: int
    so_lo: str
    ma_nhan_vien: int
    so_thu_tu_mui: int
    ngay_tiem: datetime
    ngay_du_kien_mui_tiep: date | None
    phan_ung_sau_tiem: str | None
    ghi_chu: str | None
    trang_thai_lich_hen: str
