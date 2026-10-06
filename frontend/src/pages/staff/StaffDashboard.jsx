import { useEffect, useRef, useState } from 'react';
import { getStaffAppointments } from '../../services/staffAppointmentService.js';
import { deduplicateStaffPatients } from '../../services/staffPatientService.js';
import { getStaffVaccinationHistory } from '../../services/staffVaccinationHistoryService.js';
import { Icon } from '../customer/CustomerDashboard';
import './StaffDashboard.css';

const menuItems = [
  { page: 'staff-dashboard', icon: 'overview', label: 'Tổng quan' },
  { page: 'staff-appointments', icon: 'calendar', label: 'Quản lý lịch hẹn' },
  { page: 'staff-patients', icon: 'users', label: 'Tra cứu người tiêm' },
  { page: 'staff-vaccination', icon: 'vaccine', label: 'Ghi nhận tiêm chủng' },
  { page: 'staff-history', icon: 'history', label: 'Lịch sử tiêm' },
];

const actions = [
  { page: 'staff-appointments', icon: 'calendar', title: 'Quản lý lịch hẹn', description: 'Xem và xác nhận lịch' },
  { page: 'staff-patients', icon: 'users', title: 'Tra cứu người tiêm', description: 'Tìm hồ sơ người tiêm' },
  { page: 'staff-vaccination', icon: 'vaccine', title: 'Ghi nhận tiêm chủng', description: 'Ghi nhận mũi tiêm mới' },
  { page: 'staff-history', icon: 'history', title: 'Lịch sử tiêm', description: 'Tra cứu các mũi đã ghi nhận' },
];

const statusLabels = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
};

