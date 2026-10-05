import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database import get_db
from app.models.nguoi_dung import NguoiDung


bearer_scheme = HTTPBearer(auto_error=False)

ROLE_KHACH_HANG = "KHACH_HANG"
ROLE_NHAN_VIEN = "NHAN_VIEN"
ROLE_QUAN_TRI_VIEN = "QUAN_TRI_VIEN"
VALID_ROLES = frozenset(
    {ROLE_KHACH_HANG, ROLE_NHAN_VIEN, ROLE_QUAN_TRI_VIEN}
)


def _authentication_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Thông tin xác thực không hợp lệ",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> NguoiDung:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _authentication_error()

    try:
        payload = decode_access_token(credentials.credentials)
        subject = payload.get("sub")
        if subject is None:
            raise ValueError("Missing token subject")
        user_id = int(subject)
        if user_id <= 0:
            raise ValueError("Invalid user identifier")
    except (jwt.InvalidTokenError, TypeError, ValueError) as exc:
        raise _authentication_error() from exc

    user = db.scalar(
        select(NguoiDung).where(NguoiDung.ma_nguoi_dung == user_id)
    )
    if user is None:
        raise _authentication_error()
    if not user.trang_thai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa",
        )

    return user


def require_roles(*allowed_roles: str):
    if not allowed_roles:
        raise ValueError("require_roles cần ít nhất một role")

    invalid_roles = set(allowed_roles) - VALID_ROLES
    if invalid_roles:
        raise ValueError("require_roles nhận role không hợp lệ")

    def role_checker(
        current_user: NguoiDung = Depends(get_current_user),
    ) -> NguoiDung:
        if current_user.vai_tro not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập chức năng này",
            )
        return current_user

    return role_checker
