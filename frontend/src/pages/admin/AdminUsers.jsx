import { useEffect, useRef, useState } from 'react';
import {
  createAdminUser,
  getAdminUser,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserPassword,
} from '../../services/adminUserService.js';
import { Icon } from '../customer/CustomerDashboard';
import { AdminSidebar, AdminHeader } from './AdminDashboard';
import './AdminUsers.css';

const roles = ['KHACH_HANG', 'NHAN_VIEN', 'QUAN_TRI_VIEN'];
const roleLabels = {
  KHACH_HANG: 'Khách hàng',
  NHAN_VIEN: 'Nhân viên',
  QUAN_TRI_VIEN: 'Quản trị viên',
};
const statusLabels = { true: 'Đang hoạt động', false: 'Đã khóa' };

function displayDateTime(value) {
  if (!value) return 'Không có';
  const [datePart, timePart = ''] = String(value).split(/[T ]/);
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
}

function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return words.length ? `${words[0][0]}${words.length > 1 ? words.at(-1)[0] : ''}`.toLocaleUpperCase('vi') : '';
}

function emptyUserForm() {
  return { ho_ten: '', email: '', so_dien_thoai: '', mat_khau: '', confirmPassword: '', vai_tro: 'NHAN_VIEN', trang_thai: true };
}

function validateUserForm(form, creating) {
  const errors = {};
  if (!form.ho_ten.trim()) errors.ho_ten = 'Vui lòng nhập họ và tên.';
  if (form.ho_ten.trim().length > 100) errors.ho_ten = 'Họ tên không được quá 100 ký tự.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Vui lòng nhập email hợp lệ.';
  if (form.email.trim().length > 150) errors.email = 'Email không được quá 150 ký tự.';
  if (form.so_dien_thoai.trim().length > 20) errors.so_dien_thoai = 'Số điện thoại không được quá 20 ký tự.';
  if (!roles.includes(form.vai_tro)) errors.vai_tro = 'Vai trò không hợp lệ.';
  if (creating && form.mat_khau.length < 8) errors.mat_khau = 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (creating && form.confirmPassword !== form.mat_khau) errors.confirmPassword = 'Xác nhận mật khẩu không khớp.';
  return errors;
}

