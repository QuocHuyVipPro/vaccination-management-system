import { useEffect, useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import { StaffSidebar, StaffHeader, DetailModal } from './StaffDashboard';
import { initialPatients } from './staffMockData';
import { todayInVietnam } from './vaccinationState';
import './StaffHistory.css';

// ISO dates support inclusive filtering; display dates are formatted below.
const initialHistory = [
  { id: 'LS0001', patientId: 2, vaccine: 'HPV Gardasil 9', dose: 'Mũi 1', batchNumber: 'HPV240801', vaccinationDate: '2026-08-08', nextDoseDate: '2026-10-08', reaction: 'Không ghi nhận', note: '' },
  { id: 'LS0002', patientId: 1, vaccine: 'Vaxigrip Tetra', dose: 'Mũi 1', batchNumber: 'VAX260301', vaccinationDate: '2026-09-15', nextDoseDate: null, reaction: 'Đau nhẹ tại vị trí tiêm', note: 'Đã ghi nhận phản ứng sau tiêm' },
  { id: 'LS0003', patientId: 3, vaccine: 'Prevenar 13', dose: 'Mũi 1', batchNumber: 'PRE260401', vaccinationDate: '2026-09-20', nextDoseDate: null, reaction: 'Không ghi nhận', note: '' },
  { id: 'LS0004', patientId: 4, vaccine: 'Varivax', dose: 'Mũi 1', batchNumber: 'VAR260501', vaccinationDate: '2026-09-01', nextDoseDate: '2026-10-15', reaction: 'Đỏ nhẹ tại vị trí tiêm', note: '' },
  { id: 'LS0005', patientId: 5, vaccine: 'Varivax', dose: 'Mũi 1', batchNumber: 'VAR260501', vaccinationDate: '2026-09-30', nextDoseDate: '2026-11-30', reaction: 'Không ghi nhận', note: '' },
  { id: 'LS0006', patientId: 6, vaccine: 'Vaxigrip Tetra', dose: 'Mũi 1', batchNumber: 'VAX260301', vaccinationDate: '2026-10-04', nextDoseDate: null, reaction: 'Không ghi nhận', note: 'Đi cùng người giám hộ' },
  { id: 'LS0007', patientId: 1, vaccine: 'Prevenar 13', dose: 'Mũi 1', batchNumber: 'PRE260401', vaccinationDate: '2026-09-29', nextDoseDate: null, reaction: 'Không ghi nhận', note: '' },
  { id: 'LS0008', patientId: 2, vaccine: 'Vaxigrip Tetra', dose: 'Mũi 1', batchNumber: 'VAX260301', vaccinationDate: '2026-05-10', nextDoseDate: null, reaction: 'Đau nhẹ tại vị trí tiêm', note: '' },
].map((record) => {
  const patient = initialPatients.find((item) => item.id === record.patientId);
  return { ...record, patientName: patient.fullName, dateOfBirth: patient.dateOfBirth, staffName: 'Trần Thị Lan' };
});
const displayDate = (value) => value ? value.split('-').reverse().join('/') : 'Không có';
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
const hasReaction = (record) => Boolean(record.reaction?.trim() && normalize(record.reaction) !== 'khong ghi nhan');

function HistoryModal({ record, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const groups = [
    ['Thông tin người tiêm', [['Họ và tên', record.patientName], ['Ngày sinh', record.dateOfBirth]]],
    ['Thông tin tiêm chủng', [['Vắc xin', record.vaccine], ['Mũi tiêm', record.dose], ['Ngày tiêm', displayDate(record.vaccinationDate)]]],
    ['Thông tin lô', [['Số lô', record.batchNumber], ...(record.expiryDate ? [['Hạn sử dụng', displayDate(record.expiryDate)]] : [])]],
    ['Nhân viên thực hiện', [['Họ tên nhân viên', record.staffName]]],
    ['Theo dõi sau tiêm', [['Phản ứng sau tiêm', record.reaction || 'Không ghi nhận'], ['Ghi chú', record.note || 'Không có']]],
    ['Mũi tiếp theo', [['Ngày dự kiến', record.nextDoseDate ? displayDate(record.nextDoseDate) : 'Không có lịch mũi tiếp theo']]],
  ];
  return <dialog ref={ref} className="sh-modal" aria-labelledby="sh-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id="sh-modal-title">CHI TIẾT MŨI TIÊM</h2><button type="button" className="sh-close" aria-label="Đóng chi tiết mũi tiêm" onClick={onClose}>×</button></header>
    <div className="sh-modal-body">{groups.map(([title, fields]) => <section key={title}><h3>{title}</h3><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}</div>
    <footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer>
  </dialog>;
}

export default function StaffHistory({ patientId, records = [], onNavigate }) {
  const [patient, setPatient] = useState(patientId == null ? 'all' : String(patientId));
  const [vaccine, setVaccine] = useState('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const history = [...initialHistory, ...records];
  const patients = [...new Map([...initialPatients.map((item) => [String(item.id), item.fullName]), ...history.map((item) => [String(item.patientId), item.patientName])]).entries()];
  const vaccines = [...new Set(history.map((item) => item.vaccine))];
  const invalidRange = from && to && from > to;
  const visible = history.filter((item) => !invalidRange && (patient === 'all' || String(item.patientId) === patient) && (vaccine === 'all' || item.vaccine === vaccine) && (!from || item.vaccinationDate >= from) && (!to || item.vaccinationDate <= to) && normalize(`${item.patientName} ${item.vaccine} ${item.batchNumber}`).includes(normalize(search)))
    .sort((a, b) => b.vaccinationDate.localeCompare(a.vaccinationDate));
  const statistics = [
    ['Tổng mũi đã ghi nhận', history.length, 'vaccine'],
    ['Tiêm hôm nay', history.filter((item) => item.vaccinationDate === todayInVietnam()).length, 'clock'],
    ['Có lịch mũi tiếp theo', history.filter((item) => item.nextDoseDate).length, 'calendar'],
    ['Có ghi nhận phản ứng', history.filter(hasReaction).length, 'history'],
  ];
  function reset() { setPatient('all'); setVaccine('all'); setSearch(''); setFrom(''); setTo(''); }
  return <div className="customer-dashboard staff-dashboard staff-history">
    <a href="#sh-main" className="cd-skip-link">Đến nội dung chính</a><StaffSidebar activePage="staff-history" onNavigate={onNavigate} />
    <div className="cd-workspace"><StaffHeader onNotifications={() => setShowAlerts(true)} /><main id="sh-main" className="cd-main" tabIndex={-1}>
      <div className="cd-page-heading"><h1>Lịch sử tiêm</h1><p>Tra cứu các mũi tiêm đã được thực hiện</p></div>
      <section className="cd-statistics" aria-label="Thống kê lịch sử tiêm">{statistics.map(([label, value, icon]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name={icon} /></span></div><strong className="cd-stat-value">{value}</strong></article>)}</section>
      <section className="cd-panel sh-filters" aria-label="Lọc lịch sử tiêm">
        <div className="sh-search"><label htmlFor="sh-search">Tìm lịch sử tiêm</label><input id="sh-search" type="search" placeholder="Tìm theo tên người tiêm, vắc xin hoặc số lô..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="sh-filter-grid">
          <div><label htmlFor="sh-patient">Người tiêm</label><select id="sh-patient" value={patient} onChange={(event) => setPatient(event.target.value)}><option value="all">Tất cả</option>{patients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div><label htmlFor="sh-vaccine">Vắc xin</label><select id="sh-vaccine" value={vaccine} onChange={(event) => setVaccine(event.target.value)}><option value="all">Tất cả</option>{vaccines.map((name) => <option key={name}>{name}</option>)}</select></div>
          <div><label htmlFor="sh-from">Từ ngày</label><input id="sh-from" type="date" value={from} aria-invalid={!!invalidRange} aria-describedby={invalidRange ? 'sh-date-error' : undefined} onChange={(event) => setFrom(event.target.value)} /></div>
          <div><label htmlFor="sh-to">Đến ngày</label><input id="sh-to" type="date" value={to} aria-invalid={!!invalidRange} aria-describedby={invalidRange ? 'sh-date-error' : undefined} onChange={(event) => setTo(event.target.value)} /></div>
          <button type="button" className="cd-button sh-reset" onClick={reset}>Đặt lại</button>
        </div>{invalidRange && <p id="sh-date-error" role="alert">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
      </section>
      <p className="sh-count" role="status">Hiển thị {visible.length} / {history.length} mũi tiêm</p>
      {visible.length ? <div className="sh-table-card"><table className="sh-table"><caption>Lịch sử tiêm, mới nhất trước</caption><thead><tr>{['Người tiêm', 'Vắc xin', 'Mũi', 'Ngày tiêm', 'Số lô', 'Nhân viên', 'Mũi tiếp theo', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((item) => <tr key={item.id}>
        <td data-label="Người tiêm"><strong>{item.patientName}</strong><small>{item.dateOfBirth}</small></td><td data-label="Vắc xin"><span>{item.vaccine}</span>{hasReaction(item) && <small className="sh-reaction">Có ghi nhận</small>}</td><td data-label="Mũi">{item.dose}</td><td data-label="Ngày tiêm">{displayDate(item.vaccinationDate)}</td><td data-label="Số lô">{item.batchNumber}</td><td data-label="Nhân viên">{item.staffName}</td><td data-label="Mũi tiếp theo"><span className={item.nextDoseDate ? 'sh-next-dose' : 'sh-muted'}>{displayDate(item.nextDoseDate)}</span></td><td data-label="Thao tác"><button type="button" className="cd-text-button sh-view" onClick={() => setSelected(item)}>Xem chi tiết</button></td>
      </tr>)}</tbody></table></div> : <section className="cd-panel sh-empty"><span className="cd-icon-box"><Icon name="history" /></span><h2>Không tìm thấy lịch sử tiêm phù hợp</h2><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></section>}
      <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
    </main></div>
    {selected && <HistoryModal record={selected} onClose={() => setSelected(null)} />}{showAlerts && <DetailModal onClose={() => setShowAlerts(false)} />}
  </div>;
}