function displayDate(value) {
  if (!value) return 'Không có';
  const [year, month, day] = String(value).split(/[T ]/)[0].split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function displayDateTime(value) {
  if (!value) return 'Không có';
  const [datePart, timePart = ''] = String(value).split(/[T ]/);
  return `${displayDate(datePart)}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
}

function appointmentItems(appointment) {
  return appointment.items.map((item) => `${item.ten_vac_xin} · ${item.ten_mui || `Mũi ${item.so_thu_tu_mui}`}`).join(', ');
}

export function StaffSidebar({ onNavigate, activePage = 'staff-dashboard' }) {
  const [open, setOpen] = useState(false);
  return <aside className="cd-sidebar"><div className="cd-brand"><span className="cd-brand-mark"><Icon name="shield" /></span><span>TIÊM CHỦNG<strong>CARE</strong></span></div><button type="button" className="cd-mobile-toggle" aria-expanded={open} aria-controls="staff-navigation" onClick={() => setOpen(!open)}><Icon name="menu" />Menu</button><div id="staff-navigation" className={`cd-navigation${open ? ' cd-navigation-open' : ''}`}><p className="cd-nav-label">KHÔNG GIAN NHÂN VIÊN</p><nav aria-label="Menu nhân viên">{menuItems.map((item) => <button type="button" key={item.page} className={`cd-nav-item${item.page === activePage ? ' cd-nav-active' : ''}`} aria-current={item.page === activePage ? 'page' : undefined} onClick={() => { onNavigate?.(item.page); setOpen(false); }}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav><div className="cd-sidebar-bottom"><button className="cd-nav-item" type="button" onClick={() => onNavigate?.('logout')}><Icon name="logout" /><span>Đăng xuất</span></button><p>TIÊM CHỦNG CARE<span>Chăm sóc sức khỏe cộng đồng</span></p></div></div></aside>;
}

export function StaffHeader({ onNotifications, currentUser }) {
  const name = currentUser?.ho_ten || '';
  const role = currentUser?.vai_tro || '';
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  return <header className="cd-header"><div className="cd-greeting"><p>Xin chào, <strong>{name}</strong></p><span>Chúc bạn một ngày làm việc hiệu quả!</span></div><div className="cd-header-account"><button className="cd-notification-button" type="button" aria-label="Xem thông báo" onClick={onNotifications}><Icon name="bell" /></button><span className="cd-avatar">{initials}</span><div className="cd-account-name"><strong>{name}</strong><span>{role}</span></div></div></header>;
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
  const fields = appointment ? [
    ['Mã lịch hẹn', appointment.ma_lich_hen],
    ['Người tiêm', appointment.ho_ten],
    ['Ngày hẹn', displayDate(appointment.ngay_hen)],
    ['Giờ hẹn', appointment.gio_hen.slice(0, 5)],
    ['Mũi tiêm', appointmentItems(appointment)],
    ['Trạng thái', statusLabels[appointment.trang_thai] || appointment.trang_thai],
  ] : [];
  return <dialog ref={ref} className="sd-modal" aria-labelledby="sd-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><header><h2 id="sd-modal-title">{appointment ? 'Chi tiết lịch hẹn' : 'Thông báo'}</h2><button type="button" className="sd-close" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>{appointment ? <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <div className="sd-empty-message">Chưa có thông báo dành cho nhân viên.</div>}<footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></dialog>;
}

export default function StaffDashboard({ currentUser, onNavigate }) {
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [detail, setDetail] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getStaffAppointments(), getStaffVaccinationHistory()])
      .then(([appointmentResult, historyResult]) => {
        if (!active) return;
        if (appointmentResult.status === 'fulfilled') {
          setAppointments(Array.isArray(appointmentResult.value) ? appointmentResult.value : []);
        } else {
          setAppointments([]);
          setAppointmentsError(appointmentResult.reason?.message || 'Không thể tải dữ liệu lịch hẹn.');
        }
        if (historyResult.status === 'fulfilled') {
          setHistory(Array.isArray(historyResult.value) ? historyResult.value : []);
        } else {
          setHistory([]);
          setHistoryError(historyResult.reason?.message || 'Không thể tải lịch sử tiêm.');
        }
      })
      .finally(() => {
        if (active) { setAppointmentsLoading(false); setHistoryLoading(false); }
      });
    return () => { active = false; };
  }, [reloadKey]);

  const pendingCount = appointments.filter((item) => item.trang_thai === 'CHO_XAC_NHAN').length;
  const confirmedCount = appointments.filter((item) => item.trang_thai === 'DA_XAC_NHAN').length;
  const patients = deduplicateStaffPatients(appointments);
  const actionableAppointments = appointments
    .filter((item) => ['CHO_XAC_NHAN', 'DA_XAC_NHAN'].includes(item.trang_thai))
    .sort((left, right) => `${left.ngay_hen}T${left.gio_hen}`.localeCompare(`${right.ngay_hen}T${right.gio_hen}`))
    .slice(0, 5);
  const recentHistory = history.slice(0, 5);
  const statistics = [
    { label: 'Tổng lịch hẹn', value: appointmentsLoading || appointmentsError ? '—' : appointments.length, caption: appointmentsError || 'Tất cả trạng thái', icon: 'calendar' },
    { label: 'Chờ xác nhận', value: appointmentsLoading || appointmentsError ? '—' : pendingCount, caption: appointmentsError || 'Cần nhân viên xử lý', icon: 'clock' },
    { label: 'Đã xác nhận', value: appointmentsLoading || appointmentsError ? '—' : confirmedCount, caption: appointmentsError || 'Sẵn sàng ghi nhận tiêm', icon: 'check' },
    { label: 'Mũi đã ghi nhận', value: historyLoading || historyError ? '—' : history.length, caption: historyError || 'Từ lịch sử tiêm', icon: 'vaccine' },
  ];

  function retryDashboard() {
    setAppointmentsLoading(true);
    setHistoryLoading(true);
    setAppointmentsError('');
    setHistoryError('');
    setReloadKey((value) => value + 1);
  }

  const allFailed = appointmentsError && historyError;
  return <div className="customer-dashboard staff-dashboard"><a href="#staff-main" className="cd-skip-link">Đến nội dung chính</a><StaffSidebar onNavigate={onNavigate} /><div className="cd-workspace"><StaffHeader currentUser={currentUser} onNotifications={() => setDetail({ type: 'notice' })} /><main id="staff-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading"><h1>Tổng quan</h1><p>Theo dõi lịch hẹn và hoạt động tiêm chủng</p></div>
    {allFailed && <div className="sd-dashboard-error" role="alert"><span>Không thể tải dữ liệu Dashboard.</span><button type="button" className="cd-button" onClick={retryDashboard}>Thử lại</button></div>}
    <section className="cd-statistics" aria-label="Thống kê hoạt động">{statistics.map((item) => <article className="cd-stat-card" key={item.label}><div className="cd-stat-top"><h2>{item.label}</h2><span className="cd-icon-box"><Icon name={item.icon} /></span></div><strong className="cd-stat-value">{item.value}</strong><p>{item.caption}</p></article>)}</section>
    <div className="cd-content-grid"><div className="cd-content-column">
      <section className="cd-panel" aria-labelledby="sd-appointments-title"><div className="cd-section-heading"><h2 id="sd-appointments-title">Lịch hẹn cần xử lý</h2><button type="button" className="cd-text-button" onClick={() => onNavigate?.('staff-appointments')}>Xem tất cả<Icon name="arrow" /></button></div>
        {appointmentsLoading ? <p className="sd-section-state" role="status">Đang tải lịch hẹn...</p> : appointmentsError ? <div className="sd-section-state sd-error" role="alert"><p>{appointmentsError}</p><button type="button" className="cd-button" onClick={retryDashboard}>Thử lại</button></div> : actionableAppointments.length ? <ul className="sd-appointments">{actionableAppointments.map((item) => <li key={item.ma_lich_hen}><time className="sd-time"><span>{item.gio_hen.slice(0, 5)}</span><small>{displayDate(item.ngay_hen)}</small></time><div className="sd-appointment-body"><h3>{item.ho_ten}</h3><p>{appointmentItems(item)}</p><span className={`cd-badge${item.trang_thai === 'CHO_XAC_NHAN' ? ' sd-pending' : ''}`}>{statusLabels[item.trang_thai]}</span><div className="sd-row-actions"><button type="button" className="cd-text-button" onClick={() => setDetail({ type: 'appointment', appointment: item })}>Xem chi tiết<Icon name="arrow" /></button></div></div></li>)}</ul> : <p className="sd-section-state">Chưa có lịch hẹn cần xử lý.</p>}
      </section>
      <section className="cd-panel" aria-labelledby="sd-activity-title"><div className="cd-section-heading"><h2 id="sd-activity-title">Hoạt động tiêm gần đây</h2><button type="button" className="cd-text-button" onClick={() => onNavigate?.('staff-history')}>Xem lịch sử<Icon name="arrow" /></button></div>
        {historyLoading ? <p className="sd-section-state" role="status">Đang tải lịch sử tiêm...</p> : historyError ? <div className="sd-section-state sd-error" role="alert"><p>{historyError}</p><button type="button" className="cd-button" onClick={retryDashboard}>Thử lại</button></div> : recentHistory.length ? <ul className="sd-activities">{recentHistory.map((item) => <li key={item.ma_lich_su}><time>{displayDateTime(item.ngay_tiem)}</time><span className="sd-activity-icon"><Icon name="vaccine" /></span><div><strong>{item.ten_vac_xin} · Mũi {item.so_thu_tu_mui}</strong><p>{item.ho_ten_nguoi_tiem}</p></div></li>)}</ul> : <p className="sd-section-state">Chưa có lịch sử tiêm chủng.</p>}
      </section>
    </div><div className="cd-content-column">
      <section className="cd-panel" aria-labelledby="sd-actions-title"><div className="cd-section-heading"><h2 id="sd-actions-title">Thao tác nhanh</h2></div><div className="cd-actions">{actions.map((item) => <button className="cd-action" key={item.page} type="button" onClick={() => onNavigate?.(item.page)}><span className="cd-icon-box"><Icon name={item.icon} /></span><span className="cd-action-text"><strong>{item.title}</strong><span>{item.description}</span></span><Icon name="arrow" /></button>)}</div></section>
      <section className="cd-panel sd-patient-summary" aria-labelledby="sd-patient-title"><div className="cd-section-heading"><h2 id="sd-patient-title">Người tiêm</h2><span className="cd-icon-box"><Icon name="users" /></span></div>{appointmentsLoading ? <p className="sd-section-state" role="status">Đang tải...</p> : appointmentsError ? <p className="sd-section-state sd-error">Không thể tải số người tiêm.</p> : <><strong>{patients.length}</strong><p>Hồ sơ duy nhất xuất hiện trong lịch hẹn</p></>}<button type="button" className="cd-text-button" onClick={() => onNavigate?.('staff-patients')}>Tra cứu người tiêm<Icon name="arrow" /></button></section>
    </div></div>
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div>{detail && <DetailModal appointment={detail.type === 'appointment' ? detail.appointment : null} onClose={() => setDetail(null)} />}</div>;
}
