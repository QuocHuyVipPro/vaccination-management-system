from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.chi_tiet_lich_hen import ChiTietLichHen
    from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
    from app.models.lo_vac_xin import LoVacXin
    from app.models.nguoi_dung import NguoiDung
    from app.models.vac_xin import VacXin


class LichSuTiem(Base):
    __tablename__ = "lich_su_tiem"

    ma_lich_su: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_ho_so: Mapped[int] = mapped_column(ForeignKey("ho_so_nguoi_tiem.ma_ho_so"), nullable=False)
    ma_chi_tiet_lich_hen: Mapped[int] = mapped_column(ForeignKey("chi_tiet_lich_hen.ma_chi_tiet"), nullable=False)
    ma_vac_xin: Mapped[int] = mapped_column(ForeignKey("vac_xin.ma_vac_xin"), nullable=False)
    ma_lo: Mapped[int] = mapped_column(ForeignKey("lo_vac_xin.ma_lo"), nullable=False)
    ma_nhan_vien: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.ma_nguoi_dung"), nullable=False)
    so_thu_tu_mui: Mapped[int] = mapped_column(Integer, nullable=False)
    ngay_tiem: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ngay_du_kien_mui_tiep: Mapped[date | None] = mapped_column(Date)
    phan_ung_sau_tiem: Mapped[str | None] = mapped_column(Text)
    ghi_chu: Mapped[str | None] = mapped_column(Text)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)

    ho_so: Mapped[HoSoNguoiTiem] = relationship(back_populates="lich_su_tiem")
    chi_tiet_lich_hen: Mapped[ChiTietLichHen] = relationship(back_populates="lich_su_tiem")
    vac_xin: Mapped[VacXin] = relationship(back_populates="lich_su_tiem")
    lo_vac_xin: Mapped[LoVacXin] = relationship(back_populates="lich_su_tiem")
    nhan_vien: Mapped[NguoiDung] = relationship(back_populates="lich_su_tiem_thuc_hien", foreign_keys=[ma_nhan_vien])

