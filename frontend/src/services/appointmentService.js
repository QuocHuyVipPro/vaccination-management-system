import { authenticatedRequest } from './authService.js';


export function createAppointment(payload) {
  return authenticatedRequest('/appointments', {
    method: 'POST',
    body: payload,
  });
}

export function getAppointments() {
  return authenticatedRequest('/appointments');
}

export function getAppointment(maLichHen) {
  return authenticatedRequest(`/appointments/${maLichHen}`);
}

export function cancelAppointment(maLichHen) {
  return authenticatedRequest(`/appointments/${maLichHen}/cancel`, {
    method: 'PATCH',
  });
}
