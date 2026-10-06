import { useEffect, useState } from 'react';
import {
  getAdminAppointmentReport,
  getAdminDashboardReport,
  getAdminInventoryReport,
  getAdminNotificationReport,
  getAdminVaccinationReport,
  getAdminVaccineReport,
} from '../../services/adminReportService.js';
import { Icon } from '../customer/CustomerDashboard';
import { AdminHeader, AdminSidebar } from './AdminDashboard';
import './AdminReports.css';

const reportKeys = ['dashboard', 'appointments', 'vaccinations', 'vaccines', 'inventory', 'notifications'];
const initialReports = Object.fromEntries(reportKeys.map((key) => [key, { loading: true, data: null, error: '' }]));
const appointmentStatuses = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
};
const notificationTypes = {
  NHAC_LICH: 'Nhắc lịch',
  XAC_NHAN_LICH: 'Xác nhận lịch',
  HUY_LICH: 'Hủy lịch',
  HE_THONG: 'Hệ thống',
  KHONG_XAC_DINH: 'Không xác định',
};

const dateText = (value) => value ? String(value).slice(0, 10).split('-').reverse().join('/') : 'Tất cả';
const periodText = (value) => value?.length === 7 ? `${value.slice(5, 7)}/${value.slice(0, 4)}` : dateText(value);
const numberText = (value) => new Intl.NumberFormat('vi-VN').format(value ?? 0);

function ReportState({ state, name, onRetry, children }) {
  if (state.loading) return <section className="cd-panel ar-state" role="status"><h2>Đang tải {name}...</h2></section>;
  if (state.error) return <section className="cd-panel ar-state ar-request-error" role="alert"><h2>Không thể tải {name}</h2><p>{state.error}</p><button type="button" className="cd-button" onClick={onRetry}>Thử lại</button></section>;
  return children;
}

function MetricCards({ items, label }) {
  return <section className="cd-statistics ar-metrics" aria-label={label}>{items.map(([title, value, icon = 'vaccine']) => <article className="cd-stat-card" key={title}><div className="cd-stat-top"><h2>{title}</h2><span className="cd-icon-box"><Icon name={icon} /></span></div><strong className="cd-stat-value">{numberText(value)}</strong></article>)}</section>;
}

function ProgressRows({ items }) {
  const max = Math.max(0, ...items.map((item) => item.value));
  return <div className="ar-progress-list">{items.map((item) => <div className="ar-progress-row" key={item.label}><div><span>{item.label}</span><strong>{numberText(item.value)}</strong></div><div className="ar-track" aria-hidden="true"><span style={{ width: `${max ? item.value / max * 100 : 0}%`, minWidth: item.value ? 2 : 0 }} /></div></div>)}</div>;
}

