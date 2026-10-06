import { useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import './AdminDashboard.css';

const menu = [
  { page: 'admin-dashboard', icon: 'overview', label: 'Tổng quan' },
  { page: 'admin-users', icon: 'users', label: 'Quản lý tài khoản' },
  { page: 'admin-vaccines', icon: 'vaccine', label: 'Quản lý vắc xin' },
  { page: 'admin-inventory', icon: 'inventory', label: 'Quản lý lô & kho' },
  { page: 'admin-reports', icon: 'reports', label: 'Báo cáo thống kê' },
];
const statistics = [
  { label: 'Tổng người dùng', value: 156, caption: 'Đang hoạt động', icon: 'users' },
  { label: 'Tổng hồ sơ người tiêm', value: 203, caption: 'Đã được quản lý', icon: 'shield' },
  { label: 'Lịch hẹn hôm nay', value: 12, caption: '4 lịch chờ xác nhận', icon: 'calendar' },
  { label: 'Mũi tiêm tháng này', value: 128, caption: 'Đã ghi nhận', icon: 'vaccine' },
];
const inventory = [
  { label: 'Tổng số liều còn', value: 485, unit: 'liều' },
  { label: 'Sắp hết hàng', value: 3, unit: 'vắc xin' },
  { label: 'Lô sắp hết hạn', value: 2, unit: 'lô' },
];
const alerts = [
  { title: 'Lô HPV240701 sắp hết hạn', description: 'Hạn sử dụng: 20/10/2026', badge: 'Sắp hết hạn', type: 'expiry', icon: 'clock' },
  { title: 'Vaxigrip Tetra sắp hết hàng', description: 'Còn lại: 8 liều', badge: 'Tồn kho thấp', type: 'stock', icon: 'inventory' },
  { title: '4 lịch hẹn đang chờ xác nhận', description: '', badge: 'Chờ xử lý', type: 'pending', icon: 'calendar' },
];
const activities = [
  { time: '10:20', title: 'Trần Thị Lan đã ghi nhận mũi tiêm', description: 'HPV Gardasil 9 cho Nguyễn Minh Anh', icon: 'vaccine' },
  { time: '09:45', title: 'Nhân viên đã xác nhận lịch hẹn', description: 'LH20261008001', icon: 'check' },
  { time: '09:15', title: 'Lô vắc xin VAX261001 được nhập kho', description: '50 liều', icon: 'inventory' },
  { time: '08:40', title: 'Tài khoản nhân viên mới được tạo', description: 'Nguyễn Hoàng Minh', icon: 'users' },
];
const actions = [
  { page: 'admin-users', icon: 'users', title: 'Quản lý tài khoản', description: 'Quản lý khách hàng và nhân viên' },
  { page: 'admin-vaccines', icon: 'vaccine', title: 'Quản lý vắc xin', description: 'Danh mục và thông tin vắc xin' },
  { page: 'admin-inventory', icon: 'inventory', title: 'Quản lý kho', description: 'Theo dõi lô và tồn kho' },
  { page: 'admin-reports', icon: 'reports', title: 'Xem báo cáo', description: 'Thống kê hoạt động hệ thống' },
];
function AdminIcon({ name }) {
  if (!['inventory', 'reports'].includes(name)) return <Icon name={name} />;
  return <svg className="cd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name === 'inventory' ? <><path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4M12 11v10M7 5l9 4" /></> : <><path d="M4 3v18h17M8 16v-4m5 4V7m5 9v-6" /></>}</svg>;
}
export function AdminSidebar({ onNavigate, activePage = 'admin-dashboard' }) {
  const [open, setOpen] = useState(false);
  return <aside className="cd-sidebar">
    <div className="cd-brand"><span className="cd-brand-mark"><Icon name="shield" /></span><span>TIÊM CHỦNG<strong>CARE</strong></span></div>
    <button type="button" className="cd-mobile-toggle" aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(!open)}><Icon name="menu" />Menu</button>
    <div id="admin-navigation" className={`cd-navigation${open ? ' cd-navigation-open' : ''}`}><p className="cd-nav-label">QUẢN TRỊ HỆ THỐNG</p><nav aria-label="Menu quản trị viên">{menu.map((item) => <button type="button" key={item.page} className={`cd-nav-item${activePage === item.page ? ' cd-nav-active' : ''}`} aria-current={activePage === item.page ? 'page' : undefined} onClick={() => { onNavigate?.(item.page); setOpen(false); }}><AdminIcon name={item.icon} /><span>{item.label}</span></button>)}</nav><div className="cd-sidebar-bottom"><button type="button" className="cd-nav-item" onClick={() => onNavigate?.('logout')}><Icon name="logout" /><span>Đăng xuất</span></button><p>TIÊM CHỦNG CARE<span>Quản lý hệ thống tiêm chủng</span></p></div></div>
  </aside>;
}
export function AdminHeader({ onNotifications, currentUser }) {
  const name = currentUser?.ho_ten || 'Quản trị viên';
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  return <header className="cd-header"><div className="cd-greeting"><p>Xin chào, <strong>{name}</strong></p><span>Tổng quan hoạt động của hệ thống</span></div><div className="cd-header-account"><button type="button" className="cd-notification-button" aria-label="Xem cảnh báo hệ thống" onClick={onNotifications}><Icon name="bell" /><span /></button><span className="cd-avatar">{initials}</span><div className="cd-account-name"><strong>{name}</strong><span>{currentUser?.vai_tro || 'QUAN_TRI_VIEN'}</span></div></div></header>;
}
export default function AdminDashboard({ onNavigate }) {
  const alertsRef = useRef(null);
  function showAlerts() { alertsRef.current?.focus({ preventScroll: true }); alertsRef.current?.scrollIntoView({ block: 'center' }); }
  return <div className="customer-dashboard admin-dashboard">
    <a href="#admin-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar onNavigate={onNavigate} />
    <div className="cd-workspace"><AdminHeader onNotifications={showAlerts} /><main id="admin-main" className="cd-main" tabIndex={-1}>
      <div className="cd-page-heading"><h1>Tổng quan</h1><p>Theo dõi hoạt động và tình trạng hệ thống tiêm chủng</p></div>
      <section className="cd-statistics" aria-label="Thống kê hệ thống">{statistics.map((item) => <article className="cd-stat-card" key={item.label}><div className="cd-stat-top"><h2>{item.label}</h2><span className="cd-icon-box"><AdminIcon name={item.icon} /></span></div><strong className="cd-stat-value">{item.value}</strong><p>{item.caption}</p></article>)}</section>
      <div className="cd-content-grid"><div className="cd-content-column">
        <section className="cd-panel" aria-labelledby="ad-inventory-title"><div className="cd-section-heading"><h2 id="ad-inventory-title">Tình trạng kho vắc xin</h2><button type="button" className="cd-text-button ad-inventory-link" onClick={() => onNavigate?.('admin-inventory')}>Xem kho<Icon name="arrow" /></button></div><dl className="ad-inventory">{inventory.map((item) => <div key={item.label}><dt>{item.label}</dt><dd><strong>{item.value}</strong><span>{item.unit}</span></dd></div>)}</dl></section>
        <section className="cd-panel" aria-labelledby="ad-activities-title"><div className="cd-section-heading"><h2 id="ad-activities-title">Hoạt động gần đây</h2></div><ul className="ad-activities">{activities.map((item) => <li key={item.time}><time>{item.time}</time><span className="ad-activity-icon"><AdminIcon name={item.icon} /></span><div><strong>{item.title}</strong><p>{item.description}</p></div></li>)}</ul></section>
      </div><div className="cd-content-column">
        <section className="cd-panel ad-alert-panel" aria-labelledby="ad-alerts-title" ref={alertsRef} tabIndex={-1}><div className="cd-section-heading"><h2 id="ad-alerts-title">Cảnh báo cần chú ý</h2><span className="cd-unread-count">{alerts.length}</span></div><ul className="ad-alerts">{alerts.map((item) => <li key={item.title}><span className="ad-alert-icon"><AdminIcon name={item.icon} /></span><div><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}<span className={`ad-badge ad-${item.type}`}>{item.badge}</span></div></li>)}</ul></section>
        <section className="cd-panel" aria-labelledby="ad-actions-title"><div className="cd-section-heading"><h2 id="ad-actions-title">Thao tác nhanh</h2></div><div className="cd-actions">{actions.map((item) => <button type="button" className="cd-action" key={item.page} onClick={() => onNavigate?.(item.page)}><span className="cd-icon-box"><AdminIcon name={item.icon} /></span><span className="cd-action-text"><strong>{item.title}</strong><span>{item.description}</span></span><Icon name="arrow" /></button>)}</div></section>
      </div></div>
      <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
    </main></div>
  </div>;
}
