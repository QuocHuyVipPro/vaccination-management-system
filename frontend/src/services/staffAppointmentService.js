import { authenticatedRequest } from './authService.js';


export function getStaffAppointments({ trangThai } = {}) {
  const query = trangThai
    ? `?${new URLSearchParams({ trang_thai: trangThai })}`
    : '';
  return authenticatedRequest(`/staff/appointments${query}`);
}

export function getStaffAppointment(maLichHen) {
  return authenticatedRequest(`/staff/appointments/${maLichHen}`);
}

export function confirmStaffAppointment(maLichHen) {
  return authenticatedRequest(`/staff/appointments/${maLichHen}/confirm`, {
    method: 'PATCH',
  });
}
