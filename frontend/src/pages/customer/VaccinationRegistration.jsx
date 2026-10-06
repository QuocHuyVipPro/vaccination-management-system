import { useEffect, useRef, useState } from 'react';
import { createAppointment } from '../../services/appointmentService.js';
import { getProfiles } from '../../services/profileService.js';
import { getVaccines, getVaccineSchedule } from '../../services/vaccineService.js';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import './VaccinationRegistration.css';

const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
const steps = ['Người tiêm', 'Vắc xin', 'Thời gian', 'Xác nhận'];
const headings = [
  ['Chọn người tiêm', 'Vui lòng chọn hồ sơ cần đăng ký tiêm chủng'],
  ['Chọn vắc xin và mũi tiêm', 'Chọn loại vắc xin và mũi tiêm phù hợp'],
  ['Chọn thời gian tiêm', 'Chọn ngày và khung giờ phù hợp với bạn'],
  ['Xác nhận đăng ký', 'Vui lòng kiểm tra lại thông tin trước khi xác nhận'],
];
const genderLabels = { NAM: 'Nam', NU: 'Nữ', KHAC: 'Khác' };

function todayInVietnam() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
}
function validSchedule(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !timeSlots.includes(time)) return false;
  const timestamp = Date.parse(`${date}T${time}:00+07:00`);
  return !Number.isNaN(timestamp) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date && timestamp > Date.now();
}
function money(value) { return value == null ? 'Chưa cập nhật' : `${Number(value).toLocaleString('vi-VN')}đ`; }
function displayDate(value) { return value?.split('-').reverse().join('/') || 'Chưa cập nhật'; }
function displayTime(value) { return value?.slice(0, 5) || ''; }
function normalizeSearch(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim(); }
function initials(name) { return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase(); }

function Stepper({ currentStep }) {
  return <ol className="vr-stepper" aria-label="Các bước đăng ký">{steps.map((label, index) => <li key={label} className={index + 1 === currentStep ? 'vr-step-active' : index + 1 < currentStep ? 'vr-step-complete' : ''} aria-current={index + 1 === currentStep ? 'step' : undefined}><span className="vr-step-number">{index + 1 < currentStep ? <Icon name="check" /> : index + 1}</span><span>{label}</span></li>)}</ol>;
}

function ProfileSelection({ profiles, loading, error, onRetry, selectedProfile, onSelect }) {
  if (loading) return <p className="vr-api-state" role="status">Đang tải hồ sơ người tiêm...</p>;
  if (error) return <div className="vr-api-state vr-api-error" role="alert"><p>{error}</p><button type="button" className="cd-button" onClick={onRetry}>Thử lại</button></div>;
  if (!profiles.length) return <p className="vr-empty" role="status">Bạn chưa có hồ sơ người tiêm. Vui lòng tạo hồ sơ trước khi đăng ký lịch.</p>;
  return <div className="vr-grid" role="group" aria-label="Chọn một người tiêm">{profiles.map((profile) => <button type="button" key={profile.ma_ho_so} className={`vr-choice vr-profile${selectedProfile?.ma_ho_so === profile.ma_ho_so ? ' vr-selected' : ''}`} aria-pressed={selectedProfile?.ma_ho_so === profile.ma_ho_so} onClick={() => onSelect(profile)}><span className="vr-choice-top"><span className="cd-avatar">{initials(profile.ho_ten)}</span><span className="vr-check">{selectedProfile?.ma_ho_so === profile.ma_ho_so && <Icon name="check" />}</span></span><strong>{profile.ho_ten}</strong><span className="cd-relation">{profile.moi_quan_he || 'Người tiêm'}</span><span className="vr-profile-info"><span>Ngày sinh: {displayDate(profile.ngay_sinh)}</span><span>Giới tính: {genderLabels[profile.gioi_tinh] || 'Chưa cập nhật'}</span></span></button>)}</div>;
}

