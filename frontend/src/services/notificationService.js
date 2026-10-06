import { authenticatedRequest } from './authService.js';


export function getNotifications({ unreadOnly = false } = {}) {
  const query = unreadOnly ? '?unread_only=true' : '';
  return authenticatedRequest(`/notifications${query}`);
}

export function getNotification(maThongBao) {
  return authenticatedRequest(`/notifications/${maThongBao}`);
}

export function markNotificationRead(maThongBao) {
  return authenticatedRequest(`/notifications/${maThongBao}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead() {
  return authenticatedRequest('/notifications/read-all', {
    method: 'PATCH',
  });
}
