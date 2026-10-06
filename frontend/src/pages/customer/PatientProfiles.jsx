import { useEffect, useRef, useState } from 'react';
import {
  createProfile,
  deleteProfile,
  getProfile,
  getProfiles,
  updateProfile,
} from '../../services/profileService';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import './PatientProfiles.css';


const emptyProfile = {
  ho_ten: '',
  ngay_sinh: '',
  gioi_tinh: '',
  so_dien_thoai: '',
  dia_chi: '',
  nguoi_giam_ho: '',
  moi_quan_he: '',
  di_ung: '',
  ghi_chu_suc_khoe: '',
};

const fields = [
  { name: 'ho_ten', label: 'Họ và tên', required: true, autoComplete: 'name', maxLength: 100 },
  { name: 'ngay_sinh', label: 'Ngày sinh', type: 'date', required: true },
  {
    name: 'gioi_tinh',
    label: 'Giới tính',
    options: [
      ['', 'Chọn giới tính'],
      ['NAM', 'Nam'],
      ['NU', 'Nữ'],
      ['KHAC', 'Khác'],
    ],
  },
  { name: 'so_dien_thoai', label: 'Số điện thoại', type: 'tel', autoComplete: 'tel', maxLength: 20 },
  { name: 'dia_chi', label: 'Địa chỉ', autoComplete: 'street-address', wide: true, maxLength: 255 },
  { name: 'nguoi_giam_ho', label: 'Người giám hộ', maxLength: 100 },
  {
    name: 'moi_quan_he',
    label: 'Mối quan hệ',
    options: [
      ['', 'Chọn mối quan hệ'],
      ['Bản thân', 'Bản thân'],
      ['Con', 'Con'],
      ['Em', 'Em'],
      ['Anh/Chị', 'Anh/Chị'],
      ['Cha/Mẹ', 'Cha/Mẹ'],
      ['Người thân', 'Người thân'],
      ['Khác', 'Khác'],
    ],
  },
  { name: 'di_ung', label: 'Dị ứng', multiline: true, wide: true },
  { name: 'ghi_chu_suc_khoe', label: 'Ghi chú sức khỏe', multiline: true, wide: true },
];

const genderLabels = { NAM: 'Nam', NU: 'Nữ', KHAC: 'Khác' };

function optionalText(value) {
  const normalized = value.trim();
  return normalized || null;
}

function profilePayload(profile) {
  return {
    ho_ten: profile.ho_ten.trim(),
    ngay_sinh: profile.ngay_sinh,
    gioi_tinh: profile.gioi_tinh || null,
    so_dien_thoai: optionalText(profile.so_dien_thoai),
    dia_chi: optionalText(profile.dia_chi),
    nguoi_giam_ho: optionalText(profile.nguoi_giam_ho),
    moi_quan_he: optionalText(profile.moi_quan_he),
    di_ung: optionalText(profile.di_ung),
    ghi_chu_suc_khoe: optionalText(profile.ghi_chu_suc_khoe),
  };
}

function profileForm(profile) {
  return Object.fromEntries(
    Object.keys(emptyProfile).map((key) => [key, profile?.[key] ?? '']),
  );
}

function formatDate(value) {
  return value ? value.split('-').reverse().join('/') : 'Chưa cập nhật';
}

function todayInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function initials(name) {
  const words = name.trim().split(/\s+/);
  return `${words[0]?.[0] || ''}${words.length > 1 ? words.at(-1)[0] : ''}`
    .toLocaleUpperCase('vi');
}

function userInitials(name) {
  return initials(name || 'Khách hàng');
}

function validateProfile(profile) {
  const errors = {};
  if (!profile.ho_ten.trim()) errors.ho_ten = 'Vui lòng nhập họ và tên.';
  if (!profile.ngay_sinh) {
    errors.ngay_sinh = 'Vui lòng chọn ngày sinh.';
  } else if (profile.ngay_sinh > todayInputValue()) {
    errors.ngay_sinh = 'Ngày sinh không được ở trong tương lai.';
  }
  return errors;
}

