import { useEffect, useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import { AdminSidebar, AdminHeader } from './AdminDashboard';
import './AdminUsers.css';

const initialUsers = [
  { id: 1, fullName: 'Nguyễn Văn An', email: 'nguyenvanan@gmail.com', phone: '0901234567', role: 'KHACH_HANG', status: true, createdAt: '15/08/2026', profileCount: 2 },
  { id: 2, fullName: 'Trần Thị Lan', email: 'lan@tiemchungcare.vn', phone: '0912345678', role: 'NHAN_VIEN', status: true, createdAt: '01/06/2026' },
  { id: 3, fullName: 'Lê Hoàng Nam', email: 'hoangnam@gmail.com', phone: '0923456789', role: 'KHACH_HANG', status: true, createdAt: '20/08/2026', profileCount: 1 },
  { id: 4, fullName: 'Trần Ngọc Mai', email: 'ngocmai@gmail.com', phone: '0934567890', role: 'KHACH_HANG', status: true, createdAt: '25/08/2026', profileCount: 1 },
  { id: 5, fullName: 'Phạm Thu Hà', email: 'thuha@gmail.com', phone: '0945678901', role: 'KHACH_HANG', status: true, createdAt: '02/09/2026', profileCount: 3 },
  { id: 6, fullName: 'Nguyễn Hoàng Minh', email: 'minh@tiemchungcare.vn', phone: '0956789012', role: 'NHAN_VIEN', status: true, createdAt: '04/10/2026' },
  { id: 7, fullName: 'Võ Thanh Hương', email: 'thanhhuong@gmail.com', phone: '0967890123', role: 'KHACH_HANG', status: false, createdAt: '10/09/2026', profileCount: 1 },
  { id: 8, fullName: 'Nguyễn Thị Mai', email: 'mai@tiemchungcare.vn', phone: '0978901234', role: 'NHAN_VIEN', status: true, createdAt: '15/06/2026' },
];
const roleLabel = (role) => role === 'NHAN_VIEN' ? 'Nhân viên' : 'Khách hàng';
const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
function initials(name) { const words = name.trim().split(/\s+/); return `${words[0][0]}${words.length > 1 ? words.at(-1)[0] : ''}`.toLocaleUpperCase('vi'); }
function validate(form, users, editingId) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Vui lòng nhập email hợp lệ.';
  else if (users.some((user) => user.id !== editingId && user.email.toLowerCase() === form.email.trim().toLowerCase())) errors.email = 'Email đã được sử dụng.';
  if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại.';
  else if (!/^\+?[\d\s().-]{9,16}$/.test(form.phone.trim())) errors.phone = 'Vui lòng nhập số điện thoại hợp lệ.';
  if (editingId == null) {
    if (form.password.length < 6 || !form.password.trim()) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (!form.confirmPassword || form.confirmPassword !== form.password) errors.confirmPassword = 'Xác nhận mật khẩu phải trùng khớp.';
  }
  return errors;
}
function UserModal({ mode, user, users, onClose, onSave, onToggle }) {
  const ref = useRef(null);
  const creating = mode === 'add';
  const editing = mode === 'edit';
  const [form, setForm] = useState(() => ({ fullName: user?.fullName || '', email: user?.email || '', phone: user?.phone || '', ...(creating ? { password: '', confirmPassword: '' } : {}) }));
  const [errors, setErrors] = useState({});
  useEffect(() => {
    const dialog = ref.current; const trigger = document.activeElement; const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  function submit(event) {
    event.preventDefault();
    const nextErrors = validate(form, users, editing ? user.id : null);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0])?.focus(); return; }
    // Only the three public profile fields leave the form; never retain passwords.
    onSave({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim() }, editing ? user.id : null);
  }
  const title = creating ? 'Thêm tài khoản nhân viên' : editing ? 'Chỉnh sửa nhân viên' : mode === 'view' ? 'CHI TIẾT TÀI KHOẢN' : user.status ? 'Khóa tài khoản?' : 'Mở khóa tài khoản này?';
  return <dialog ref={ref} className="au-modal" aria-labelledby="au-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id="au-modal-title">{title}</h2><button type="button" className="au-close" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>
    {creating || editing ? <form onSubmit={submit} noValidate><div className="au-modal-body au-form">
      {[['fullName', 'Họ và tên', 'text'], ['email', 'Email', 'email'], ['phone', 'Số điện thoại', 'tel'], ...(creating ? [['password', 'Mật khẩu', 'password'], ['confirmPassword', 'Xác nhận mật khẩu', 'password']] : [])].map(([name, label, type]) => <div key={name}><label htmlFor={`au-${name}`}>{label} *</label><input id={`au-${name}`} name={name} type={type} autoComplete={type === 'password' ? 'new-password' : 'off'} required value={form[name]} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `au-${name}-error` : undefined} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} />{errors[name] && <p className="au-error" id={`au-${name}-error`} role="alert">{errors[name]}</p>}</div>)}
      <p className="au-role-readonly">Vai trò: <strong>Nhân viên</strong></p>
    </div><footer><button type="button" className="cd-button" onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary au-save">{creating ? 'Thêm nhân viên' : 'Lưu thay đổi'}</button></footer></form> : mode === 'view' ? <><dl className="au-details au-modal-body">{[['Họ và tên', user.fullName], ['Email', user.email], ['Số điện thoại', user.phone], ['Vai trò', roleLabel(user.role)], ['Trạng thái', user.status ? 'Đang hoạt động' : 'Đã khóa'], ['Ngày tạo', user.createdAt], ...(user.role === 'KHACH_HANG' ? [['Số hồ sơ người tiêm đang quản lý', user.profileCount || 0]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></> : <><div className="au-modal-body"><p>Bạn có chắc muốn {user.status ? 'khóa' : 'mở khóa'} tài khoản <strong>{user.fullName}</strong>?</p><p className="au-confirm-note">{user.status ? 'Tài khoản sẽ không thể đăng nhập vào hệ thống cho đến khi được mở khóa.' : 'Tài khoản sẽ được chuyển về trạng thái đang hoạt động.'}</p></div><footer><button type="button" className="cd-button" onClick={onClose}>Hủy</button><button type="button" className="cd-button cd-button-primary au-confirm" onClick={() => onToggle(user.id)}>{user.status ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button></footer></>}
  </dialog>;
}

