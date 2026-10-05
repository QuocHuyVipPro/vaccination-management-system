from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.lich_hen_tiem import LichHenTiem
    from app.models.lich_su_tiem import LichSuTiem
    from app.models.vac_xin import VacXin


class ChiTietLichHen(Base):
    __tablename__ = "chi_tiet_lich_hen"

    ma_chi_tiet: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_lich_hen: Mapped[int] = mapped_column(ForeignKey("lich_hen_tiem.ma_lich_hen"), nullable=False)
    ma_vac_xin: Mapped[int] = mapped_column(ForeignKey("vac_xin.ma_vac_xin"), nullable=False)
    so_thu_tu_mui: Mapped[int] = mapped_column(Integer, nullable=False)

    lich_hen: Mapped[LichHenTiem] = relationship(back_populates="chi_tiet_lich_hen")
    vac_xin: Mapped[VacXin] = relationship(back_populates="chi_tiet_lich_hen")
    lich_su_tiem: Mapped[list[LichSuTiem]] = relationship(back_populates="chi_tiet_lich_hen")

