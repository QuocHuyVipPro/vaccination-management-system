"""Seed a small vaccine catalog for local development and testing."""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.phac_do_tiem import PhacDoTiem
from app.models.vac_xin import VacXin


VACCINE_SEEDS = (
    {
        "vaccine": {
            "ten_vac_xin": "Vắc xin mẫu A",
            "nha_san_xuat": "Nhà sản xuất mẫu A",
            "quoc_gia_san_xuat": "Việt Nam",
            "phong_benh": "Bệnh truyền nhiễm mẫu A",
            "mo_ta": "Dữ liệu phát triển cho vaccine có hai mũi.",
            "gia": Decimal("350000.00"),
            "trang_thai": True,
        },
        "schedule": (
            {
                "so_thu_tu_mui": 1,
                "ten_mui": "Mũi 1",
                "khoang_cach_ngay": 0,
                "mo_ta": "Mũi khởi đầu",
            },
            {
                "so_thu_tu_mui": 2,
                "ten_mui": "Mũi 2",
                "khoang_cach_ngay": 28,
                "mo_ta": "Cách mũi 1 tối thiểu 28 ngày",
            },
        ),
    },
    {
        "vaccine": {
            "ten_vac_xin": "Vắc xin mẫu B",
            "nha_san_xuat": "Nhà sản xuất mẫu B",
            "quoc_gia_san_xuat": "Pháp",
            "phong_benh": "Bệnh truyền nhiễm mẫu B",
            "mo_ta": "Dữ liệu phát triển cho vaccine một mũi.",
            "gia": Decimal("420000.00"),
            "trang_thai": True,
        },
        "schedule": (
            {
                "so_thu_tu_mui": 1,
                "ten_mui": "Mũi duy nhất",
                "khoang_cach_ngay": 0,
                "mo_ta": "Phác đồ một mũi",
            },
        ),
    },
    {
        "vaccine": {
            "ten_vac_xin": "Vắc xin mẫu C ngừng sử dụng",
            "nha_san_xuat": "Nhà sản xuất mẫu C",
            "quoc_gia_san_xuat": "Nhật Bản",
            "phong_benh": "Bệnh truyền nhiễm mẫu C",
            "mo_ta": "Dữ liệu phát triển để kiểm tra bộ lọc trạng thái.",
            "gia": Decimal("280000.00"),
            "trang_thai": False,
        },
        "schedule": (),
    },
)


def seed_vaccines() -> tuple[int, int, int, int]:
    created_vaccines = 0
    existing_vaccines = 0
    created_schedule_entries = 0
    existing_schedule_entries = 0

    with SessionLocal() as db:
        for seed in VACCINE_SEEDS:
            vaccine_data = seed["vaccine"]
            vaccine = db.scalar(
                select(VacXin).where(
                    VacXin.ten_vac_xin == vaccine_data["ten_vac_xin"]
                )
            )
            if vaccine is None:
                vaccine = VacXin(**vaccine_data)
                db.add(vaccine)
                db.flush()
                created_vaccines += 1
            else:
                existing_vaccines += 1

            for schedule_data in seed["schedule"]:
                existing_schedule = db.scalar(
                    select(PhacDoTiem).where(
                        PhacDoTiem.ma_vac_xin == vaccine.ma_vac_xin,
                        PhacDoTiem.so_thu_tu_mui
                        == schedule_data["so_thu_tu_mui"],
                    )
                )
                if existing_schedule is not None:
                    existing_schedule_entries += 1
                    continue
                db.add(
                    PhacDoTiem(
                        ma_vac_xin=vaccine.ma_vac_xin,
                        **schedule_data,
                    )
                )
                created_schedule_entries += 1

        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise RuntimeError(
                "Không thể seed vaccine vì dữ liệu trùng lặp đồng thời."
            ) from exc

    return (
        created_vaccines,
        existing_vaccines,
        created_schedule_entries,
        existing_schedule_entries,
    )


if __name__ == "__main__":
    created, existing, created_schedule, existing_schedule = seed_vaccines()
    print(f"Vaccines created: {created}")
    print(f"Vaccines already existed: {existing}")
    print(f"Schedule entries created: {created_schedule}")
    print(f"Schedule entries already existed: {existing_schedule}")
