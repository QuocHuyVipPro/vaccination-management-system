from sqlalchemy import select

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.nguoi_dung import NguoiDung


CUSTOMER_ID = 2
NEW_PASSWORD = "Customer123456"


with SessionLocal() as db:
    customer = db.scalar(
        select(NguoiDung).where(
            NguoiDung.ma_nguoi_dung == CUSTOMER_ID
        )
    )

    if customer is None:
        print("Khong tim thay tai khoan Customer.")
    else:
        customer.mat_khau = hash_password(NEW_PASSWORD)
        db.commit()

        print("Reset mat khau Customer thanh cong.")
        print(f"Email: {customer.email}")