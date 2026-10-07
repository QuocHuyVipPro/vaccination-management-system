import { useEffect, useRef, useState } from 'react';
import { getAdminDashboardReport } from '../../services/adminReportService.js';
import { Icon } from '../customer/CustomerDashboard';
import './AdminDashboard.css';

const menu = [
  { page: 'admin-dashboard', icon: 'overview', label: 'Tổng quan' },
  { page: 'admin-users', icon: 'users', label: 'Quản lý tài khoản' },
  { page: 'admin-vaccines', icon: 'vaccine', label: 'Quản lý vắc xin' },
  { page: 'admin-inventory', icon: 'inventory', label: 'Quản lý lô & kho' },
  { page: 'admin-reports', icon: 'reports', label: 'Báo cáo thống kê' },
];
const actions = [
  { page: 'admin-users', icon: 'users', title: 'Quản lý tài khoản', description: 'Quản lý khách hàng và nhân viên' },
  { page: 'admin-vaccines', icon: 'vaccine', title: 'Quản lý vắc xin', description: 'Danh mục và phác đồ tiêm' },
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

export function AdminHeader({ onNotifications, currentUser, notificationCount = 0 }) {
  const name = currentUser?.ho_ten || '—';
  const initials = name === '—' ? '—' : name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  return <header className="cd-header"><div className="cd-greeting"><p>Xin chào, <strong>{name}</strong></p><span>Tổng quan hoạt động của hệ thống</span></div><div className="cd-header-account"><button type="button" className="cd-notification-button" aria-label={`Xem cảnh báo hệ thống${notificationCount ? `, ${notificationCount} thông báo chưa đọc` : ''}`} onClick={onNotifications}><Icon name="bell" />{notificationCount > 0 && <span />}</button><span className="cd-avatar">{initials}</span><div className="cd-account-name"><strong>{name}</strong><span>{currentUser?.vai_tro || '—'}</span></div></div></header>;
}

function DashboardContent({ report, alertsRef, onNavigate }) {
  const statistics = [
    { label: 'Người dùng', value: report.tong_nguoi_dung, caption: 'Tổng tài khoản', icon: 'users' },
    { label: 'Hồ sơ người tiêm', value: report.tong_ho_so_nguoi_tiem, caption: 'Hồ sơ đang quản lý', icon: 'shield' },
    { label: 'Lịch hẹn', value: report.tong_lich_hen, caption: 'Tổng lịch trong hệ thống', icon: 'calendar' },
    { label: 'Mũi đã tiêm', value: report.tong_mui_tiem_da_thuc_hien, caption: 'Lịch sử đã ghi nhận', icon: 'check' },
    { label: 'Vắc xin', value: report.tong_vac_xin, caption: `${report.tong_lo_vac_xin} lô vắc xin`, icon: 'vaccine' },
    { label: 'Tổng tồn kho', value: report.tong_ton_kho, caption: 'Liều còn trong kho', icon: 'inventory' },
  ];
  const statuses = [
    { label: 'Vắc xin có lô sắp hết hạn', value: report.vaccine_sap_het_han, icon: 'clock', type: 'expiry' },
    { label: 'Lô sắp hết hàng', value: report.lo_sap_het_hang, icon: 'inventory', type: 'stock' },
    { label: 'Thông báo chưa đọc', value: report.thong_bao_chua_doc, icon: 'bell', type: 'pending' },
  ];
  return <>
    <section className="cd-statistics ad-statistics" aria-label="Thống kê hệ thống">{statistics.map((item) => <article className="cd-stat-card" key={item.label}><div className="cd-stat-top"><h2>{item.label}</h2><span className="cd-icon-box"><AdminIcon name={item.icon} /></span></div><strong className="cd-stat-value">{item.value}</strong><p>{item.caption}</p></article>)}</section>
    <div className="cd-content-grid"><div className="cd-content-column">
      <section className="cd-panel" aria-labelledby="ad-today-title"><div className="cd-section-heading"><h2 id="ad-today-title">Hoạt động hôm nay</h2></div><dl className="ad-today"><div><dt>Lịch hẹn hôm nay</dt><dd><strong>{report.lich_hen_hom_nay}</strong><span>lịch hẹn</span></dd></div><div><dt>Mũi tiêm hôm nay</dt><dd><strong>{report.mui_tiem_hom_nay}</strong><span>mũi tiêm</span></dd></div></dl></section>
      <section className="cd-panel" aria-labelledby="ad-inventory-title"><div className="cd-section-heading"><h2 id="ad-inventory-title">Tổng quan vắc xin &amp; kho</h2><button type="button" className="cd-text-button ad-inventory-link" onClick={() => onNavigate?.('admin-inventory')}>Xem kho<Icon name="arrow" /></button></div><dl className="ad-inventory"><div><dt>Danh mục vắc xin</dt><dd><strong>{report.tong_vac_xin}</strong><span>loại</span></dd></div><div><dt>Lô vắc xin</dt><dd><strong>{report.tong_lo_vac_xin}</strong><span>lô</span></dd></div><div><dt>Tồn kho</dt><dd><strong>{report.tong_ton_kho}</strong><span>liều</span></dd></div></dl></section>
    </div><div className="cd-content-column">
      <section className="cd-panel ad-alert-panel" aria-labelledby="ad-alerts-title" ref={alertsRef} tabIndex={-1}><div className="cd-section-heading"><h2 id="ad-alerts-title">Tình trạng hệ thống</h2><span className="cd-unread-count">{statuses.reduce((sum, item) => sum + item.value, 0)}</span></div><ul className="ad-alerts">{statuses.map((item) => <li key={item.label}><span className="ad-alert-icon"><AdminIcon name={item.icon} /></span><div><h3>{item.label}</h3><p>{item.value === 0 ? 'Không có cảnh báo.' : `Có ${item.value} mục cần chú ý.`}</p><span className={`ad-badge ${item.value === 0 ? 'ad-normal' : `ad-${item.type}`}`}>{item.value === 0 ? 'Bình thường' : item.value}</span></div></li>)}</ul></section>
      <section className="cd-panel" aria-labelledby="ad-actions-title"><div className="cd-section-heading"><h2 id="ad-actions-title">Thao tác nhanh</h2></div><div className="cd-actions">{actions.map((item) => <button type="button" className="cd-action" key={item.page} onClick={() => onNavigate?.(item.page)}><span className="cd-icon-box"><AdminIcon name={item.icon} /></span><span className="cd-action-text"><strong>{item.title}</strong><span>{item.description}</span></span><Icon name="arrow" /></button>)}</div></section>
    </div></div>
  </>;
}

export default function AdminDashboard({ currentUser, onNavigate }) {
  const alertsRef = useRef(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getAdminDashboardReport()
      .then((result) => { if (active) setReport(result); })
      .catch((requestError) => { if (active) { setReport(null); setError(requestError.message || 'Không thể tải dữ liệu Dashboard.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  function showAlerts() {
    if (loading || error) return;
    alertsRef.current?.focus({ preventScroll: true }); alertsRef.current?.scrollIntoView({ block: 'center' });
  }
  function retry() {
    setLoading(true); setError(''); setReloadKey((value) => value + 1);
  }

  return <div className="customer-dashboard admin-dashboard">
    <a href="#admin-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar onNavigate={onNavigate} />
    <div className="cd-workspace"><AdminHeader currentUser={currentUser} notificationCount={report?.thong_bao_chua_doc ?? 0} onNotifications={showAlerts} /><main id="admin-main" className="cd-main" tabIndex={-1}>
      <div className="cd-page-heading"><h1>Tổng quan</h1><p>Theo dõi hoạt động và tình trạng hệ thống tiêm chủng</p></div>
      {loading ? <section className="cd-panel ad-state" role="status"><h2>Đang tải dữ liệu Dashboard...</h2><p>Các thống kê sẽ hiển thị sau khi nhận phản hồi từ máy chủ.</p></section> : error ? <section className="cd-panel ad-state ad-request-error" role="alert"><h2>Không thể tải Dashboard</h2><p>{error}</p><button type="button" className="cd-button" onClick={retry}>Thử lại</button></section> : <DashboardContent report={report} alertsRef={alertsRef} onNavigate={onNavigate} />}
      <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
    </main></div>
  </div>;
}
