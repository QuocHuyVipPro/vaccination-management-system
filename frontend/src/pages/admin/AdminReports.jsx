import { useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import { AdminSidebar, AdminHeader } from './AdminDashboard';
import './AdminReports.css';

const monthlyVaccinations = [
  { date: '2026-05-01', label: 'Tháng 5', vaccinations: 72, appointments: { completed: 72, confirmed: 7, pending: 3, cancelled: 3 } },
  { date: '2026-06-01', label: 'Tháng 6', vaccinations: 85, appointments: { completed: 85, confirmed: 8, pending: 4, cancelled: 3 } },
  { date: '2026-07-01', label: 'Tháng 7', vaccinations: 91, appointments: { completed: 91, confirmed: 8, pending: 4, cancelled: 4 } },
  { date: '2026-08-01', label: 'Tháng 8', vaccinations: 104, appointments: { completed: 104, confirmed: 9, pending: 4, cancelled: 4 } },
  { date: '2026-09-01', label: 'Tháng 9', vaccinations: 116, appointments: { completed: 116, confirmed: 9, pending: 4, cancelled: 4 } },
  { date: '2026-10-01', label: 'Tháng 10', vaccinations: 128, appointments: { completed: 128, confirmed: 10, pending: 4, cancelled: 4 } },
];
const topVaccines = [
  { name: 'HPV Gardasil 9', count: 42 }, { name: 'Vaxigrip Tetra', count: 31 }, { name: 'Prevenar 13', count: 27 }, { name: 'Varivax', count: 18 }, { name: 'Infanrix Hexa', count: 10 },
];
const inventoryStats = { remaining: 485, lowStock: 3, expiring: 2, expired: 1 };
const userStats = { customers: 142, staff: 13, active: 154, locked: 1 };
const recentVaccinations = [
  { date: '2026-10-08', patient: 'Nguyễn Minh Anh', vaccine: 'HPV Gardasil 9', dose: 'Mũi 2', staff: 'Trần Thị Lan' },
  { date: '2026-10-08', patient: 'Phạm Thu Hà', vaccine: 'Vaxigrip Tetra', dose: 'Mũi 1', staff: 'Nguyễn Hoàng Minh' },
  { date: '2026-10-07', patient: 'Lê Hoàng Nam', vaccine: 'Prevenar 13', dose: 'Mũi 1', staff: 'Trần Thị Lan' },
  { date: '2026-09-30', patient: 'Trần Ngọc Mai', vaccine: 'Varivax', dose: 'Mũi 1', staff: 'Nguyễn Thị Mai' },
  { date: '2026-09-29', patient: 'Nguyễn Văn An', vaccine: 'Prevenar 13', dose: 'Mũi 1', staff: 'Trần Thị Lan' },
];
const recentInventoryTransactions = [
  { date: '2026-10-05', quantity: 50, type: 'Nhập kho', vaccine: 'Vaxigrip Tetra', batch: 'VAX261001' },
  { date: '2026-10-04', quantity: -1, type: 'Xuất tiêm', vaccine: 'HPV Gardasil 9', batch: 'HPV240801' },
  { date: '2026-09-30', quantity: -2, type: 'Hủy / loại bỏ', vaccine: 'Varivax', batch: 'VAR260501' },
];
const presets = {
  month: ['2026-10-01', '2026-10-31'], quarter: ['2026-08-01', '2026-10-31'], half: ['2026-05-01', '2026-10-31'], year: ['2026-01-01', '2026-12-31'],
};
const dateText = (value) => value.split('-').reverse().join('/');
const inRange = (value, range) => value >= range.from && value <= range.to;

function ProgressRows({ items, max }) {
  return <div className="ar-progress-list">{items.map((item) => <div className="ar-progress-row" key={item.label}><div><span>{item.label}</span><strong>{item.value}</strong></div><div className="ar-track" aria-hidden="true"><span style={{ width: `${max ? item.value / max * 100 : 0}%` }} /></div></div>)}</div>;
}
function RecentTable({ records }) {
  return records.length ? <div className="ar-table-card"><table className="ar-table"><caption>Danh sách hoạt động tiêm gần đây</caption><thead><tr>{['Ngày', 'Người tiêm', 'Vắc xin', 'Mũi', 'Nhân viên'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{records.map((item) => <tr key={`${item.date}-${item.patient}`}><td data-label="Ngày">{dateText(item.date)}</td><td data-label="Người tiêm"><strong>{item.patient}</strong></td><td data-label="Vắc xin">{item.vaccine}</td><td data-label="Mũi">{item.dose}</td><td data-label="Nhân viên">{item.staff}</td></tr>)}</tbody></table></div> : <section className="ar-empty"><h3>Không có hoạt động tiêm trong khoảng thời gian này</h3></section>;
}

export default function AdminReports({ onNavigate }) {
  const [draft, setDraft] = useState({ from: presets.half[0], to: presets.half[1], preset: 'half' });
  const [range, setRange] = useState({ from: presets.half[0], to: presets.half[1] });
  const [error, setError] = useState('');
  const months = monthlyVaccinations.filter((item) => inRange(`${item.date.slice(0, 7)}-01`, { from: `${range.from.slice(0, 7)}-01`, to: `${range.to.slice(0, 7)}-01` }));
  const latest = months.at(-1);
  const appointments = latest?.appointments || { completed: 0, confirmed: 0, pending: 0, cancelled: 0 };
  const totalAppointments = Object.values(appointments).reduce((sum, value) => sum + value, 0);
  const completionRate = totalAppointments ? appointments.completed / totalAppointments * 100 : 0;
  const vaccinationTotal = latest?.vaccinations || 0;
  const chartMax = Math.max(1, ...months.map((item) => item.vaccinations));
  const filteredVaccinations = recentVaccinations.filter((item) => inRange(item.date, range));
  const filteredTransactions = recentInventoryTransactions.filter((item) => inRange(item.date, range));
  function apply(event) {
    event.preventDefault();
    if (!draft.from || !draft.to) { setError('Vui lòng chọn đầy đủ từ ngày và đến ngày.'); return; }
    if (draft.from > draft.to) { setError('Từ ngày phải trước hoặc bằng đến ngày.'); return; }
    setError(''); setRange({ from: draft.from, to: draft.to });
  }
  function choosePreset(event) {
    const preset = event.target.value; const values = presets[preset];
    setDraft({ from: values[0], to: values[1], preset }); setError('');
  }
  function reset() { setDraft({ from: presets.half[0], to: presets.half[1], preset: 'half' }); setRange({ from: presets.half[0], to: presets.half[1] }); setError(''); }
  const appointmentRows = [['Hoàn thành', appointments.completed], ['Đã xác nhận', appointments.confirmed], ['Chờ xác nhận', appointments.pending], ['Đã hủy', appointments.cancelled]].map(([label, value]) => ({ label, value }));
  return <div className="customer-dashboard admin-dashboard admin-reports"><a href="#ar-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar activePage="admin-reports" onNavigate={onNavigate} /><div className="cd-workspace"><AdminHeader onNotifications={() => onNavigate('admin-dashboard')} /><main id="ar-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading"><h1>Báo cáo thống kê</h1><p>Theo dõi và phân tích hoạt động tiêm chủng của hệ thống</p></div>
    <form className="cd-panel ar-filters" onSubmit={apply} noValidate><div><label htmlFor="ar-preset">Khoảng thời gian nhanh</label><select id="ar-preset" value={draft.preset} onChange={choosePreset}><option value="month">Tháng này</option><option value="quarter">3 tháng gần nhất</option><option value="half">6 tháng gần nhất</option><option value="year">Năm nay</option></select></div><div><label htmlFor="ar-from">Từ ngày</label><input id="ar-from" type="date" value={draft.from} aria-invalid={!!error} onChange={(event) => setDraft({ ...draft, from: event.target.value, preset: '' })} /></div><div><label htmlFor="ar-to">Đến ngày</label><input id="ar-to" type="date" value={draft.to} aria-invalid={!!error} onChange={(event) => setDraft({ ...draft, to: event.target.value, preset: '' })} /></div><div className="ar-filter-actions"><button type="submit" className="cd-button cd-button-primary ar-apply">Áp dụng</button><button type="button" className="cd-button ar-reset" onClick={reset}>Đặt lại</button></div>{error && <p className="ar-error" role="alert">{error}</p>}</form>
    <p className="ar-period" role="status">Kỳ báo cáo: {dateText(range.from)} – {dateText(range.to)}{latest ? ` · Số liệu tổng quan đến ${latest.label}` : ''}</p>
    <section className="cd-statistics" aria-label="Tổng quan báo cáo">{[
      ['Tổng mũi tiêm', vaccinationTotal, 'vaccine'], ['Lịch hẹn', totalAppointments, 'calendar'], ['Tỷ lệ hoàn thành', `${completionRate.toFixed(1)}%`, 'check'], ['Vắc xin đã sử dụng', `${vaccinationTotal} liều`, 'shield'],
    ].map(([label, value, icon]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name={icon} /></span></div><strong className="cd-stat-value">{value}</strong></article>)}</section>
    <div className="ar-report-grid">
      <section className="cd-panel ar-monthly" aria-labelledby="ar-monthly-title"><div className="cd-section-heading"><h2 id="ar-monthly-title">Số mũi tiêm theo tháng</h2></div>{months.length ? <div className="ar-bar-chart" role="img" aria-label={months.map((item) => `${item.label}: ${item.vaccinations} mũi`).join(', ')}>{months.map((item) => <div className="ar-bar-column" key={item.date} title={`${item.label}: ${item.vaccinations} mũi`}><strong>{item.vaccinations}</strong><div className="ar-bar-space"><span style={{ height: `${item.vaccinations / chartMax * 100}%` }} /></div><small>{item.label.replace('Tháng ', 'T')}</small></div>)}</div> : <div className="ar-empty"><h3>Không có dữ liệu theo tháng trong khoảng này</h3></div>}</section>
      <section className="cd-panel" aria-labelledby="ar-appointments-title"><div className="cd-section-heading"><h2 id="ar-appointments-title">Trạng thái lịch hẹn</h2></div><ProgressRows items={appointmentRows} max={totalAppointments} /></section>
      <section className="cd-panel" aria-labelledby="ar-top-title"><div className="cd-section-heading"><h2 id="ar-top-title">Vắc xin được sử dụng nhiều</h2></div><ol className="ar-ranking">{topVaccines.map((item, index) => <li key={item.name}><span>{index + 1}</span><div><div><strong>{item.name}</strong><b>{item.count} mũi</b></div><div className="ar-track"><span style={{ width: `${item.count / topVaccines[0].count * 100}%` }} /></div></div></li>)}</ol></section>
      <section className="cd-panel" aria-labelledby="ar-inventory-title"><div className="cd-section-heading"><h2 id="ar-inventory-title">Tổng quan tồn kho</h2><button type="button" className="cd-text-button ar-inventory-link" onClick={() => onNavigate('admin-inventory')}>Xem quản lý kho<Icon name="arrow" /></button></div><ProgressRows items={[{ label: 'Tổng số liều còn', value: inventoryStats.remaining }, { label: 'Vắc xin tồn kho thấp', value: inventoryStats.lowStock }, { label: 'Lô sắp hết hạn', value: inventoryStats.expiring }, { label: 'Lô hết hạn', value: inventoryStats.expired }]} max={inventoryStats.remaining} /></section>
      <section className="cd-panel" aria-labelledby="ar-users-title"><div className="cd-section-heading"><h2 id="ar-users-title">Người dùng hệ thống</h2></div><dl className="ar-user-stats">{[['Khách hàng', userStats.customers], ['Nhân viên', userStats.staff], ['Đang hoạt động', userStats.active], ['Đã khóa', userStats.locked]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <section className="cd-panel" aria-labelledby="ar-stock-title"><div className="cd-section-heading"><h2 id="ar-stock-title">Biến động kho gần đây</h2></div>{filteredTransactions.length ? <ul className="ar-stock-list">{filteredTransactions.map((item) => <li key={`${item.date}-${item.batch}`}><strong className={item.quantity > 0 ? 'ar-positive' : ''}>{item.quantity > 0 ? '+' : ''}{item.quantity}</strong><div><b>{item.type}</b><span>{item.vaccine} · Lô {item.batch}</span></div></li>)}</ul> : <div className="ar-empty"><h3>Không có biến động kho trong khoảng này</h3></div>}</section>
    </div>
    <section className="cd-panel ar-recent" aria-labelledby="ar-recent-title"><div className="cd-section-heading"><h2 id="ar-recent-title">Hoạt động tiêm gần đây</h2></div><RecentTable records={filteredVaccinations} /></section>
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div></div>;
}
