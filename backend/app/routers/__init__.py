"""API routers."""

from app.routers.admin_notifications import router as admin_notifications_router
from app.routers.admin_reminders import router as admin_reminders_router
from app.routers.admin_users import router as admin_users_router
from app.routers.admin_vaccines import router as admin_vaccines_router
from app.routers.auth import router as auth_router
from app.routers.appointments import router as appointments_router
from app.routers.notifications import router as notifications_router
from app.routers.profiles import router as profiles_router
from app.routers.staff_appointments import router as staff_appointments_router
from app.routers.staff_vaccinations import router as staff_vaccinations_router
from app.routers.vaccination_history import router as vaccination_history_router
from app.routers.vaccines import router as vaccines_router

__all__ = [
    "admin_notifications_router",
    "admin_reminders_router",
    "admin_users_router",
    "admin_vaccines_router",
    "appointments_router",
    "auth_router",
    "notifications_router",
    "profiles_router",
    "staff_appointments_router",
    "staff_vaccinations_router",
    "vaccination_history_router",
    "vaccines_router",
]
