from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.vac_xin import VacXin


class PhacDoTiem(Base):
    __tablename__ = "phac_do_tiem"
    __table_args__ = (UniqueConstraint("ma_vac_xin", "so_thu_tu_mui", name="uq_phac_do_vac_xin_mui"),)

    ma_phac_do: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_vac_xin: Mapped[int] = mapped_column(ForeignKey("vac_xin.ma_vac_xin"), nullable=False)
    so_thu_tu_mui: Mapped[int] = mapped_column(Integer, nullable=False)
    ten_mui: Mapped[str | None] = mapped_column(String(100))
    khoang_cach_ngay: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mo_ta: Mapped[str | None] = mapped_column(Text)

    vac_xin: Mapped[VacXin] = relationship(back_populates="phac_do_tiem")

