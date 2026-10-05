import { useEffect, useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import { StaffSidebar, StaffHeader, DetailModal } from './StaffDashboard';
import './StaffPatients.css';

// Profile fields correspond to ho_so_nguoi_tiem; counts/dates are demo aggregates.
import { initialPatients } from './staffMockData';

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
}
function initials(name) {
  const words = name.trim().split(/\s+/);
  return `${words[0][0]}${words.length > 1 ? words.at(-1)[0] : ''}`.toLocaleUpperCase('vi');
}

function PatientModal({ patient, onClose, onNavigate }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const groups = [
    ['Thông tin cá nhân', [['Họ và tên', patient.fullName], ['Ngày sinh', patient.dateOfBirth], ['Giới tính', patient.gender], ['Số điện thoại', patient.phone], ['Địa chỉ', patient.address]]],
    ['Thông tin người giám hộ', [['Người giám hộ', patient.guardian || 'Không có'], ['Mối quan hệ', patient.relationship]]],
    ['Thông tin sức khỏe', [['Dị ứng', patient.allergies || 'Không ghi nhận'], ['Ghi chú sức khỏe', patient.healthNotes || 'Không có ghi chú đặc biệt']]],
    ['Tổng quan tiêm chủng', [['Số mũi đã tiêm', `${patient.vaccinationCount} mũi`], ['Lịch sắp tới', patient.upcomingAppointment || 'Chưa có lịch']]],
  ];
  return <dialog ref={ref} className="sp-modal" aria-labelledby="sp-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id="sp-modal-title">Hồ sơ người tiêm</h2><button type="button" className="sp-close" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>
    <div className="sp-modal-body">{groups.map(([title, fields]) => <section key={title}><h3>{title}</h3><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}</div>
    <footer>
      <button type="button" className="cd-button" onClick={onClose}>Đóng</button>
      <button type="button" className="cd-button sp-history" onClick={() => onNavigate?.('staff-history', { patientId: patient.id })}>Xem lịch sử tiêm</button>
      <button type="button" className="cd-button cd-button-primary sp-record" onClick={() => onNavigate?.('staff-vaccination', { patientId: patient.id })}>Ghi nhận tiêm chủng</button>
    </footer>
  </dialog>;
}

export default function StaffPatients({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const query = normalize(search);
  const phoneQuery = query.replace(/[\s().-]/g, '');
  const visible = initialPatients.filter((patient) => (gender === 'all' || patient.gender === gender) &&
    (!query || normalize(patient.fullName).includes(query) || (/^\d+$/.test(phoneQuery) && patient.phone.includes(phoneQuery))));
  const statistics = [
    ['Tổng hồ sơ', initialPatients.length, 'users'],
    ['Có lịch sắp tới', initialPatients.filter((patient) => patient.upcomingAppointment).length, 'calendar'],
    ['Đã từng tiêm', initialPatients.filter((patient) => patient.vaccinationCount > 0).length, 'vaccine'],
  ];
  return <div className="customer-dashboard staff-dashboard staff-patients">
    <a href="#sp-main" className="cd-skip-link">Đến nội dung chính</a>
    <StaffSidebar activePage="staff-patients" onNavigate={onNavigate} />
    <div className="cd-workspace"><StaffHeader onNotifications={() => setShowAlerts(true)} />
      <main id="sp-main" className="cd-main" tabIndex={-1}>
        <div className="cd-page-heading"><h1>Tra cứu người tiêm</h1><p>Tìm kiếm và xem thông tin hồ sơ người tiêm chủng</p></div>
        <section className="cd-statistics sp-statistics" aria-label="Thống kê hồ sơ">{statistics.map(([label, count, icon]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name={icon} /></span></div><strong className="cd-stat-value">{count}</strong></article>)}</section>
        <section className="cd-panel sp-filters" aria-label="Tìm kiếm người tiêm">
          <div><label htmlFor="sp-search">Tìm người tiêm</label><div className="sp-search-box"><svg className="cd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input id="sp-search" type="search" placeholder="Tìm theo họ tên, số điện thoại..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
          <div><label htmlFor="sp-gender">Giới tính</label><select id="sp-gender" value={gender} onChange={(event) => setGender(event.target.value)}><option value="all">Tất cả</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
        </section>
        <p className="sp-count" role="status">Hiển thị {visible.length} / {initialPatients.length} hồ sơ</p>
        {visible.length ? <div className="sp-table-card"><table className="sp-table"><caption>Danh sách người tiêm</caption><thead><tr>{['Người tiêm', 'Ngày sinh', 'Giới tính', 'Số điện thoại', 'Số mũi đã tiêm', 'Lịch sắp tới', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((patient) => <tr key={patient.id}>
          <td data-label="Người tiêm"><div className="sp-person"><span className="cd-avatar" aria-hidden="true">{initials(patient.fullName)}</span><div><strong>{patient.fullName}</strong>{patient.guardian && <small>Người giám hộ: {patient.guardian}</small>}</div></div></td>
          <td data-label="Ngày sinh">{patient.dateOfBirth}</td><td data-label="Giới tính">{patient.gender}</td><td data-label="Số điện thoại">{patient.phone}</td><td data-label="Số mũi đã tiêm">{patient.vaccinationCount} mũi</td>
          <td data-label="Lịch sắp tới">{patient.upcomingAppointment ? <span className="sp-upcoming">{patient.upcomingAppointment}</span> : <span className="sp-muted">Chưa có lịch</span>}</td>
          <td data-label="Thao tác"><button type="button" className="cd-text-button sp-view" aria-label={`Xem hồ sơ ${patient.fullName}`} onClick={() => setSelected(patient)}>Xem hồ sơ</button></td>
        </tr>)}</tbody></table></div> : <section className="cd-panel sp-empty"><span className="cd-icon-box"><Icon name="users" /></span><h2>Không tìm thấy người tiêm</h2><p>Vui lòng kiểm tra lại họ tên hoặc số điện thoại.</p></section>}
        <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
      </main>
    </div>
    {selected && <PatientModal patient={selected} onClose={() => setSelected(null)} onNavigate={onNavigate} />}
    {showAlerts && <DetailModal onClose={() => setShowAlerts(false)} />}
  </div>;
}

