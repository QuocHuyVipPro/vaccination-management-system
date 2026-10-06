import { authenticatedRequest } from './authService.js';


export function getProfiles() {
  return authenticatedRequest('/profiles');
}

export function getProfile(maHoSo) {
  return authenticatedRequest(`/profiles/${maHoSo}`);
}

export function createProfile(payload) {
  return authenticatedRequest('/profiles', {
    method: 'POST',
    body: payload,
  });
}

export function updateProfile(maHoSo, payload) {
  return authenticatedRequest(`/profiles/${maHoSo}`, {
    method: 'PUT',
    body: payload,
  });
}

export function deleteProfile(maHoSo) {
  return authenticatedRequest(`/profiles/${maHoSo}`, {
    method: 'DELETE',
  });
}
