import { useEffect, useRef, useState } from 'react';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import './PatientProfiles.css';

const initialProfiles = [
  { id: 1, fullName: 'Nguyễn Văn An', relationship: 'Bản thân', dateOfBirth: '2005-06-15', gender: 'Nam', phone: '0901234567', address: 'Bình Dương', guardian: '', allergies: 'Không ghi nhận', healthNotes: 'Không có ghi chú đặc biệt', status: 'Đang hoạt động' },
  { id: 2, fullName: 'Nguyễn Minh Anh', relationship: 'Em', dateOfBirth: '2015-03-12', gender: 'Nữ', phone: '0901234567', address: 'Bình Dương', guardian: 'Nguyễn Văn An', allergies: 'Không ghi nhận', healthNotes: 'Không có ghi chú đặc biệt', status: 'Đang hoạt động' },
];
const emptyProfile = { fullName: '', dateOfBirth: '', gender: '', phone: '', address: '', guardian: '', relationship: 'Bản thân', allergies: '', healthNotes: '' };
const fields = [
  { name: 'fullName', label: 'Họ và tên', required: true, autoComplete: 'name' },
  { name: 'dateOfBirth', label: 'Ngày sinh', type: 'date', required: true },
  { name: 'gender', label: 'Giới tính', options: ['', 'Nam', 'Nữ', 'Khác'] },
  { name: 'phone', label: 'Số điện thoại', type: 'tel', autoComplete: 'tel' },
  { name: 'address', label: 'Địa chỉ', autoComplete: 'street-address', wide: true },
  { name: 'guardian', label: 'Người giám hộ' },
  { name: 'relationship', label: 'Mối quan hệ', options: ['Bản thân', 'Con', 'Em', 'Anh/Chị', 'Cha/Mẹ', 'Người thân', 'Khác'] },
  { name: 'allergies', label: 'Dị ứng', multiline: true, wide: true },
  { name: 'healthNotes', label: 'Ghi chú sức khỏe', multiline: true, wide: true },
];

function formatDate(value) { return value ? value.split('-').reverse().join('/') : 'Chưa cập nhật'; }
function initials(name) {
  const words = name.trim().split(/\s+/);
  return `${words[0]?.[0] || ''}${words.length > 1 ? words.at(-1)[0] : ''}`.toLocaleUpperCase('vi');
}
function validateProfile(profile) {
  const errors = {};
  if (!profile.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
  if (!profile.dateOfBirth) errors.dateOfBirth = 'Vui lòng chọn ngày sinh.';
  return errors;
}
function saveProfile(profiles, profile, id) {
  const saved = { ...profile, fullName: profile.fullName.trim(), id: id ?? Math.max(0, ...profiles.map((item) => item.id)) + 1, status: profile.status || 'Đang hoạt động' };
  return id == null ? [...profiles, saved] : profiles.map((item) => item.id === id ? saved : item);
}

function ProfileDetails({ profile, full = false }) {
  const entries = full
    ? [['Họ tên', profile.fullName], ['Mối quan hệ', profile.relationship], ['Ngày sinh', formatDate(profile.dateOfBirth)], ['Giới tính', profile.gender], ['Số điện thoại', profile.phone], ['Địa chỉ', profile.address], ['Người giám hộ', profile.guardian], ['Dị ứng', profile.allergies], ['Ghi chú sức khỏe', profile.healthNotes], ['Trạng thái', profile.status]]
    : [['Ngày sinh', formatDate(profile.dateOfBirth)], ['Giới tính', profile.gender], ['Số điện thoại', profile.phone], ['Địa chỉ', profile.address], ...(profile.guardian ? [['Người giám hộ', profile.guardian]] : [])];
  return <dl className="pp-details">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>;
}

function ProfileCard({ profile, onView, onEdit }) {
  return <article className="cd-panel pp-card">
    <div className="pp-card-heading"><span className="cd-avatar pp-avatar">{initials(profile.fullName)}</span><div><h2>{profile.fullName}</h2><span className="cd-relation">{profile.relationship}</span></div></div>
    <ProfileDetails profile={profile} />
    <div className="pp-status"><span>Trạng thái</span><span className="cd-badge"><Icon name="check" />{profile.status}</span></div>
    <div className="pp-card-actions"><button type="button" className="cd-button cd-button-primary" onClick={onView}>Xem chi tiết<Icon name="arrow" /></button><button type="button" className="cd-button" onClick={onEdit}>Chỉnh sửa</button></div>
  </article>;
}

function ProfileModal({ mode, profile, onClose, onSave }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(() => ({ ...(profile || emptyProfile) }));
  const [errors, setErrors] = useState({});
  const viewing = mode === 'view';
  const title = viewing ? 'Chi tiết hồ sơ người tiêm' : mode === 'edit' ? 'Chỉnh sửa hồ sơ người tiêm' : 'Thêm hồ sơ người tiêm';

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

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateProfile(form);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      event.currentTarget.elements.namedItem(firstError)?.focus();
      return;
    }
    onSave(form, mode === 'edit' ? profile.id : null);
  }

  return <dialog ref={dialogRef} className="pp-modal" aria-labelledby="pp-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="pp-modal-header"><h2 id="pp-modal-title">{title}</h2><button type="button" className="pp-close" aria-label="Đóng hộp thoại" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
    {viewing ? <><div className="pp-modal-body"><ProfileDetails profile={profile} full /></div><footer className="pp-modal-footer"><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></> :
      <form onSubmit={handleSubmit} noValidate>
        <div className="pp-modal-body pp-form-grid">{fields.map((field) => {
          const inputProps = { id: `pp-${field.name}`, name: field.name, value: form[field.name], onChange: (event) => setForm((current) => ({ ...current, [field.name]: event.target.value })), required: field.required, 'aria-invalid': Boolean(errors[field.name]), 'aria-describedby': errors[field.name] ? `pp-${field.name}-error` : undefined };
          return <div key={field.name} className={`pp-field${field.wide ? ' pp-field-wide' : ''}`}><label htmlFor={inputProps.id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>{field.options ? <select {...inputProps}>{field.options.map((option) => <option key={option} value={option}>{option || 'Chọn giới tính'}</option>)}</select> : field.multiline ? <textarea {...inputProps} rows={2} /> : <input {...inputProps} type={field.type || 'text'} autoComplete={field.autoComplete} />}{errors[field.name] && <p id={`pp-${field.name}-error`} className="pp-error" role="alert">{errors[field.name]}</p>}</div>;
        })}</div>
        <footer className="pp-modal-footer"><button type="button" className="cd-button" onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary">{mode === 'edit' ? 'Lưu thay đổi' : 'Lưu hồ sơ'}</button></footer>
      </form>}
  </dialog>;
}

