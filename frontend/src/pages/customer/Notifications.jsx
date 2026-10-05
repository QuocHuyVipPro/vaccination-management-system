import { useContext, useEffect, useRef, useState } from 'react';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import { NotificationContext, unreadCount, markRead, filterNotifications } from './notificationState';
import './Notifications.css';

const types = { reminder: { label: 'Nhắc lịch', icon: 'bell' }, appointment: { label: 'Lịch hẹn', icon: 'calendar' }, system: { label: 'Hệ thống', icon: 'info' } };
const filters = [['all', 'Tất cả'], ['unread', 'Chưa đọc'], ['reminder', 'Nhắc lịch'], ['appointment', 'Lịch hẹn'], ['system', 'Hệ thống']];
function NotificationIcon({ type }) {
  if (type !== 'system') return <Icon name={types[type].icon} />;
  return <svg className="cd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></svg>;
}
function NotificationItem({ item, onOpen }) {
  return <li><button type="button" className={`nt-item${item.isRead ? '' : ' nt-unread'}`} onClick={onOpen} aria-label={`${item.title}, ${item.isRead ? 'Đã đọc' : 'Chưa đọc'}`}><span className="cd-icon-box"><NotificationIcon type={item.type} /></span><span className="nt-item-body"><span className="nt-item-heading"><strong>{item.title}</strong>{!item.isRead && <span className="nt-dot" aria-hidden="true" />}</span><span className="nt-message">{item.message}</span><span className="nt-meta"><span>{types[item.type].label}</span><time dateTime={`${item.date.split('/').reverse().join('-')}T${item.time}:00+07:00`}>{item.date} · {item.time}</time><span>{item.isRead ? 'Đã đọc' : 'Chưa đọc'}</span></span></span><Icon name="arrow" /></button></li>;
}
function NotificationModal({ item, onClose, onAppointments }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const entries = [['Loại thông báo', types[item.type].label], ['Tiêu đề', item.title], ['Nội dung', item.message], ['Thời gian', `${item.date} · ${item.time}`], ['Trạng thái', item.isRead ? 'Đã đọc' : 'Chưa đọc'], ...(item.appointmentId ? [['Mã lịch hẹn', item.appointmentId]] : [])];
  return <dialog className="nt-modal" ref={ref} aria-labelledby="nt-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><header className="nt-modal-header"><h2 id="nt-modal-title">Chi tiết thông báo</h2><button type="button" className="nt-close" onClick={onClose} aria-label="Đóng chi tiết thông báo">×</button></header><dl className="nt-details">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><footer className="nt-modal-footer"><button className="cd-button" type="button" onClick={onClose}>Đóng</button>{item.appointmentId && <button className="cd-button cd-button-primary" type="button" onClick={onAppointments}>Xem lịch hẹn</button>}</footer></dialog>;
}

export default function Notifications({ onNavigate }) {
  const { notifications, setNotifications } = useContext(NotificationContext);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const filterRef = useRef(null);
  const unread = unreadCount(notifications);
  const visible = filterNotifications(notifications, filter);
  const selected = notifications.find((item) => item.id === selectedId);
  const summary = [{ label: 'Tất cả', value: notifications.length, icon: 'overview' }, { label: 'Chưa đọc', value: unread, icon: 'bell' }, { label: 'Nhắc lịch', value: notifications.filter((item) => item.type === 'reminder').length, icon: 'calendar' }];
  function openNotification(id) { setNotifications((current) => markRead(current, id)); setSelectedId(id); }
  function closeModal() { setSelectedId(null); if (filter === 'unread') filterRef.current?.focus(); }
  const emptyTitle = !notifications.length ? 'Chưa có thông báo' : filter === 'unread' ? 'Bạn không có thông báo chưa đọc' : `Không có thông báo ${types[filter]?.label.toLowerCase() || ''}`;
  return <div className="customer-dashboard notifications-page"><a href="#nt-main" className="cd-skip-link">Đến nội dung chính</a><Sidebar activeMenu="bell" onNavigate={onNavigate} /><div className="cd-workspace"><DashboardHeader customer={{ name: 'Nguyễn Văn An', initials: 'NA' }} /><main id="nt-main" className="cd-main" tabIndex={-1}><div className="cd-page-heading nt-heading"><div><h1>Thông báo</h1><p>Cập nhật lịch tiêm và các thông tin quan trọng dành cho bạn</p></div><button className="cd-button nt-mark-all" type="button" disabled={unread === 0} onClick={() => setNotifications((current) => markRead(current))}><Icon name="check" />Đánh dấu tất cả đã đọc</button></div><div className="nt-content"><section className="cd-statistics nt-statistics" aria-label="Thống kê thông báo">{summary.map((stat) => <article className="cd-stat-card" key={stat.label}><div className="cd-stat-top"><h2>{stat.label}</h2><span className="cd-icon-box"><Icon name={stat.icon} /></span></div><strong className="cd-stat-value">{stat.value}</strong></article>)}</section><div className="nt-filters" role="group" aria-label="Lọc thông báo">{filters.map(([key, label]) => <button ref={key === 'unread' ? filterRef : undefined} type="button" key={key} className={filter === key ? 'nt-filter-active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><p className="nt-count" role="status">{unread} thông báo chưa đọc · Hiển thị {visible.length} thông báo</p>{visible.length ? <ul className="nt-list" aria-label="Danh sách thông báo">{visible.map((item) => <NotificationItem key={item.id} item={item} onOpen={() => openNotification(item.id)} />)}</ul> : <section className="cd-panel nt-empty"><span className="cd-icon-box"><Icon name="bell" /></span><h2>{emptyTitle}</h2><p>{!notifications.length ? 'Các thông báo về lịch tiêm và nhắc lịch sẽ xuất hiện tại đây.' : 'Bạn có thể chọn bộ lọc khác để xem các thông báo.'}</p></section>}</div><footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{selected && <NotificationModal item={selected} onClose={closeModal} onAppointments={() => { setSelectedId(null); onNavigate?.('calendar'); }} />}</div>;
}
