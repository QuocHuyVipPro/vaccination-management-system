from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import (
    REMINDER_CHECK_INTERVAL_MINUTES,
    REMINDER_SCHEDULER_ENABLED,
)
from app.database import SessionLocal
from app.services.reminder_service import process_due_reminders


_scheduler: AsyncIOScheduler | None = None


def _run_reminder_job() -> None:
    with SessionLocal() as db:
        process_due_reminders(db)


def start_reminder_scheduler() -> bool:
    global _scheduler
    if not REMINDER_SCHEDULER_ENABLED:
        return False
    if _scheduler is not None and _scheduler.running:
        return True

    _scheduler = AsyncIOScheduler(timezone="Asia/Ho_Chi_Minh")
    _scheduler.add_job(
        _run_reminder_job,
        trigger="interval",
        minutes=REMINDER_CHECK_INTERVAL_MINUTES,
        id="vaccination-reminder-check",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    _scheduler.start()
    return True


def shutdown_reminder_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
    _scheduler = None
