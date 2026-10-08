import re
from dataclasses import dataclass
from datetime import date, time
from html import escape


REMINDER_KEY_PATTERN = re.compile(
    r"(?:\r?\n)*\[REMINDER_KEY:[^\]\r\n]+\](?:\r?\n)*"
)


@dataclass(frozen=True)
class EmailContent:
    plain_text: str
    html: str


@dataclass(frozen=True)
class ReminderEmailData:
    notification_type: str
    recipient_name: str
    scheduled_date: date
    scheduled_time: time | None = None
    vaccine_name: str | None = None


def remove_reminder_key(content: str) -> str:
    return REMINDER_KEY_PATTERN.sub("\n", content).strip()


def _information_row(label: str, value: str) -> str:
    return f"""
        <tr>
          <td style="padding:8px 12px 8px 0;color:#69798d;font-size:13px;line-height:20px;vertical-align:top;white-space:nowrap;">{escape(label)}</td>
          <td style="padding:8px 0;color:#0d2b55;font-size:14px;font-weight:700;line-height:20px;vertical-align:top;">{escape(value)}</td>
        </tr>"""


def _html_document(
    *,
    heading: str,
    recipient_name: str | None,
    introduction: str,
    information_rows: list[tuple[str, str]],
    closing: str,
) -> str:
    greeting = (
        f"Xin chào <strong>{escape(recipient_name)}</strong>,"
        if recipient_name
        else "Xin chào,"
    )
    rows = "".join(
        _information_row(label, value)
        for label, value in information_rows
    )
    information_block = (
        f"""
            <tr>
              <td style="padding:22px 28px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid #d8e9f8;border-radius:10px;background-color:#f4f9ff;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="padding-bottom:7px;color:#1a5fb4;font-size:11px;font-weight:700;line-height:17px;letter-spacing:1px;">THÔNG TIN LỊCH TIÊM</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">{rows}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>"""
        if information_rows
        else ""
    )
    return f"""<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{escape(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f6fa;color:#52657a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f3f6fa;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border:1px solid #dde8f3;border-radius:14px;background-color:#ffffff;overflow:hidden;box-shadow:0 8px 24px rgba(13,43,85,0.08);">
            <tr>
              <td style="padding:24px 28px;background-color:#0d2b55;color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="48" valign="middle" style="width:48px;">
                      <div style="width:40px;height:40px;border:1px solid rgba(255,255,255,0.35);border-radius:11px;text-align:center;font-size:26px;font-weight:700;line-height:40px;color:#ffffff;">+</div>
                    </td>
                    <td valign="middle" style="padding-left:10px;">
                      <div style="font-size:11px;font-weight:700;line-height:14px;letter-spacing:1.4px;">TIÊM CHỦNG</div>
                      <div style="font-size:22px;font-weight:700;line-height:26px;letter-spacing:3px;">CARE</div>
                    </td>
                  </tr>
                </table>
                <div style="padding-top:14px;color:#c9d7e7;font-size:11px;line-height:17px;">An toàn &bull; Chủ động &bull; Vì sức khỏe cộng đồng</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 12px;">
                <div style="color:#1a5fb4;font-size:12px;font-weight:700;line-height:18px;letter-spacing:1px;">NHẮC LỊCH TIÊM CHỦNG</div>
                <h1 style="margin:7px 0 0;color:#0d2b55;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;line-height:32px;">{escape(heading)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 0;color:#52657a;font-size:15px;line-height:24px;">
                <p style="margin:0 0 10px;">{greeting}</p>
                <p style="margin:0;">{escape(introduction)}</p>
              </td>
            </tr>
            {information_block}
            <tr>
              <td style="padding:22px 28px 30px;color:#52657a;font-size:14px;line-height:23px;">
                <p style="margin:0;">{escape(closing)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;border-top:1px solid #dde8f3;background-color:#f8fafc;color:#69798d;text-align:center;">
                <div style="color:#0d2b55;font-size:13px;font-weight:700;line-height:20px;">Tiêm chủng CARE</div>
                <div style="padding-top:4px;font-size:11px;line-height:18px;">An toàn &bull; Chủ động &bull; Vì sức khỏe cộng đồng</div>
                <div style="padding-top:9px;color:#8796a8;font-size:10px;line-height:16px;">Hệ thống được xây dựng phục vụ mục đích học tập và nghiên cứu.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def render_reminder_email(data: ReminderEmailData) -> EmailContent:
    recipient_name = data.recipient_name.strip()
    date_text = data.scheduled_date.strftime("%d/%m/%Y")

    if data.notification_type == "LICH_TIEM":
        heading = "Nhắc lịch tiêm sắp tới"
        introduction = "Bạn có một lịch tiêm sắp tới."
        rows = [("Người tiêm", recipient_name), ("Ngày tiêm", date_text)]
        if data.scheduled_time is not None:
            rows.append(("Thời gian", data.scheduled_time.strftime("%H:%M")))
        plain_summary = f"Bạn có lịch tiêm vào ngày {date_text}"
        if data.scheduled_time is not None:
            plain_summary += f" lúc {data.scheduled_time.strftime('%H:%M')}"
        plain_summary += "."
        closing = (
            "Vui lòng chủ động sắp xếp thời gian và kiểm tra thông tin "
            "lịch hẹn trong hệ thống."
        )
    elif data.notification_type == "MUI_TIEP_THEO":
        heading = "Nhắc lịch mũi tiêm tiếp theo"
        introduction = "Bạn có một mũi tiêm tiếp theo đang đến gần."
        rows = [("Người tiêm", recipient_name), ("Ngày dự kiến", date_text)]
        if data.vaccine_name:
            rows.append(("Vắc xin", data.vaccine_name.strip()))
        vaccine_text = (
            f" đối với {data.vaccine_name.strip()}"
            if data.vaccine_name
            else ""
        )
        plain_summary = (
            f"Mũi tiêm tiếp theo{vaccine_text} được dự kiến vào ngày "
            f"{date_text}."
        )
        closing = (
            "Vui lòng kiểm tra thông tin mũi tiêm tiếp theo trong hệ thống "
            "và chủ động sắp xếp thời gian phù hợp."
        )
    else:
        raise ValueError("Loại nhắc lịch email không hợp lệ")

    plain_text = (
        "TIÊM CHỦNG CARE\n"
        "An toàn • Chủ động • Vì sức khỏe cộng đồng\n\n"
        f"{heading.upper()}\n\n"
        f"Xin chào {recipient_name},\n\n"
        f"{plain_summary}\n\n"
        f"{closing}\n\n"
        "Tiêm chủng CARE\n"
        "Hệ thống được xây dựng phục vụ mục đích học tập và nghiên cứu."
    )
    html = _html_document(
        heading=heading,
        recipient_name=recipient_name,
        introduction=introduction,
        information_rows=rows,
        closing=closing,
    )
    return EmailContent(plain_text=plain_text, html=html)


def render_generic_notification_email(title: str, body: str) -> EmailContent:
    clean_body = remove_reminder_key(body)
    html = _html_document(
        heading=title.strip(),
        recipient_name=None,
        introduction=clean_body,
        information_rows=[],
        closing="Vui lòng kiểm tra thông tin trong hệ thống.",
    )
    plain_text = (
        "TIÊM CHỦNG CARE\n\n"
        f"{title.strip()}\n\n"
        f"{clean_body}\n\n"
        "Hệ thống được xây dựng phục vụ mục đích học tập và nghiên cứu."
    )
    return EmailContent(plain_text=plain_text, html=html)
