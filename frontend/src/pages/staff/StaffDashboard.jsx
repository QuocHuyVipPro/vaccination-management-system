import { useEffect, useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import './StaffDashboard.css';

const staff = { name: 'Trần Thị Lan', initials: 'TL' };
const menuItems = [
  { page: 'staff-dashboard', icon: 'overview', label: 'Tổng quan' },
  { page: 'staff-appointments', icon: 'calendar', label: 'Quản lý lịch hẹn' },
  { page: 'staff-patients', icon: 'users', label: 'Tra cứu người tiêm' },
  { page: 'staff-vaccination', icon: 'vaccine', label: 'Ghi nhận tiêm chủng' },
  { page: 'staff-history', icon: 'history', label: 'Lịch sử tiêm' },
];
const initialAppointments = [
  { id: 1, time: '09:00', name: 'Nguyễn Minh Anh', vaccine: 'HPV Gardasil 9', dose: 'Mũi 2', status: 'confirmed' },
  { id: 2, time: '09:30', name: 'Nguyễn Văn An', vaccine: 'Vaxigrip Tetra', dose: 'Mũi 1', status: 'confirmed' },
  { id: 3, time: '10:00', name: 'Lê Hoàng Nam', vaccine: 'Prevenar 13', dose: 'Mũi 1', status: 'pending' },
  { id: 4, time: '10:30', name: 'Trần Ngọc Mai', vaccine: 'Varivax', dose: 'Mũi 2', status: 'confirmed' },
];
const actions = [
  { page: 'staff-appointments', icon: 'calendar', title: 'Quản lý lịch hẹn', description: 'Xem và xác nhận lịch' },
  { page: 'staff-patients', icon: 'users', title: 'Tra cứu người tiêm', description: 'Tìm hồ sơ người tiêm' },
  { page: 'staff-vaccination', icon: 'vaccine', title: 'Ghi nhận tiêm chủng', description: 'Ghi nhận mũi tiêm mới' },
];
const activities = [
  { time: '09:42', title: 'Đã ghi nhận tiêm HPV Gardasil 9', description: 'cho Nguyễn Minh Anh', icon: 'vaccine' },
  { time: '09:15', title: 'Đã xác nhận lịch tiêm', description: 'của Nguyễn Văn An', icon: 'check' },
  { time: '08:50', title: 'Đã ghi nhận tiêm Vaxigrip Tetra', description: 'cho Phạm Thu Hà', icon: 'vaccine' },
];
const alerts = [{ count: 2, label: 'lô sắp hết hạn' }, { count: 3, label: 'vắc xin sắp hết hàng' }];

export function StaffSidebar({ onNavigate, activePage = 'staff-dashboard' }) {
  const [open, setOpen] = useState(false);
  return <aside className="cd-sidebar"><div className="cd-brand"><span className="cd-brand-mark"><Icon name="shield" /></span><span>TIÊM CHỦNG<strong>CARE</strong></span></div><button type="button" className="cd-mobile-toggle" aria-expanded={open} aria-controls="staff-navigation" onClick={() => setOpen(!open)}><Icon name="menu" />Menu</button><div id="staff-navigation" className={`cd-navigation${open ? ' cd-navigation-open' : ''}`}><p className="cd-nav-label">KHÔNG GIAN NHÂN VIÊN</p><nav aria-label="Menu nhân viên">{menuItems.map((item) => <button type="button" key={item.page} className={`cd-nav-item${item.page === activePage ? ' cd-nav-active' : ''}`} aria-current={item.page === activePage ? 'page' : undefined} onClick={() => { onNavigate?.(item.page); setOpen(false); }}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav><div className="cd-sidebar-bottom"><button className="cd-nav-item" type="button" onClick={() => onNavigate?.('logout')}><Icon name="logout" /><span>Đăng xuất</span></button><p>TIÊM CHỦNG CARE<span>Chăm sóc sức khỏe cộng đồng</span></p></div></div></aside>;
}
export function StaffHeader({ onNotifications }) {
  return <header className="cd-header"><div className="cd-greeting"><p>Xin chào, <strong>{staff.name}</strong></p><span>Chúc bạn một ngày làm việc hiệu quả!</span></div><div className="cd-header-account"><button className="cd-notification-button" type="button" aria-label="Xem cảnh báo vắc xin" onClick={onNotifications}><Icon name="bell" /><span /></button><span className="cd-avatar">{staff.initials}</span><div className="cd-account-name"><strong>{staff.name}</strong><span>Nhân viên</span></div></div></header>;
}
function WarningIcon() {
  return <svg className="cd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 10 18H2Z" /><path d="M12 9v5m0 3v.1" /></svg>;
}
export function DetailModal({ appointment, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={ref} className="sd-modal" aria-labelledby="sd-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><header><h2 id="sd-modal-title">{appointment ? 'Chi tiết lịch hẹn' : 'Cảnh báo vắc xin'}</h2><button type="button" className="sd-close" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>{appointment ? <dl>{[['Người tiêm', appointment.name], ['Giờ hẹn', appointment.time], ['Vắc xin', appointment.vaccine], ['Mũi tiêm', appointment.dose], ['Trạng thái', appointment.status === 'pending' ? 'Chờ xác nhận' : 'Đã xác nhận']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <div className="sd-alert-details">{alerts.map((alert) => <p key={alert.label}><WarningIcon /><strong>{alert.count}</strong> {alert.label}</p>)}</div>}<footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></dialog>;
}

export default function StaffDashboard({ onNavigate }) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [detail, setDetail] = useState(null);
  const confirmedInDemo = appointments.filter((item) => item.status === 'confirmed').length - 3;
  const statistics = [
    { label: 'Lịch hẹn hôm nay', value: 12, caption: 'Cần xử lý', icon: 'calendar' },
    { label: 'Chờ xác nhận', value: 4 - confirmedInDemo, caption: 'Lịch đăng ký mới', icon: 'clock' },
    { label: 'Đã tiêm hôm nay', value: 7, caption: 'Đã hoàn thành', icon: 'vaccine' },
    { label: 'Sắp đến lượt', value: 3, caption: 'Trong 60 phút tới', icon: 'users' },
  ];
  return <div className="customer-dashboard staff-dashboard"><a href="#staff-main" className="cd-skip-link">Đến nội dung chính</a><StaffSidebar onNavigate={onNavigate} /><div className="cd-workspace"><StaffHeader onNotifications={() => setDetail({ type: 'alerts' })} /><main id="staff-main" className="cd-main" tabIndex={-1}><div className="cd-page-heading"><h1>Tổng quan</h1><p>Theo dõi hoạt động tiêm chủng trong ngày</p></div><section className="cd-statistics" aria-label="Thống kê hoạt động trong ngày">{statistics.map((item) => <article className="cd-stat-card" key={item.label}><div className="cd-stat-top"><h2>{item.label}</h2><span className="cd-icon-box"><Icon name={item.icon} /></span></div><strong className="cd-stat-value">{item.value}</strong><p>{item.caption}</p></article>)}</section><div className="cd-content-grid"><div className="cd-content-column"><section className="cd-panel" aria-labelledby="sd-appointments-title"><div className="cd-section-heading"><h2 id="sd-appointments-title">Lịch hẹn hôm nay</h2><button type="button" className="cd-text-button" onClick={() => onNavigate?.('staff-appointments')}>Xem tất cả<Icon name="arrow" /></button></div><ul className="sd-appointments">{appointments.map((item) => <li key={item.id}><time className="sd-time">{item.time}</time><div className="sd-appointment-body"><h3>{item.name}</h3><p>{item.vaccine}<span> · {item.dose}</span></p><span className={`cd-badge${item.status === 'pending' ? ' sd-pending' : ''}`}>{item.status === 'pending' ? 'Chờ xác nhận' : 'Đã xác nhận'}</span><div className="sd-row-actions"><button type="button" className="cd-text-button" onClick={() => setDetail({ type: 'appointment', id: item.id })}>Xem chi tiết<Icon name="arrow" /></button>{item.status === 'pending' && <button type="button" className="cd-button cd-button-primary" onClick={() => setAppointments((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'confirmed' } : entry))}>Xác nhận</button>}</div></div></li>)}</ul></section><section className="cd-panel" aria-labelledby="sd-activity-title"><div className="cd-section-heading"><h2 id="sd-activity-title">Hoạt động gần đây</h2></div><ul className="sd-activities">{activities.map((item) => <li key={item.time}><time>{item.time}</time><span className="sd-activity-icon"><Icon name={item.icon} /></span><div><strong>{item.title}</strong><p>{item.description}</p></div></li>)}</ul></section></div><div className="cd-content-column"><section className="cd-panel" aria-labelledby="sd-actions-title"><div className="cd-section-heading"><h2 id="sd-actions-title">Thao tác nhanh</h2></div><div className="cd-actions">{actions.map((item) => <button className="cd-action" key={item.page} type="button" onClick={() => onNavigate?.(item.page)}><span className="cd-icon-box"><Icon name={item.icon} /></span><span className="cd-action-text"><strong>{item.title}</strong><span>{item.description}</span></span><Icon name="arrow" /></button>)}</div></section><section className="cd-panel" aria-labelledby="sd-alert-title"><div className="cd-section-heading"><h2 id="sd-alert-title">Cảnh báo vắc xin</h2><span className="sd-warning"><WarningIcon /></span></div><div className="sd-alert-list">{alerts.map((alert) => <p key={alert.label}><strong>{alert.count}</strong><span>{alert.label}</span></p>)}</div><button type="button" className="cd-text-button sd-alert-link" onClick={() => setDetail({ type: 'alerts' })}>Xem chi tiết<Icon name="arrow" /></button></section></div></div><footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{detail && <DetailModal appointment={detail.type === 'appointment' ? appointments.find((item) => item.id === detail.id) : null} onClose={() => setDetail(null)} />}</div>;
}
