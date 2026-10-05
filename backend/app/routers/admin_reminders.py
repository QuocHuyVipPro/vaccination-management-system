from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import ROLE_QUAN_TRI_VIEN, require_roles
from app.models.nguoi_dung import NguoiDung
from app.schemas.notification import ReminderRunResponse
from app.services.reminder_service import process_due_reminders


router = APIRouter(
    prefix="/admin/reminders",
    tags=["Admin Reminders"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentAdmin = Annotated[
    NguoiDung,
    Depends(require_roles(ROLE_QUAN_TRI_VIEN)),
]


@router.post("/run", response_model=ReminderRunResponse)
def run_due_reminders(
    _current_user: CurrentAdmin,
    db: DatabaseSession,
) -> dict[str, int]:
    return process_due_reminders(db)
