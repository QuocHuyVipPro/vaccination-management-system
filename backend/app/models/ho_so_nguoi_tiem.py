from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.lich_hen_tiem import LichHenTiem
    from app.models.lich_su_tiem import LichSuTiem
    from app.models.nguoi_dung import NguoiDung


class HoSoNguoiTiem(Base):
    __tablename__ = "ho_so_nguoi_tiem"

    ma_ho_so: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.ma_nguoi_dung"), nullable=False)
    ho_ten: Mapped[str] = mapped_column(String(100), nullable=False)
    ngay_sinh: Mapped[date] = mapped_column(Date, nullable=False)
    gioi_tinh: Mapped[str | None] = mapped_column(String(20))
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20))
    dia_chi: Mapped[str | None] = mapped_column(String(255))
    nguoi_giam_ho: Mapped[str | None] = mapped_column(String(100))
    moi_quan_he: Mapped[str | None] = mapped_column(String(50))
    di_ung: Mapped[str | None] = mapped_column(Text)
    ghi_chu_suc_khoe: Mapped[str | None] = mapped_column(Text)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    ngay_cap_nhat: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    nguoi_dung: Mapped[NguoiDung] = relationship(back_populates="ho_so_nguoi_tiem", foreign_keys=[ma_nguoi_dung])
    lich_hen_tiem: Mapped[list[LichHenTiem]] = relationship(back_populates="ho_so")
    lich_su_tiem: Mapped[list[LichSuTiem]] = relationship(back_populates="ho_so")