function ProfileDetails({ profile, full = false }) {
  const entries = full
    ? [
      ['Họ tên', profile.ho_ten],
      ['Mối quan hệ', profile.moi_quan_he],
      ['Ngày sinh', formatDate(profile.ngay_sinh)],
      ['Giới tính', genderLabels[profile.gioi_tinh]],
      ['Số điện thoại', profile.so_dien_thoai],
      ['Địa chỉ', profile.dia_chi],
      ['Người giám hộ', profile.nguoi_giam_ho],
      ['Dị ứng', profile.di_ung],
      ['Ghi chú sức khỏe', profile.ghi_chu_suc_khoe],
    ]
    : [
      ['Ngày sinh', formatDate(profile.ngay_sinh)],
      ['Giới tính', genderLabels[profile.gioi_tinh]],
      ['Số điện thoại', profile.so_dien_thoai],
      ['Địa chỉ', profile.dia_chi],
      ...(profile.nguoi_giam_ho ? [['Người giám hộ', profile.nguoi_giam_ho]] : []),
    ];
  return <dl className="pp-details">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>;
}

function ProfileCard({ profile, deleting, viewing, onView, onEdit, onDelete }) {
  return <article className="cd-panel pp-card">
    <div className="pp-card-heading"><span className="cd-avatar pp-avatar">{initials(profile.ho_ten)}</span><div><h2>{profile.ho_ten}</h2><span className="cd-relation">{profile.moi_quan_he || 'Chưa cập nhật quan hệ'}</span></div></div>
    <ProfileDetails profile={profile} />
    <div className="pp-card-actions">
      <button type="button" className="cd-button cd-button-primary" onClick={onView} disabled={viewing}>{viewing ? 'Đang tải...' : 'Xem chi tiết'}{!viewing && <Icon name="arrow" />}</button>
      <button type="button" className="cd-button" onClick={onEdit}>Chỉnh sửa</button>
      <button type="button" className="cd-button pp-delete" onClick={onDelete} disabled={deleting}>{deleting ? 'Đang xóa...' : 'Xóa'}</button>
    </div>
  </article>;
}