function DataTable({ caption, headers, rows, empty }) {
  if (!rows.length) return <div className="ar-empty"><h3>{empty}</h3></div>;
  return <div className="ar-table-card"><table className="ar-table"><caption>{caption}</caption><thead><tr>{headers.map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(({ id, cells }) => <tr key={id}>{cells.map((cell, index) => <td key={headers[index]} data-label={headers[index]}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function DashboardSection({ data }) {
  return <><MetricCards label="Tổng quan hệ thống" items={[
    ['Người dùng', data.tong_nguoi_dung, 'users'], ['Hồ sơ người tiêm', data.tong_ho_so_nguoi_tiem, 'users'], ['Vắc xin', data.tong_vac_xin], ['Lô vắc xin', data.tong_lo_vac_xin],
    ['Lịch hẹn', data.tong_lich_hen, 'calendar'], ['Mũi đã tiêm', data.tong_mui_tiem_da_thuc_hien, 'check'], ['Tồn kho', data.tong_ton_kho], ['Thông báo chưa đọc', data.thong_bao_chua_doc, 'bell'],
  ]} /><section className="cd-panel"><div className="cd-section-heading"><h2>Chỉ số hôm nay và cảnh báo</h2></div><dl className="ar-detail-grid">{[
    ['Lịch hẹn hôm nay', data.lich_hen_hom_nay], ['Mũi tiêm hôm nay', data.mui_tiem_hom_nay], ['Vắc xin sắp hết hạn', data.vaccine_sap_het_han], ['Lô sắp hết hàng', data.lo_sap_het_hang],
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{numberText(value)}</dd></div>)}</dl></section></>;
}

function AppointmentSection({ data }) {
  const items = Object.entries(data.theo_trang_thai || {}).map(([status, value]) => ({ label: appointmentStatuses[status] || status, value }));
  return <><MetricCards label="Tổng quan lịch hẹn" items={[[ 'Tổng lịch hẹn', data.tong, 'calendar' ], ...items.map((item) => [item.label, item.value, 'calendar'])]} /><section className="cd-panel"><div className="cd-section-heading"><h2>Phân bố theo trạng thái</h2></div><ProgressRows items={items} /></section></>;
}

function VaccinationSection({ data }) {
  const max = Math.max(0, ...data.series.map((item) => item.so_mui_tiem));
  return <><MetricCards label="Tổng quan tiêm chủng" items={[[ 'Tổng mũi đã tiêm', data.tong_mui_tiem, 'check' ]]} /><section className="cd-panel"><div className="cd-section-heading"><h2>Số mũi tiêm theo {data.group_by === 'month' ? 'tháng' : 'ngày'}</h2></div>{data.series.length ? <div className="ar-bar-chart" role="img" aria-label={data.series.map((item) => `${periodText(item.period)}: ${item.so_mui_tiem} mũi`).join(', ')}>{data.series.map((item) => <div className="ar-bar-column" key={item.period}><strong>{item.so_mui_tiem}</strong><div className="ar-bar-space"><span style={{ height: `${max ? item.so_mui_tiem / max * 100 : 0}%` }} /></div><small>{periodText(item.period)}</small></div>)}</div> : <div className="ar-empty"><h3>Không có mũi tiêm trong khoảng đã chọn.</h3></div>}</section></>;
}

function VaccineSection({ data }) {
  return <DataTable caption="Thống kê theo vắc xin" headers={['Vắc xin', 'Mũi đã tiêm', 'Tồn kho', 'Số lô', 'Lô còn hàng']} empty="Chưa có dữ liệu vắc xin." rows={data.map((item) => ({ id: item.ma_vac_xin, cells: [<strong key="name">{item.ten_vac_xin}</strong>, item.so_mui_da_tiem, item.ton_kho_hien_tai, item.so_lo_dang_co, item.so_lo_con_hang] }))} />;
}

function BatchList({ title, items, empty }) {
  return <section className="cd-panel"><div className="cd-section-heading"><h2>{title}</h2></div><DataTable caption={title} headers={['Vắc xin', 'Số lô', 'Tồn kho', 'Hạn sử dụng', 'Trạng thái']} empty={empty} rows={items.map((item) => ({ id: item.ma_lo, cells: [item.ten_vac_xin, item.so_lo, item.so_luong_con, dateText(item.han_su_dung), item.trang_thai] }))} /></section>;
}

function InventorySection({ data }) {
  return <><MetricCards label="Tổng quan kho" items={[[ 'Tổng tồn kho', data.tong_ton_kho ], ['Lô sắp hết hàng', data.lo_sap_het_hang.length], ['Lô sắp hết hạn', data.lo_sap_het_han.length]]} /><section className="cd-panel"><div className="cd-section-heading"><h2>Tồn kho theo vắc xin</h2></div><DataTable caption="Tồn kho theo vắc xin" headers={['Vắc xin', 'Tồn kho', 'Số lô', 'Lô còn hàng']} empty="Chưa có dữ liệu kho." rows={data.theo_vac_xin.map((item) => ({ id: item.ma_vac_xin, cells: [item.ten_vac_xin, item.ton_kho_hien_tai, item.so_lo, item.so_lo_con_hang] }))} /></section><div className="ar-report-grid"><BatchList title={`Lô tồn không quá ${data.low_stock_threshold} liều`} items={data.lo_sap_het_hang} empty="Không có lô tồn kho thấp." /><BatchList title={`Lô hết hạn trong ${data.expiry_days} ngày`} items={data.lo_sap_het_han} empty="Không có lô sắp hết hạn." /></div></>;
}

function NotificationSection({ data }) {
  const types = Object.entries(data.theo_loai_thong_bao || {}).map(([type, value]) => ({ label: notificationTypes[type] || type, value }));
  return <><MetricCards label="Tổng quan thông báo" items={[[ 'Tổng thông báo', data.tong_thong_bao, 'bell' ], ['Đã đọc', data.da_doc, 'check'], ['Chưa đọc', data.chua_doc, 'bell'], ['Tổng lần gửi', data.tong_lan_gui], ['Gửi thành công', data.gui_thanh_cong, 'check'], ['Gửi thất bại', data.gui_that_bai]]} /><section className="cd-panel"><div className="cd-section-heading"><h2>Thông báo theo loại</h2></div>{types.length ? <ProgressRows items={types} /> : <div className="ar-empty"><h3>Chưa có thông báo.</h3></div>}</section></>;
}

export default function AdminReports({ currentUser, onNavigate }) {
  const [active, setActive] = useState('dashboard');
  const [reports, setReports] = useState(initialReports);
  const [draft, setDraft] = useState({ tu_ngay: '', den_ngay: '', group_by: 'day' });
  const [range, setRange] = useState({ tu_ngay: '', den_ngay: '', group_by: 'day' });
  const [dateError, setDateError] = useState('');

  function requestsFor(keys, filters = range) {
    const requests = {
      dashboard: () => getAdminDashboardReport(),
      appointments: () => getAdminAppointmentReport({ tu_ngay: filters.tu_ngay, den_ngay: filters.den_ngay }),
      vaccinations: () => getAdminVaccinationReport({ tu_ngay: filters.tu_ngay, den_ngay: filters.den_ngay, group_by: filters.group_by }),
      vaccines: () => getAdminVaccineReport(),
      inventory: () => getAdminInventoryReport(),
      notifications: () => getAdminNotificationReport(),
    };
    return keys.map((key) => requests[key]());
  }

  async function load(keys, filters = range) {
    const results = await Promise.allSettled(requestsFor(keys, filters));
    setReports((current) => {
      const next = { ...current };
      keys.forEach((key, index) => {
        const result = results[index];
        next[key] = result.status === 'fulfilled'
          ? { loading: false, data: result.value, error: '' }
          : { loading: false, data: null, error: result.reason?.message || 'Không thể tải báo cáo.' };
      });
      return next;
    });
  }

  // The request resolves asynchronously; this state update cannot cascade synchronously.
  // oxlint-disable-next-line react(set-state-in-effect)
  useEffect(() => {
    let activeRequest = true;
    const initialFilters = { tu_ngay: '', den_ngay: '', group_by: 'day' };
    Promise.allSettled(requestsFor(reportKeys, initialFilters)).then((results) => {
      if (!activeRequest) return;
      setReports((current) => {
        const next = { ...current };
        reportKeys.forEach((key, index) => {
          const result = results[index];
          next[key] = result.status === 'fulfilled'
            ? { loading: false, data: result.value, error: '' }
            : { loading: false, data: null, error: result.reason?.message || 'Không thể tải báo cáo.' };
        });
        return next;
      });
    });
    return () => { activeRequest = false; };
  }, []); // requestsFor is stable for this initial, unfiltered load.

  function markLoading(keys) {
    setReports((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, keys.includes(key) ? { ...value, loading: true, error: '' } : value])));
  }
  function retry(key) {
    markLoading([key]); load([key]);
  }
  function applyDates(event) {
    event.preventDefault();
    if (draft.tu_ngay && draft.den_ngay && draft.tu_ngay > draft.den_ngay) {
      setDateError('Từ ngày phải trước hoặc bằng đến ngày.');
      return;
    }
    setDateError('');
    const next = { ...draft };
    setRange(next); markLoading(['appointments', 'vaccinations']); load(['appointments', 'vaccinations'], next);
  }
  function resetDates() {
    const next = { tu_ngay: '', den_ngay: '', group_by: 'day' };
    setDraft(next); setRange(next); setDateError(''); markLoading(['appointments', 'vaccinations']); load(['appointments', 'vaccinations'], next);
  }

  const tabs = { dashboard: 'Tổng quan', appointments: 'Lịch hẹn', vaccinations: 'Tiêm chủng', vaccines: 'Vắc xin', inventory: 'Kho', notifications: 'Thông báo' };
  const state = reports[active];
  const allFailed = reportKeys.every((key) => !reports[key].loading && reports[key].error);
  const content = {
    dashboard: state.data && <DashboardSection data={state.data} />,
    appointments: state.data && <AppointmentSection data={state.data} />,
    vaccinations: state.data && <VaccinationSection data={state.data} />,
    vaccines: state.data && <VaccineSection data={state.data} />,
    inventory: state.data && <InventorySection data={state.data} />,
    notifications: state.data && <NotificationSection data={state.data} />,
  }[active];

  return <div className="customer-dashboard admin-dashboard admin-reports"><a href="#ar-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar activePage="admin-reports" onNavigate={onNavigate} /><div className="cd-workspace"><AdminHeader currentUser={currentUser} onNotifications={() => onNavigate('admin-dashboard')} /><main id="ar-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading"><h1>Báo cáo thống kê</h1><p>Số liệu tổng hợp trực tiếp từ hệ thống</p></div>
    {allFailed && <section className="cd-panel ar-state ar-request-error" role="alert"><h2>Không thể tải các báo cáo</h2><p>Kiểm tra kết nối backend và thử lại.</p><button type="button" className="cd-button" onClick={() => { markLoading(reportKeys); load(reportKeys); }}>Thử lại tất cả</button></section>}
    <nav className="cd-panel ar-tabs" aria-label="Nhóm báo cáo">{Object.entries(tabs).map(([key, label]) => <button type="button" key={key} aria-current={active === key ? 'page' : undefined} onClick={() => setActive(key)}>{label}</button>)}</nav>
    {['appointments', 'vaccinations'].includes(active) && <form className="cd-panel ar-filters" onSubmit={applyDates} noValidate><div><label htmlFor="ar-from">Từ ngày</label><input id="ar-from" type="date" value={draft.tu_ngay} aria-invalid={!!dateError} onChange={(event) => setDraft((current) => ({ ...current, tu_ngay: event.target.value }))} /></div><div><label htmlFor="ar-to">Đến ngày</label><input id="ar-to" type="date" value={draft.den_ngay} aria-invalid={!!dateError} onChange={(event) => setDraft((current) => ({ ...current, den_ngay: event.target.value }))} /></div>{active === 'vaccinations' && <div><label htmlFor="ar-group">Nhóm dữ liệu</label><select id="ar-group" value={draft.group_by} onChange={(event) => setDraft((current) => ({ ...current, group_by: event.target.value }))}><option value="day">Theo ngày</option><option value="month">Theo tháng</option></select></div>}<div className="ar-filter-actions"><button type="submit" className="cd-button cd-button-primary" disabled={state.loading}>Áp dụng</button><button type="button" className="cd-button" disabled={state.loading} onClick={resetDates}>Đặt lại</button></div>{dateError && <p className="ar-error" role="alert">{dateError}</p>}</form>}
    {['appointments', 'vaccinations'].includes(active) && <p className="ar-period" role="status">Kỳ báo cáo: {dateText(range.tu_ngay)} – {dateText(range.den_ngay)}{active === 'vaccinations' ? ` · ${range.group_by === 'month' ? 'Theo tháng' : 'Theo ngày'}` : ''}</p>}
    <ReportState state={state} name={tabs[active].toLowerCase()} onRetry={() => retry(active)}>{content}</ReportState>
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div></div>;
}
