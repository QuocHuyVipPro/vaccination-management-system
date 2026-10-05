import { useContext, useState } from 'react';
import { NotificationContext, unreadCount } from './notificationState';
import './CustomerDashboard.css';

export function Icon({ name, className = '' }) {
  const paths = {
    shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" /><path d="M12 8v8m-4-4h8" /></>,
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-14 5h3m4 0h3" /></>,
    vaccine: <><path d="m15 3 6 6m-4-4-4 4m2 2 4-4M5 15l4 4 8-8-4-4Zm0 0-2 6 6-2m1-9 4 4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 12a2 2 0 0 0 4 0" /></>,
    history: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2" /></>,
    logout: <><path d="M9 3H4v18h5m5-14 5 5-5 5m-6-5h11" /></>,
    arrow: <path d="m9 5 7 7-7 7" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  };
  return <svg className={`cd-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Sidebar({ activeMenu = 'overview', onNavigate }) {
  const { notifications } = useContext(NotificationContext);
  const unread = unreadCount(notifications);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = [
    ['overview', 'Tổng quan'], ['users', 'Hồ sơ người tiêm'],
    ['vaccine', 'Đăng ký tiêm'], ['calendar', 'Lịch hẹn'],
    ['history', 'Lịch sử tiêm'], ['bell', 'Thông báo'],
  ];

  return (
    <aside className="cd-sidebar">
      <div className="cd-brand"><span className="cd-brand-mark"><Icon name="shield" /></span><span>TIÊM CHỦNG<strong>CARE</strong></span></div>
      <button className="cd-mobile-toggle" type="button" aria-expanded={menuOpen} aria-controls="cd-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /><span>Menu</span></button>
      <div id="cd-navigation" className={`cd-navigation${menuOpen ? ' cd-navigation-open' : ''}`}>
        <p className="cd-nav-label">KHÔNG GIAN CỦA BẠN</p>
        <nav aria-label="Menu khách hàng">
          {menu.map(([icon, label]) => <button key={icon} type="button" onClick={() => { onNavigate?.(icon); setMenuOpen(false); }} className={`cd-nav-item${icon === activeMenu ? ' cd-nav-active' : ''}`} aria-current={icon === activeMenu ? 'page' : undefined}><Icon name={icon} /><span>{label}</span>{icon === 'bell' && unread > 0 && <span className="cd-nav-count">{unread}</span>}</button>)}
        </nav>
        <div className="cd-sidebar-bottom"><button type="button" className="cd-nav-item" onClick={() => onNavigate?.('logout')}><Icon name="logout" /><span>Đăng xuất</span></button><p>TIÊM CHỦNG CARE<span>Chủ động vì sức khỏe</span></p></div>
      </div>
    </aside>
  );
}

export function DashboardHeader({ customer }) {
  const { notifications, onOpenNotifications } = useContext(NotificationContext);
  const unread = unreadCount(notifications);
  return (
    <header className="cd-header">
      <div className="cd-greeting"><p>Xin chào, <strong>{customer.name}</strong></p><span>Chúc bạn một ngày tốt lành!</span></div>
      <div className="cd-header-account"><button type="button" className="cd-notification-button" onClick={onOpenNotifications} aria-label={`Thông báo, ${unread} thông báo chưa đọc`}><Icon name="bell" />{unread > 0 && <span />}</button><span className="cd-avatar">{customer.initials}</span><div className="cd-account-name"><strong>{customer.name}</strong><span>Khách hàng</span></div></div>
    </header>
  );
}

function Statistics({ items }) {
  return <section className="cd-statistics" aria-label="Thống kê tổng quan">{items.map((item) => <article className="cd-stat-card" key={item.label}><div className="cd-stat-top"><h2>{item.label}</h2><span className="cd-icon-box"><Icon name={item.icon} /></span></div><strong className="cd-stat-value">{item.value}</strong><p>{item.caption}</p></article>)}</section>;
}

function UpcomingAppointment({ appointment, onNavigate }) {
  return (
    <section className="cd-panel cd-appointment" aria-labelledby="cd-appointment-title">
      <div className="cd-section-heading"><h2 id="cd-appointment-title">Lịch tiêm sắp tới</h2><span className="cd-badge"><Icon name="check" />{appointment.status}</span></div>
      <div className="cd-appointment-summary"><div className="cd-date-tile"><span>THÁNG 10</span><strong>08</strong><span>2026</span></div><div><p className="cd-eyebrow">LỊCH TIÊM CỦA BẠN</p><h3>{appointment.vaccine}</h3><p>{appointment.dose}<span className="cd-separator">•</span>{appointment.name}</p></div></div>
      <dl className="cd-appointment-details"><div><dt><Icon name="calendar" />Ngày tiêm</dt><dd><time dateTime="2026-10-08">{appointment.date}</time></dd></div><div><dt><Icon name="clock" />Giờ hẹn</dt><dd><time dateTime="2026-10-08T09:30:00+07:00">{appointment.time}</time></dd></div></dl>
      <div className="cd-appointment-footer"><span><Icon name="shield" />Chủ động theo dõi lịch tiêm của bạn</span><button type="button" className="cd-button cd-button-primary" onClick={() => onNavigate?.('calendar')}>Xem chi tiết<Icon name="arrow" /></button></div>
    </section>
  );
}

function Profiles({ profiles, onNavigate }) {
  return (
    <section className="cd-panel" aria-labelledby="cd-profiles-title">
      <div className="cd-section-heading"><h2 id="cd-profiles-title">Hồ sơ người tiêm</h2><button type="button" className="cd-text-button" onClick={() => onNavigate?.('users')}><Icon name="plus" />Thêm hồ sơ</button></div>
      <div className="cd-profile-grid">{profiles.map((profile) => <article className="cd-profile" key={profile.name}><div className="cd-profile-top"><span className="cd-avatar cd-profile-avatar">{profile.initials}</span><span className="cd-relation">{profile.relationship}</span></div><h3>{profile.name}</h3><p>Ngày sinh: <time dateTime={profile.birthDate}>{profile.birthday}</time></p><button type="button" className="cd-button cd-profile-button" onClick={() => onNavigate?.('users')}>Xem hồ sơ<Icon name="arrow" /></button></article>)}</div>
    </section>
  );
}

function QuickActions({ onNavigate }) {
  const actions = [
    { icon: 'vaccine', title: 'Đăng ký tiêm', description: 'Đặt lịch tiêm mới' },
    { icon: 'calendar', title: 'Xem lịch hẹn', description: 'Theo dõi lịch đã đăng ký' },
    { icon: 'history', title: 'Lịch sử tiêm', description: 'Xem các mũi đã tiêm' },
  ];
  return <section className="cd-panel" aria-labelledby="cd-actions-title"><div className="cd-section-heading"><h2 id="cd-actions-title">Thao tác nhanh</h2></div><div className="cd-actions">{actions.map((action) => <button type="button" className="cd-action" onClick={() => onNavigate?.(action.icon)} key={action.title}><span className="cd-icon-box"><Icon name={action.icon} /></span><span className="cd-action-text"><strong>{action.title}</strong><span>{action.description}</span></span><Icon name="arrow" /></button>)}</div></section>;
}

function Notifications({ notifications, onNavigate, unread }) {
  return <section className="cd-panel" aria-labelledby="cd-notifications-title"><div className="cd-section-heading"><h2 id="cd-notifications-title">Thông báo gần đây</h2><span className="cd-unread-count">{unread} mới</span></div><ul className="cd-notifications">{notifications.map((notification) => <li key={notification.title}><span className="cd-unread-dot" role="img" aria-label="Chưa đọc" /><div><h3>{notification.title}</h3><p>{notification.message}</p><span className="cd-notification-time">{notification.time}</span></div></li>)}</ul><button type="button" className="cd-text-button cd-all-notifications" onClick={() => onNavigate?.('bell')}>Xem tất cả<Icon name="arrow" /></button></section>;
}

export default function CustomerDashboard({ onNavigate }) {
  const { notifications: sharedNotifications } = useContext(NotificationContext);
  const customer = { name: 'Nguyễn Văn An', initials: 'NA' };
  const statistics = [
    { label: 'Hồ sơ người tiêm', value: 2, caption: 'Đang quản lý', icon: 'users' },
    { label: 'Lịch hẹn sắp tới', value: 1, caption: 'Trong 7 ngày tới', icon: 'calendar' },
    { label: 'Mũi đã tiêm', value: 6, caption: 'Đã hoàn thành', icon: 'vaccine' },
    { label: 'Thông báo mới', value: unreadCount(sharedNotifications), caption: 'Chưa đọc', icon: 'bell' },
  ];
  const appointment = { name: 'Nguyễn Minh Anh', vaccine: 'Vắc xin HPV', dose: 'Mũi 2', date: '08/10/2026', time: '09:30', status: 'Đã xác nhận' };
  const profiles = [
    { name: 'Nguyễn Văn An', initials: 'NA', birthday: '15/06/2005', birthDate: '2005-06-15', relationship: 'Bản thân' },
    { name: 'Nguyễn Minh Anh', initials: 'MA', birthday: '12/03/2015', birthDate: '2015-03-12', relationship: 'Em' },
  ];
  const notifications = [
    { title: 'Nhắc lịch tiêm', message: 'Bạn có lịch tiêm HPV mũi 2 vào ngày 08/10/2026 lúc 09:30.', time: '2 giờ trước' },
    { title: 'Lịch hẹn đã được xác nhận', message: 'Lịch tiêm của Nguyễn Minh Anh đã được xác nhận.', time: 'Hôm qua' },
  ];

  return (
    <div className="customer-dashboard">
      <a href="#cd-main" className="cd-skip-link">Đến nội dung chính</a>
      <Sidebar onNavigate={onNavigate} />
      <div className="cd-workspace">
        <DashboardHeader customer={customer} />
        <main id="cd-main" className="cd-main" tabIndex={-1}>
          <div className="cd-page-heading"><h1>Tổng quan</h1><p>Theo dõi lịch tiêm và quản lý sức khỏe của bạn</p></div>
          <Statistics items={statistics} />
          <div className="cd-content-grid"><div className="cd-content-column"><UpcomingAppointment appointment={appointment} onNavigate={onNavigate} /><Profiles profiles={profiles} onNavigate={onNavigate} /></div><div className="cd-content-column"><QuickActions onNavigate={onNavigate} /><Notifications notifications={notifications} onNavigate={onNavigate} unread={unreadCount(sharedNotifications)} /></div></div>
          <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
        </main>
      </div>
    </div>
  );
}
