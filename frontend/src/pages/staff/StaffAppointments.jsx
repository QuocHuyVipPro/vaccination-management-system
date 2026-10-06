import { useCallback, useEffect, useRef, useState } from 'react';
import { confirmStaffAppointment, getStaffAppointment, getStaffAppointments } from '../../services/staffAppointmentService.js';
import { Icon } from '../customer/CustomerDashboard';
import { StaffSidebar, StaffHeader, DetailModal } from './StaffDashboard';
import './StaffAppointments.css';

const statuses = {
  CHO_XAC_NHAN: { label: 'Chờ xác nhận', className: 'pending' },
  DA_XAC_NHAN: { label: 'Đã xác nhận', className: 'confirmed' },
  HOAN_THANH: { label: 'Hoàn thành', className: 'completed' },
  DA_HUY: { label: 'Đã hủy', className: 'cancelled' },
};

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  const [datePart, timePart = ''] = value.split(/[T ]/);
  return `${formatDate(datePart)}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
}

function vaccineNames(item) {
  return item.items?.length ? item.items.map((entry) => entry.ten_vac_xin).join(', ') : 'Chưa có thông tin vắc xin';
}

function doseNames(item) {
  return item.items?.length
    ? item.items.map((entry) => entry.ten_mui || `Mũi ${entry.so_thu_tu_mui}`).join(', ')
    : 'Chưa có thông tin mũi tiêm';
}

function filterAppointments(items, date, search) {
  const keyword = normalize(search);
  return items.filter((item) => {
    if (date && item.ngay_hen !== date) return false;
    return !keyword || normalize(`${item.ma_lich_hen} ${item.ho_ten} ${item.so_dien_thoai} ${vaccineNames(item)}`).includes(keyword);
  });
}

function todayInVietnam() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
}

function statusLabel(status) {
  return statuses[status]?.label || status || 'Chưa xác định';
}

function Badge({ status }) {
  const className = statuses[status]?.className || 'unknown';
  return <span className={`sa-badge sa-${className}`}>{statusLabel(status)}</span>;
}

function appointmentGroups(item) {
  return [
    { title: 'Lịch hẹn', fields: [['Mã lịch', item.ma_lich_hen], ['Mã hồ sơ', item.ma_ho_so], ['Trạng thái', statusLabel(item.trang_thai)]] },
    { title: 'Thông tin người tiêm', fields: [['Họ tên', item.ho_ten], ['Ngày sinh', formatDate(item.ngay_sinh)], ['Giới tính', item.gioi_tinh || 'Chưa cập nhật'], ['Số điện thoại', item.so_dien_thoai || 'Chưa cập nhật']] },
    { title: 'Thông tin tiêm', fields: [['Vắc xin', vaccineNames(item)], ['Mũi tiêm', doseNames(item)]] },
    { title: 'Thời gian', fields: [['Ngày hẹn', formatDate(item.ngay_hen)], ['Giờ hẹn', item.gio_hen?.slice(0, 5) || 'Chưa cập nhật'], ['Ngày đăng ký', formatDateTime(item.ngay_tao)], ['Ghi chú', item.ghi_chu || 'Không có ghi chú']] },
  ];
}

function AppointmentModal({ item, mode, loading, error, confirming, onClose, onRetry, onConfirm }) {
  const ref = useRef(null);
  const isConfirm = mode === 'confirm';
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);

  return <dialog ref={ref} className="sa-modal" aria-labelledby="sa-modal-title" onCancel={(event) => { event.preventDefault(); if (!confirming) onClose(); }}>
    <header><h2 id="sa-modal-title">{isConfirm ? 'Xác nhận lịch hẹn' : 'CHI TIẾT LỊCH HẸN'}</h2><button className="sa-close" type="button" disabled={confirming} aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>
    {loading ? <p className="sa-modal-state" role="status">Đang tải chi tiết lịch hẹn...</p> : error && !isConfirm ? <div className="sa-modal-state sa-request-error" role="alert"><p>{error}</p><button type="button" className="cd-button" onClick={onRetry}>Thử lại</button></div> : item && <div className="sa-modal-body">{isConfirm && <p className="sa-question">Bạn có chắc muốn xác nhận lịch hẹn này?</p>}{error && <p className="sa-action-error" role="alert">{error}</p>}{appointmentGroups(item).map((group) => <section key={group.title}><h3>{group.title}</h3><dl>{group.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}</div>}
    <footer><button type="button" className="cd-button" disabled={confirming} onClick={onClose}>Đóng</button>{isConfirm && <button type="button" className="cd-button cd-button-primary" disabled={confirming} onClick={onConfirm}>{confirming ? 'Đang xác nhận...' : 'Xác nhận lịch'}</button>}</footer>
  </dialog>;
}

export default function StaffAppointments({ currentUser, onNavigate }) {
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const confirmLockRef = useRef(false);

  const loadAppointments = useCallback(async (nextStatus) => {
    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;
    await Promise.resolve();
    if (requestId !== listRequestRef.current) return;
    setLoading(true);
    setError('');
    try {
      const result = await getStaffAppointments({ trangThai: nextStatus === 'all' ? undefined : nextStatus });
      if (requestId !== listRequestRef.current) return;
      const records = Array.isArray(result) ? result : [];
      setAppointments(records);
      if (nextStatus === 'all') setAllAppointments(records);
    } catch (requestError) {
      if (requestId === listRequestRef.current) {
        setAppointments([]);
        setError(requestError.message || 'Không thể tải danh sách lịch hẹn.');
      }
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getStaffAppointments()
      .then((result) => {
        if (!active) return;
        const records = Array.isArray(result) ? result : [];
        setAppointments(records);
        setAllAppointments(records);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Không thể tải danh sách lịch hẹn.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      listRequestRef.current += 1;
      detailRequestRef.current += 1;
    };
  }, []);

  function changeStatus(nextStatus) {
    setStatus(nextStatus);
    setMessage('');
    loadAppointments(nextStatus);
  }

  async function loadDetail(appointmentId) {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setDetailLoading(true);
    setDetailError('');
    try {
      const result = await getStaffAppointment(appointmentId);
      if (requestId === detailRequestRef.current) setDetail(result);
    } catch (requestError) {
      if (requestId === detailRequestRef.current) setDetailError(requestError.message || 'Không thể tải chi tiết lịch hẹn.');
    } finally {
      if (requestId === detailRequestRef.current) setDetailLoading(false);
    }
  }

  function openDetail(item) {
    setDetail(null);
    setDetailError('');
    setModal({ mode: 'view', id: item.ma_lich_hen });
    loadDetail(item.ma_lich_hen);
  }

  function openConfirm(item) {
    setConfirmError('');
    setModal({ mode: 'confirm', id: item.ma_lich_hen });
  }

  function updateConfirmed(updated) {
    const replace = (items) => items.map((item) => item.ma_lich_hen === updated.ma_lich_hen ? updated : item);
    setAllAppointments(replace);
    setAppointments((current) => status === 'CHO_XAC_NHAN'
      ? current.filter((item) => item.ma_lich_hen !== updated.ma_lich_hen)
      : replace(current));
  }

  async function confirmAppointment() {
    const selected = appointments.find((item) => item.ma_lich_hen === modal?.id);
    if (!selected || selected.trang_thai !== 'CHO_XAC_NHAN' || confirmLockRef.current) return;
    confirmLockRef.current = true;
    setConfirmingId(selected.ma_lich_hen);
    setConfirmError('');
    try {
      const updated = await confirmStaffAppointment(selected.ma_lich_hen);
      updateConfirmed(updated);
      setMessage(`Đã xác nhận lịch ${updated.ma_lich_hen}.`);
      setModal(null);
    } catch (requestError) {
      setConfirmError(requestError.message || 'Không thể xác nhận lịch hẹn.');
    } finally {
      confirmLockRef.current = false;
      setConfirmingId(null);
    }
  }

  function closeModal() {
    if (confirmingId != null) return;
    detailRequestRef.current += 1;
    setModal(null);
    setDetail(null);
    setDetailError('');
    setConfirmError('');
    setDetailLoading(false);
  }

  const visible = filterAppointments(appointments, date, search);
  const selectedListItem = appointments.find((item) => item.ma_lich_hen === modal?.id);
  const modalItem = modal?.mode === 'view' ? detail : selectedListItem;
  const statistics = [
    ['all', 'Tất cả lịch hẹn', 'calendar'],
    ['CHO_XAC_NHAN', 'Chờ xác nhận', 'clock'],
    ['DA_XAC_NHAN', 'Đã xác nhận', 'check'],
    ['HOAN_THANH', 'Hoàn thành', 'shield'],
  ];

  return <div className="customer-dashboard staff-dashboard staff-appointments"><a href="#sa-main" className="cd-skip-link">Đến nội dung chính</a><StaffSidebar activePage="staff-appointments" onNavigate={onNavigate} /><div className="cd-workspace"><StaffHeader currentUser={currentUser} onNotifications={() => setShowAlerts(true)} /><main id="sa-main" className="cd-main" tabIndex={-1}><div className="cd-page-heading"><h1>Quản lý lịch hẹn</h1><p>Xem, xác nhận và theo dõi các lịch tiêm chủng</p></div>
    {error && <div className="sa-page-error" role="alert"><span>{error}</span><button type="button" className="cd-button" onClick={() => loadAppointments(status)}>Thử lại</button></div>}
    <section className="cd-statistics" aria-label="Thống kê lịch hẹn">{statistics.map(([key, label, icon]) => <article className="cd-stat-card" key={key}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name={icon} /></span></div><strong className="cd-stat-value">{key === 'all' ? allAppointments.length : allAppointments.filter((item) => item.trang_thai === key).length}</strong></article>)}</section>
    <section className="cd-panel sa-filters" aria-label="Lọc lịch hẹn"><div className="sa-tabs" role="group" aria-label="Trạng thái">{[['all', 'Tất cả'], ...Object.entries(statuses).map(([key, value]) => [key, value.label])].map(([key, label]) => <button type="button" key={key} className={status === key ? 'sa-tab-active' : ''} aria-pressed={status === key} disabled={loading} onClick={() => changeStatus(key)}>{label}</button>)}</div><div className="sa-filter-grid"><div><label htmlFor="sa-date">Ngày hẹn</label><div className="sa-date-controls"><input id="sa-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button type="button" className="cd-button" onClick={() => setDate(todayInVietnam())}>Hôm nay</button></div></div><div><label htmlFor="sa-search">Tìm lịch hẹn</label><input id="sa-search" type="search" placeholder="Tìm theo mã lịch, tên, số điện thoại hoặc vắc xin..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></div></section>
    {loading ? <section className="cd-panel sa-empty" role="status"><span className="cd-icon-box"><Icon name="calendar" /></span><h2>Đang tải lịch hẹn...</h2><p>Vui lòng chờ trong giây lát.</p></section> : !error && <><p className="sa-count" role="status">{message && `${message} `}Hiển thị {visible.length} lịch hẹn</p>{visible.length ? <div className="sa-table-card"><table className="sa-table"><caption>Danh sách lịch hẹn tiêm chủng</caption><thead><tr>{['Mã lịch', 'Người tiêm', 'Vắc xin', 'Ngày', 'Giờ', 'Trạng thái', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((item) => <tr key={item.ma_lich_hen} data-status={item.trang_thai}><td data-label="Mã lịch" className="sa-id">{item.ma_lich_hen}</td><td data-label="Người tiêm"><strong>{item.ho_ten}</strong><small>{formatDate(item.ngay_sinh)}{item.so_dien_thoai ? ` · ${item.so_dien_thoai}` : ''}</small></td><td data-label="Vắc xin"><strong>{vaccineNames(item)}</strong><small>{doseNames(item)}</small></td><td data-label="Ngày">{formatDate(item.ngay_hen)}</td><td data-label="Giờ">{item.gio_hen?.slice(0, 5) || '—'}</td><td data-label="Trạng thái"><Badge status={item.trang_thai} /></td><td data-label="Thao tác"><div className="sa-actions">{item.trang_thai === 'CHO_XAC_NHAN' && <button type="button" className="cd-button cd-button-primary sa-confirm" disabled={confirmingId === item.ma_lich_hen} onClick={() => openConfirm(item)}>Xác nhận</button>}<button type="button" className="cd-text-button sa-view" onClick={() => openDetail(item)}>Xem chi tiết</button></div></td></tr>)}</tbody></table></div> : <section className="cd-panel sa-empty"><span className="cd-icon-box"><Icon name="calendar" /></span><h2>{appointments.length ? 'Không tìm thấy lịch hẹn phù hợp' : 'Chưa có lịch hẹn.'}</h2><p>{appointments.length ? 'Thử thay đổi ngày hoặc từ khóa tìm kiếm.' : 'Danh sách sẽ hiển thị khi có lịch hẹn phù hợp.'}</p></section>}</>}
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{modal && <AppointmentModal item={modalItem} mode={modal.mode} loading={modal.mode === 'view' && detailLoading} error={modal.mode === 'view' ? detailError : confirmError} confirming={confirmingId === modal.id} onClose={closeModal} onRetry={() => loadDetail(modal.id)} onConfirm={confirmAppointment} />}{showAlerts && <DetailModal onClose={() => setShowAlerts(false)} />}</div>;
}
