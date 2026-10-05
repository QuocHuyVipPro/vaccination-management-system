"""Seed usable vaccine batches for confirmed development appointments."""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.chi_tiet_lich_hen import ChiTietLichHen
from app.models.lich_hen_tiem import LichHenTiem
from app.models.lo_vac_xin import LoVacXin


def seed_batches() -> tuple[int, int]:
    created_count = 0
    existing_count = 0
    today = date.today()

    with SessionLocal() as db:
        vaccine_ids = db.scalars(
            select(ChiTietLichHen.ma_vac_xin).distinct()
            .join(
                LichHenTiem,
                LichHenTiem.ma_lich_hen
                == ChiTietLichHen.ma_lich_hen,
            )
            .where(LichHenTiem.trang_thai == "DA_XAC_NHAN")
        ).all()

        for vaccine_id in vaccine_ids:
            batch_number = f"DEV-MAIN-VACCINE-{vaccine_id}"
            batch = db.scalar(
                select(LoVacXin).where(LoVacXin.so_lo == batch_number)
            )
            if batch is not None:
                existing_count += 1
                continue

            db.add(
                LoVacXin(
                    ma_vac_xin=vaccine_id,
                    so_lo=batch_number,
                    ngay_san_xuat=today - timedelta(days=30),
                    han_su_dung=today + timedelta(days=365),
                    so_luong_nhap=20,
                    so_luong_con=20,
                    gia_nhap=Decimal("200000.00"),
                    ngay_nhap=today,
                    trang_thai="DANG_SU_DUNG",
                )
            )
            created_count += 1

        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise RuntimeError(
                "Không thể seed lô vắc xin vì số lô đã tồn tại đồng thời."
            ) from exc

    return created_count, existing_count


if __name__ == "__main__":
    created, existing = seed_batches()
    print(f"Batches created: {created}")
    print(f"Batches already existed: {existing}")
