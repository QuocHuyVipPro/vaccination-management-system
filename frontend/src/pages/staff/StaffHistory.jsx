import { useEffect, useRef, useState } from 'react';
import {
  getStaffVaccinationHistory,
  getStaffVaccinationHistoryDetail,
} from '../../services/staffVaccinationHistoryService.js';
import { Icon } from '../customer/CustomerDashboard';
import { StaffSidebar, StaffHeader, DetailModal } from './StaffDashboard';
import './StaffHistory.css';

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

function hasReaction(record) {
  return Boolean(record.phan_ung_sau_tiem?.trim());
}

function HistoryModal({ historyId, onClose }) {
  const dialogRef = useRef(null);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

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

  useEffect(() => {
    let active = true;
    getStaffVaccinationHistoryDetail(historyId)
      .then((result) => { if (active) setRecord(result); })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Không thể tải chi tiết lịch sử tiêm.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [historyId, retryKey]);

  const groups = record ? [
    ['Thông tin người tiêm', [
      ['Mã hồ sơ', record.ma_ho_so], ['Họ và tên', record.ho_ten_nguoi_tiem],
      ['Ngày sinh', displayDate(record.ngay_sinh)], ['Giới tính', record.gioi_tinh || 'Chưa cập nhật'],
      ['Số điện thoại', record.so_dien_thoai || 'Chưa cập nhật'],
    ]],
    ['Thông tin tiêm chủng', [
      ['Mã lịch sử', record.ma_lich_su], ['Vắc xin', record.ten_vac_xin],
      ['Mũi tiêm', `Mũi ${record.so_thu_tu_mui}`], ['Số lô', record.so_lo],
      ['Ngày tiêm', displayDateTime(record.ngay_tiem)],
    ]],
    ['Nhân viên thực hiện', [
      ['Mã nhân viên', record.ma_nhan_vien], ['Họ tên', record.ho_ten_nhan_vien],
    ]],
    ['Theo dõi sau tiêm', [
      ['Phản ứng sau tiêm', record.phan_ung_sau_tiem || 'Không ghi nhận'],
      ['Ghi chú', record.ghi_chu || 'Không có'],
      ['Ngày dự kiến mũi tiếp theo', displayDate(record.ngay_du_kien_mui_tiep)],
    ]],
  ] : [];

  return <dialog ref={dialogRef} className="sh-modal" aria-labelledby="sh-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id="sh-modal-title">CHI TIẾT MŨI TIÊM</h2><button type="button" className="sh-close" aria-label="Đóng chi tiết mũi tiêm" onClick={onClose}>×</button></header>
    <div className="sh-modal-body">
      {loading && <div className="sh-detail-state" role="status">Đang tải chi tiết...</div>}
      {!loading && error && <div className="sh-detail-state sh-error" role="alert"><p>{error}</p><button type="button" className="cd-button" onClick={() => { setLoading(true); setError(''); setRetryKey((value) => value + 1); }}>Thử lại</button></div>}
      {!loading && !error && groups.map(([title, fields]) => <section key={title}><h3>{title}</h3><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}
    </div>
    <footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer>
  </dialog>;
}

export default function StaffHistory({ currentUser, patientId, onNavigate }) {
  const [history, setHistory] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState(patientId == null ? '' : String(patientId));
  const [vaccine, setVaccine] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const requestRef = useRef(0);
  const lastFiltersRef = useRef(patientId == null ? {} : { maHoSo: patientId });
  const invalidRange = Boolean(from && to && from > to);

  function requestHistory(filters) {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    lastFiltersRef.current = filters;
    setLoading(true);
    setError('');
    return getStaffVaccinationHistory(filters)
      .then((result) => {
        if (requestId === requestRef.current) setHistory(Array.isArray(result) ? result : []);
      })
      .catch((requestError) => {
        if (requestId === requestRef.current) {
          setHistory([]);
          setError(requestError.message || 'Không thể tải lịch sử tiêm chủng.');
        }
      })
      .finally(() => { if (requestId === requestRef.current) setLoading(false); });
  }

  useEffect(() => {
    let active = true;
    const initialFilters = patientId == null ? {} : { maHoSo: patientId };
    const allRequest = getStaffVaccinationHistory();
    Promise.all([allRequest, patientId == null ? allRequest : getStaffVaccinationHistory(initialFilters)])
      .then(([allRecords, visibleRecords]) => {
        if (!active) return;
        setCatalog(Array.isArray(allRecords) ? allRecords : []);
        setHistory(Array.isArray(visibleRecords) ? visibleRecords : []);
      })
      .catch((requestError) => {
        if (!active) return;
        setHistory([]);
        setError(requestError.message || 'Không thể tải lịch sử tiêm chủng.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; requestRef.current += 1; };
  }, [patientId]);

  const patients = [...new Map(catalog.map((record) => [record.ma_ho_so, record.ho_ten_nguoi_tiem])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'vi'));
  const vaccines = [...new Map(catalog.map((record) => [record.ma_vac_xin, record.ten_vac_xin])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'vi'));

  function currentFilters() {
    return {
      maHoSo: patient || undefined,
      maVacXin: vaccine || undefined,
      search,
      tuNgay: from || undefined,
      denNgay: to || undefined,
    };
  }

  function applyFilters(event) {
    event.preventDefault();
    if (!invalidRange) requestHistory(currentFilters());
  }

  function resetFilters() {
    setPatient('');
    setVaccine('');
    setSearch('');
    setFrom('');
    setTo('');
    requestHistory({});
  }

  const statistics = [
    ['Tổng mũi hiển thị', history.length, 'vaccine'],
    ['Người tiêm', new Set(history.map((item) => item.ma_ho_so)).size, 'users'],
    ['Có lịch mũi tiếp theo', history.filter((item) => item.ngay_du_kien_mui_tiep).length, 'calendar'],
    ['Có ghi nhận phản ứng', history.filter(hasReaction).length, 'history'],
  ];

  return <div className="customer-dashboard staff-dashboard staff-history">
    <a href="#sh-main" className="cd-skip-link">Đến nội dung chính</a><StaffSidebar activePage="staff-history" onNavigate={onNavigate} />
    <div className="cd-workspace"><StaffHeader currentUser={currentUser} onNotifications={() => setShowAlerts(true)} /><main id="sh-main" className="cd-main" tabIndex={-1}>
      <div className="cd-page-heading"><h1>Lịch sử tiêm</h1><p>Tra cứu các mũi tiêm đã được thực hiện</p></div>
      <section className="cd-statistics" aria-label="Thống kê lịch sử tiêm">{statistics.map(([label, value, icon]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name={icon} /></span></div><strong className="cd-stat-value">{value}</strong></article>)}</section>
      <form className="cd-panel sh-filters" aria-label="Lọc lịch sử tiêm" onSubmit={applyFilters}>
        <div className="sh-search"><label htmlFor="sh-search">Tìm lịch sử tiêm</label><input id="sh-search" type="search" placeholder="Tìm theo tên người tiêm hoặc số điện thoại..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="sh-filter-grid">
          <div><label htmlFor="sh-patient">Người tiêm</label><select id="sh-patient" value={patient} onChange={(event) => setPatient(event.target.value)}><option value="">Tất cả</option>{patients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div><label htmlFor="sh-vaccine">Vắc xin</label><select id="sh-vaccine" value={vaccine} onChange={(event) => setVaccine(event.target.value)}><option value="">Tất cả</option>{vaccines.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div><label htmlFor="sh-from">Từ ngày</label><input id="sh-from" type="date" value={from} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'sh-date-error' : undefined} onChange={(event) => setFrom(event.target.value)} /></div>
          <div><label htmlFor="sh-to">Đến ngày</label><input id="sh-to" type="date" value={to} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'sh-date-error' : undefined} onChange={(event) => setTo(event.target.value)} /></div>
          <div className="sh-filter-actions"><button type="submit" className="cd-button cd-button-primary" disabled={loading || invalidRange}>Lọc</button><button type="button" className="cd-button" disabled={loading} onClick={resetFilters}>Đặt lại</button></div>
        </div>{invalidRange && <p id="sh-date-error" role="alert">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
      </form>
      {loading && <section className="cd-panel sh-empty" role="status"><span className="cd-icon-box"><Icon name="history" /></span><h2>Đang tải lịch sử tiêm...</h2></section>}
      {!loading && error && <section className="cd-panel sh-empty sh-error" role="alert"><span className="cd-icon-box"><Icon name="history" /></span><h2>Không thể tải lịch sử tiêm</h2><p>{error}</p><button type="button" className="cd-button" onClick={() => requestHistory(lastFiltersRef.current)}>Thử lại</button></section>}
      {!loading && !error && <><p className="sh-count" role="status">Hiển thị {history.length} mũi tiêm</p>{history.length ? <div className="sh-table-card"><table className="sh-table"><caption>Lịch sử tiêm, mới nhất trước</caption><thead><tr>{['Mã LS', 'Người tiêm', 'Vắc xin', 'Mũi', 'Ngày tiêm', 'Số lô', 'Nhân viên', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{history.map((item) => <tr key={item.ma_lich_su}>
        <td data-label="Mã LS">#{item.ma_lich_su}</td><td data-label="Người tiêm"><strong>{item.ho_ten_nguoi_tiem}</strong><small>{displayDate(item.ngay_sinh)}</small></td><td data-label="Vắc xin"><span>{item.ten_vac_xin}</span>{hasReaction(item) && <small className="sh-reaction">Có ghi nhận</small>}</td><td data-label="Mũi">Mũi {item.so_thu_tu_mui}</td><td data-label="Ngày tiêm">{displayDateTime(item.ngay_tiem)}</td><td data-label="Số lô">{item.so_lo}</td><td data-label="Nhân viên">{item.ho_ten_nhan_vien}</td><td data-label="Thao tác"><button type="button" className="cd-text-button sh-view" onClick={() => setSelectedId(item.ma_lich_su)}>Xem chi tiết</button></td>
      </tr>)}</tbody></table></div> : <section className="cd-panel sh-empty"><span className="cd-icon-box"><Icon name="history" /></span><h2>Chưa có lịch sử tiêm chủng.</h2><p>Không có bản ghi phù hợp với bộ lọc hiện tại.</p></section>}</>}
      <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
    </main></div>
    {selectedId != null && <HistoryModal historyId={selectedId} onClose={() => setSelectedId(null)} />}
    {showAlerts && <DetailModal onClose={() => setShowAlerts(false)} />}
  </div>;
}
