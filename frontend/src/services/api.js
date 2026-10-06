export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const fieldLabels = {
  ho_ten: 'Họ và tên',
  ngay_sinh: 'Ngày sinh',
  gioi_tinh: 'Giới tính',
  email: 'Email',
  so_dien_thoai: 'Số điện thoại',
  dia_chi: 'Địa chỉ',
  nguoi_giam_ho: 'Người giám hộ',
  moi_quan_he: 'Mối quan hệ',
  di_ung: 'Dị ứng',
  ghi_chu_suc_khoe: 'Ghi chú sức khỏe',
  mat_khau: 'Mật khẩu',
};

function validationMessage(items) {
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      const field = item?.loc?.at(-1);
      const label = fieldLabels[field] || field;
      const message = item?.msg || 'Dữ liệu không hợp lệ';
      return label ? `${label}: ${message}` : message;
    })
    .join('. ');
}

function errorMessage(payload, status) {
  const detail = payload?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return validationMessage(detail);
  if (typeof payload?.message === 'string') return payload.message;
  return `Yêu cầu không thành công (${status}).`;
}

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend và thử lại.',
    );
  }

  const rawBody = await response.text();
  let payload = null;
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(payload, response.status), response.status, payload);
  }
  return payload;
}
