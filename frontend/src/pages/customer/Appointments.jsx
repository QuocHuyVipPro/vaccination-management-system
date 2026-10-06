import { useEffect, useRef, useState } from 'react';
import { cancelAppointment, getAppointment, getAppointments } from '../../services/appointmentService.js';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import './Appointments.css';

const statuses = {
  CHO_XAC_NHAN: { label: 'Chờ xác nhận', className: 'pending', icon: 'clock' },
  DA_XAC_NHAN: { label: 'Đã xác nhận', className: 'confirmed', icon: 'check' },
  HOAN_THANH: { label: 'Hoàn thành', className: 'completed', icon: 'shield' },
  DA_HUY: { label: 'Đã hủy', className: 'cancelled', icon: 'calendar' },
};
const cancellableStatuses = new Set(['CHO_XAC_NHAN', 'DA_XAC_NHAN']);

function canCancel(item) { return cancellableStatuses.has(item.trang_thai); }
function normalize(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim(); }
function displayDate(value) { return value?.split('-').reverse().join('/') || 'Chưa cập nhật'; }
function displayTime(value) { return value?.slice(0, 5) || 'Chưa cập nhật'; }
function displayDateTime(value) { return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa cập nhật'; }
function initials(name) { return (name || 'Khách hàng').trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase(); }
function filterAppointments(items, filter, search) {
  const keyword = normalize(search);
  return items.filter((item) => (filter === 'all' || item.trang_thai === filter) && normalize(`${item.ma_lich_hen} ${item.ngay_hen} ${item.gio_hen} ${item.trang_thai} ${item.ghi_chu || ''}`).includes(keyword));
}

function StatusBadge({ status }) {
  const config = statuses[status];
  return <span className={`ap-badge ap-${config?.className || 'unknown'}`}>{config?.label || status || 'Chưa cập nhật'}</span>;
}

function AppointmentCard({ item, cancelling, viewing, onView, onCancel }) {
  return <article className="cd-panel ap-card"><header className="ap-card-header"><span className="ap-id">Mã lịch: <strong>{item.ma_lich_hen}</strong></span><StatusBadge status={item.trang_thai} /></header><div className="ap-card-content"><div><span className="ap-label"><Icon name="calendar" />Ngày hẹn</span><strong>{displayDate(item.ngay_hen)}</strong></div><div><span className="ap-label"><Icon name="clock" />Giờ hẹn</span><strong>{displayTime(item.gio_hen)}</strong></div><div><span className="ap-label">Ghi chú</span><strong>{item.ghi_chu || 'Không có ghi chú'}</strong></div></div><footer className="ap-card-actions"><button className="cd-button" type="button" disabled={viewing || cancelling} onClick={onView}>{viewing ? 'Đang tải...' : 'Xem chi tiết'}{!viewing && <Icon name="arrow" />}</button>{canCancel(item) && <button className="cd-button ap-cancel-button" type="button" disabled={cancelling || viewing} onClick={onCancel}>{cancelling ? 'Đang hủy...' : 'Hủy lịch'}</button>}</footer></article>;
}

function DetailContent({ detail }) {
  const details = [
    ['Mã lịch hẹn', detail.ma_lich_hen],
    ['Ngày hẹn', displayDate(detail.ngay_hen)],
    ['Giờ hẹn', displayTime(detail.gio_hen)],
    ['Trạng thái', <StatusBadge key="status" status={detail.trang_thai} />],
    ['Ngày đăng ký', displayDateTime(detail.ngay_tao)],
    ['Ghi chú', detail.ghi_chu || 'Không có ghi chú'],
  ];
  return <><dl className="ap-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><section className="ap-items"><h3>Vắc xin và mũi tiêm</h3>{detail.items.length ? <ul>{detail.items.map((item) => <li key={item.ma_chi_tiet}><strong>{item.ten_vac_xin}</strong><span>{item.ten_mui || `Mũi ${item.so_thu_tu_mui}`}</span></li>)}</ul> : <p>Lịch hẹn chưa có chi tiết mũi tiêm.</p>}</section><aside className="ap-guidance"><h3>Hướng dẫn</h3><ul><li>Vui lòng đến trước giờ hẹn khoảng 15 phút.</li><li>Mang theo giấy tờ cần thiết và thông tin tiêm chủng nếu có.</li><li>Thông báo cho nhân viên y tế nếu có thay đổi về tình trạng sức khỏe.</li></ul></aside></>;
}

function AppointmentModal({ mode, item, detail, loading, error, cancelling, onClose, onRetry, onConfirm }) {
  const ref = useRef(null);
  const isCancel = mode === 'cancel';
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog className="ap-modal" ref={ref} aria-labelledby="ap-modal-title" onCancel={(event) => { event.preventDefault(); if (!cancelling) onClose(); }}><header className="ap-modal-header"><h2 id="ap-modal-title">{isCancel ? 'Xác nhận hủy lịch' : 'Chi tiết lịch hẹn'}</h2><button type="button" className="ap-close" aria-label="Đóng hộp thoại" disabled={cancelling} onClick={onClose}>×</button></header><div className="ap-modal-body">{isCancel ? <><p className="ap-confirm-text">Bạn có chắc chắn muốn hủy lịch tiêm này không?</p><dl className="ap-details"><div><dt>Mã lịch hẹn</dt><dd>{item.ma_lich_hen}</dd></div><div><dt>Ngày và giờ</dt><dd>{displayDate(item.ngay_hen)} · {displayTime(item.gio_hen)}</dd></div><div><dt>Trạng thái hiện tại</dt><dd><StatusBadge status={item.trang_thai} /></dd></div></dl>{error && <p className="ap-modal-error" role="alert">{error}</p>}</> : loading ? <p className="ap-modal-state" role="status">Đang tải chi tiết lịch hẹn...</p> : error ? <div className="ap-modal-state ap-modal-error" role="alert"><p>{error}</p><button type="button" className="cd-button" onClick={onRetry}>Thử lại</button></div> : detail && <DetailContent detail={detail} />}</div><footer className="ap-modal-footer"><button className="cd-button" type="button" disabled={cancelling} onClick={onClose}>{isCancel ? 'Không, quay lại' : 'Đóng'}</button>{isCancel && <button className="cd-button ap-danger" type="button" disabled={cancelling} onClick={onConfirm}>{cancelling ? 'Đang hủy...' : 'Hủy lịch'}</button>}</footer></dialog>;
}

export default function Appointments({ currentUser, onNavigate, onRegister }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const cancelLockRef = useRef(false);
  const visible = filterAppointments(appointments, filter, search);
  const selected = appointments.find((item) => item.ma_lich_hen === modal?.id);
  const summary = [{ key: 'all', label: 'Tất cả', icon: 'calendar' }, ...['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'HOAN_THANH'].map((key) => ({ key, ...statuses[key] }))];

  async function loadAppointments() {
    setLoading(true);
    setError('');
    try {
      const result = await getAppointments();
      setAppointments(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách lịch hẹn.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    getAppointments().then((result) => { if (active) setAppointments(Array.isArray(result) ? result : []); }).catch((requestError) => { if (active) setError(requestError.message || 'Không thể tải danh sách lịch hẹn.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function loadDetail(appointmentId) {
    setDetailLoading(true);
    setDetailError('');
    try {
      setDetail(await getAppointment(appointmentId));
    } catch (requestError) {
      setDetailError(requestError.message || 'Không thể tải chi tiết lịch hẹn.');
    } finally {
      setDetailLoading(false);
      setViewingId(null);
    }
  }
  function openDetail(item) {
    setDetail(null);
    setViewingId(item.ma_lich_hen);
    setModal({ mode: 'view', id: item.ma_lich_hen });
    loadDetail(item.ma_lich_hen);
  }
  function openCancel(item) {
    setCancelError('');
    setModal({ mode: 'cancel', id: item.ma_lich_hen });
  }
  async function confirmCancel() {
    if (!selected || !canCancel(selected) || cancelLockRef.current) return;
    cancelLockRef.current = true;
    setCancellingId(selected.ma_lich_hen);
    setCancelError('');
    try {
      const cancelled = await cancelAppointment(selected.ma_lich_hen);
      setAppointments((current) => current.map((item) => item.ma_lich_hen === cancelled.ma_lich_hen ? { ...item, ...cancelled } : item));
      setAnnouncement(`Đã hủy lịch ${cancelled.ma_lich_hen}.`);
      setModal(null);
    } catch (requestError) {
      setCancelError(requestError.message || 'Không thể hủy lịch hẹn.');
    } finally {
      cancelLockRef.current = false;
      setCancellingId(null);
    }
  }
  function closeModal() {
    if (cancellingId == null) {
      setModal(null);
      setDetail(null);
      setDetailError('');
      setCancelError('');
    }
  }

  const customerName = currentUser?.ho_ten || 'Khách hàng';
  const register = () => onRegister?.();
  return <div className="customer-dashboard appointments-page"><a href="#ap-main" className="cd-skip-link">Đến nội dung chính</a><Sidebar activeMenu="calendar" onNavigate={onNavigate} /><div className="cd-workspace"><DashboardHeader customer={{ name: customerName, initials: initials(customerName) }} /><main className="cd-main" id="ap-main" tabIndex={-1}><div className="cd-page-heading ap-heading"><div><h1>Lịch hẹn</h1><p>Theo dõi và quản lý các lịch tiêm chủng đã đăng ký</p></div><button className="cd-button cd-button-primary" type="button" onClick={register}><Icon name="plus" />Đăng ký tiêm</button></div>
    {error && <div className="ap-page-error" role="alert"><span>{error}</span><button type="button" className="cd-button" onClick={loadAppointments}>Thử lại</button></div>}
    <section className="cd-statistics" aria-label="Thống kê lịch hẹn">{summary.map((stat) => <article className="cd-stat-card" key={stat.key}><div className="cd-stat-top"><h2>{stat.label}</h2><span className="cd-icon-box"><Icon name={stat.icon} /></span></div><strong className="cd-stat-value">{stat.key === 'all' ? appointments.length : appointments.filter((item) => item.trang_thai === stat.key).length}</strong></article>)}</section>
    {!loading && appointments.length > 0 && <section className="cd-panel ap-filters" aria-label="Lọc lịch hẹn"><div className="ap-tabs" role="group" aria-label="Trạng thái lịch hẹn">{[['all', 'Tất cả'], ...Object.entries(statuses).map(([key, value]) => [key, value.label])].map(([key, label]) => <button type="button" key={key} className={filter === key ? 'ap-filter-active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><label htmlFor="ap-search" className="ap-search-label">Tìm lịch hẹn</label><input id="ap-search" className="ap-search" type="search" placeholder="Tìm theo mã lịch hoặc ghi chú..." value={search} onChange={(event) => setSearch(event.target.value)} /></section>}
    {loading ? <section className="cd-panel ap-empty" role="status"><span className="cd-icon-box"><Icon name="calendar" /></span><h2>Đang tải lịch hẹn...</h2><p>Vui lòng chờ trong giây lát.</p></section> : !error && <><p className="ap-result-count" role="status">{announcement && `${announcement} `}Hiển thị {visible.length} lịch hẹn</p><section className="ap-list" aria-label="Danh sách lịch hẹn">{visible.map((item) => <AppointmentCard key={item.ma_lich_hen} item={item} viewing={viewingId === item.ma_lich_hen} cancelling={cancellingId === item.ma_lich_hen} onView={() => openDetail(item)} onCancel={() => openCancel(item)} />)}{!visible.length && <div className="cd-panel ap-empty"><span className="cd-icon-box"><Icon name="calendar" /></span><h2>{appointments.length ? 'Không tìm thấy lịch hẹn' : 'Bạn chưa có lịch hẹn tiêm chủng.'}</h2><p>{appointments.length ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Đăng ký tiêm để bắt đầu theo dõi lịch hẹn của bạn.'}</p><button type="button" className="cd-button cd-button-primary" onClick={register}>Đăng ký tiêm</button></div>}</section></>}
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{modal && selected && <AppointmentModal mode={modal.mode} item={selected} detail={detail} loading={detailLoading} error={modal.mode === 'cancel' ? cancelError : detailError} cancelling={cancellingId === selected.ma_lich_hen} onClose={closeModal} onRetry={() => loadDetail(selected.ma_lich_hen)} onConfirm={confirmCancel} />}</div>;
}