function VaccineSchedule({ vaccine, schedule, loading, error, onRetry, selectedDose, onSelectDose }) {
  if (!vaccine) return null;
  return <section className="vr-vaccine-schedule" aria-labelledby="vr-schedule-title">
    <h3 id="vr-schedule-title">Chọn mũi tiêm *</h3>
    {loading && <p className="vr-api-state" role="status">Đang tải phác đồ tiêm...</p>}
    {!loading && error && <div className="vr-api-state vr-api-error" role="alert"><p>{error}</p><button type="button" className="cd-button" onClick={onRetry}>Thử lại</button></div>}
    {!loading && !error && !schedule.length && <p className="vr-api-state" role="status">Vắc xin này chưa có phác đồ tiêm nên chưa thể đăng ký lịch.</p>}
    {!loading && !error && schedule.length > 0 && <div className="vr-schedule-list" role="radiogroup" aria-label="Chọn mũi tiêm">{schedule.map((dose) => <button type="button" role="radio" aria-checked={selectedDose?.ma_phac_do === dose.ma_phac_do} className={`vr-dose${selectedDose?.ma_phac_do === dose.ma_phac_do ? ' vr-dose-selected' : ''}`} key={dose.ma_phac_do} onClick={() => onSelectDose(dose)}><span>{dose.so_thu_tu_mui}</span><div><strong>{dose.ten_mui || `Mũi ${dose.so_thu_tu_mui}`}</strong><p>{dose.khoang_cach_ngay === 0 ? 'Bắt đầu phác đồ' : `Cách mũi trước ${dose.khoang_cach_ngay} ngày`}</p>{dose.mo_ta && <p>{dose.mo_ta}</p>}</div><span className="vr-check">{selectedDose?.ma_phac_do === dose.ma_phac_do && <Icon name="check" />}</span></button>)}</div>}
  </section>;
}

function VaccineSelection({ vaccines, loading, error, onRetry, selectedVaccine, onSelect, schedule, scheduleLoading, scheduleError, onScheduleRetry, selectedDose, onSelectDose }) {
  const [search, setSearch] = useState('');
  const filtered = vaccines.filter((vaccine) => normalizeSearch(`${vaccine.ten_vac_xin} ${vaccine.phong_benh || ''} ${vaccine.nha_san_xuat || ''} ${vaccine.quoc_gia_san_xuat || ''}`).includes(normalizeSearch(search)));
  return <><label className="vr-search-label" htmlFor="vr-search">Tìm kiếm vắc xin</label><input id="vr-search" className="vr-input vr-search" type="search" placeholder="Tìm kiếm vắc xin..." value={search} onChange={(event) => setSearch(event.target.value)} />
    {loading && <p className="vr-api-state" role="status">Đang tải danh sách vắc xin...</p>}
    {!loading && error && <div className="vr-api-state vr-api-error" role="alert"><p>{error}</p><button type="button" className="cd-button" onClick={onRetry}>Thử lại</button></div>}
    {!loading && !error && <div className="vr-grid" role="group" aria-label="Chọn một vắc xin">{filtered.map((vaccine) => <button type="button" className={`vr-choice${selectedVaccine?.ma_vac_xin === vaccine.ma_vac_xin ? ' vr-selected' : ''}`} key={vaccine.ma_vac_xin} aria-pressed={selectedVaccine?.ma_vac_xin === vaccine.ma_vac_xin} onClick={() => onSelect(vaccine)}><span className="vr-choice-top"><span className="cd-badge">Đang sử dụng</span><span className="vr-check">{selectedVaccine?.ma_vac_xin === vaccine.ma_vac_xin && <Icon name="check" />}</span></span><strong>{vaccine.ten_vac_xin}</strong><span className="vr-vaccine-info">Phòng bệnh: {vaccine.phong_benh || 'Chưa cập nhật'}</span><span className="vr-vaccine-info">Nhà sản xuất: {vaccine.nha_san_xuat || 'Chưa cập nhật'}</span><span className="vr-vaccine-info">Xuất xứ: {vaccine.quoc_gia_san_xuat || 'Chưa cập nhật'}</span><span className="vr-price">{money(vaccine.gia)}</span></button>)}</div>}
    {!loading && !error && vaccines.length === 0 && <p className="vr-empty" role="status">Hiện chưa có vắc xin khả dụng.</p>}
    {!loading && !error && vaccines.length > 0 && !filtered.length && <p className="vr-empty" role="status">Không tìm thấy vắc xin phù hợp. Hãy thử từ khóa khác.</p>}
    <VaccineSchedule vaccine={selectedVaccine} schedule={schedule} loading={scheduleLoading} error={scheduleError} onRetry={onScheduleRetry} selectedDose={selectedDose} onSelectDose={onSelectDose} />
  </>;
}

