from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.lo_vac_xin import LoVacXin
    from app.models.nguoi_dung import NguoiDung


class GiaoDichKho(Base):
    __tablename__ = "giao_dich_kho"

    ma_giao_dich: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_lo: Mapped[int] = mapped_column(ForeignKey("lo_vac_xin.ma_lo"), nullable=False)
    loai_giao_dich: Mapped[str] = mapped_column(String(30), nullable=False)
    so_luong: Mapped[int] = mapped_column(Integer, nullable=False)
    loai_tham_chieu: Mapped[str | None] = mapped_column(String(50))
    ma_tham_chieu: Mapped[int | None] = mapped_column(Integer)
    nguoi_thuc_hien: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.ma_nguoi_dung"), nullable=False)
    ghi_chu: Mapped[str | None] = mapped_column(Text)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)

    lo_vac_xin: Mapped[LoVacXin] = relationship(back_populates="giao_dich_kho")
    nguoi_thuc_hien_quan_he: Mapped[NguoiDung] = relationship(back_populates="giao_dich_kho_thuc_hien", foreign_keys=[nguoi_thuc_hien])

