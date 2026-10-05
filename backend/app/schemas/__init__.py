"""Pydantic schemas for API input and output."""

from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDetailResponse,
    AppointmentItemCreate,
    AppointmentItemResponse,
    AppointmentResponse,
)
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate
from app.schemas.staff_appointment import AppointmentStatus, StaffAppointmentResponse
from app.schemas.staff_vaccination import (
    StaffVaccinationCreate,
    StaffVaccinationResponse,
)
from app.schemas.vaccination_history import VaccinationHistoryResponse
from app.schemas.vaccine import (
    VaccinationScheduleResponse,
    VaccineDetailResponse,
    VaccineResponse,
)

__all__ = [
    "AppointmentCreate",
    "AppointmentDetailResponse",
    "AppointmentItemCreate",
    "AppointmentItemResponse",
    "AppointmentResponse",
    "AppointmentStatus",
    "LoginRequest",
    "ProfileCreate",
    "ProfileResponse",
    "ProfileUpdate",
    "RegisterRequest",
    "StaffAppointmentResponse",
    "StaffVaccinationCreate",
    "StaffVaccinationResponse",
    "TokenResponse",
    "UserResponse",
    "VaccinationHistoryResponse",
    "VaccinationScheduleResponse",
    "VaccineDetailResponse",
    "VaccineResponse",
]
