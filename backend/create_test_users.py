"""Create local staff/admin accounts for development authorization tests."""

import os

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.database import SessionLocal
from app.dependencies.auth import ROLE_NHAN_VIEN, ROLE_QUAN_TRI_VIEN
from app.models.nguoi_dung import NguoiDung


TEST_USERS = (
    {
        "ho_ten": "Development Test Staff",
        "email": "auth.test.staff@example.com",
        "vai_tro": ROLE_NHAN_VIEN,
        "password_variable": "TEST_STAFF_PASSWORD",
    },
    {
        "ho_ten": "Development Test Admin",
        "email": "auth.test.admin@example.com",
        "vai_tro": ROLE_QUAN_TRI_VIEN,
        "password_variable": "TEST_ADMIN_PASSWORD",
    },
)


def create_test_users() -> tuple[int, int]:
    passwords: dict[str, str] = {}
    for user_data in TEST_USERS:
        variable_name = user_data["password_variable"]
        password = os.getenv(variable_name)
        if not password or len(password) < 8:
            raise RuntimeError(
                f"Biến môi trường {variable_name} phải có ít nhất 8 ký tự."
            )
        passwords[variable_name] = password

    created_count = 0
    existing_count = 0
    with SessionLocal() as db:
        for user_data in TEST_USERS:
            existing_user = db.scalar(
                select(NguoiDung).where(NguoiDung.email == user_data["email"])
            )
            if existing_user is not None:
                existing_count += 1
                continue

            db.add(
                NguoiDung(
                    ho_ten=user_data["ho_ten"],
                    email=user_data["email"],
                    so_dien_thoai=None,
                    mat_khau=hash_password(
                        passwords[user_data["password_variable"]]
                    ),
                    vai_tro=user_data["vai_tro"],
                    trang_thai=True,
                )
            )
            created_count += 1

        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise RuntimeError(
                "Không thể tạo test users vì email đã tồn tại đồng thời."
            ) from exc

    return created_count, existing_count


if __name__ == "__main__":
    created, existing = create_test_users()
    print(f"Test users created: {created}")
    print(f"Test users already existed: {existing}")
