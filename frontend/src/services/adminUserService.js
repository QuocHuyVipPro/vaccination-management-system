import { authenticatedRequest } from './authService.js';


export function getAdminUsers({ search, vaiTro, trangThai } = {}) {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  if (vaiTro) query.set('vai_tro', vaiTro);
  if (trangThai !== undefined && trangThai !== '') query.set('trang_thai', String(trangThai));
  const suffix = query.size ? `?${query}` : '';
  return authenticatedRequest(`/admin/users${suffix}`);
}

export function getAdminUser(userId) {
  return authenticatedRequest(`/admin/users/${userId}`);
}

export function createAdminUser(payload) {
  return authenticatedRequest('/admin/users', { method: 'POST', body: payload });
}

export function updateAdminUser(userId, payload) {
  return authenticatedRequest(`/admin/users/${userId}`, { method: 'PATCH', body: payload });
}

export function updateAdminUserPassword(userId, payload) {
  return authenticatedRequest(`/admin/users/${userId}/password`, { method: 'PATCH', body: payload });
}
