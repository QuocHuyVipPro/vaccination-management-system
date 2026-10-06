import { useContext, useEffect, useRef, useState } from 'react';
import { getNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/notificationService.js';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import { NotificationContext, unreadCount } from './notificationState';
import './Notifications.css';

const types = {
  LICH_TIEM: { label: 'Lịch tiêm', icon: 'calendar' },
  MUI_TIEP_THEO: { label: 'Mũi tiếp theo', icon: 'bell' },
  HE_THONG: { label: 'Hệ thống', icon: 'info' },
};
const filters = [['all', 'Tất cả'], ['unread', 'Chưa đọc'], ...Object.entries(types).map(([key, value]) => [key, value.label])];

function typeLabel(type) { return types[type]?.label || type || 'Chưa phân loại'; }
function formatDateTime(value) {
  if (!value) return 'Chưa xác định';
  const [datePart, timePart = ''] = value.split(/[T ]/);
  return `${datePart.split('-').reverse().join('/')}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
}
function initials(name) { return (name || 'Khách hàng').trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase(); }
function NotificationIcon({ type }) {
  const icon = types[type]?.icon;
  if (icon && icon !== 'info') return <Icon name={icon} />;
  return <svg className="cd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></svg>;
}
function NotificationItem({ item, viewing, onOpen }) {
  return <li><button type="button" disabled={viewing} className={`nt-item${item.da_doc ? '' : ' nt-unread'}`} onClick={onOpen} aria-label={`${item.tieu_de}, ${item.da_doc ? 'Đã đọc' : 'Chưa đọc'}`}><span className="cd-icon-box"><NotificationIcon type={item.loai_thong_bao} /></span><span className="nt-item-body"><span className="nt-item-heading"><strong>{item.tieu_de}</strong>{!item.da_doc && <span className="nt-dot" aria-hidden="true" />}</span><span className="nt-message">{item.noi_dung}</span><span className="nt-meta"><span>{typeLabel(item.loai_thong_bao)}</span><time dateTime={item.ngay_tao}>{formatDateTime(item.ngay_tao)}</time><span>{viewing ? 'Đang mở...' : item.da_doc ? 'Đã đọc' : 'Chưa đọc'}</span></span></span><Icon name="arrow" /></button></li>;
}
function NotificationModal({ item, loading, error, onRetry, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const entries = item ? [
    ['Loại thông báo', typeLabel(item.loai_thong_bao)],
    ['Tiêu đề', item.tieu_de],
    ['Nội dung', item.noi_dung],
    ['Thời gian tạo', formatDateTime(item.ngay_tao)],
    ['Thời gian gửi dự kiến', formatDateTime(item.thoi_gian_gui_du_kien)],
    ['Trạng thái', item.da_doc ? 'Đã đọc' : 'Chưa đọc'],
  ] : [];
  return <dialog className="nt-modal" ref={ref} aria-labelledby="nt-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><header className="nt-modal-header"><h2 id="nt-modal-title">Chi tiết thông báo</h2><button type="button" className="nt-close" onClick={onClose} aria-label="Đóng chi tiết thông báo">×</button></header>{loading ? <p className="nt-modal-state" role="status">Đang tải chi tiết thông báo...</p> : error ? <div className="nt-modal-state nt-request-error" role="alert"><p>{error}</p><button type="button" className="cd-button" onClick={onRetry}>Thử lại</button></div> : <dl className="nt-details">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}<footer className="nt-modal-footer"><button className="cd-button" type="button" onClick={onClose}>Đóng</button></footer></dialog>;
}

export default function Notifications({ currentUser, onNavigate }) {
  const { notifications, setNotifications } = useContext(NotificationContext);
  const [filter, setFilter] = useState('all');
  const [unreadRecords, setUnreadRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const filterRef = useRef(null);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const markAllLockRef = useRef(false);
  const unread = unreadCount(notifications);
  const visible = filter === 'unread' ? unreadRecords : filter === 'all' ? notifications : notifications.filter((item) => item.loai_thong_bao === filter);
  const summary = [{ label: 'Tất cả', value: notifications.length, icon: 'overview' }, { label: 'Chưa đọc', value: unread, icon: 'bell' }, { label: 'Mũi tiếp theo', value: notifications.filter((item) => item.loai_thong_bao === 'MUI_TIEP_THEO').length, icon: 'calendar' }];

  async function loadNotifications(selectedFilter = filter) {
    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const unreadOnly = selectedFilter === 'unread';
      const result = await getNotifications({ unreadOnly });
      if (requestId !== listRequestRef.current) return;
      const data = Array.isArray(result) ? result : [];
      if (unreadOnly) setUnreadRecords(data);
      else setNotifications(data);
    } catch (requestError) {
      if (requestId === listRequestRef.current) setError(requestError.message || 'Không thể tải danh sách thông báo.');
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    getNotifications().then((result) => { if (active) setNotifications(Array.isArray(result) ? result : []); }).catch((requestError) => { if (active) setError(requestError.message || 'Không thể tải danh sách thông báo.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [setNotifications]);
  function changeFilter(nextFilter) {
    setFilter(nextFilter);
    setActionError('');
    if (nextFilter === 'unread') loadNotifications(nextFilter);
  }
  function updateReadNotification(updated) {
    setNotifications((current) => current.map((item) => item.ma_thong_bao === updated.ma_thong_bao ? updated : item));
    setUnreadRecords((current) => current.filter((item) => item.ma_thong_bao !== updated.ma_thong_bao));
  }
  async function loadDetail(notificationId) {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setDetailLoading(true);
    setDetailError('');
    try {
      const notification = await getNotification(notificationId);
      const updated = notification.da_doc ? notification : await markNotificationRead(notificationId);
      if (requestId !== detailRequestRef.current) return;
      setDetail(updated);
      if (!notification.da_doc) updateReadNotification(updated);
    } catch (requestError) {
      if (requestId === detailRequestRef.current) setDetailError(requestError.message || 'Không thể tải chi tiết thông báo.');
    } finally {
      if (requestId === detailRequestRef.current) {
        setDetailLoading(false);
        setViewingId(null);
      }
    }
  }
  function openNotification(notificationId) {
    setSelectedId(notificationId);
    setDetail(null);
    setViewingId(notificationId);
    loadDetail(notificationId);
  }
  function closeModal() {
    detailRequestRef.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
    setDetailLoading(false);
    setViewingId(null);
    if (filter === 'unread') filterRef.current?.focus();
  }
  async function markAllRead() {
    if (unread === 0 || markAllLockRef.current) return;
    markAllLockRef.current = true;
    setMarkingAll(true);
    setActionError('');
    try {
      await markAllNotificationsRead();
      const refreshed = await getNotifications();
      setNotifications(Array.isArray(refreshed) ? refreshed : []);
      setUnreadRecords([]);
    } catch (requestError) {
      setActionError(requestError.message || 'Không thể đánh dấu tất cả thông báo đã đọc.');
    } finally {
      markAllLockRef.current = false;
      setMarkingAll(false);
    }
  }

  const customerName = currentUser?.ho_ten || 'Khách hàng';
  const emptyTitle = !notifications.length ? 'Bạn chưa có thông báo.' : filter === 'unread' ? 'Bạn không có thông báo chưa đọc' : `Không có thông báo ${typeLabel(filter).toLowerCase()}`;
  return <div className="customer-dashboard notifications-page"><a href="#nt-main" className="cd-skip-link">Đến nội dung chính</a><Sidebar activeMenu="bell" onNavigate={onNavigate} /><div className="cd-workspace"><DashboardHeader customer={{ name: customerName, initials: initials(customerName) }} /><main id="nt-main" className="cd-main" tabIndex={-1}><div className="cd-page-heading nt-heading"><div><h1>Thông báo</h1><p>Cập nhật lịch tiêm và các thông tin quan trọng dành cho bạn</p></div><button className="cd-button nt-mark-all" type="button" disabled={unread === 0 || markingAll} onClick={markAllRead}><Icon name="check" />{markingAll ? 'Đang đánh dấu...' : 'Đánh dấu tất cả đã đọc'}</button></div><div className="nt-content">
    {error && <div className="nt-page-error" role="alert"><span>{error}</span><button type="button" className="cd-button" onClick={() => loadNotifications()}>Thử lại</button></div>}
    {actionError && <p className="nt-action-error" role="alert">{actionError}</p>}
    <section className="cd-statistics nt-statistics" aria-label="Thống kê thông báo">{summary.map((stat) => <article className="cd-stat-card" key={stat.label}><div className="cd-stat-top"><h2>{stat.label}</h2><span className="cd-icon-box"><Icon name={stat.icon} /></span></div><strong className="cd-stat-value">{stat.value}</strong></article>)}</section><div className="nt-filters" role="group" aria-label="Lọc thông báo">{filters.map(([key, label]) => <button ref={key === 'unread' ? filterRef : undefined} type="button" key={key} className={filter === key ? 'nt-filter-active' : ''} aria-pressed={filter === key} onClick={() => changeFilter(key)}>{label}</button>)}</div>
    {loading ? <section className="cd-panel nt-empty" role="status"><span className="cd-icon-box"><Icon name="bell" /></span><h2>Đang tải thông báo...</h2><p>Vui lòng chờ trong giây lát.</p></section> : !error && <><p className="nt-count" role="status">{unread} thông báo chưa đọc · Hiển thị {visible.length} thông báo</p>{visible.length ? <ul className="nt-list" aria-label="Danh sách thông báo">{visible.map((item) => <NotificationItem key={item.ma_thong_bao} item={item} viewing={viewingId === item.ma_thong_bao} onOpen={() => openNotification(item.ma_thong_bao)} />)}</ul> : <section className="cd-panel nt-empty"><span className="cd-icon-box"><Icon name="bell" /></span><h2>{emptyTitle}</h2><p>{!notifications.length ? 'Các thông báo trong ứng dụng sẽ xuất hiện tại đây.' : 'Bạn có thể chọn bộ lọc khác để xem thông báo.'}</p></section>}</>}
    </div><footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{selectedId != null && <NotificationModal item={detail} loading={detailLoading} error={detailError} onRetry={() => loadDetail(selectedId)} onClose={closeModal} />}</div>;
}
