import { authenticatedRequest } from './authService.js';

export function getVaccines() {
  return authenticatedRequest('/vaccines');
}

export function getVaccine(maVacXin) {
  return authenticatedRequest(`/vaccines/${maVacXin}`);
}

export function getVaccineSchedule(maVacXin) {
  return authenticatedRequest(`/vaccines/${maVacXin}/schedule`);
}