function ScheduleSelection({ selectedDate, selectedTime, note, onDate, onTime, onNote }) {
  const today = todayInVietnam();
  const invalidDateTime = Boolean(selectedDate && selectedTime && !validSchedule(selectedDate, selectedTime));
  return <div className="vr-schedule"><label htmlFor="vr-date">Ngày tiêm *</label><input id="vr-date" type="date" className="vr-input vr-date" min={today} required value={selectedDate} onChange={(event) => onDate(event.target.value)} aria-describedby={invalidDateTime ? 'vr-date-error' : undefined} aria-invalid={invalidDateTime} />{invalidDateTime && <p id="vr-date-error" className="vr-error" role="alert">Vui lòng chọn thời gian trong tương lai.</p>}
    <fieldset className="vr-times"><legend>Chọn giờ *</legend><div className="vr-time-grid">{timeSlots.map((time) => <button type="button" key={time} className={`vr-time${selectedTime === time ? ' vr-time-selected' : ''}`} aria-pressed={selectedTime === time} onClick={() => onTime(time)}>{time}</button>)}</div></fieldset>
    <label htmlFor="vr-note">Ghi chú</label><textarea id="vr-note" className="vr-input" rows={3} placeholder="Nhập ghi chú nếu có..." value={note} onChange={(event) => onNote(event.target.value)} />
  </div>;
}

function Confirmation({ profile, vaccine, dose, date, time, note }) {
  return <><dl className="vr-summary"><div><dt><Icon name="users" />NGƯỜI TIÊM</dt><dd><strong>{profile.ho_ten}</strong><span>{profile.moi_quan_he || 'Người tiêm'} · {displayDate(profile.ngay_sinh)}</span></dd></div><div><dt><Icon name="vaccine" />VẮC XIN</dt><dd><strong>{vaccine.ten_vac_xin}</strong><span>{dose.ten_mui || `Mũi ${dose.so_thu_tu_mui}`} · {vaccine.nha_san_xuat || 'Chưa cập nhật'}</span><b className="vr-price">{money(vaccine.gia)}</b></dd></div><div><dt><Icon name="calendar" />THỜI GIAN</dt><dd><strong>{displayDate(date)}</strong><span>{time}</span></dd></div><div><dt><Icon name="overview" />GHI CHÚ</dt><dd className="vr-note-value">{note.trim() || 'Không có ghi chú'}</dd></div></dl><aside className="vr-info"><h3>Lưu ý trước khi tiêm</h3><ul><li>Vui lòng đến trước giờ hẹn khoảng 15 phút.</li><li>Mang theo giấy tờ cá nhân và thông tin tiêm chủng nếu có.</li><li>Thông báo cho nhân viên y tế về tiền sử dị ứng hoặc phản ứng sau tiêm.</li></ul></aside></>;
}

