from sqlalchemy import select

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.nguoi_dung import NguoiDung


ADMIN_EMAIL = "auth.test.admin@example.com"
NEW_PASSWORD = "Admin123456"


with SessionLocal() as db:
    admin = db.scalar(
        select(NguoiDung).where(NguoiDung.email == ADMIN_EMAIL)
    )

    if admin is None:
        print("Khong tim thay tai khoan Admin.")
    else:
        admin.mat_khau = hash_password(NEW_PASSWORD)
        db.commit()

        print("Reset mat khau Admin thanh cong.")
        print(f"Email: {ADMIN_EMAIL}")