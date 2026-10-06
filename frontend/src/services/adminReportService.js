import { authenticatedRequest } from './authService.js';


function withQuery(path, filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.size ? `${path}?${query}` : path;
}

export function getAdminDashboardReport() {
  return authenticatedRequest('/admin/reports/dashboard');
}

export function getAdminAppointmentReport(filters = {}) {
  return authenticatedRequest(withQuery('/admin/reports/appointments', filters));
}

export function getAdminVaccinationReport(filters = {}) {
  return authenticatedRequest(withQuery('/admin/reports/vaccinations', filters));
}

export function getAdminVaccineReport() {
  return authenticatedRequest('/admin/reports/vaccines');
}

export function getAdminInventoryReport(filters = {}) {
  return authenticatedRequest(withQuery('/admin/reports/inventory', filters));
}

export function getAdminNotificationReport() {
  return authenticatedRequest('/admin/reports/notifications');
}
