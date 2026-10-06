"""Pydantic schemas for API input and output."""

from app.schemas.admin_report import (
    AdminAppointmentReportResponse,
    AdminDashboardResponse,
    AdminInventoryBatchItem,
    AdminInventoryReportResponse,
    AdminInventoryVaccineItem,
    AdminNotificationReportResponse,
    AdminVaccinationReportResponse,
    AdminVaccinationSeriesItem,
    AdminVaccineStatistic,
)
from app.schemas.admin_inventory import (
    AdminBatchAdjust,
    AdminBatchCreate,
    AdminBatchResponse,
    AdminBatchRestock,
    AdminBatchUpdate,
    AdminInventoryTransactionResponse,
)

from app.schemas.admin_user import (
    AdminPasswordReset,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserRole,
    AdminUserUpdate,
)
from app.schemas.admin_vaccine import (
    AdminScheduleCreate,
    AdminScheduleResponse,
    AdminScheduleUpdate,
    AdminVaccineCreate,
    AdminVaccineResponse,
    AdminVaccineUpdate,
)
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDetailResponse,
    AppointmentItemCreate,
    AppointmentItemResponse,
    AppointmentResponse,
)
from app.schemas.notification import (
    DeliveryHistoryResponse,
    NotificationResponse,
    NotificationType,
    ReadAllNotificationsResponse,
    ReminderRunResponse,
)
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate
from app.schemas.staff_appointment import AppointmentStatus, StaffAppointmentResponse
from app.schemas.staff_vaccination import (
    StaffVaccinationCreate,
    StaffVaccinationResponse,
)
from app.schemas.staff_vaccination_history import (
    StaffVaccinationHistoryResponse,
)
from app.schemas.vaccination_history import VaccinationHistoryResponse
from app.schemas.vaccine import (
    VaccinationScheduleResponse,
    VaccineDetailResponse,
    VaccineResponse,
)

__all__ = [
    "AdminAppointmentReportResponse",
    "AdminDashboardResponse",
    "AdminInventoryBatchItem",
    "AdminInventoryReportResponse",
    "AdminInventoryVaccineItem",
    "AdminNotificationReportResponse",
    "AdminVaccinationReportResponse",
    "AdminVaccinationSeriesItem",
    "AdminVaccineStatistic",
    "AdminBatchAdjust",
    "AdminBatchCreate",
    "AdminBatchResponse",
    "AdminBatchRestock",
    "AdminBatchUpdate",
    "AdminInventoryTransactionResponse",
    "AdminScheduleCreate",
    "AdminScheduleResponse",
    "AdminScheduleUpdate",
    "AdminPasswordReset",
    "AdminUserCreate",
    "AdminUserResponse",
    "AdminUserRole",
    "AdminUserUpdate",
    "AdminVaccineCreate",
    "AdminVaccineResponse",
    "AdminVaccineUpdate",
    "AppointmentCreate",
    "AppointmentDetailResponse",
    "AppointmentItemCreate",
    "AppointmentItemResponse",
    "AppointmentResponse",
    "AppointmentStatus",
    "DeliveryHistoryResponse",
    "LoginRequest",
    "NotificationResponse",
    "NotificationType",
    "ProfileCreate",
    "ProfileResponse",
    "ProfileUpdate",
    "RegisterRequest",
    "ReadAllNotificationsResponse",
    "ReminderRunResponse",
    "StaffAppointmentResponse",
    "StaffVaccinationCreate",
    "StaffVaccinationHistoryResponse",
    "StaffVaccinationResponse",
    "TokenResponse",
    "UserResponse",
    "VaccinationHistoryResponse",
    "VaccinationScheduleResponse",
    "VaccineDetailResponse",
    "VaccineResponse",
]
