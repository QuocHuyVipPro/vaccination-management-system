from sqlalchemy import select

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.nguoi_dung import NguoiDung


STAFF_EMAIL = "auth.test.staff@example.com"
NEW_PASSWORD = "Staff123456"


with SessionLocal() as db:
    staff = db.scalar(
        select(NguoiDung).where(
            NguoiDung.email == STAFF_EMAIL
        )
    )

    if staff is None:
        print("Khong tim thay tai khoan Staff.")
    else:
        staff.mat_khau = hash_password(NEW_PASSWORD)
        db.commit()

        print("Reset mat khau Staff thanh cong.")
        print(f"Email: {staff.email}")