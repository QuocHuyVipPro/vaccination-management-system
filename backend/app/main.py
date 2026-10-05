from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.routers.admin_notifications import router as admin_notifications_router
from app.routers.appointments import router as appointments_router
from app.routers.auth import router as auth_router
from app.routers.notifications import router as notifications_router
from app.routers.profiles import router as profiles_router
from app.routers.staff_appointments import router as staff_appointments_router
from app.routers.staff_vaccinations import router as staff_vaccinations_router
from app.routers.vaccination_history import router as vaccination_history_router
from app.routers.vaccines import router as vaccines_router

app = FastAPI(
    title="Hệ thống Quản lý và Nhắc lịch Tiêm chủng",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_notifications_router)
app.include_router(notifications_router)
app.include_router(profiles_router)
app.include_router(vaccines_router)
app.include_router(appointments_router)
app.include_router(staff_appointments_router)
app.include_router(staff_vaccinations_router)
app.include_router(vaccination_history_router)


@app.get("/")
def root():
    return {
        "message": "Backend hệ thống tiêm chủng đang hoạt động"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }
@app.get("/db-check")
def database_check():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT current_database()"))
        database_name = result.scalar()

    return {
        "status": "connected",
        "database": database_name
    }
