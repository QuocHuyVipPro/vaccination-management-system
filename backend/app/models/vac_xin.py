from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.chi_tiet_lich_hen import ChiTietLichHen
    from app.models.lich_su_tiem import LichSuTiem
    from app.models.lo_vac_xin import LoVacXin
    from app.models.phac_do_tiem import PhacDoTiem


class VacXin(Base):
    __tablename__ = "vac_xin"

    ma_vac_xin: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ten_vac_xin: Mapped[str] = mapped_column(String(150), nullable=False)
    nha_san_xuat: Mapped[str | None] = mapped_column(String(150))
    quoc_gia_san_xuat: Mapped[str | None] = mapped_column(String(100))
    phong_benh: Mapped[str | None] = mapped_column(String(255))
    mo_ta: Mapped[str | None] = mapped_column(Text)
    gia: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    trang_thai: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    ngay_cap_nhat: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    phac_do_tiem: Mapped[list[PhacDoTiem]] = relationship(back_populates="vac_xin")
    lo_vac_xin: Mapped[list[LoVacXin]] = relationship(back_populates="vac_xin")
    chi_tiet_lich_hen: Mapped[list[ChiTietLichHen]] = relationship(back_populates="vac_xin")
    lich_su_tiem: Mapped[list[LichSuTiem]] = relationship(back_populates="vac_xin")

