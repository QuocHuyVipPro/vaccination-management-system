import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import (
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_USE_TLS,
)


class EmailConfigurationError(RuntimeError):
    pass


def _smtp_port() -> int:
    try:
        port = int(SMTP_PORT)
    except ValueError as exc:
        raise EmailConfigurationError(
            "SMTP_PORT phải là số nguyên hợp lệ"
        ) from exc
    if not 1 <= port <= 65535:
        raise EmailConfigurationError(
            "SMTP_PORT phải nằm trong khoảng từ 1 đến 65535"
        )
    return port


def _use_tls() -> bool:
    if SMTP_USE_TLS in {"true", "1", "yes", "on"}:
        return True
    if SMTP_USE_TLS in {"false", "0", "no", "off"}:
        return False
    raise EmailConfigurationError("SMTP_USE_TLS không hợp lệ")


def _validate_smtp_config() -> None:
    missing = [
        name
        for name, value in (
            ("SMTP_HOST", SMTP_HOST),
            ("SMTP_USERNAME", SMTP_USERNAME),
            ("SMTP_PASSWORD", SMTP_PASSWORD),
            ("SMTP_FROM_EMAIL", SMTP_FROM_EMAIL),
        )
        if not value
    ]
    if missing:
        raise EmailConfigurationError(
            "Thiếu cấu hình SMTP: " + ", ".join(missing)
        )


def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: str | None = None,
) -> None:
    _validate_smtp_config()
    port = _smtp_port()
    use_tls = _use_tls()

    message = EmailMessage()
    message["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body, charset="utf-8")
    if html_body is not None:
        message.add_alternative(html_body, subtype="html", charset="utf-8")

    with smtplib.SMTP(SMTP_HOST, port, timeout=30) as smtp:
        if use_tls:
            smtp.starttls(context=ssl.create_default_context())
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)
