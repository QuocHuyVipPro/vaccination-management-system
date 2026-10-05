from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class VaccinationScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_phac_do: int
    ma_vac_xin: int
    so_thu_tu_mui: int
    ten_mui: str | None
    khoang_cach_ngay: int
    mo_ta: str | None


class VaccineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ma_vac_xin: int
    ten_vac_xin: str
    nha_san_xuat: str | None
    quoc_gia_san_xuat: str | None
    phong_benh: str | None
    mo_ta: str | None
    gia: Decimal | None
    trang_thai: bool


class VaccineDetailResponse(VaccineResponse):
    phac_do_tiem: list[VaccinationScheduleResponse]
