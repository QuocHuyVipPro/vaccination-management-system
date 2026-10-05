"""Shared FastAPI dependencies."""

from app.dependencies.auth import (
    ROLE_KHACH_HANG,
    ROLE_NHAN_VIEN,
    ROLE_QUAN_TRI_VIEN,
    get_current_user,
    require_roles,
)

__all__ = [
    "ROLE_KHACH_HANG",
    "ROLE_NHAN_VIEN",
    "ROLE_QUAN_TRI_VIEN",
    "get_current_user",
    "require_roles",
]
