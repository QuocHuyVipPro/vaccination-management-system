import { useEffect, useRef, useState } from 'react';
import { getStaffAppointments } from '../../services/staffAppointmentService.js';
import { getStaffVaccinationHistoryByProfile } from '../../services/staffVaccinationHistoryService.js';
import { getAvailableBatches, recordStaffVaccination } from '../../services/staffVaccinationService.js';
import { Icon } from '../customer/CustomerDashboard';
import { StaffSidebar, StaffHeader, DetailModal } from './StaffDashboard';
import './StaffVaccination.css';

const steps = ['Chọn lịch hẹn', 'Chọn mũi tiêm', 'Ghi nhận tiêm'];

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

function displayDate(value) {
  if (!value) return 'Không có';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function displayDateTime(value) {
  if (!value) return 'Không có';
  const [datePart, timePart = ''] = value.split(/[T ]/);
  return `${displayDate(datePart)}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
}

function itemName(item) {
  return `${item.ten_vac_xin} · ${item.ten_mui || `Mũi ${item.so_thu_tu_mui}`}`;
}

function Details({ fields }) {
  return <dl className="sv-details">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Không có'}</dd></div>)}</dl>;
}

function SuccessModal({ result, patientName, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={ref} className="sv-modal" aria-labelledby="sv-success-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><span className="sv-success-icon"><Icon name="check" /></span><h2 id="sv-success-title">Ghi nhận tiêm thành công!</h2><p>Backend đã lưu lịch sử tiêm và cập nhật tồn kho.</p></header>
    <Details fields={[
      ['Người tiêm', patientName],
      ['Vắc xin', result.ten_vac_xin],
      ['Mũi', `Mũi ${result.so_thu_tu_mui}`],
      ['Số lô', result.so_lo],
      ['Ngày tiêm', displayDateTime(result.ngay_tiem)],
      ['Mũi tiếp theo dự kiến', displayDate(result.ngay_du_kien_mui_tiep)],
      ['Trạng thái lịch hẹn', result.trang_thai_lich_hen],
    ]} />
    <footer><button type="button" className="cd-button cd-button-primary" onClick={onClose}>Đóng</button></footer>
  </dialog>;
}

export default function StaffVaccination({ currentUser, entry = {}, onNavigate }) {
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [recordedDetailIds, setRecordedDetailIds] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedDetailId, setSelectedDetailId] = useState('');
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [reaction, setReaction] = useState('');
  const [note, setNote] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const historyRequestRef = useRef(0);
  const batchRequestRef = useRef(0);
  const submitLockRef = useRef(false);

  async function loadRecordedItems(appointment) {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setHistoryLoading(true);
    setHistoryError('');
    setRecordedDetailIds(null);
    try {
      const records = await getStaffVaccinationHistoryByProfile(appointment.ma_ho_so);
      if (requestId === historyRequestRef.current) {
        setRecordedDetailIds(new Set((Array.isArray(records) ? records : []).map((record) => record.ma_chi_tiet_lich_hen)));
      }
    } catch (requestError) {
      if (requestId === historyRequestRef.current) setHistoryError(requestError.message || 'Không thể kiểm tra các mũi đã ghi nhận.');
    } finally {
      if (requestId === historyRequestRef.current) setHistoryLoading(false);
    }
  }

  function chooseAppointment(appointment) {
    setSelectedAppointmentId(String(appointment.ma_lich_hen));
    setSelectedDetailId('');
    setBatches([]);
    setSelectedBatchId('');
    setBatchesError('');
    setSubmitError('');
    loadRecordedItems(appointment);
  }

  async function loadAppointments() {
    setAppointmentsLoading(true);
    setAppointmentsError('');
    try {
      const result = await getStaffAppointments({ trangThai: 'DA_XAC_NHAN' });
      setAppointments(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setAppointments([]);
      setAppointmentsError(requestError.message || 'Không thể tải lịch hẹn đã xác nhận.');
    } finally {
      setAppointmentsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getStaffAppointments({ trangThai: 'DA_XAC_NHAN' })
      .then((result) => { if (active) setAppointments(Array.isArray(result) ? result : []); })
      .catch((requestError) => { if (active) setAppointmentsError(requestError.message || 'Không thể tải lịch hẹn đã xác nhận.'); })
      .finally(() => { if (active) setAppointmentsLoading(false); });
    return () => {
      active = false;
      historyRequestRef.current += 1;
      batchRequestRef.current += 1;
    };
  }, []);

  async function chooseItem(item) {
    setSelectedDetailId(String(item.ma_chi_tiet));
    setSelectedBatchId('');
    setBatches([]);
    setBatchesError('');
    setSubmitError('');
    const requestId = batchRequestRef.current + 1;
    batchRequestRef.current = requestId;
    setBatchesLoading(true);
    try {
      const result = await getAvailableBatches(item.ma_vac_xin);
      if (requestId === batchRequestRef.current) {
        const records = Array.isArray(result) ? result : [];
        setBatches([...records].sort((left, right) => String(left.han_su_dung).localeCompare(String(right.han_su_dung)) || left.ma_lo - right.ma_lo));
      }
    } catch (requestError) {
      if (requestId === batchRequestRef.current) setBatchesError(requestError.message || 'Không thể tải lô vắc xin khả dụng.');
    } finally {
      if (requestId === batchRequestRef.current) setBatchesLoading(false);
    }
  }

  const appointment = appointments.find((item) => item.ma_lich_hen === Number(selectedAppointmentId));
  const availableItems = appointment && recordedDetailIds
    ? appointment.items.filter((item) => !recordedDetailIds.has(item.ma_chi_tiet))
    : [];
  const selectedItem = appointment?.items.find((item) => item.ma_chi_tiet === Number(selectedDetailId));
  const selectedBatch = batches.find((batch) => batch.ma_lo === Number(selectedBatchId));
  const choices = appointments.filter((item) => {
    if (entry.patientId != null && item.ma_ho_so !== Number(entry.patientId)) return false;
    return normalize(`${item.ma_lich_hen} ${item.ho_ten}`).includes(normalize(search));
  });
  const activeStep = selectedItem ? 3 : appointment ? 2 : 1;

  async function submitVaccination() {
    if (submitLockRef.current) return;
    if (!appointment || !selectedItem || !selectedBatch) {
      setSubmitError('Vui lòng chọn đầy đủ lịch hẹn, mũi tiêm và lô vắc xin.');
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await recordStaffVaccination({
        ma_chi_tiet_lich_hen: selectedItem.ma_chi_tiet,
        ma_lo: selectedBatch.ma_lo,
        phan_ung_sau_tiem: reaction.trim() || null,
        ghi_chu: note.trim() || null,
      });
      setRecordedDetailIds((current) => new Set([...(current || []), selectedItem.ma_chi_tiet]));
      setSuccess({ result, patientName: appointment.ho_ten });
      setReaction('');
      setNote('');
      setSelectedDetailId('');
      setSelectedBatchId('');
      setBatches([]);
      const refreshed = await getStaffAppointments({ trangThai: 'DA_XAC_NHAN' });
      const records = Array.isArray(refreshed) ? refreshed : [];
      setAppointments(records);
      if (!records.some((item) => item.ma_lich_hen === appointment.ma_lich_hen)) setSelectedAppointmentId('');
    } catch (requestError) {
      setSubmitError(requestError.message || 'Không thể ghi nhận mũi tiêm.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  return <div className="customer-dashboard staff-dashboard staff-vaccination">
    <a href="#sv-main" className="cd-skip-link">Đến nội dung chính</a><StaffSidebar activePage="staff-vaccination" onNavigate={onNavigate} />
    <div className="cd-workspace"><StaffHeader currentUser={currentUser} onNotifications={() => setShowAlerts(true)} /><main className="cd-main" id="sv-main" tabIndex={-1}>
      <div className="cd-page-heading"><h1>Ghi nhận tiêm chủng</h1><p>Ghi nhận mũi tiêm bằng dữ liệu lịch hẹn và lô vắc xin thực tế</p></div>
      <ol className="sv-stepper" aria-label="Các bước ghi nhận tiêm">{steps.map((label, index) => <li key={label} className={index + 1 < activeStep ? 'sv-step-done' : index + 1 === activeStep ? 'sv-step-active' : ''} aria-current={index + 1 === activeStep ? 'step' : undefined}><span>{index + 1 < activeStep ? <Icon name="check" /> : index + 1}</span><strong>{label}</strong></li>)}</ol>
      {appointmentsError && <div className="sv-page-error" role="alert"><span>{appointmentsError}</span><button type="button" className="cd-button" onClick={loadAppointments}>Thử lại</button></div>}
      <section className="cd-panel sv-content">
        <div className="sv-section-heading"><h2>1. Chọn lịch hẹn đã xác nhận</h2><p>Chỉ các lịch có trạng thái Đã xác nhận được hiển thị.</p></div>
        {appointmentsLoading ? <div className="sv-empty" role="status"><Icon name="calendar" /><h3>Đang tải lịch hẹn...</h3></div> : !appointmentsError && <><label className="sv-field" htmlFor="sv-search"><span>Tìm lịch hẹn</span><input id="sv-search" type="search" placeholder="Tìm theo mã lịch hoặc tên người tiêm..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><fieldset className="sv-choices"><legend>Lịch đã xác nhận</legend>{choices.map((item) => <label className={`sv-choice${selectedAppointmentId === String(item.ma_lich_hen) ? ' sv-choice-selected' : ''}`} key={item.ma_lich_hen}><input type="radio" name="appointment" value={item.ma_lich_hen} checked={selectedAppointmentId === String(item.ma_lich_hen)} onChange={() => chooseAppointment(item)} /><span><small>Mã lịch #{item.ma_lich_hen}</small><strong>{item.ho_ten}</strong><span>{item.items.map(itemName).join(', ')}</span></span><span className="sv-choice-time">{displayDate(item.ngay_hen)}<small>{item.gio_hen.slice(0, 5)}</small></span></label>)}</fieldset>{!choices.length && <div className="sv-empty"><Icon name="calendar" /><h3>Không có lịch đã xác nhận phù hợp</h3><p>Kiểm tra lại từ khóa hoặc xác nhận lịch hẹn trước.</p></div>}</>}
      </section>
      {appointment && <section className="cd-panel sv-content"><div className="sv-section-heading"><h2>2. Chọn mũi cần ghi nhận</h2><p>Mỗi lựa chọn sử dụng mã chi tiết lịch hẹn thật.</p></div><div className="sv-grid"><section className="sv-info-card"><h3>Người tiêm</h3><Details fields={[[ 'Mã hồ sơ', appointment.ma_ho_so], ['Họ tên', appointment.ho_ten], ['Ngày sinh', displayDate(appointment.ngay_sinh)], ['Số điện thoại', appointment.so_dien_thoai || 'Chưa cập nhật']]} /></section><section className="sv-info-card"><h3>Lịch hẹn</h3><Details fields={[[ 'Mã lịch', appointment.ma_lich_hen], ['Ngày hẹn', displayDate(appointment.ngay_hen)], ['Giờ hẹn', appointment.gio_hen.slice(0, 5)], ['Ghi chú', appointment.ghi_chu || 'Không có']]} /></section></div>{historyLoading ? <p className="sv-data-state" role="status">Đang kiểm tra các mũi đã ghi nhận...</p> : historyError ? <div className="sv-data-state sv-request-error" role="alert"><p>{historyError}</p><button type="button" className="cd-button" onClick={() => loadRecordedItems(appointment)}>Thử lại</button></div> : <fieldset className="sv-item-choices"><legend>Mũi chưa ghi nhận</legend>{availableItems.map((item) => <label className={`sv-item-choice${selectedDetailId === String(item.ma_chi_tiet) ? ' sv-item-selected' : ''}`} key={item.ma_chi_tiet}><input type="radio" name="appointment-item" value={item.ma_chi_tiet} checked={selectedDetailId === String(item.ma_chi_tiet)} onChange={() => chooseItem(item)} /><span><strong>{item.ten_vac_xin}</strong><small>{item.ten_mui || `Mũi ${item.so_thu_tu_mui}`} · Chi tiết #{item.ma_chi_tiet}</small></span></label>)}</fieldset>}{!historyLoading && !historyError && !availableItems.length && <p className="sv-notice">Tất cả mũi trong lịch hẹn này đã được ghi nhận.</p>}</section>}
      {selectedItem && <section className="cd-panel sv-content"><div className="sv-section-heading"><h2>3. Chọn lô và ghi nhận</h2><p>Danh sách lô đã được lọc theo đúng vắc xin và sắp xếp FEFO.</p></div><div className="sv-form"><div className="sv-grid"><label className="sv-field">Vắc xin<input value={selectedItem.ten_vac_xin} readOnly /></label><label className="sv-field">Mũi tiêm<input value={selectedItem.ten_mui || `Mũi ${selectedItem.so_thu_tu_mui}`} readOnly /></label><div className="sv-field"><label htmlFor="sv-batch">Lô vắc xin *</label><select id="sv-batch" required disabled={batchesLoading || submitting} value={selectedBatchId} onChange={(event) => { setSelectedBatchId(event.target.value); setSubmitError(''); }}><option value="">{batchesLoading ? 'Đang tải lô...' : 'Chọn lô vắc xin'}</option>{batches.map((batch) => <option key={batch.ma_lo} value={batch.ma_lo}>{batch.so_lo} — HSD: {displayDate(batch.han_su_dung)} — Còn: {batch.so_luong_con}</option>)}</select>{batchesError && <div className="sv-request-error" role="alert"><p>{batchesError}</p><button type="button" className="cd-button" onClick={() => chooseItem(selectedItem)}>Thử lại</button></div>}{!batchesLoading && !batchesError && !batches.length && <p className="sv-error">Không có lô đủ điều kiện sử dụng.</p>}</div></div>{selectedBatch && <section className="sv-batch-info"><Details fields={[[ 'Số lô', selectedBatch.so_lo], ['Hạn sử dụng', displayDate(selectedBatch.han_su_dung)], ['Số lượng còn', `${selectedBatch.so_luong_con} liều`], ['Trạng thái', selectedBatch.trang_thai]]} /></section>}<div className="sv-grid"><label className="sv-field">Phản ứng sau tiêm<textarea rows={3} disabled={submitting} placeholder="Nhập nếu có..." value={reaction} onChange={(event) => setReaction(event.target.value)} /></label><label className="sv-field">Ghi chú<textarea rows={3} disabled={submitting} placeholder="Nhập ghi chú nếu có..." value={note} onChange={(event) => setNote(event.target.value)} /></label></div>{submitError && <p className="sv-submit-error" role="alert">{submitError}</p>}<div className="sv-actions"><button type="button" className="cd-button cd-button-primary sv-finish" disabled={submitting || !selectedBatch} onClick={submitVaccination}>{submitting ? 'Đang ghi nhận...' : 'Ghi nhận tiêm'}</button></div></div></section>}
      <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
    </main></div>
    {success && <SuccessModal result={success.result} patientName={success.patientName} onClose={() => setSuccess(null)} />}
    {showAlerts && <DetailModal onClose={() => setShowAlerts(false)} />}
  </div>;
}
