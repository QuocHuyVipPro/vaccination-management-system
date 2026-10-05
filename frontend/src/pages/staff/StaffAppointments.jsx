import { useEffect, useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import { StaffSidebar, StaffHeader, DetailModal } from './StaffDashboard';
import './StaffAppointments.css';

import { initialAppointments } from './staffMockData';
const statuses = { pending: { label: 'Chờ xác nhận', databaseValue: 'CHO_XAC_NHAN' }, confirmed: { label: 'Đã xác nhận', databaseValue: 'DA_XAC_NHAN' }, completed: { label: 'Hoàn thành', databaseValue: 'HOAN_THANH' }, cancelled: { label: 'Đã hủy', databaseValue: 'DA_HUY' } };
function normalize(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim(); }
function filterAppointments(items, status, date, search) {
  return items.filter((item) => (status === 'all' || item.status === status) && (!date || item.date.split('/').reverse().join('-') === date) && normalize(`${item.id} ${item.patientName} ${item.vaccine}`).includes(normalize(search)));
}
function confirmAppointment(items, id) { return items.map((item) => item.id === id && item.status === 'pending' ? { ...item, status: 'confirmed' } : item); }
function todayInVietnam() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
}
function Badge({ status }) { return <span className={`sa-badge sa-${status}`}>{statuses[status].label}</span>; }
function AppointmentModal({ item, mode, onClose, onConfirm }) {
  const ref = useRef(null);
  const confirming = mode === 'confirm';
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const groups = confirming ? [{ title: '', fields: [['Mã lịch', item.id], ['Người tiêm', item.patientName], ['Vắc xin', item.vaccine], ['Mũi', item.dose], ['Ngày', item.date], ['Giờ', item.time]] }] : [
    { title: 'Mã lịch hẹn', fields: [['Mã lịch', item.id], ['Trạng thái', statuses[item.status].label]] },
    { title: 'Thông tin người tiêm', fields: [['Họ tên', item.patientName], ['Ngày sinh', item.dateOfBirth], ['Số điện thoại', item.phone]] },
    { title: 'Thông tin tiêm', fields: [['Vắc xin', item.vaccine], ['Mũi', item.dose]] },
    { title: 'Thời gian', fields: [['Ngày hẹn', item.date], ['Giờ hẹn', item.time], ['Ngày đăng ký', item.createdAt], ['Ghi chú', item.note || 'Không có ghi chú']] },
  ];
  return <dialog ref={ref} className="sa-modal" aria-labelledby="sa-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><header><h2 id="sa-modal-title">{confirming ? 'Xác nhận lịch hẹn' : 'CHI TIẾT LỊCH HẸN'}</h2><button className="sa-close" type="button" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header><div className="sa-modal-body">{confirming && <p className="sa-question">Xác nhận lịch tiêm này?</p>}{groups.map((group) => <section key={group.title}>{group.title && <h3>{group.title}</h3>}<dl>{group.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}</div><footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button>{confirming && <button type="button" className="cd-button cd-button-primary" onClick={onConfirm}>Xác nhận lịch</button>}</footer></dialog>;
}