function ProfileModal({ mode, profile, onClose, onSave, saving, serverError }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(() => profileForm(profile));
  const [errors, setErrors] = useState({});
  const viewing = mode === 'view';
  const title = viewing
    ? 'Chi tiết hồ sơ người tiêm'
    : mode === 'edit'
      ? 'Chỉnh sửa hồ sơ người tiêm'
      : 'Thêm hồ sơ người tiêm';

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateProfile(form);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      event.currentTarget.elements.namedItem(firstError)?.focus();
      return;
    }
    await onSave(form, mode === 'edit' ? profile.ma_ho_so : null);
  }

  return <dialog ref={dialogRef} className="pp-modal" aria-labelledby="pp-modal-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
    <header className="pp-modal-header"><h2 id="pp-modal-title">{title}</h2><button type="button" className="pp-close" aria-label="Đóng hộp thoại" onClick={onClose} disabled={saving}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
    {viewing
      ? <><div className="pp-modal-body"><ProfileDetails profile={profile} full /></div><footer className="pp-modal-footer"><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></>
      : <form onSubmit={handleSubmit} noValidate>
        <div className="pp-modal-body pp-form-grid">
          {serverError && <p className="pp-request-error pp-field-wide" role="alert">{serverError}</p>}
          {fields.map((field) => {
            const inputProps = {
              id: `pp-${field.name}`,
              name: field.name,
              value: form[field.name],
              onChange: (event) => {
                setForm((current) => ({ ...current, [field.name]: event.target.value }));
                setErrors((current) => ({ ...current, [field.name]: undefined }));
              },
              required: field.required,
              disabled: saving,
              maxLength: field.maxLength,
              'aria-invalid': Boolean(errors[field.name]),
              'aria-describedby': errors[field.name] ? `pp-${field.name}-error` : undefined,
            };
            return <div key={field.name} className={`pp-field${field.wide ? ' pp-field-wide' : ''}`}>
              <label htmlFor={inputProps.id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
              {field.options
                ? <select {...inputProps}>{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                : field.multiline
                  ? <textarea {...inputProps} rows={2} />
                  : <input {...inputProps} type={field.type || 'text'} autoComplete={field.autoComplete} max={field.type === 'date' ? todayInputValue() : undefined} />}
              {errors[field.name] && <p id={`pp-${field.name}-error`} className="pp-error" role="alert">{errors[field.name]}</p>}
            </div>;
          })}
        </div>
        <footer className="pp-modal-footer"><button type="button" className="cd-button" onClick={onClose} disabled={saving}>Hủy</button><button type="submit" className="cd-button cd-button-primary" disabled={saving}>{saving ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu hồ sơ'}</button></footer>
      </form>}
  </dialog>;
}

export default function PatientProfiles({ onNavigate, currentUser }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  async function loadProfiles() {
    setLoading(true);
    setError('');
    try {
      setProfiles(await getProfiles());
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách hồ sơ.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getProfiles()
      .then((data) => { if (active) setProfiles(data); })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Không thể tải danh sách hồ sơ.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleView(profileId) {
    setViewingId(profileId);
    setError('');
    try {
      const profile = await getProfile(profileId);
      setModal({ mode: 'view', profile });
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải chi tiết hồ sơ.');
    } finally {
      setViewingId(null);
    }
  }

  async function handleSave(form, profileId) {
    setSaving(true);
    setModalError('');
    try {
      const payload = profilePayload(form);
      const saved = profileId == null
        ? await createProfile(payload)
        : await updateProfile(profileId, payload);
      setProfiles((current) => profileId == null
        ? [...current, saved]
        : current.map((item) => item.ma_ho_so === profileId ? saved : item));
      setModal(null);
    } catch (requestError) {
      setModalError(requestError.message || 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(profile) {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa hồ sơ “${profile.ho_ten}”?`);
    if (!confirmed) return;
    setDeletingId(profile.ma_ho_so);
    setError('');
    try {
      await deleteProfile(profile.ma_ho_so);
      setProfiles((current) => current.filter(
        (item) => item.ma_ho_so !== profile.ma_ho_so,
      ));
    } catch (requestError) {
      setError(requestError.message || 'Không thể xóa hồ sơ.');
    } finally {
      setDeletingId(null);
    }
  }

  function openForm(mode, profile = null) {
    setModalError('');
    setModal({ mode, profile });
  }

  const addButton = <button type="button" className="cd-button cd-button-primary" onClick={() => openForm('add')} disabled={loading}><Icon name="plus" />Thêm hồ sơ</button>;
  const customerName = currentUser?.ho_ten || 'Khách hàng';

  return <div className="customer-dashboard patient-profiles">
    <a href="#cd-main" className="cd-skip-link">Đến nội dung chính</a>
    <Sidebar activeMenu="users" onNavigate={onNavigate} />
    <div className="cd-workspace"><DashboardHeader customer={{ name: customerName, initials: userInitials(customerName) }} />
      <main id="cd-main" className="cd-main" tabIndex={-1}>
        <div className="cd-page-heading pp-page-heading"><div><h1>Hồ sơ người tiêm</h1><p>Quản lý thông tin người được tiêm chủng trong tài khoản của bạn</p></div>{addButton}</div>
        {error && <div className="pp-page-error" role="alert"><span>{error}</span><button type="button" className="cd-button" onClick={loadProfiles}>Thử lại</button></div>}
        <section className="cd-panel pp-summary" aria-label="Thống kê hồ sơ"><span className="cd-icon-box"><Icon name="users" /></span><div><h2>Tổng số hồ sơ <strong>{profiles.length}</strong></h2><p aria-live="polite">{loading ? 'Đang tải danh sách hồ sơ...' : `Bạn đang quản lý ${profiles.length} hồ sơ người tiêm`}</p></div></section>
        {loading
          ? <section className="cd-panel pp-empty" role="status"><span className="cd-icon-box"><Icon name="users" /></span><h2>Đang tải hồ sơ...</h2><p>Vui lòng chờ trong giây lát.</p></section>
          : profiles.length
            ? <section className="pp-grid" aria-label="Danh sách hồ sơ người tiêm">{profiles.map((profile) => <ProfileCard key={profile.ma_ho_so} profile={profile} viewing={viewingId === profile.ma_ho_so} deleting={deletingId === profile.ma_ho_so} onView={() => handleView(profile.ma_ho_so)} onEdit={() => openForm('edit', profile)} onDelete={() => handleDelete(profile)} />)}</section>
            : <section className="cd-panel pp-empty"><span className="cd-icon-box"><Icon name="users" /></span><h2>Bạn chưa có hồ sơ người tiêm</h2><p>Thêm hồ sơ để bắt đầu đăng ký và theo dõi lịch tiêm.</p>{addButton}</section>}
        <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
      </main>
    </div>
    {modal && <ProfileModal mode={modal.mode} profile={modal.profile} onClose={() => { if (!saving) setModal(null); }} onSave={handleSave} saving={saving} serverError={modalError} />}
  </div>;
}
