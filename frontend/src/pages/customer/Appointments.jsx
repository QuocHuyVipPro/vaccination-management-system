import { useEffect, useRef, useState } from 'react';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import './Appointments.css';

const initialAppointments = [
  { id: 'LH20261008001', patientName: 'Nguyễn Minh Anh', relationship: 'Em', vaccine: 'HPV Gardasil 9', dose: 'Mũi 2', date: '08/10/2026', time: '09:30', status: 'confirmed', createdAt: '02/10/2026', note: '' },
  { id: 'LH20261012002', patientName: 'Nguyễn Văn An', relationship: 'Bản thân', vaccine: 'Vaxigrip Tetra', dose: 'Mũi 1', date: '12/10/2026', time: '14:00', status: 'pending', createdAt: '03/10/2026', note: 'Tiêm phòng cúm mùa' },
  { id: 'LH20260915003', patientName: 'Nguyễn Văn An', relationship: 'Bản thân', vaccine: 'Prevenar 13', dose: 'Mũi 1', date: '15/09/2026', time: '08:30', status: 'completed', createdAt: '10/09/2026', note: '' },
  { id: 'LH20261020004', patientName: 'Nguyễn Minh Anh', relationship: 'Em', vaccine: 'Varivax', dose: 'Mũi 1', date: '20/10/2026', time: '10:00', status: 'confirmed', createdAt: '04/10/2026', note: '' },
];
const statuses = {
  pending: { label: 'Chờ xác nhận', databaseValue: 'CHO_XAC_NHAN', icon: 'clock' },
  confirmed: { label: 'Đã xác nhận', databaseValue: 'DA_XAC_NHAN', icon: 'check' },
  completed: { label: 'Hoàn thành', databaseValue: 'HOAN_THANH', icon: 'shield' },
  cancelled: { label: 'Đã hủy', databaseValue: 'DA_HUY', icon: 'calendar' },
};
function canCancel(item) { return item.status === 'pending' || item.status === 'confirmed'; }
function normalize(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim(); }
function filterAppointments(items, filter, search) {
  return items.filter((item) => (filter === 'all' || item.status === filter) && normalize(`${item.patientName} ${item.vaccine}`).includes(normalize(search))).sort((a, b) => {
    const group = Number(canCancel(b)) - Number(canCancel(a));
    const dateA = `${a.date.split('/').reverse().join('-')}T${a.time}`;
    const dateB = `${b.date.split('/').reverse().join('-')}T${b.time}`;
    return group || dateA.localeCompare(dateB);
  });
}
function cancelAppointment(items, id) { return items.map((item) => item.id === id && canCancel(item) ? { ...item, status: 'cancelled' } : item); }
function StatusBadge({ status }) { return <span className={`ap-badge ap-${status}`}>{statuses[status].label}</span>; }

function AppointmentCard({ item, onView, onCancel }) {
  return <article className="cd-panel ap-card"><header className="ap-card-header"><span className="ap-id">Mã lịch: <strong>{item.id}</strong></span><StatusBadge status={item.status} /></header><div className="ap-card-content"><div><h2>{item.patientName}</h2><span className="cd-relation">{item.relationship}</span></div><div><span className="ap-label">Vắc xin</span><strong>{item.vaccine}</strong><span className="ap-dose">{item.dose}</span></div><div><span className="ap-label"><Icon name="calendar" />Ngày</span><strong>{item.date}</strong></div><div><span className="ap-label"><Icon name="clock" />Giờ</span><strong>{item.time}</strong></div></div><footer className="ap-card-actions"><button className="cd-button" type="button" onClick={onView}>Xem chi tiết<Icon name="arrow" /></button>{canCancel(item) && <button className="cd-button ap-cancel-button" type="button" onClick={onCancel}>Hủy lịch</button>}</footer></article>;
}

