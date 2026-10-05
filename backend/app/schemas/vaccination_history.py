from datetime import date, datetime

from pydantic import BaseModel


class VaccinationHistoryResponse(BaseModel):
    ma_lich_su: int
    ma_ho_so: int
    ho_ten_nguoi_tiem: str
    ma_chi_tiet_lich_hen: int
    ma_vac_xin: int
    ten_vac_xin: str
    so_thu_tu_mui: int
    ma_lo: int
    so_lo: str
    ngay_tiem: datetime
    ngay_du_kien_mui_tiep: date | None
    phan_ung_sau_tiem: str | None
    ghi_chu: str | None