function SuccessModal({ appointment, onRegisterAnother, onOverview }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="vr-success" aria-labelledby="vr-success-title" onCancel={(event) => { event.preventDefault(); onRegisterAnother(); }}><span className="vr-success-icon"><Icon name="check" /></span><h2 id="vr-success-title">Đăng ký lịch tiêm thành công!</h2><p>Lịch tiêm đã được máy chủ ghi nhận.</p><dl><div><dt>Mã lịch hẹn</dt><dd>{appointment.ma_lich_hen}</dd></div><div><dt>Ngày</dt><dd>{displayDate(appointment.ngay_hen)}</dd></div><div><dt>Giờ</dt><dd>{displayTime(appointment.gio_hen)}</dd></div><div><dt>Trạng thái</dt><dd>{appointment.trang_thai === 'CHO_XAC_NHAN' ? 'Chờ xác nhận' : appointment.trang_thai}</dd></div></dl><div className="vr-success-actions"><button type="button" className="cd-button cd-button-primary" onClick={onRegisterAnother}>Đăng ký lịch khác</button><button type="button" className="cd-button" onClick={onOverview}>Về trang tổng quan</button></div></dialog>;
}

export default function VaccinationRegistration({ currentUser, onNavigate, onOverview }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [vaccinesLoading, setVaccinesLoading] = useState(true);
  const [vaccinesError, setVaccinesError] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [selectedDose, setSelectedDose] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const headingRef = useRef(null);
  const scheduleRequestRef = useRef(0);
  const submitLockRef = useRef(false);
  const validProfile = profiles.some((profile) => profile.ma_ho_so === selectedProfile?.ma_ho_so);
  const validVaccine = vaccines.some((vaccine) => vaccine.ma_vac_xin === selectedVaccine?.ma_vac_xin && vaccine.trang_thai === true);
  const validDose = schedule.some((dose) => dose.ma_phac_do === selectedDose?.ma_phac_do && dose.ma_vac_xin === selectedVaccine?.ma_vac_xin);
  const appointmentTimeValid = validSchedule(selectedDate, selectedTime);
  const canContinue = validProfile && (currentStep < 2 || (validVaccine && validDose && !scheduleLoading && !scheduleError)) && (currentStep < 3 || appointmentTimeValid);

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [currentStep]);
  function loadProfiles() {
    setProfilesLoading(true);
    setProfilesError('');
    getProfiles().then((result) => setProfiles(Array.isArray(result) ? result : [])).catch((error) => setProfilesError(error.message || 'Không thể tải hồ sơ người tiêm.')).finally(() => setProfilesLoading(false));
  }
  function loadVaccines() {
    setVaccinesLoading(true);
    setVaccinesError('');
    getVaccines().then((result) => setVaccines(Array.isArray(result) ? result : [])).catch((error) => setVaccinesError(error.message || 'Không thể tải danh sách vắc xin.')).finally(() => setVaccinesLoading(false));
  }
  useEffect(() => {
    let active = true;
    getProfiles().then((result) => { if (active) setProfiles(Array.isArray(result) ? result : []); }).catch((error) => { if (active) setProfilesError(error.message || 'Không thể tải hồ sơ người tiêm.'); }).finally(() => { if (active) setProfilesLoading(false); });
    getVaccines().then((result) => { if (active) setVaccines(Array.isArray(result) ? result : []); }).catch((error) => { if (active) setVaccinesError(error.message || 'Không thể tải danh sách vắc xin.'); }).finally(() => { if (active) setVaccinesLoading(false); });
    return () => { active = false; };
  }, []);
  async function loadSchedule(vaccineId) {
    const requestId = scheduleRequestRef.current + 1;
    scheduleRequestRef.current = requestId;
    setSchedule([]);
    setScheduleLoading(true);
    setScheduleError('');
    try {
      const result = await getVaccineSchedule(vaccineId);
      if (requestId !== scheduleRequestRef.current) return;
      setSchedule(Array.isArray(result) ? result : []);
    } catch (error) {
      if (requestId !== scheduleRequestRef.current) return;
      setScheduleError(error.message || 'Không thể tải phác đồ tiêm.');
    } finally {
      if (requestId === scheduleRequestRef.current) setScheduleLoading(false);
    }
  }
  function selectVaccine(vaccine) {
    setSelectedVaccine(vaccine);
    setSelectedDose(null);
    setSubmitError('');
    loadSchedule(vaccine.ma_vac_xin);
  }
  function resetForm() {
    setCurrentStep(1);
    setSelectedProfile(null);
    setSelectedVaccine(null);
    setSchedule([]);
    setScheduleError('');
    setSelectedDose(null);
    setSelectedDate('');
    setSelectedTime('');
    setNote('');
    setSubmitError('');
    setCreatedAppointment(null);
    submitLockRef.current = false;
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if (!canContinue || submitting || submitLockRef.current) return;
    if (currentStep < 4) {
      setCurrentStep((step) => step + 1);
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const appointment = await createAppointment({
        ma_ho_so: selectedProfile.ma_ho_so,
        ngay_hen: selectedDate,
        gio_hen: selectedTime,
        ghi_chu: note.trim() || null,
        items: [{ ma_vac_xin: selectedVaccine.ma_vac_xin, so_thu_tu_mui: selectedDose.so_thu_tu_mui }],
      });
      setCreatedAppointment(appointment);
    } catch (error) {
      setSubmitError(error.message || 'Không thể đăng ký lịch tiêm. Vui lòng thử lại.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  const customer = { name: currentUser?.ho_ten || 'Khách hàng', initials: initials(currentUser?.ho_ten || 'KH') };
  return <div className="customer-dashboard vaccination-registration"><a href="#cd-main" className="cd-skip-link">Đến nội dung chính</a><Sidebar activeMenu="vaccine" onNavigate={onNavigate} /><div className="cd-workspace"><DashboardHeader customer={customer} /><main id="cd-main" className="cd-main" tabIndex={-1}><div className="cd-page-heading"><h1>Đăng ký tiêm</h1><p>Đặt lịch tiêm chủng cho bạn và người thân</p></div><div className="vr-content"><Stepper currentStep={currentStep} /><form className="cd-panel vr-form" onSubmit={handleSubmit}><header className="vr-form-heading"><span>BƯỚC {currentStep} / 4</span><h2 ref={headingRef} tabIndex={-1}>{headings[currentStep - 1][0]}</h2><p>{headings[currentStep - 1][1]}</p></header>
    {currentStep === 1 && <ProfileSelection profiles={profiles} loading={profilesLoading} error={profilesError} onRetry={loadProfiles} selectedProfile={selectedProfile} onSelect={setSelectedProfile} />}
    {currentStep === 2 && <VaccineSelection vaccines={vaccines} loading={vaccinesLoading} error={vaccinesError} onRetry={loadVaccines} selectedVaccine={selectedVaccine} onSelect={selectVaccine} schedule={schedule} scheduleLoading={scheduleLoading} scheduleError={scheduleError} onScheduleRetry={() => loadSchedule(selectedVaccine.ma_vac_xin)} selectedDose={selectedDose} onSelectDose={setSelectedDose} />}
    {currentStep === 3 && <ScheduleSelection selectedDate={selectedDate} selectedTime={selectedTime} note={note} onDate={setSelectedDate} onTime={setSelectedTime} onNote={setNote} />}
    {currentStep === 4 && <Confirmation profile={selectedProfile} vaccine={selectedVaccine} dose={selectedDose} date={selectedDate} time={selectedTime} note={note} />}
    {submitError && <p className="vr-submit-error" role="alert">{submitError}</p>}
    <footer className="vr-actions">{currentStep > 1 && <button type="button" className="cd-button" disabled={submitting} onClick={() => { setSubmitError(''); setCurrentStep((step) => step - 1); }}>Quay lại</button>}<button type="submit" className="cd-button cd-button-primary vr-next" disabled={!canContinue || submitting}>{submitting ? 'Đang đăng ký...' : currentStep === 4 ? 'Xác nhận đăng ký' : 'Tiếp tục'}<Icon name={currentStep === 4 ? 'check' : 'arrow'} /></button></footer></form></div><footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{createdAppointment && <SuccessModal appointment={createdAppointment} onRegisterAnother={resetForm} onOverview={() => { resetForm(); onOverview(); }} />}</div>;
}
