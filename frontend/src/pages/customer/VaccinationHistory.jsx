import { useEffect, useRef, useState } from 'react';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import './VaccinationHistory.css';

// Read-only sample records; clinical data will be supplied by staff via the backend.
const vaccinationHistory = [
  { id: 'LS001', patientName: 'Nguyễn Minh Anh', relationship: 'Em', vaccine: 'HPV Gardasil 9', dose: 'Mũi 1', vaccinationDate: '08/08/2026', manufacturer: 'MSD', batchNumber: 'HPV240801', staffName: 'Trần Thị Lan', nextDoseDate: '08/10/2026', reaction: 'Không ghi nhận', note: '' },
  { id: 'LS002', patientName: 'Nguyễn Văn An', relationship: 'Bản thân', vaccine: 'Vaxigrip Tetra', dose: 'Mũi 1', vaccinationDate: '15/09/2026', manufacturer: 'Sanofi Pasteur', batchNumber: 'VAX260915', staffName: 'Nguyễn Thị Mai', nextDoseDate: null, reaction: 'Đau nhẹ tại vị trí tiêm', note: '' },
  { id: 'LS003', patientName: 'Nguyễn Văn An', relationship: 'Bản thân', vaccine: 'Prevenar 13', dose: 'Mũi 1', vaccinationDate: '20/06/2026', manufacturer: 'Pfizer', batchNumber: 'PRE260620', staffName: 'Trần Thị Lan', nextDoseDate: null, reaction: 'Không ghi nhận', note: '' },
  { id: 'LS004', patientName: 'Nguyễn Minh Anh', relationship: 'Em', vaccine: 'Vaxigrip Tetra', dose: 'Mũi 1', vaccinationDate: '10/05/2026', manufacturer: 'Sanofi Pasteur', batchNumber: 'VAX260510', staffName: 'Nguyễn Thị Mai', nextDoseDate: null, reaction: 'Không ghi nhận', note: '' },
  { id: 'LS005', patientName: 'Nguyễn Văn An', relationship: 'Bản thân', vaccine: 'Varivax', dose: 'Mũi 1', vaccinationDate: '12/02/2026', manufacturer: 'MSD', batchNumber: 'VAR260212', staffName: 'Trần Thị Lan', nextDoseDate: null, reaction: 'Không ghi nhận', note: '' },
  { id: 'LS006', patientName: 'Nguyễn Văn An', relationship: 'Bản thân', vaccine: 'Varivax', dose: 'Mũi 2', vaccinationDate: '16/04/2026', manufacturer: 'MSD', batchNumber: 'VAR260416', staffName: 'Nguyễn Thị Mai', nextDoseDate: null, reaction: 'Không ghi nhận', note: '' },
];

function normalizeSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}
function isoDate(date) { return date.split('/').reverse().join('-'); }
function filterHistory(records, patient, search) {
  return records.filter((record) => (patient === 'all' || record.patientName === patient) && normalizeSearch(record.vaccine).includes(normalizeSearch(search)))
    .sort((a, b) => isoDate(b.vaccinationDate).localeCompare(isoDate(a.vaccinationDate)));
}
function historySummary(records) {
  return { total: records.length, patients: new Set(records.map((record) => record.patientName)).size, nextDoses: records.filter((record) => record.nextDoseDate).length };
}
function detailEntries(record) {
  return [
    ['Người tiêm', record.patientName], ['Mối quan hệ', record.relationship],
    ['Vắc xin', record.vaccine], ['Mũi tiêm', record.dose],
    ['Ngày tiêm', record.vaccinationDate], ['Nhà sản xuất', record.manufacturer],
    ['Số lô vắc xin', record.batchNumber], ['Nhân viên thực hiện', record.staffName],
    ['Phản ứng sau tiêm', record.reaction], ['Ghi chú', record.note],
    ['Mũi tiếp theo dự kiến', record.nextDoseDate],
  ].map(([label, value]) => [label, value || 'Không có']);
}

