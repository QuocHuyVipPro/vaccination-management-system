import { useEffect, useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import { StaffSidebar, StaffHeader, DetailModal } from './StaffDashboard';
import { availableBatches, patientFor, validateVaccination } from './vaccinationState';
import './StaffVaccination.css';

const steps = ['Chọn lịch hẹn', 'Kiểm tra thông tin', 'Ghi nhận tiêm', 'Xác nhận'];
const isoDate = (date) => date.split('/').reverse().join('-');
const displayDate = (date) => date ? date.split('-').reverse().join('/') : 'Không có';
const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
function Details({ fields }) {
  return <dl className="sv-details">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Không có'}</dd></div>)}</dl>;
}
function SuccessModal({ record, onNavigate, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={ref} className="sv-modal" aria-labelledby="sv-success-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><span className="sv-success-icon"><Icon name="check" /></span><h2 id="sv-success-title">Ghi nhận tiêm thành công!</h2><p>Mũi tiêm đã được ghi nhận vào lịch sử tiêm chủng.</p></header>
    <Details fields={[[ 'Người tiêm', record.patientName], ['Vắc xin', record.vaccine], ['Mũi', record.dose], ['Số lô', record.batchNumber], ['Ngày tiêm', displayDate(record.vaccinationDate)]]} />
    <footer><button type="button" className="cd-button sv-history" onClick={() => onNavigate('staff-history', { patientId: record.patientId })}>Xem lịch sử tiêm</button><button type="button" className="cd-button cd-button-primary sv-dashboard" onClick={() => onNavigate('staff-dashboard')}>Về tổng quan</button></footer>
  </dialog>;
}

export default function StaffVaccination({ entry = {}, state, onComplete, onNavigate }) {
  const preselected = state.appointments.find((item) => item.id === entry.appointmentId && item.status === 'confirmed');
  const [currentStep, setCurrentStep] = useState(preselected ? 2 : 1);
  const [selectedAppointment, setSelectedAppointment] = useState(preselected?.id || '');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [vaccinationDate, setVaccinationDate] = useState(preselected ? isoDate(preselected.date) : '');
  const [reaction, setReaction] = useState('Không ghi nhận');
  const [note, setNote] = useState('');
  const [hasNextDose, setHasNextDose] = useState(false);
  const [nextDoseDate, setNextDoseDate] = useState('');
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const submitted = useRef(false);
  const stepHeading = useRef(null);
  const appointment = state.appointments.find((item) => item.id === selectedAppointment);
  const patient = appointment ? patientFor(appointment) : null;
  const eligibleBatches = availableBatches(state.batches, appointment?.vaccine, vaccinationDate);
  const batch = state.batches.find((item) => item.id === Number(selectedBatch));
  const record = state.records.find((item) => item.appointmentId === selectedAppointment);
  const choices = state.appointments.filter((item) => item.status === 'confirmed' && (!entry.patientId || patientFor(item).id === entry.patientId) && normalize(`${item.id} ${item.patientName}`).includes(normalize(search)));
  const draft = { appointmentId: selectedAppointment, batchId: Number(selectedBatch), vaccinationDate, reaction: reaction.trim() || 'Không ghi nhận', note: note.trim(), hasNextDose, nextDoseDate };
  useEffect(() => { stepHeading.current?.focus(); }, [currentStep]);
  function choose(item) {
    if (item.id !== selectedAppointment) {
      setSelectedAppointment(item.id); setSelectedBatch(''); setVaccinationDate(isoDate(item.date));
      setReaction('Không ghi nhận'); setNote(''); setHasNextDose(false); setNextDoseDate('');
    }
    setErrors({});
  }
  function advance() {
    if (!appointment || appointment.status !== 'confirmed') { setErrors({ appointment: 'Vui lòng chọn lịch hẹn đã xác nhận.' }); return; }
    if (currentStep === 3) {
      const nextErrors = validateVaccination(state, draft);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
    }
    setErrors({}); setCurrentStep((step) => step + 1);
  }
  function finish() {
    if (submitted.current || record) return;
    const nextErrors = validateVaccination(state, draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setCurrentStep(3); return; }
    submitted.current = true;
    onComplete(draft);
    setShowSuccess(true);
  }
  const fieldError = (key) => errors[key] && <p id={`sv-${key}-error`} className="sv-error">{errors[key]}</p>;
  return <div className="customer-dashboard staff-dashboard staff-vaccination">
    <a href="#sv-main" className="cd-skip-link">Đến nội dung chính</a><StaffSidebar activePage="staff-vaccination" onNavigate={onNavigate} />
    <div className="cd-workspace"><StaffHeader onNotifications={() => setShowAlerts(true)} /><main className="cd-main" id="sv-main" tabIndex={-1}>
      <div className="cd-page-heading"><h1>Ghi nhận tiêm chủng</h1><p>Ghi nhận thông tin mũi tiêm đã thực hiện cho người tiêm</p></div>
      <ol className="sv-stepper" aria-label="Các bước ghi nhận tiêm">{steps.map((label, index) => <li key={label} className={index + 1 < currentStep || record ? 'sv-step-done' : index + 1 === currentStep ? 'sv-step-active' : ''} aria-current={index + 1 === currentStep ? 'step' : undefined}><span>{index + 1 < currentStep || record ? <Icon name="check" /> : index + 1}</span><strong>{label}</strong></li>)}</ol>
      <section className="cd-panel sv-content" aria-labelledby="sv-step-title">
        <div className="sv-section-heading"><h2 id="sv-step-title" ref={stepHeading} tabIndex={-1}>{['Chọn lịch hẹn', 'Kiểm tra thông tin', 'Thông tin thực hiện tiêm', 'Xác nhận ghi nhận tiêm'][currentStep - 1]}</h2>{currentStep === 1 && <p>Chọn lịch đã được xác nhận để thực hiện ghi nhận tiêm chủng</p>}{currentStep === 4 && <p>Kiểm tra lại thông tin trước khi hoàn thành</p>}</div>
        {Object.keys(errors).length > 0 && <p className="sv-error" role="alert">{errors.appointment || 'Vui lòng kiểm tra các thông tin được đánh dấu bên dưới.'}</p>}
        {currentStep === 1 && <>
          {entry.appointmentId && !preselected && <p className="sv-notice">Lịch được yêu cầu không còn ở trạng thái đã xác nhận. Vui lòng chọn lịch khác.</p>}
          {entry.patientId && <p className="sv-notice">Đang hiển thị lịch đã xác nhận của người tiêm được chọn.</p>}
          <label className="sv-field" htmlFor="sv-search"><span>Tìm lịch hẹn</span><input id="sv-search" type="search" placeholder="Tìm theo mã lịch hoặc tên người tiêm..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <fieldset className="sv-choices"><legend>Lịch đã xác nhận</legend>{choices.map((item) => <label className={`sv-choice${selectedAppointment === item.id ? ' sv-choice-selected' : ''}`} key={item.id}><input type="radio" name="appointment" value={item.id} checked={selectedAppointment === item.id} onChange={() => choose(item)} /><span><small>{item.id}</small><strong>{item.patientName}</strong><span>{item.vaccine} · {item.dose}</span></span><span className="sv-choice-time">{item.date}<small>{item.time}</small></span></label>)}</fieldset>
          {!choices.length && <div className="sv-empty"><Icon name="calendar" /><h3>Không tìm thấy lịch đã xác nhận</h3><p>Kiểm tra lại từ khóa hoặc danh sách lịch hẹn.</p></div>}
        </>}
        {currentStep === 2 && appointment && <>
          {patient.allergies && !['Không ghi nhận', 'Chưa cập nhật'].includes(patient.allergies) && <div className="sv-warning"><strong>Lưu ý dị ứng</strong><p>{patient.allergies}</p></div>}
          <div className="sv-grid"><section className="sv-info-card"><h3>Thông tin người tiêm</h3><Details fields={[[ 'Họ tên', patient.fullName], ['Ngày sinh', patient.dateOfBirth], ['Giới tính', patient.gender], ['Số điện thoại', patient.phone], ['Người giám hộ', patient.guardian || 'Không có'], ['Dị ứng', patient.allergies], ['Ghi chú sức khỏe', patient.healthNotes || 'Không có ghi chú đặc biệt']]} /></section><section className="sv-info-card"><h3>Thông tin lịch tiêm</h3><Details fields={[[ 'Mã lịch', appointment.id], ['Vắc xin', appointment.vaccine], ['Mũi', appointment.dose], ['Ngày hẹn', appointment.date], ['Giờ', appointment.time]]} /></section></div>
        </>}
        {currentStep === 3 && appointment && <div className="sv-form">
          <div className="sv-grid"><label className="sv-field">Vắc xin<input value={appointment.vaccine} readOnly /></label><label className="sv-field">Mũi tiêm<input value={appointment.dose} readOnly /></label>
            <div className="sv-field"><label htmlFor="sv-date">Ngày tiêm *</label><input id="sv-date" type="date" required value={vaccinationDate} aria-invalid={!!errors.date} aria-describedby={errors.date ? 'sv-date-error' : undefined} onChange={(event) => { setVaccinationDate(event.target.value); setSelectedBatch(''); }} />{fieldError('date')}</div>
            <div className="sv-field"><label htmlFor="sv-batch">Lô vắc xin *</label><select id="sv-batch" required value={selectedBatch} aria-invalid={!!errors.batch} aria-describedby={errors.batch ? 'sv-batch-error' : undefined} onChange={(event) => setSelectedBatch(event.target.value)}><option value="">Chọn lô vắc xin</option>{eligibleBatches.map((item) => <option key={item.id} value={item.id}>{item.batchNumber} — HSD: {displayDate(item.expiryDate)} — Còn: {item.remainingQuantity}</option>)}</select>{fieldError('batch')}{!eligibleBatches.length && <p className="sv-error">Không có lô phù hợp còn hạn và còn hàng.</p>}</div></div>
          {batch && eligibleBatches.some((item) => item.id === batch.id) && <section className="sv-batch-info"><Details fields={[[ 'Số lô', batch.batchNumber], ['Hạn sử dụng', displayDate(batch.expiryDate)], ['Số lượng còn', `${batch.remainingQuantity} liều`], ['Trạng thái', 'Có thể sử dụng']]} /></section>}
          <div className="sv-grid"><label className="sv-field">Phản ứng sau tiêm<textarea id="sv-reaction" rows={3} placeholder="Nhập phản ứng sau tiêm nếu có..." value={reaction} onChange={(event) => setReaction(event.target.value)} /></label><label className="sv-field">Ghi chú<textarea id="sv-note" rows={3} placeholder="Nhập ghi chú của nhân viên..." value={note} onChange={(event) => setNote(event.target.value)} /></label></div>
          <section className="sv-next-dose"><h3>Mũi tiếp theo</h3><label className="sv-checkbox"><input id="sv-has-next" type="checkbox" checked={hasNextDose} onChange={(event) => setHasNextDose(event.target.checked)} />Có mũi tiêm tiếp theo</label>{hasNextDose && <div className="sv-field"><label htmlFor="sv-next-date">Ngày dự kiến mũi tiếp theo *</label><input id="sv-next-date" type="date" required value={nextDoseDate} aria-invalid={!!errors.nextDate} aria-describedby={`sv-next-help${errors.nextDate ? ' sv-nextDate-error' : ''}`} onChange={(event) => setNextDoseDate(event.target.value)} /><p id="sv-next-help" className="sv-helper">Ngày này sẽ được sử dụng để tạo nhắc lịch cho người dùng.</p>{fieldError('nextDate')}</div>}</section>
        </div>}
        {currentStep === 4 && appointment && batch && <>
          <div className="sv-summary sv-grid">{[
            ['Người tiêm', [['Họ tên', patient.fullName], ['Ngày sinh', patient.dateOfBirth]]],
            ['Vắc xin', [['Vắc xin', appointment.vaccine], ['Mũi', appointment.dose]]],
            ['Lô vắc xin', [['Số lô', batch.batchNumber], ['HSD', displayDate(batch.expiryDate)]]],
            ['Thực hiện', [['Ngày tiêm', displayDate(vaccinationDate)], ['Nhân viên', 'Trần Thị Lan']]],
            ['Phản ứng sau tiêm', [['Phản ứng', draft.reaction], ['Ghi chú', draft.note || 'Không có']]],
            ['Mũi tiếp theo', [['Ngày dự kiến', hasNextDose ? displayDate(nextDoseDate) : 'Không có']]],
          ].map(([title, fields]) => <section className="sv-info-card" key={title}><h3>{title}</h3><Details fields={fields} /></section>)}</div>
          <p className="sv-notice">Vui lòng kiểm tra kỹ thông tin trước khi xác nhận. Sau khi hoàn thành, mũi tiêm sẽ được ghi nhận vào lịch sử tiêm chủng.</p>
        </>}
        <div className="sv-actions">{!record && currentStep > 1 && <button type="button" className="cd-button sv-back" onClick={() => { setErrors({}); setCurrentStep((step) => step - 1); }}>Quay lại</button>}{record ? <button type="button" className="cd-button cd-button-primary" onClick={() => setShowSuccess(true)}>Xem kết quả ghi nhận</button> : currentStep < 4 ? <button type="button" className="cd-button cd-button-primary sv-next" onClick={advance}>Tiếp tục<Icon name="arrow" /></button> : <button type="button" className="cd-button cd-button-primary sv-finish" onClick={finish}>Hoàn thành tiêm</button>}</div>
      </section>
      <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
    </main></div>
    {showSuccess && record && <SuccessModal record={record} onNavigate={onNavigate} onClose={() => setShowSuccess(false)} />}
    {showAlerts && <DetailModal onClose={() => setShowAlerts(false)} />}
  </div>;
}
