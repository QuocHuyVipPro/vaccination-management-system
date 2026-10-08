from dataclasses import asdict, dataclass
from datetime import datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import REMINDER_BEFORE_HOURS
from app.models.ho_so_nguoi_tiem import HoSoNguoiTiem
from app.models.lich_hen_tiem import LichHenTiem
from app.models.lich_su_gui_thong_bao import LichSuGuiThongBao
from app.models.lich_su_tiem import LichSuTiem
from app.models.nguoi_dung import NguoiDung
from app.models.thong_bao import ThongBao
from app.models.vac_xin import VacXin
from app.services.email_template_service import (
    ReminderEmailData,
    render_reminder_email,
)
from app.services.notification_delivery_service import (
    EmailDeliveryError,
    send_notification_email,
)
from app.services.notification_service import create_notification


@dataclass
class ReminderSummary:
    checked: int = 0
    created: int = 0
    sent: int = 0
    failed: int = 0
    skipped: int = 0

    def to_dict(self) -> dict[str, int]:
        return asdict(self)


@dataclass(frozen=True)
class DueReminder:
    user_id: int
    notification_type: str
    title: str
    content: str
    scheduled_at: datetime
    reminder_key: str
    eligible: bool
    email_data: ReminderEmailData


def _appointment_reminders(
    db: Session,
    current_time: datetime,
    horizon: datetime,
) -> list[DueReminder]:
    rows = db.execute(
        select(LichHenTiem, HoSoNguoiTiem, NguoiDung)
        .join(
            HoSoNguoiTiem,
            HoSoNguoiTiem.ma_ho_so == LichHenTiem.ma_ho_so,
        )
        .join(
            NguoiDung,
            NguoiDung.ma_nguoi_dung == HoSoNguoiTiem.ma_nguoi_dung,
        )
        .where(
            LichHenTiem.ngay_hen >= current_time.date(),
            LichHenTiem.ngay_hen <= horizon.date(),
        )
        .order_by(LichHenTiem.ma_lich_hen.asc())
    ).all()

    reminders = []
    for appointment, profile, user in rows:
        scheduled_at = datetime.combine(
            appointment.ngay_hen,
            appointment.gio_hen,
        )
        key = (
            "[REMINDER_KEY:LICH_TIEM:"
            f"{appointment.ma_lich_hen}:{scheduled_at.isoformat()}]"
        )
        reminders.append(
            DueReminder(
                user_id=user.ma_nguoi_dung,
                notification_type="LICH_TIEM",
                title="Nhắc lịch tiêm sắp tới",
                content=(
                    f"{profile.ho_ten} có lịch tiêm vào "
                    f"{scheduled_at.strftime('%d/%m/%Y lúc %H:%M')}.\n\n"
                    f"{key}"
                ),
                scheduled_at=scheduled_at,
                reminder_key=key,
                eligible=(
                    appointment.trang_thai == "DA_XAC_NHAN"
                    and user.trang_thai
                    and current_time < scheduled_at <= horizon
                ),
                email_data=ReminderEmailData(
                    notification_type="LICH_TIEM",
                    recipient_name=profile.ho_ten,
                    scheduled_date=appointment.ngay_hen,
                    scheduled_time=appointment.gio_hen,
                ),
            )
        )
    return reminders


