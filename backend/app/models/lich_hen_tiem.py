from __future__ import annotations

from datetime import date, datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.chi_tiet_lich_hen import ChiTietLichHen
    from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem


class LichHenTiem(Base):
    __tablename__ = "lich_hen_tiem"

    ma_lich_hen: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_ho_so: Mapped[int] = mapped_column(ForeignKey("ho_so_nguoi_tiem.ma_ho_so"), nullable=False)
    ngay_hen: Mapped[date] = mapped_column(Date, nullable=False)
    gio_hen: Mapped[time] = mapped_column(Time, nullable=False)
    trang_thai: Mapped[str] = mapped_column(String(30), nullable=False, default="CHO_XAC_NHAN")
    ghi_chu: Mapped[str | None] = mapped_column(Text)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    ngay_cap_nhat: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    ho_so: Mapped[HoSoNguoiTiem] = relationship(back_populates="lich_hen_tiem")
    chi_tiet_lich_hen: Mapped[list[ChiTietLichHen]] = relationship(back_populates="lich_hen")

