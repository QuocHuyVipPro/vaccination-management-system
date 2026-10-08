import unittest
from datetime import date, datetime, time
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.services.email_service import send_email
from app.services.email_template_service import (
    ReminderEmailData,
    remove_reminder_key,
    render_generic_notification_email,
    render_reminder_email,
)
from app.services.reminder_service import _appointment_reminders


class ReminderEmailTemplateTests(unittest.TestCase):
    def test_appointment_email_formats_values_and_escapes_html(self) -> None:
        content = render_reminder_email(
            ReminderEmailData(
                notification_type="LICH_TIEM",
                recipient_name="HOÀNG <QUỐC> HUY",
                scheduled_date=date(2026, 10, 7),
                scheduled_time=time(10, 0),
            )
        )

        self.assertIn("07/10/2026", content.plain_text)
        self.assertIn("10:00", content.plain_text)
        self.assertIn("HOÀNG &lt;QUỐC&gt; HUY", content.html)
        self.assertNotIn("HOÀNG <QUỐC> HUY", content.html)
        self.assertTrue(content.html.startswith("<!doctype html>"))
        self.assertIn('<meta name="viewport"', content.html)
        self.assertNotIn("<script", content.html.lower())
        self.assertNotIn("REMINDER_KEY", content.plain_text)
        self.assertNotIn("REMINDER_KEY", content.html)

    def test_next_dose_email_uses_its_own_wording_and_existing_data(self) -> None:
        content = render_reminder_email(
            ReminderEmailData(
                notification_type="MUI_TIEP_THEO",
                recipient_name="Nguyễn An",
                scheduled_date=date(2026, 11, 15),
                vaccine_name="Vắc xin <A>",
            )
        )

        self.assertIn("mũi tiêm tiếp theo", content.plain_text.lower())
        self.assertIn("15/11/2026", content.plain_text)
        self.assertIn("Vắc xin &lt;A&gt;", content.html)
        self.assertNotIn("Thời gian", content.html)

    def test_generic_fallback_removes_internal_reminder_key(self) -> None:
        body = (
            "Người tiêm có lịch vào ngày 07/10/2026.\n\n"
            "[REMINDER_KEY:LICH_TIEM:12:2026-10-07T10:00:00]"
        )

        self.assertEqual(
            remove_reminder_key(body),
            "Người tiêm có lịch vào ngày 07/10/2026.",
        )
        content = render_generic_notification_email("Nhắc lịch", body)
        self.assertNotIn("REMINDER_KEY", content.plain_text)
        self.assertNotIn("REMINDER_KEY", content.html)

    def test_appointment_reminder_keeps_key_in_internal_content(self) -> None:
        appointment = SimpleNamespace(
            ma_lich_hen=12,
            ngay_hen=date(2026, 10, 7),
            gio_hen=time(10, 0),
            trang_thai="DA_XAC_NHAN",
        )
        profile = SimpleNamespace(ho_ten="HOÀNG QUỐC HUY")
        user = SimpleNamespace(ma_nguoi_dung=8, trang_thai=True)
        db = Mock()
        db.execute.return_value.all.return_value = [
            (appointment, profile, user)
        ]

        reminders = _appointment_reminders(
            db,
            datetime(2026, 10, 6, 10, 0),
            datetime(2026, 10, 7, 11, 0),
        )

        self.assertEqual(len(reminders), 1)
        reminder = reminders[0]
        self.assertIn(reminder.reminder_key, reminder.content)
        self.assertEqual(
            reminder.reminder_key,
            "[REMINDER_KEY:LICH_TIEM:12:2026-10-07T10:00:00]",
        )

    @patch("app.services.email_service._use_tls", return_value=False)
    @patch("app.services.email_service._smtp_port", return_value=587)
    @patch("app.services.email_service._validate_smtp_config")
    @patch("app.services.email_service.smtplib.SMTP")
    def test_send_email_builds_plain_and_html_multipart(
        self,
        smtp_class,
        _validate_config,
        _smtp_port,
        _use_tls,
    ) -> None:
        smtp = smtp_class.return_value.__enter__.return_value

        send_email(
            to_email="recipient@example.com",
            subject="Nhắc lịch tiêm sắp tới",
            body="Nội dung thuần văn bản",
            html_body="<html><body><strong>Nội dung HTML</strong></body></html>",
        )

        message = smtp.send_message.call_args.args[0]
        self.assertEqual(message.get_content_type(), "multipart/alternative")
        self.assertEqual(
            message.get_body(preferencelist=("plain",)).get_content().strip(),
            "Nội dung thuần văn bản",
        )
        self.assertIn(
            "<strong>Nội dung HTML</strong>",
            message.get_body(preferencelist=("html",)).get_content(),
        )


if __name__ == "__main__":
    unittest.main()
