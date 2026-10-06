import { authenticatedRequest } from './authService.js';


export function getVaccinationHistory() {
  return authenticatedRequest('/vaccination-history');
}

export function getVaccinationHistoryByProfile(maHoSo) {
  return authenticatedRequest(`/vaccination-history/profile/${maHoSo}`);
}

export function getVaccinationHistoryDetail(maLichSu) {
  return authenticatedRequest(`/vaccination-history/${maLichSu}`);
}
