from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.giao_dich_kho import GiaoDichKho
    from app.models.lich_su_tiem import LichSuTiem
    from app.models.vac_xin import VacXin


class LoVacXin(Base):
    __tablename__ = "lo_vac_xin"

    ma_lo: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_vac_xin: Mapped[int] = mapped_column(ForeignKey("vac_xin.ma_vac_xin"), nullable=False)
    so_lo: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    ngay_san_xuat: Mapped[date | None] = mapped_column(Date)
    han_su_dung: Mapped[date] = mapped_column(Date, nullable=False)
    so_luong_nhap: Mapped[int] = mapped_column(Integer, nullable=False)
    so_luong_con: Mapped[int] = mapped_column(Integer, nullable=False)
    gia_nhap: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    ngay_nhap: Mapped[date] = mapped_column(Date, nullable=False)
    trang_thai: Mapped[str] = mapped_column(String(30), nullable=False, default="DANG_SU_DUNG")
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)

    vac_xin: Mapped[VacXin] = relationship(back_populates="lo_vac_xin")
    lich_su_tiem: Mapped[list[LichSuTiem]] = relationship(back_populates="lo_vac_xin")
    giao_dich_kho: Mapped[list[GiaoDichKho]] = relationship(back_populates="lo_vac_xin")