def _next_dose_reminders(
    db: Session,
    current_time: datetime,
    horizon: datetime,
) -> list[DueReminder]:
    rows = db.execute(
        select(LichSuTiem, HoSoNguoiTiem, NguoiDung, VacXin)
        .join(
            HoSoNguoiTiem,
            HoSoNguoiTiem.ma_ho_so == LichSuTiem.ma_ho_so,
        )
        .join(
            NguoiDung,
            NguoiDung.ma_nguoi_dung == HoSoNguoiTiem.ma_nguoi_dung,
        )
        .join(VacXin, VacXin.ma_vac_xin == LichSuTiem.ma_vac_xin)
        .where(
            LichSuTiem.ngay_du_kien_mui_tiep.is_not(None),
            LichSuTiem.ngay_du_kien_mui_tiep >= current_time.date(),
            LichSuTiem.ngay_du_kien_mui_tiep <= horizon.date(),
        )
        .order_by(LichSuTiem.ma_lich_su.asc())
    ).all()

    reminders = []
    for history, profile, user, vaccine in rows:
        scheduled_at = datetime.combine(
            history.ngay_du_kien_mui_tiep,
            time.min,
        )
        key = (
            "[REMINDER_KEY:MUI_TIEP_THEO:"
            f"{history.ma_lich_su}:{history.ngay_du_kien_mui_tiep.isoformat()}]"
        )
        reminders.append(
            DueReminder(
                user_id=user.ma_nguoi_dung,
                notification_type="MUI_TIEP_THEO",
                title="Nhắc mũi tiêm tiếp theo",
                content=(
                    f"{profile.ho_ten} có mũi {vaccine.ten_vac_xin} "
                    f"dự kiến vào ngày "
                    f"{history.ngay_du_kien_mui_tiep.strftime('%d/%m/%Y')}.\n\n"
                    f"{key}"
                ),
                scheduled_at=scheduled_at,
                reminder_key=key,
                eligible=(
                    user.trang_thai
                    and current_time < scheduled_at <= horizon
                ),
                email_data=ReminderEmailData(
                    notification_type="MUI_TIEP_THEO",
                    recipient_name=profile.ho_ten,
                    scheduled_date=history.ngay_du_kien_mui_tiep,
                    vaccine_name=vaccine.ten_vac_xin,
                ),
            )
        )
    return reminders


def _process_one_reminder(
    db: Session,
    reminder: DueReminder,
) -> tuple[bool, str]:
    # The PostgreSQL transaction lock serializes the same deterministic key
    # across scheduler workers without requiring a schema change.
    db.execute(
        select(
            func.pg_advisory_xact_lock(
                func.hashtext(reminder.reminder_key)
            )
        )
    )
    notification = db.scalar(
        select(ThongBao)
        .where(
            ThongBao.ma_nguoi_dung == reminder.user_id,
            ThongBao.loai_thong_bao == reminder.notification_type,
            ThongBao.noi_dung.contains(reminder.reminder_key),
        )
        .order_by(ThongBao.ma_thong_bao.asc())
    )
    created = False
    if notification is None:
        notification = create_notification(
            db,
            ma_nguoi_dung=reminder.user_id,
            tieu_de=reminder.title,
            noi_dung=reminder.content,
            loai_thong_bao=reminder.notification_type,
            thoi_gian_gui_du_kien=reminder.scheduled_at,
            commit=False,
        )
        created = True

    was_sent = db.scalar(
        select(LichSuGuiThongBao.ma_gui).where(
            LichSuGuiThongBao.ma_thong_bao
            == notification.ma_thong_bao,
            LichSuGuiThongBao.kenh_gui == "EMAIL",
            LichSuGuiThongBao.trang_thai == "DA_GUI",
        )
    )
    if was_sent is not None:
        db.commit()
        return created, "skipped"

    try:
        send_notification_email(
            db,
            notification,
            email_content=render_reminder_email(reminder.email_data),
        )
    except EmailDeliveryError:
        return created, "failed"
    return created, "sent"


def process_due_reminders(
    db: Session,
    *,
    current_time: datetime | None = None,
    reminder_before_hours: float = REMINDER_BEFORE_HOURS,
) -> dict[str, int]:
    now = current_time or datetime.now()
    horizon = now + timedelta(hours=reminder_before_hours)
    reminders = [
        *_appointment_reminders(db, now, horizon),
        *_next_dose_reminders(db, now, horizon),
    ]
    summary = ReminderSummary(checked=len(reminders))

    for reminder in reminders:
        if not reminder.eligible:
            summary.skipped += 1
            continue
        try:
            created, outcome = _process_one_reminder(db, reminder)
        except SQLAlchemyError:
            db.rollback()
            summary.failed += 1
            continue
        if created:
            summary.created += 1
        if outcome == "sent":
            summary.sent += 1
        elif outcome == "failed":
            summary.failed += 1
        else:
            summary.skipped += 1

    return summary.to_dict()
