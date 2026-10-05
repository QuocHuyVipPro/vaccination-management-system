from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.thong_bao import ThongBao


class LichSuGuiThongBao(Base):
    __tablename__ = "lich_su_gui_thong_bao"

    ma_gui: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_thong_bao: Mapped[int] = mapped_column(ForeignKey("thong_bao.ma_thong_bao"), nullable=False)
    kenh_gui: Mapped[str] = mapped_column(String(20), nullable=False)
    nguoi_nhan: Mapped[str] = mapped_column(String(150), nullable=False)
    trang_thai: Mapped[str] = mapped_column(String(30), nullable=False)
    thoi_gian_gui: Mapped[datetime | None] = mapped_column(DateTime)
    loi_gui: Mapped[str | None] = mapped_column(Text)

    thong_bao: Mapped[ThongBao] = relationship(back_populates="lich_su_gui")

