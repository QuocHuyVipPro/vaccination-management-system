import { useEffect, useRef, useState } from 'react';
import { getProfiles } from '../../services/profileService.js';
import { getVaccinationHistory, getVaccinationHistoryByProfile, getVaccinationHistoryDetail } from '../../services/vaccinationHistoryService.js';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import './VaccinationHistory.css';

function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}
function formatDate(value) { return value ? value.split('-').reverse().join('/') : 'Không có'; }
function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  const [datePart, timePart = ''] = value.split(/[T ]/);
  return `${formatDate(datePart)}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
}
function initials(name) { return (name || 'Khách hàng').trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase(); }
function filterHistory(records, search) {
  const keyword = normalizeSearch(search);
  return records.filter((record) => normalizeSearch(`${record.ten_vac_xin} ${record.ho_ten_nguoi_tiem} ${record.so_lo} ${record.so_thu_tu_mui}`).includes(keyword));
}
function historySummary(records) {
  return { total: records.length, profiles: new Set(records.map((record) => record.ma_ho_so)).size, nextDoses: records.filter((record) => record.ngay_du_kien_mui_tiep).length };
}
function detailEntries(record) {
  return [
    ['Mã lịch sử', record.ma_lich_su],
    ['Người tiêm', record.ho_ten_nguoi_tiem],
    ['Vắc xin', record.ten_vac_xin],
    ['Mũi tiêm', `Mũi ${record.so_thu_tu_mui}`],
    ['Ngày tiêm', formatDateTime(record.ngay_tiem)],
    ['Số lô vắc xin', record.so_lo],
    ['Phản ứng sau tiêm', record.phan_ung_sau_tiem || 'Không có'],
    ['Ghi chú', record.ghi_chu || 'Không có'],
    ['Mũi tiếp theo dự kiến', formatDate(record.ngay_du_kien_mui_tiep)],
  ];
}

function HistoryCard({ record, viewing, onView }) {
  return <li className="vh-timeline-item">
    <span className="vh-timeline-dot" aria-hidden="true" />
    <article className="cd-panel vh-card">
      <header className="vh-card-header"><span className="vh-date"><Icon name="calendar" />Ngày tiêm: <time dateTime={record.ngay_tiem}>{formatDateTime(record.ngay_tiem)}</time></span><span className="vh-history-id">Mã lịch sử: <strong>{record.ma_lich_su}</strong></span></header>
      <div className="vh-card-content"><div className="vh-vaccine"><span className="cd-icon-box"><Icon name="vaccine" /></span><div><h2>{record.ten_vac_xin}</h2><p>Mũi {record.so_thu_tu_mui}</p></div></div><div><span className="vh-label">Người tiêm</span><strong>{record.ho_ten_nguoi_tiem}</strong></div><div><span className="vh-label">Số lô vắc xin</span><strong>{record.so_lo}</strong></div></div>
      <footer className="vh-card-footer">{record.ngay_du_kien_mui_tiep && <div className="vh-next-dose"><Icon name="calendar" /><span>Mũi tiếp theo dự kiến <strong><time dateTime={record.ngay_du_kien_mui_tiep}>{formatDate(record.ngay_du_kien_mui_tiep)}</time></strong></span></div>}<button type="button" className="cd-button vh-view-button" disabled={viewing} onClick={onView}>{viewing ? 'Đang tải...' : 'Xem chi tiết'}{!viewing && <Icon name="arrow" />}</button></footer>
    </article>
  </li>;
}

function HistoryDetailModal({ record, loading, error, onRetry, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={dialogRef} className="vh-modal" aria-labelledby="vh-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="vh-modal-header"><h2 id="vh-modal-title">CHI TIẾT MŨI TIÊM</h2><button type="button" className="vh-close" aria-label="Đóng chi tiết mũi tiêm" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
    {loading ? <p className="vh-modal-state" role="status">Đang tải chi tiết mũi tiêm...</p> : error ? <div className="vh-modal-state vh-request-error" role="alert"><p>{error}</p><button type="button" className="cd-button" onClick={onRetry}>Thử lại</button></div> : record && <dl className="vh-modal-details">{detailEntries(record).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    <footer className="vh-modal-footer"><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer>
  </dialog>;
}

export default function VaccinationHistory({ currentUser, onNavigate }) {
  const [records, setRecords] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profilesError, setProfilesError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const historyRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const visible = filterHistory(records, search);
  const totals = historySummary(records);
  const statistics = [
    { label: 'Tổng mũi đã tiêm', value: totals.total, icon: 'vaccine' },
    { label: 'Người được quản lý', value: totals.profiles, icon: 'users' },
    { label: 'Mũi tiếp theo', value: totals.nextDoses, icon: 'calendar' },
  ];

  async function loadHistory(profileId = selectedProfile) {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const result = profileId === 'all' ? await getVaccinationHistory() : await getVaccinationHistoryByProfile(profileId);
      if (requestId === historyRequestRef.current) setRecords(Array.isArray(result) ? result : []);
    } catch (requestError) {
      if (requestId === historyRequestRef.current) {
        setRecords([]);
        setError(requestError.message || 'Không thể tải lịch sử tiêm chủng.');
      }
    } finally {
      if (requestId === historyRequestRef.current) setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    Promise.allSettled([getProfiles(), getVaccinationHistory()]).then(([profileResult, historyResult]) => {
      if (!active) return;
      if (profileResult.status === 'fulfilled') setProfiles(Array.isArray(profileResult.value) ? profileResult.value : []);
      else setProfilesError(profileResult.reason?.message || 'Không thể tải danh sách hồ sơ.');
      if (historyResult.status === 'fulfilled') setRecords(Array.isArray(historyResult.value) ? historyResult.value : []);
      else setError(historyResult.reason?.message || 'Không thể tải lịch sử tiêm chủng.');
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  function changeProfile(event) {
    const profileId = event.target.value;
    setSelectedProfile(profileId);
    setSearch('');
    loadHistory(profileId);
  }
  async function loadDetail(historyId) {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setDetailLoading(true);
    setDetailError('');
    try {
      const result = await getVaccinationHistoryDetail(historyId);
      if (requestId === detailRequestRef.current) setDetail(result);
    } catch (requestError) {
      if (requestId === detailRequestRef.current) setDetailError(requestError.message || 'Không thể tải chi tiết lịch sử tiêm.');
    } finally {
      if (requestId === detailRequestRef.current) {
        setDetailLoading(false);
        setViewingId(null);
      }
    }
  }
  function openDetail(historyId) {
    setSelectedId(historyId);
    setDetail(null);
    setViewingId(historyId);
    loadDetail(historyId);
  }
  function closeDetail() {
    detailRequestRef.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
    setDetailLoading(false);
    setViewingId(null);
  }

  const customerName = currentUser?.ho_ten || 'Khách hàng';
  return <div className="customer-dashboard vaccination-history">
    <a href="#vh-main" className="cd-skip-link">Đến nội dung chính</a>
    <Sidebar activeMenu="history" onNavigate={onNavigate} />
    <div className="cd-workspace"><DashboardHeader customer={{ name: customerName, initials: initials(customerName) }} />
      <main id="vh-main" className="cd-main" tabIndex={-1}>
        <div className="cd-page-heading"><h1>Lịch sử tiêm</h1><p>Theo dõi các mũi tiêm đã hoàn thành của bạn và người thân</p></div>
        {error && <div className="vh-page-error" role="alert"><span>{error}</span><button type="button" className="cd-button" onClick={() => loadHistory()}>Thử lại</button></div>}
        <section className="cd-statistics vh-statistics" aria-label="Thống kê lịch sử tiêm">{statistics.map((stat) => <article className="cd-stat-card" key={stat.label}><div className="cd-stat-top"><h2>{stat.label}</h2><span className="cd-icon-box"><Icon name={stat.icon} /></span></div><strong className="cd-stat-value">{stat.value}</strong></article>)}</section>
        <section className="cd-panel vh-filters" aria-label="Lọc lịch sử tiêm"><div><label htmlFor="vh-patient">Người tiêm</label><select id="vh-patient" value={selectedProfile} disabled={Boolean(profilesError)} onChange={changeProfile}><option value="all">Tất cả hồ sơ</option>{profiles.map((profile) => <option key={profile.ma_ho_so} value={profile.ma_ho_so}>{profile.ho_ten}{profile.moi_quan_he ? ` · ${profile.moi_quan_he}` : ''}</option>)}</select>{profilesError && <p className="vh-filter-error" role="alert">{profilesError}</p>}</div><div><label htmlFor="vh-search">Tìm kiếm</label><input type="search" id="vh-search" placeholder="Tìm theo vắc xin, người tiêm hoặc số lô..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></section>
        {loading ? <section className="cd-panel vh-empty" role="status"><span className="cd-icon-box"><Icon name="history" /></span><h2>Đang tải lịch sử tiêm...</h2><p>Vui lòng chờ trong giây lát.</p></section> : !error && <><p className="vh-result-count" role="status">Hiển thị {visible.length} mũi tiêm</p>{visible.length ? <ol className="vh-timeline" aria-label="Lịch sử tiêm, mới nhất trước">{visible.map((record) => <HistoryCard key={record.ma_lich_su} record={record} viewing={viewingId === record.ma_lich_su} onView={() => openDetail(record.ma_lich_su)} />)}</ol> : <section className="cd-panel vh-empty"><span className="cd-icon-box"><Icon name="history" /></span><h2>{records.length ? 'Không tìm thấy lịch sử tiêm phù hợp' : 'Bạn chưa có lịch sử tiêm chủng.'}</h2><p>{records.length ? 'Thử thay đổi từ khóa tìm kiếm.' : 'Thông tin các mũi tiêm đã hoàn thành sẽ được hiển thị tại đây.'}</p></section>}</>}
        <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
      </main>
    </div>
    {selectedId != null && <HistoryDetailModal record={detail} loading={detailLoading} error={detailError} onRetry={() => loadDetail(selectedId)} onClose={closeDetail} />}
  </div>;
}
