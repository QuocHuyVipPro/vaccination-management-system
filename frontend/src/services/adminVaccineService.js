import { authenticatedRequest } from './authService.js';


export function getAdminVaccines({ search, trangThai } = {}) {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  if (trangThai !== undefined && trangThai !== '') query.set('trang_thai', String(trangThai));
  const suffix = query.size ? `?${query}` : '';
  return authenticatedRequest(`/admin/vaccines${suffix}`);
}

export function getAdminVaccine(vaccineId) {
  return authenticatedRequest(`/admin/vaccines/${vaccineId}`);
}

export function createAdminVaccine(payload) {
  return authenticatedRequest('/admin/vaccines', { method: 'POST', body: payload });
}

export function updateAdminVaccine(vaccineId, payload) {
  return authenticatedRequest(`/admin/vaccines/${vaccineId}`, { method: 'PATCH', body: payload });
}

export function getAdminVaccineSchedule(vaccineId) {
  return authenticatedRequest(`/admin/vaccines/${vaccineId}/schedule`);
}

export function createAdminVaccineScheduleItem(vaccineId, payload) {
  return authenticatedRequest(`/admin/vaccines/${vaccineId}/schedule`, { method: 'POST', body: payload });
}

export function updateAdminVaccineScheduleItem(vaccineId, scheduleId, payload) {
  return authenticatedRequest(`/admin/vaccines/${vaccineId}/schedule/${scheduleId}`, { method: 'PATCH', body: payload });
}