function HistoryCard({ record, onView }) {
  return <li className="vh-timeline-item">
    <span className="vh-timeline-dot" aria-hidden="true" />
    <article className="cd-panel vh-card">
      <header className="vh-card-header"><span className="vh-date"><Icon name="calendar" />Ngày tiêm: <time dateTime={isoDate(record.vaccinationDate)}>{record.vaccinationDate}</time></span><span className="vh-status"><Icon name="check" />Đã tiêm</span></header>
      <div className="vh-card-content"><div className="vh-vaccine"><span className="cd-icon-box"><Icon name="vaccine" /></span><div><h2>{record.vaccine}</h2><p>{record.dose}</p></div></div><div><span className="vh-label">Người tiêm</span><strong>{record.patientName}</strong><span className="cd-relation">{record.relationship}</span></div><div><span className="vh-label">Nhà sản xuất</span><strong>{record.manufacturer}</strong></div></div>
      <footer className="vh-card-footer">{record.nextDoseDate && <div className="vh-next-dose"><Icon name="calendar" /><span>Mũi tiếp theo dự kiến <strong><time dateTime={isoDate(record.nextDoseDate)}>{record.nextDoseDate}</time></strong></span></div>}<button type="button" className="cd-button vh-view-button" onClick={onView}>Xem chi tiết<Icon name="arrow" /></button></footer>
    </article>
  </li>;
}

function HistoryDetailModal({ record, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  return <dialog ref={dialogRef} className="vh-modal" aria-labelledby="vh-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="vh-modal-header"><h2 id="vh-modal-title">CHI TIẾT MŨI TIÊM</h2><button type="button" className="vh-close" aria-label="Đóng chi tiết mũi tiêm" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
    <dl className="vh-modal-details">{detailEntries(record).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <footer className="vh-modal-footer"><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer>
  </dialog>;
}

export default function VaccinationHistory({ onNavigate }) {
  const [patient, setPatient] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const visible = filterHistory(vaccinationHistory, patient, search);
  const selectedRecord = vaccinationHistory.find((record) => record.id === selectedId);
  const totals = historySummary(vaccinationHistory);
  const patients = [...new Set(vaccinationHistory.map((record) => record.patientName))].sort((a, b) => a.localeCompare(b, 'vi'));
  const statistics = [
    { label: 'Tổng mũi đã tiêm', value: totals.total, icon: 'vaccine' },
    { label: 'Người được quản lý', value: totals.patients, icon: 'users' },
    { label: 'Mũi tiếp theo', value: totals.nextDoses, icon: 'calendar' },
  ];
  return <div className="customer-dashboard vaccination-history">
    <a href="#vh-main" className="cd-skip-link">Đến nội dung chính</a>
    <Sidebar activeMenu="history" onNavigate={onNavigate} />
    <div className="cd-workspace"><DashboardHeader customer={{ name: 'Nguyễn Văn An', initials: 'NA' }} />
      <main id="vh-main" className="cd-main" tabIndex={-1}>
        <div className="cd-page-heading"><h1>Lịch sử tiêm</h1><p>Theo dõi các mũi tiêm đã hoàn thành của bạn và người thân</p></div>
        <section className="cd-statistics vh-statistics" aria-label="Thống kê lịch sử tiêm">{statistics.map((stat) => <article className="cd-stat-card" key={stat.label}><div className="cd-stat-top"><h2>{stat.label}</h2><span className="cd-icon-box"><Icon name={stat.icon} /></span></div><strong className="cd-stat-value">{stat.value}</strong></article>)}</section>
        <section className="cd-panel vh-filters" aria-label="Lọc lịch sử tiêm"><div><label htmlFor="vh-patient">Người tiêm</label><select id="vh-patient" value={patient} onChange={(event) => setPatient(event.target.value)}><option value="all">Tất cả người tiêm</option>{patients.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><div><label htmlFor="vh-search">Tìm kiếm vắc xin</label><input type="search" id="vh-search" placeholder="Tìm theo tên vắc xin..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></section>
        <p className="vh-result-count" role="status">Hiển thị {visible.length} mũi tiêm</p>
        {visible.length ? <ol className="vh-timeline" aria-label="Lịch sử tiêm, mới nhất trước">{visible.map((record) => <HistoryCard key={record.id} record={record} onView={() => setSelectedId(record.id)} />)}</ol> : <section className="cd-panel vh-empty"><span className="cd-icon-box"><Icon name="history" /></span><h2>{vaccinationHistory.length ? 'Không tìm thấy lịch sử tiêm phù hợp' : 'Chưa có lịch sử tiêm'}</h2><p>{vaccinationHistory.length ? 'Thử thay đổi người tiêm hoặc từ khóa tìm kiếm.' : 'Thông tin các mũi tiêm đã hoàn thành sẽ được hiển thị tại đây.'}</p></section>}
        <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
      </main>
    </div>
    {selectedRecord && <HistoryDetailModal record={selectedRecord} onClose={() => setSelectedId(null)} />}
  </div>;
}
