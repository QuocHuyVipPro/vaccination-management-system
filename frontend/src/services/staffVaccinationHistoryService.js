import { authenticatedRequest } from './authService.js';


export function getStaffVaccinationHistory({ maHoSo, maVacXin, search, tuNgay, denNgay } = {}) {
  const query = new URLSearchParams();
  if (maHoSo != null && maHoSo !== '') query.set('ma_ho_so', String(maHoSo));
  if (maVacXin != null && maVacXin !== '') query.set('ma_vac_xin', String(maVacXin));
  if (search?.trim()) query.set('search', search.trim());
  if (tuNgay) query.set('tu_ngay', tuNgay);
  if (denNgay) query.set('den_ngay', denNgay);
  const suffix = query.size ? `?${query}` : '';
  return authenticatedRequest(`/staff/vaccination-history${suffix}`);
}

export function getStaffVaccinationHistoryByProfile(maHoSo) {
  return authenticatedRequest(`/staff/vaccination-history/profile/${maHoSo}`);
}

export function getStaffVaccinationHistoryDetail(maLichSu) {
  return authenticatedRequest(`/staff/vaccination-history/${maLichSu}`);
}
