from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.lich_su_gui_thong_bao import LichSuGuiThongBao
    from app.models.nguoi_dung import NguoiDung


class ThongBao(Base):
    __tablename__ = "thong_bao"

    ma_thong_bao: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.ma_nguoi_dung"), nullable=False)
    tieu_de: Mapped[str] = mapped_column(String(200), nullable=False)
    noi_dung: Mapped[str] = mapped_column(Text, nullable=False)
    loai_thong_bao: Mapped[str | None] = mapped_column(String(50))
    thoi_gian_gui_du_kien: Mapped[datetime | None] = mapped_column(DateTime)
    da_doc: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)

    nguoi_dung: Mapped[NguoiDung] = relationship(back_populates="thong_bao", foreign_keys=[ma_nguoi_dung])
    lich_su_gui: Mapped[list[LichSuGuiThongBao]] = relationship(back_populates="thong_bao")

