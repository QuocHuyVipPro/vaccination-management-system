import os

from dotenv import load_dotenv


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Thiếu biến môi trường SECRET_KEY. Hãy cấu hình SECRET_KEY trong file .env.")

ALGORITHM = os.getenv("ALGORITHM", "HS256").strip() or "HS256"

try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )
except ValueError as exc:
    raise RuntimeError(
        "ACCESS_TOKEN_EXPIRE_MINUTES phải là một số nguyên dương."
    ) from exc

if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES phải lớn hơn 0.")


# SMTP is optional at application startup and validated only when sending email.
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = os.getenv("SMTP_PORT", "587").strip()
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "").strip()
SMTP_FROM_NAME = os.getenv(
    "SMTP_FROM_NAME", "Vaccination Reminder System"
).strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").strip().lower()
