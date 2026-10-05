import sys

from sqlalchemy import inspect

from app.database import Base, engine
import app.models  # noqa: F401  # Registers every mapped table with Base metadata.


EXPECTED_TABLES = {
    "chi_tiet_lich_hen",
    "giao_dich_kho",
    "ho_so_nguoi_tiem",
    "lich_hen_tiem",
    "lich_su_gui_thong_bao",
    "lich_su_tiem",
    "lo_vac_xin",
    "nguoi_dung",
    "phac_do_tiem",
    "thong_bao",
    "vac_xin",
}


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    Base.metadata.create_all(bind=engine)
    existing_tables = set(inspect(engine).get_table_names(schema="public"))
    missing_tables = EXPECTED_TABLES - existing_tables
    if missing_tables:
        missing = ", ".join(sorted(missing_tables))
        raise RuntimeError(f"Chưa tạo đủ bảng: {missing}")
    print("Đã tạo/kiểm tra 11 bảng trong tiem_chung_db")


if __name__ == "__main__":
    main()