export default function PatientProfiles({ onNavigate }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [modal, setModal] = useState(null);
  function handleSave(profile, id) {
    setProfiles((current) => saveProfile(current, profile, id));
    setModal(null);
  }
  const addButton = <button type="button" className="cd-button cd-button-primary" onClick={() => setModal({ mode: 'add' })}><Icon name="plus" />Thêm hồ sơ</button>;

  return <div className="customer-dashboard patient-profiles">
    <a href="#cd-main" className="cd-skip-link">Đến nội dung chính</a>
    <Sidebar activeMenu="users" onNavigate={onNavigate} />
    <div className="cd-workspace"><DashboardHeader customer={{ name: 'Nguyễn Văn An', initials: 'NA' }} />
      <main id="cd-main" className="cd-main" tabIndex={-1}>
        <div className="cd-page-heading pp-page-heading"><div><h1>Hồ sơ người tiêm</h1><p>Quản lý thông tin người được tiêm chủng trong tài khoản của bạn</p></div>{addButton}</div>
        <section className="cd-panel pp-summary" aria-label="Thống kê hồ sơ"><span className="cd-icon-box"><Icon name="users" /></span><div><h2>Tổng số hồ sơ <strong>{profiles.length}</strong></h2><p aria-live="polite">Bạn đang quản lý {profiles.length} hồ sơ người tiêm</p></div></section>
        {profiles.length ? <section className="pp-grid" aria-label="Danh sách hồ sơ người tiêm">{profiles.map((profile) => <ProfileCard key={profile.id} profile={profile} onView={() => setModal({ mode: 'view', profile })} onEdit={() => setModal({ mode: 'edit', profile })} />)}</section> : <section className="cd-panel pp-empty"><span className="cd-icon-box"><Icon name="users" /></span><h2>Chưa có hồ sơ người tiêm</h2><p>Thêm hồ sơ để bắt đầu đăng ký và theo dõi lịch tiêm.</p>{addButton}</section>}
        <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
      </main>
    </div>
    {modal && <ProfileModal mode={modal.mode} profile={modal.profile} onClose={() => setModal(null)} onSave={handleSave} />}
  </div>;
}