function AppointmentModal({ item, mode, onClose, onConfirm }) {
  const ref = useRef(null);
  const cancelling = mode === 'cancel';
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const details = cancelling
    ? [['Người tiêm', item.patientName], ['Vắc xin', item.vaccine], ['Ngày hẹn', item.date], ['Giờ hẹn', item.time]]
    : [['Mã lịch hẹn', item.id], ['Người tiêm', item.patientName], ['Mối quan hệ', item.relationship], ['Vắc xin', item.vaccine], ['Mũi tiêm', item.dose], ['Ngày hẹn', item.date], ['Giờ hẹn', item.time], ['Trạng thái', <StatusBadge key="status" status={item.status} />], ['Ngày đăng ký', item.createdAt], ['Ghi chú', item.note || 'Không có ghi chú']];
  return <dialog className="ap-modal" ref={ref} aria-labelledby="ap-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><header className="ap-modal-header"><h2 id="ap-modal-title">{cancelling ? 'Xác nhận hủy lịch' : 'Chi tiết lịch hẹn'}</h2><button type="button" className="ap-close" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header><div className="ap-modal-body">{cancelling && <p className="ap-confirm-text">Bạn có chắc chắn muốn hủy lịch tiêm này không?</p>}<dl className="ap-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{!cancelling && <aside className="ap-guidance"><h3>Hướng dẫn</h3><ul><li>Vui lòng đến trước giờ hẹn khoảng 15 phút.</li><li>Mang theo giấy tờ cần thiết và thông tin tiêm chủng nếu có.</li><li>Thông báo cho nhân viên y tế nếu có thay đổi về tình trạng sức khỏe.</li></ul></aside>}</div><footer className="ap-modal-footer"><button className="cd-button" type="button" onClick={onClose}>{cancelling ? 'Không, quay lại' : 'Đóng'}</button>{cancelling && <button className="cd-button ap-danger" type="button" onClick={onConfirm}>Hủy lịch</button>}</footer></dialog>;
}

export default function Appointments({ onNavigate, onRegister, appointments: savedAppointments, setAppointments }) {
  const appointments = savedAppointments ?? initialAppointments;
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const visible = filterAppointments(appointments, filter, search);
  const selected = appointments.find((item) => item.id === modal?.id);
  const summary = [{ key: 'all', label: 'Tất cả', icon: 'calendar' }, ...['pending', 'confirmed', 'completed'].map((key) => ({ key, ...statuses[key] }))];
  const register = () => onRegister ? onRegister() : console.log('Đăng ký tiêm');
  function confirmCancel() {
    if (!selected || !canCancel(selected)) return;
    setAppointments((current) => cancelAppointment(current ?? initialAppointments, selected.id));
    setAnnouncement(`Đã hủy lịch ${selected.id}.`);
    setModal(null);
  }
  return <div className="customer-dashboard appointments-page"><a href="#ap-main" className="cd-skip-link">Đến nội dung chính</a><Sidebar activeMenu="calendar" onNavigate={onNavigate} /><div className="cd-workspace"><DashboardHeader customer={{ name: 'Nguyễn Văn An', initials: 'NA' }} /><main className="cd-main" id="ap-main" tabIndex={-1}><div className="cd-page-heading ap-heading"><div><h1>Lịch hẹn</h1><p>Theo dõi và quản lý các lịch tiêm chủng đã đăng ký</p></div><button className="cd-button cd-button-primary" type="button" onClick={register}><Icon name="plus" />Đăng ký tiêm</button></div><section className="cd-statistics" aria-label="Thống kê lịch hẹn">{summary.map((stat) => <article className="cd-stat-card" key={stat.key}><div className="cd-stat-top"><h2>{stat.label}</h2><span className="cd-icon-box"><Icon name={stat.icon} /></span></div><strong className="cd-stat-value">{stat.key === 'all' ? appointments.length : appointments.filter((item) => item.status === stat.key).length}</strong></article>)}</section>
    <section className="cd-panel ap-filters" aria-label="Lọc lịch hẹn"><div className="ap-tabs" role="group" aria-label="Trạng thái lịch hẹn">{[['all', 'Tất cả'], ...Object.entries(statuses).map(([key, value]) => [key, value.label])].map(([key, label]) => <button type="button" key={key} className={filter === key ? 'ap-filter-active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><label htmlFor="ap-search" className="ap-search-label">Tìm lịch hẹn</label><input id="ap-search" className="ap-search" type="search" placeholder="Tìm theo tên người tiêm hoặc vắc xin..." value={search} onChange={(event) => setSearch(event.target.value)} /></section>
    <p className="ap-result-count" role="status">{announcement && `${announcement} `}Hiển thị {visible.length} lịch hẹn</p>
    <section className="ap-list" aria-label="Danh sách lịch hẹn">{visible.map((item) => <AppointmentCard key={item.id} item={item} onView={() => setModal({ mode: 'view', id: item.id })} onCancel={() => setModal({ mode: 'cancel', id: item.id })} />)}{!visible.length && <div className="cd-panel ap-empty"><span className="cd-icon-box"><Icon name="calendar" /></span><h2>{appointments.length ? 'Không tìm thấy lịch hẹn' : 'Bạn chưa có lịch tiêm nào'}</h2><p>{appointments.length ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Đăng ký tiêm để bắt đầu theo dõi lịch hẹn của bạn.'}</p><button type="button" className="cd-button cd-button-primary" onClick={register}>Đăng ký tiêm</button></div>}</section><footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{modal && selected && <AppointmentModal item={selected} mode={modal.mode} onClose={() => setModal(null)} onConfirm={confirmCancel} />}</div>;
}
