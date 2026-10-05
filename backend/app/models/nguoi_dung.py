from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.giao_dich_kho import GiaoDichKho
    from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
    from app.models.lich_su_tiem import LichSuTiem
    from app.models.thong_bao import ThongBao


class NguoiDung(Base):
    __tablename__ = "nguoi_dung"

    ma_nguoi_dung: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ho_ten: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, unique=True, index=True)
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20))
    mat_khau: Mapped[str] = mapped_column(String(255), nullable=False)
    vai_tro: Mapped[str] = mapped_column(String(20), nullable=False)
    trang_thai: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    ngay_cap_nhat: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    ho_so_nguoi_tiem: Mapped[list[HoSoNguoiTiem]] = relationship(back_populates="nguoi_dung", foreign_keys="HoSoNguoiTiem.ma_nguoi_dung")
    lich_su_tiem_thuc_hien: Mapped[list[LichSuTiem]] = relationship(back_populates="nhan_vien", foreign_keys="LichSuTiem.ma_nhan_vien")
    giao_dich_kho_thuc_hien: Mapped[list[GiaoDichKho]] = relationship(back_populates="nguoi_thuc_hien_quan_he", foreign_keys="GiaoDichKho.nguoi_thuc_hien")
    thong_bao: Mapped[list[ThongBao]] = relationship(back_populates="nguoi_dung", foreign_keys="ThongBao.ma_nguoi_dung")

