import { authenticatedRequest } from './authService.js';


export function getAvailableBatches(maVacXin) {
  const query = new URLSearchParams({ ma_vac_xin: String(maVacXin) });
  return authenticatedRequest(`/staff/vaccinations/available-batches?${query}`);
}

export function recordStaffVaccination(payload) {
  return authenticatedRequest('/staff/vaccinations', {
    method: 'POST',
    body: payload,
  });
}
