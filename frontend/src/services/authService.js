import { apiRequest } from './api.js';

export const ACCESS_TOKEN_KEY = 'access_token';
export const CURRENT_USER_KEY = 'current_user';

export const AUTH_ROLES = Object.freeze({
  CUSTOMER: 'KHACH_HANG',
  STAFF: 'NHAN_VIEN',
  ADMIN: 'QUAN_TRI_VIEN',
});

const validRoles = new Set(Object.values(AUTH_ROLES));

function validateUser(user) {
  if (!user || !validRoles.has(user.vai_tro) || user.trang_thai !== true) {
    throw new Error('Tài khoản không có quyền truy cập hợp lệ.');
  }
  return user;
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(CURRENT_USER_KEY);
  }
}

function saveSession(storage, token, user) {
  storage.setItem(ACCESS_TOKEN_KEY, token);
  storage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export async function getCurrentUser(token, storage = localStorage) {
  const user = validateUser(await apiRequest('/auth/me', { token }));
  storage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export async function login(email, password, rememberMe = true) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), mat_khau: password },
  });
  const token = result?.access_token;
  if (!token) throw new Error('Máy chủ không trả về access token hợp lệ.');

  clearSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, token);
  try {
    const user = await getCurrentUser(token, storage);
    saveSession(storage, token, user);
    return user;
  } catch (error) {
    clearSession();
    throw error;
  }
}

export async function registerCustomer({ fullName, email, phone, password }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: {
      ho_ten: fullName.trim(),
      email: email.trim(),
      so_dien_thoai: phone.trim() || null,
      mat_khau: password,
    },
  });
}

export async function restoreSession() {
  const storage = localStorage.getItem(ACCESS_TOKEN_KEY)
    ? localStorage
    : sessionStorage;
  const token = storage.getItem(ACCESS_TOKEN_KEY);
  if (!token) {
    clearSession();
    return null;
  }
  try {
    return await getCurrentUser(token, storage);
  } catch {
    clearSession();
    return null;
  }
}