export default function AdminUsers({ onNavigate, users: savedUsers, setUsers }) {
  const users = savedUsers ?? initialUsers;
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');
  const selected = users.find((user) => user.id === modal?.id);
  const visible = users.filter((user) => (role === 'all' || user.role === role) && (status === 'all' || String(user.status) === status) && normalize(`${user.fullName} ${user.email} ${user.phone}`).includes(normalize(search)));
  const statistics = [['Tổng tài khoản', users.length], ['Khách hàng', users.filter((user) => user.role === 'KHACH_HANG').length], ['Nhân viên', users.filter((user) => user.role === 'NHAN_VIEN').length], ['Bị khóa', users.filter((user) => !user.status).length]];
  function save(fields, id) {
    if (id != null && users.find((user) => user.id === id)?.role !== 'NHAN_VIEN') return;
    const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    setUsers((current) => {
      const list = current ?? initialUsers;
      return id == null ? [...list, { ...fields, id: Math.max(...list.map((user) => user.id)) + 1, role: 'NHAN_VIEN', status: true, createdAt: now }] : list.map((user) => user.id === id ? { ...user, ...fields, updatedAt: now } : user);
    });
    setMessage(id == null ? 'Thêm nhân viên thành công' : 'Đã cập nhật thông tin nhân viên'); setModal(null);
  }
  function toggle(id) {
    setUsers((current) => (current ?? initialUsers).map((user) => user.id === id ? { ...user, status: !user.status } : user));
    setMessage(selected.status ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản'); setModal(null);
  }
  function open(mode, user, event) {
    const details = event.currentTarget.closest('details');
    if (details) { details.open = false; details.querySelector('summary').focus(); }
    setModal({ mode, id: user.id });
  }
  return <div className="customer-dashboard admin-dashboard admin-users"><a href="#au-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar activePage="admin-users" onNavigate={onNavigate} /><div className="cd-workspace"><AdminHeader onNotifications={() => onNavigate('admin-dashboard')} /><main id="au-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading au-heading"><div><h1>Quản lý tài khoản</h1><p>Quản lý tài khoản khách hàng và nhân viên trong hệ thống</p></div><button type="button" className="cd-button cd-button-primary au-add" onClick={() => setModal({ mode: 'add' })}><Icon name="plus" />Thêm nhân viên</button></div>
    <section className="cd-statistics" aria-label="Thống kê tài khoản">{statistics.map(([label, value]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name="users" /></span></div><strong className="cd-stat-value">{value}</strong></article>)}</section>
    <section className="cd-panel au-filters" aria-label="Lọc tài khoản"><div className="au-tabs" role="group" aria-label="Vai trò">{[['all', 'Tất cả'], ['KHACH_HANG', 'Khách hàng'], ['NHAN_VIEN', 'Nhân viên']].map(([value, label]) => <button type="button" key={value} aria-pressed={role === value} onClick={() => setRole(value)}>{label}</button>)}</div><div className="au-filter-grid"><div><label htmlFor="au-search">Tìm tài khoản</label><input id="au-search" type="search" placeholder="Tìm theo họ tên, email hoặc số điện thoại..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div><label htmlFor="au-status">Trạng thái</label><select id="au-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="true">Đang hoạt động</option><option value="false">Đã khóa</option></select></div></div></section>
    <p className="au-count" role="status">{message && `${message}. `}Hiển thị {visible.length} / {users.length} tài khoản</p>
    {visible.length ? <div className="au-table-card"><table className="au-table"><caption>Danh sách tài khoản</caption><thead><tr>{['Người dùng', 'Email', 'Số điện thoại', 'Vai trò', 'Ngày tạo', 'Trạng thái', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((user) => <tr key={user.id}>
      <td data-label="Người dùng"><div className="au-person"><span className="cd-avatar" aria-hidden="true">{initials(user.fullName)}</span><strong>{user.fullName}</strong></div></td><td data-label="Email">{user.email}</td><td data-label="Số điện thoại">{user.phone}</td><td data-label="Vai trò"><span className="au-badge">{roleLabel(user.role)}</span></td><td data-label="Ngày tạo">{user.createdAt}</td><td data-label="Trạng thái"><span className={`au-badge ${user.status ? 'au-active' : 'au-locked'}`}>{user.status ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td data-label="Thao tác"><details className="au-actions"><summary aria-label={`Thao tác cho ${user.fullName}`}>•••</summary><div><button type="button" className="au-view" onClick={(event) => open('view', user, event)}>Xem chi tiết</button>{user.role === 'NHAN_VIEN' && <button type="button" className="au-edit" onClick={(event) => open('edit', user, event)}>Chỉnh sửa</button>}<button type="button" className="au-toggle" onClick={(event) => open('toggle', user, event)}>{user.status ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button></div></details></td>
    </tr>)}</tbody></table></div> : <section className="cd-panel au-empty"><h2>Không tìm thấy tài khoản phù hợp</h2><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></section>}
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div>{modal && (modal.mode === 'add' || selected) && <UserModal mode={modal.mode} user={selected} users={users} onClose={() => setModal(null)} onSave={save} onToggle={toggle} />}</div>;
}