function UserModal({ mode, userId, currentUser, onClose, onSuccess }) {
  const dialogRef = useRef(null);
  const submitLockRef = useRef(false);
  const creating = mode === 'create';
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(emptyUserForm);
  const [password, setPassword] = useState({ value: '', confirm: '' });
  const [loading, setLoading] = useState(!creating);
  const [loadError, setLoadError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);

  useEffect(() => {
    if (creating) return undefined;
    let active = true;
    getAdminUser(userId)
      .then((result) => {
        if (!active) return;
        setRecord(result);
        setForm({
          ho_ten: result.ho_ten,
          email: result.email,
          so_dien_thoai: result.so_dien_thoai || '',
          vai_tro: result.vai_tro,
          trang_thai: result.trang_thai,
          mat_khau: '',
          confirmPassword: '',
        });
      })
      .catch((error) => { if (active) setLoadError(error.message || 'Không thể tải chi tiết tài khoản.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [creating, retryKey, userId]);

  const isSelf = record?.ma_nguoi_dung === currentUser?.ma_nguoi_dung;
  const titles = { create: 'Tạo tài khoản', view: 'CHI TIẾT TÀI KHOẢN', edit: 'Cập nhật tài khoản', password: 'Đổi mật khẩu', toggle: record ? record.trang_thai ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?' : 'Cập nhật trạng thái' };

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setRequestError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (submitLockRef.current) return;
    let nextErrors = {};
    if (creating || mode === 'edit') nextErrors = validateUserForm(form, creating);
    if (mode === 'password') {
      if (password.value.length < 8) nextErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
      if (password.confirm !== password.value) nextErrors.confirm = 'Xác nhận mật khẩu không khớp.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setRequestError('');
    try {
      let result;
      if (creating) {
        result = await createAdminUser({
          ho_ten: form.ho_ten.trim(), email: form.email.trim().toLowerCase(),
          so_dien_thoai: form.so_dien_thoai.trim() || null, mat_khau: form.mat_khau,
          vai_tro: form.vai_tro, trang_thai: form.trang_thai,
        });
      } else if (mode === 'edit') {
        result = await updateAdminUser(userId, {
          ho_ten: form.ho_ten.trim(), email: form.email.trim().toLowerCase(),
          so_dien_thoai: form.so_dien_thoai.trim() || null,
          vai_tro: form.vai_tro, trang_thai: form.trang_thai,
        });
      } else if (mode === 'password') {
        result = await updateAdminUserPassword(userId, { mat_khau_moi: password.value });
        setPassword({ value: '', confirm: '' });
      } else if (mode === 'toggle') {
        result = await updateAdminUser(userId, { trang_thai: !record.trang_thai });
      }
      onSuccess(mode, result);
    } catch (error) {
      setRequestError(error.message || 'Không thể cập nhật tài khoản.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  const formFields = creating || mode === 'edit' ? <div className="au-modal-body au-form">
    <div><label htmlFor="au-name">Họ và tên *</label><input id="au-name" value={form.ho_ten} disabled={submitting} aria-invalid={!!errors.ho_ten} onChange={(event) => setField('ho_ten', event.target.value)} />{errors.ho_ten && <p className="au-error">{errors.ho_ten}</p>}</div>
    <div><label htmlFor="au-email">Email *</label><input id="au-email" type="email" value={form.email} disabled={submitting} aria-invalid={!!errors.email} onChange={(event) => setField('email', event.target.value)} />{errors.email && <p className="au-error">{errors.email}</p>}</div>
    <div><label htmlFor="au-phone">Số điện thoại</label><input id="au-phone" type="tel" value={form.so_dien_thoai} disabled={submitting} aria-invalid={!!errors.so_dien_thoai} onChange={(event) => setField('so_dien_thoai', event.target.value)} />{errors.so_dien_thoai && <p className="au-error">{errors.so_dien_thoai}</p>}</div>
    {creating && <><div><label htmlFor="au-password">Mật khẩu *</label><input id="au-password" type="password" autoComplete="new-password" value={form.mat_khau} disabled={submitting} aria-invalid={!!errors.mat_khau} onChange={(event) => setField('mat_khau', event.target.value)} />{errors.mat_khau && <p className="au-error">{errors.mat_khau}</p>}</div><div><label htmlFor="au-confirm-password">Xác nhận mật khẩu *</label><input id="au-confirm-password" type="password" autoComplete="new-password" value={form.confirmPassword} disabled={submitting} aria-invalid={!!errors.confirmPassword} onChange={(event) => setField('confirmPassword', event.target.value)} />{errors.confirmPassword && <p className="au-error">{errors.confirmPassword}</p>}</div></>}
    <div><label htmlFor="au-role">Vai trò *</label><select id="au-role" value={form.vai_tro} disabled={submitting || isSelf} aria-invalid={!!errors.vai_tro} onChange={(event) => setField('vai_tro', event.target.value)}>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>{isSelf && <small>Không thể tự thay đổi vai trò Admin.</small>}</div>
    <div><label htmlFor="au-status">Trạng thái *</label><select id="au-status" value={String(form.trang_thai)} disabled={submitting || isSelf} onChange={(event) => setField('trang_thai', event.target.value === 'true')}><option value="true">Đang hoạt động</option><option value="false">Đã khóa</option></select>{isSelf && <small>Không thể tự khóa tài khoản hiện tại.</small>}</div>
  </div> : null;

  return <dialog ref={dialogRef} className="au-modal" aria-labelledby="au-modal-title" onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }}>
    <header><h2 id="au-modal-title">{titles[mode]}</h2><button type="button" className="au-close" disabled={submitting} aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>
    {loading ? <div className="au-modal-state" role="status">Đang tải chi tiết...</div> : loadError ? <div className="au-modal-state au-request-error" role="alert"><p>{loadError}</p><button type="button" className="cd-button" onClick={() => { setLoading(true); setLoadError(''); setRetryKey((value) => value + 1); }}>Thử lại</button></div> : mode === 'view' ? <><dl className="au-details au-modal-body">{[
      ['Mã tài khoản', record.ma_nguoi_dung], ['Họ và tên', record.ho_ten], ['Email', record.email],
      ['Số điện thoại', record.so_dien_thoai || 'Chưa cập nhật'], ['Vai trò', roleLabels[record.vai_tro] || record.vai_tro],
      ['Trạng thái', statusLabels[String(record.trang_thai)]], ['Ngày tạo', displayDateTime(record.ngay_tao)], ['Cập nhật', displayDateTime(record.ngay_cap_nhat)],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></> : mode === 'password' ? <form onSubmit={submit}><div className="au-modal-body au-form"><div><label htmlFor="au-new-password">Mật khẩu mới *</label><input id="au-new-password" type="password" autoComplete="new-password" disabled={submitting} value={password.value} aria-invalid={!!errors.password} onChange={(event) => { setPassword((current) => ({ ...current, value: event.target.value })); setErrors({}); setRequestError(''); }} />{errors.password && <p className="au-error">{errors.password}</p>}</div><div><label htmlFor="au-new-password-confirm">Xác nhận mật khẩu *</label><input id="au-new-password-confirm" type="password" autoComplete="new-password" disabled={submitting} value={password.confirm} aria-invalid={!!errors.confirm} onChange={(event) => { setPassword((current) => ({ ...current, confirm: event.target.value })); setErrors({}); setRequestError(''); }} />{errors.confirm && <p className="au-error">{errors.confirm}</p>}</div>{requestError && <p className="au-submit-error" role="alert">{requestError}</p>}</div><footer><button type="button" className="cd-button" disabled={submitting} onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary" disabled={submitting}>{submitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</button></footer></form> : mode === 'toggle' ? <form onSubmit={submit}><div className="au-modal-body"><p>Bạn có chắc muốn {record.trang_thai ? 'khóa' : 'mở khóa'} tài khoản <strong>{record.ho_ten}</strong>?</p>{requestError && <p className="au-submit-error" role="alert">{requestError}</p>}</div><footer><button type="button" className="cd-button" disabled={submitting} onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary" disabled={submitting}>{submitting ? 'Đang cập nhật...' : record.trang_thai ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button></footer></form> : <form onSubmit={submit} noValidate>{formFields}{requestError && <p className="au-submit-error" role="alert">{requestError}</p>}<footer><button type="button" className="cd-button" disabled={submitting} onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : creating ? 'Tạo tài khoản' : 'Lưu thay đổi'}</button></footer></form>}
  </dialog>;
}

export default function AdminUsers({ currentUser, onNavigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getAdminUsers(filters)
      .then((result) => { if (active) setUsers(Array.isArray(result) ? result : []); })
      .catch((requestError) => { if (active) { setUsers([]); setError(requestError.message || 'Không thể tải danh sách tài khoản.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, reloadKey]);

  function applyFilters(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setFilters({ search, vaiTro: role, trangThai: status });
  }

  function resetFilters() {
    setSearch(''); setRole(''); setStatus(''); setLoading(true); setError(''); setFilters({});
  }

  function retry() {
    setLoading(true); setError(''); setReloadKey((value) => value + 1);
  }

  function mutationSucceeded(mode) {
    const messages = { create: 'Tạo tài khoản thành công', edit: 'Cập nhật tài khoản thành công', password: 'Đổi mật khẩu thành công', toggle: 'Cập nhật trạng thái thành công' };
    setMessage(messages[mode]);
    setModal(null);
    setLoading(true);
    setError('');
    setReloadKey((value) => value + 1);
  }

  const statistics = [
    ['Tổng kết quả', users.length],
    ['Khách hàng', users.filter((user) => user.vai_tro === 'KHACH_HANG').length],
    ['Nhân viên', users.filter((user) => user.vai_tro === 'NHAN_VIEN').length],
    ['Tài khoản bị khóa', users.filter((user) => !user.trang_thai).length],
  ];

  return <div className="customer-dashboard admin-dashboard admin-users"><a href="#au-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar activePage="admin-users" onNavigate={onNavigate} /><div className="cd-workspace"><AdminHeader currentUser={currentUser} onNotifications={() => onNavigate('admin-dashboard')} /><main id="au-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading au-heading"><div><h1>Quản lý tài khoản</h1><p>Quản lý tài khoản khách hàng, nhân viên và quản trị viên</p></div><button type="button" className="cd-button cd-button-primary au-add" onClick={() => setModal({ mode: 'create' })}><Icon name="plus" />Tạo tài khoản</button></div>
    <section className="cd-statistics" aria-label="Thống kê tài khoản">{statistics.map(([label, value]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name="users" /></span></div><strong className="cd-stat-value">{loading || error ? '—' : value}</strong></article>)}</section>
    <form className="cd-panel au-filters" aria-label="Lọc tài khoản" onSubmit={applyFilters}><div className="au-filter-grid"><div><label htmlFor="au-search">Tìm tài khoản</label><input id="au-search" type="search" placeholder="Tìm theo họ tên, email hoặc số điện thoại..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div><label htmlFor="au-role-filter">Vai trò</label><select id="au-role-filter" value={role} onChange={(event) => setRole(event.target.value)}><option value="">Tất cả vai trò</option>{roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></div><div><label htmlFor="au-status-filter">Trạng thái</label><select id="au-status-filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option><option value="true">Đang hoạt động</option><option value="false">Đã khóa</option></select></div><div className="au-filter-actions"><button type="submit" className="cd-button cd-button-primary" disabled={loading}>Lọc</button><button type="button" className="cd-button" disabled={loading} onClick={resetFilters}>Đặt lại</button></div></div></form>
    {message && <p className="au-success" role="status">{message}</p>}
    {loading ? <section className="cd-panel au-empty" role="status"><h2>Đang tải danh sách tài khoản...</h2></section> : error ? <section className="cd-panel au-empty au-request-error" role="alert"><h2>Không thể tải danh sách</h2><p>{error}</p><button type="button" className="cd-button" onClick={retry}>Thử lại</button></section> : <><p className="au-count" role="status">Hiển thị {users.length} tài khoản</p>{users.length ? <div className="au-table-card"><table className="au-table"><caption>Danh sách tài khoản</caption><thead><tr>{['Người dùng', 'Email', 'Số điện thoại', 'Vai trò', 'Ngày tạo', 'Trạng thái', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{users.map((user) => <tr key={user.ma_nguoi_dung}>
      <td data-label="Người dùng"><div className="au-person"><span className="cd-avatar" aria-hidden="true">{initials(user.ho_ten)}</span><strong>{user.ho_ten}</strong></div></td><td data-label="Email">{user.email}</td><td data-label="Số điện thoại">{user.so_dien_thoai || 'Chưa cập nhật'}</td><td data-label="Vai trò"><span className="au-badge">{roleLabels[user.vai_tro] || user.vai_tro}</span></td><td data-label="Ngày tạo">{displayDateTime(user.ngay_tao)}</td><td data-label="Trạng thái"><span className={`au-badge ${user.trang_thai ? 'au-active' : 'au-locked'}`}>{statusLabels[String(user.trang_thai)]}</span></td><td data-label="Thao tác"><details className="au-actions"><summary aria-label={`Thao tác cho ${user.ho_ten}`}>•••</summary><div><button type="button" onClick={() => setModal({ mode: 'view', userId: user.ma_nguoi_dung })}>Xem chi tiết</button><button type="button" onClick={() => setModal({ mode: 'edit', userId: user.ma_nguoi_dung })}>Chỉnh sửa</button><button type="button" onClick={() => setModal({ mode: 'password', userId: user.ma_nguoi_dung })}>Đổi mật khẩu</button><button type="button" disabled={user.ma_nguoi_dung === currentUser?.ma_nguoi_dung} title={user.ma_nguoi_dung === currentUser?.ma_nguoi_dung ? 'Không thể tự khóa tài khoản' : undefined} onClick={() => setModal({ mode: 'toggle', userId: user.ma_nguoi_dung })}>{user.trang_thai ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button></div></details></td>
    </tr>)}</tbody></table></div> : <section className="cd-panel au-empty"><h2>Chưa có tài khoản phù hợp.</h2><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></section>}</>}
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div>{modal && <UserModal mode={modal.mode} userId={modal.userId} currentUser={currentUser} onClose={() => setModal(null)} onSuccess={mutationSucceeded} />}</div>;
}