export default function StaffAppointments({ onNavigate, appointments: savedAppointments, setAppointments }) {
  const [localAppointments, setLocalAppointments] = useState(initialAppointments);
  const appointments = savedAppointments ?? localAppointments;
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [message, setMessage] = useState('');
  const visible = filterAppointments(appointments, status, date, search);
  const selected = appointments.find((item) => item.id === modal?.id);
  const statistics = [['all', 'Tất cả lịch hẹn', 'calendar'], ['pending', 'Chờ xác nhận', 'clock'], ['confirmed', 'Đã xác nhận', 'check'], ['completed', 'Hoàn thành', 'shield']];
  function confirm() {
    if (!selected || selected.status !== 'pending') return;
    const update = (current) => confirmAppointment(current ?? initialAppointments, selected.id);
    (setAppointments || setLocalAppointments)(update);
    setMessage(`Đã xác nhận lịch ${selected.id}.`); setModal(null);
  }
  return <div className="customer-dashboard staff-dashboard staff-appointments"><a href="#sa-main" className="cd-skip-link">Đến nội dung chính</a><StaffSidebar activePage="staff-appointments" onNavigate={onNavigate} /><div className="cd-workspace"><StaffHeader onNotifications={() => setShowAlerts(true)} /><main id="sa-main" className="cd-main" tabIndex={-1}><div className="cd-page-heading"><h1>Quản lý lịch hẹn</h1><p>Xem, xác nhận và theo dõi các lịch tiêm chủng</p></div><section className="cd-statistics" aria-label="Thống kê lịch hẹn">{statistics.map(([key, label, icon]) => <article className="cd-stat-card" key={key}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name={icon} /></span></div><strong className="cd-stat-value">{key === 'all' ? appointments.length : appointments.filter((item) => item.status === key).length}</strong></article>)}</section><section className="cd-panel sa-filters" aria-label="Lọc lịch hẹn"><div className="sa-tabs" role="group" aria-label="Trạng thái">{[['all', 'Tất cả'], ...Object.entries(statuses).map(([key, value]) => [key, value.label])].map(([key, label]) => <button type="button" key={key} className={status === key ? 'sa-tab-active' : ''} aria-pressed={status === key} onClick={() => setStatus(key)}>{label}</button>)}</div><div className="sa-filter-grid"><div><label htmlFor="sa-date">Ngày hẹn</label><div className="sa-date-controls"><input id="sa-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button type="button" className="cd-button" onClick={() => setDate(todayInVietnam())}>Hôm nay</button></div></div><div><label htmlFor="sa-search">Tìm lịch hẹn</label><input id="sa-search" type="search" placeholder="Tìm theo mã lịch, tên người tiêm hoặc vắc xin..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></div></section><p className="sa-count" role="status">{message && `${message} `}Hiển thị {visible.length} lịch hẹn</p>{visible.length ? <div className="sa-table-card"><table className="sa-table"><caption>Danh sách lịch hẹn tiêm chủng</caption><thead><tr>{['Mã lịch', 'Người tiêm', 'Vắc xin', 'Ngày', 'Giờ', 'Trạng thái', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((item) => <tr key={item.id} data-status={item.status}><td data-label="Mã lịch" className="sa-id">{item.id}</td><td data-label="Người tiêm"><strong>{item.patientName}</strong><small>{item.dateOfBirth}</small></td><td data-label="Vắc xin"><strong>{item.vaccine}</strong><small>{item.dose}</small></td><td data-label="Ngày">{item.date}</td><td data-label="Giờ">{item.time}</td><td data-label="Trạng thái"><Badge status={item.status} /></td><td data-label="Thao tác"><div className="sa-actions">{item.status === 'pending' && <button type="button" className="cd-button cd-button-primary sa-confirm" onClick={() => setModal({ mode: 'confirm', id: item.id })}>Xác nhận</button>}<button type="button" className="cd-text-button sa-view" onClick={() => setModal({ mode: 'view', id: item.id })}>Xem chi tiết</button>{item.status === 'confirmed' && <button type="button" className="cd-button sa-record" onClick={() => onNavigate?.('staff-vaccination', { appointmentId: item.id })}>Ghi nhận tiêm</button>}</div></td></tr>)}</tbody></table></div> : <section className="cd-panel sa-empty"><span className="cd-icon-box"><Icon name="calendar" /></span><h2>{appointments.length ? 'Không tìm thấy lịch hẹn phù hợp' : 'Chưa có lịch hẹn'}</h2></section>}<footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{selected && <AppointmentModal item={selected} mode={modal.mode} onClose={() => setModal(null)} onConfirm={confirm} />}{showAlerts && <DetailModal onClose={() => setShowAlerts(false)} />}</div>;
}

