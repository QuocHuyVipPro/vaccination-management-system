import { useEffect, useRef, useState } from 'react';
import { getStaffPatients } from '../../services/staffPatientService.js';
import { getStaffVaccinationHistoryByProfile } from '../../services/staffVaccinationHistoryService.js';
import { Icon } from '../customer/CustomerDashboard';
import { StaffSidebar, StaffHeader, DetailModal } from './StaffDashboard';
import './StaffPatients.css';

const genderLabels = { NAM: 'Nam', NU: 'Nữ', KHAC: 'Khác' };

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
}

function initials(name) {
  const words = String(name || 'Người tiêm').trim().split(/\s+/);
  return `${words[0][0]}${words.length > 1 ? words.at(-1)[0] : ''}`.toLocaleUpperCase('vi');
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  const [datePart, timePart = ''] = value.split(/[T ]/);
  return `${formatDate(datePart)}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
}

function filterPatients(patients, search, gender) {
  const query = normalize(search);
  const phoneQuery = String(search).replace(/\D/g, '');
  return patients.filter((patient) => {
    if (gender !== 'all' && patient.gioi_tinh !== gender) return false;
    if (!query) return true;
    const textMatch = normalize(`${patient.ma_ho_so} ${patient.ho_ten}`).includes(query);
    const phone = String(patient.so_dien_thoai || '').replace(/\D/g, '');
    return textMatch || (phoneQuery && phone.includes(phoneQuery));
  });
}

function HistoryItem({ record }) {
  return <li className="sp-history-item"><div className="sp-history-heading"><div><strong>{record.ten_vac_xin}</strong><span>Mũi {record.so_thu_tu_mui}</span></div><time dateTime={record.ngay_tiem}>{formatDateTime(record.ngay_tiem)}</time></div><dl><div><dt>Số lô</dt><dd>{record.so_lo}</dd></div><div><dt>Mũi tiếp theo dự kiến</dt><dd>{formatDate(record.ngay_du_kien_mui_tiep)}</dd></div><div><dt>Phản ứng sau tiêm</dt><dd>{record.phan_ung_sau_tiem || 'Không ghi nhận'}</dd></div><div><dt>Ghi chú</dt><dd>{record.ghi_chu || 'Không có'}</dd></div></dl></li>;
}

function PatientModal({ patient, history, historyLoading, historyError, onRetryHistory, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const fields = [
    ['Mã hồ sơ', patient.ma_ho_so],
    ['Họ và tên', patient.ho_ten],
    ['Ngày sinh', formatDate(patient.ngay_sinh)],
    ['Giới tính', genderLabels[patient.gioi_tinh] || patient.gioi_tinh || 'Chưa cập nhật'],
    ['Số điện thoại', patient.so_dien_thoai || 'Chưa cập nhật'],
    ['Số lịch hẹn liên quan', patient.appointment_count],
  ];
  return <dialog ref={ref} className="sp-modal" aria-labelledby="sp-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id="sp-modal-title">Hồ sơ người tiêm</h2><button type="button" className="sp-close" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>
    <div className="sp-modal-body"><section><h3>Thông tin hồ sơ</h3><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><section aria-labelledby="sp-history-title"><h3 id="sp-history-title">Lịch sử tiêm chủng</h3>{historyLoading ? <p className="sp-history-state" role="status">Đang tải lịch sử tiêm...</p> : historyError ? <div className="sp-history-state sp-request-error" role="alert"><p>{historyError}</p><button type="button" className="cd-button" onClick={onRetryHistory}>Thử lại</button></div> : history?.length ? <ol className="sp-history-list">{history.map((record) => <HistoryItem key={record.ma_lich_su} record={record} />)}</ol> : <p className="sp-history-state">Hồ sơ này chưa có lịch sử tiêm.</p>}</section></div>
    <footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer>
  </dialog>;
}

export default function StaffPatients({ currentUser, onNavigate }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [showAlerts, setShowAlerts] = useState(false);
  const historyRequestRef = useRef(0);

  async function loadPatients() {
    setLoading(true);
    setError('');
    try {
      setPatients(await getStaffPatients());
    } catch (requestError) {
      setPatients([]);
      setError(requestError.message || 'Không thể tải danh sách người tiêm.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getStaffPatients()
      .then((result) => { if (active) setPatients(result); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Không thể tải danh sách người tiêm.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; historyRequestRef.current += 1; };
  }, []);

  async function loadHistory(profileId) {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await getStaffVaccinationHistoryByProfile(profileId);
      if (requestId === historyRequestRef.current) setHistory(Array.isArray(result) ? result : []);
    } catch (requestError) {
      if (requestId === historyRequestRef.current) {
        setHistory(null);
        setHistoryError(requestError.message || 'Không thể tải lịch sử tiêm.');
      }
    } finally {
      if (requestId === historyRequestRef.current) setHistoryLoading(false);
    }
  }

  function openPatient(patient) {
    setSelected(patient);
    setHistory(null);
    setHistoryError('');
    loadHistory(patient.ma_ho_so);
  }

  function closePatient() {
    historyRequestRef.current += 1;
    setSelected(null);
    setHistory(null);
    setHistoryError('');
    setHistoryLoading(false);
  }

  const visible = filterPatients(patients, search, gender);
  const statistics = [
    ['Tổng hồ sơ', patients.length, 'users'],
    ['Tổng lịch liên quan', patients.reduce((sum, patient) => sum + patient.appointment_count, 0), 'calendar'],
    ['Có số điện thoại', patients.filter((patient) => patient.so_dien_thoai).length, 'vaccine'],
  ];
  return <div className="customer-dashboard staff-dashboard staff-patients">
    <a href="#sp-main" className="cd-skip-link">Đến nội dung chính</a>
    <StaffSidebar activePage="staff-patients" onNavigate={onNavigate} />
    <div className="cd-workspace"><StaffHeader currentUser={currentUser} onNotifications={() => setShowAlerts(true)} />
      <main id="sp-main" className="cd-main" tabIndex={-1}>
        <div className="cd-page-heading"><h1>Tra cứu người tiêm</h1><p>Tìm kiếm và xem thông tin hồ sơ người tiêm chủng</p></div>
        <p className="sp-source-note">Danh sách hiện gồm các hồ sơ đã xuất hiện trong lịch hẹn.</p>
        {error && <div className="sp-page-error" role="alert"><span>{error}</span><button type="button" className="cd-button" onClick={loadPatients}>Thử lại</button></div>}
        <section className="cd-statistics sp-statistics" aria-label="Thống kê hồ sơ">{statistics.map(([label, count, icon]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name={icon} /></span></div><strong className="cd-stat-value">{count}</strong></article>)}</section>
        <section className="cd-panel sp-filters" aria-label="Tìm kiếm người tiêm"><div><label htmlFor="sp-search">Tìm người tiêm</label><div className="sp-search-box"><svg className="cd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input id="sp-search" type="search" placeholder="Tìm theo mã hồ sơ, họ tên hoặc số điện thoại..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></div><div><label htmlFor="sp-gender">Giới tính</label><select id="sp-gender" value={gender} onChange={(event) => setGender(event.target.value)}><option value="all">Tất cả</option><option value="NAM">Nam</option><option value="NU">Nữ</option><option value="KHAC">Khác</option></select></div></section>
        {loading ? <section className="cd-panel sp-empty" role="status"><span className="cd-icon-box"><Icon name="users" /></span><h2>Đang tải người tiêm...</h2><p>Vui lòng chờ trong giây lát.</p></section> : !error && <><p className="sp-count" role="status">Hiển thị {visible.length} / {patients.length} hồ sơ</p>{visible.length ? <div className="sp-table-card"><table className="sp-table"><caption>Danh sách người tiêm</caption><thead><tr>{['Mã hồ sơ', 'Người tiêm', 'Ngày sinh', 'Giới tính', 'Số điện thoại', 'Lịch hẹn', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((patient) => <tr key={patient.ma_ho_so}><td data-label="Mã hồ sơ" className="sp-profile-id">{patient.ma_ho_so}</td><td data-label="Người tiêm"><div className="sp-person"><span className="cd-avatar" aria-hidden="true">{initials(patient.ho_ten)}</span><strong>{patient.ho_ten}</strong></div></td><td data-label="Ngày sinh">{formatDate(patient.ngay_sinh)}</td><td data-label="Giới tính">{genderLabels[patient.gioi_tinh] || patient.gioi_tinh || 'Chưa cập nhật'}</td><td data-label="Số điện thoại">{patient.so_dien_thoai || 'Chưa cập nhật'}</td><td data-label="Lịch hẹn">{patient.appointment_count}</td><td data-label="Thao tác"><button type="button" className="cd-text-button sp-view" aria-label={`Xem hồ sơ ${patient.ho_ten}`} onClick={() => openPatient(patient)}>Xem hồ sơ</button></td></tr>)}</tbody></table></div> : <section className="cd-panel sp-empty"><span className="cd-icon-box"><Icon name="users" /></span><h2>{patients.length ? 'Không tìm thấy người tiêm' : 'Chưa có người tiêm.'}</h2><p>{patients.length ? 'Vui lòng kiểm tra lại mã hồ sơ, họ tên hoặc số điện thoại.' : 'Chưa có hồ sơ nào xuất hiện trong lịch hẹn.'}</p></section>}</>}
        <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
      </main>
    </div>
    {selected && <PatientModal patient={selected} history={history} historyLoading={historyLoading} historyError={historyError} onRetryHistory={() => loadHistory(selected.ma_ho_so)} onClose={closePatient} />}
    {showAlerts && <DetailModal onClose={() => setShowAlerts(false)} />}
  </div>;
}
