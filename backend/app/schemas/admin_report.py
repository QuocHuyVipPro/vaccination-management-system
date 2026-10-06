from datetime import date

from pydantic import BaseModel


class AdminDashboardResponse(BaseModel):
    tong_nguoi_dung: int
    tong_ho_so_nguoi_tiem: int
    tong_vac_xin: int
    tong_lo_vac_xin: int
    tong_lich_hen: int
    tong_mui_tiem_da_thuc_hien: int
    tong_ton_kho: int
    lich_hen_hom_nay: int
    mui_tiem_hom_nay: int
    vaccine_sap_het_han: int
    lo_sap_het_hang: int
    thong_bao_chua_doc: int


class AdminAppointmentReportResponse(BaseModel):
    tu_ngay: date | None
    den_ngay: date | None
    tong: int
    theo_trang_thai: dict[str, int]


class AdminVaccinationSeriesItem(BaseModel):
    period: str
    so_mui_tiem: int


class AdminVaccinationReportResponse(BaseModel):
    tu_ngay: date | None
    den_ngay: date | None
    group_by: str
    tong_mui_tiem: int
    series: list[AdminVaccinationSeriesItem]


class AdminVaccineStatistic(BaseModel):
    ma_vac_xin: int
    ten_vac_xin: str
    so_mui_da_tiem: int
    ton_kho_hien_tai: int
    so_lo_dang_co: int
    so_lo_con_hang: int


class AdminInventoryVaccineItem(BaseModel):
    ma_vac_xin: int
    ten_vac_xin: str
    ton_kho_hien_tai: int
    so_lo: int
    so_lo_con_hang: int


class AdminInventoryBatchItem(BaseModel):
    ma_lo: int
    so_lo: str
    ma_vac_xin: int
    ten_vac_xin: str
    so_luong_con: int
    han_su_dung: date
    trang_thai: str


class AdminInventoryReportResponse(BaseModel):
    tong_ton_kho: int
    low_stock_threshold: int
    expiry_days: int
    theo_vac_xin: list[AdminInventoryVaccineItem]
    lo_sap_het_han: list[AdminInventoryBatchItem]
    lo_sap_het_hang: list[AdminInventoryBatchItem]


class AdminNotificationReportResponse(BaseModel):
    tong_thong_bao: int
    da_doc: int
    chua_doc: int
    tong_lan_gui: int
    gui_thanh_cong: int
    gui_that_bai: int
    theo_loai_thong_bao: dict[str, int]
