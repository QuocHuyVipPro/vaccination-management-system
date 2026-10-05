import { useEffect, useRef, useState } from 'react';
import { Sidebar, DashboardHeader, Icon } from './CustomerDashboard';
import './VaccinationRegistration.css';

const profiles = [
  { id: 1, name: 'Nguyễn Văn An', initials: 'NA', relationship: 'Bản thân', birthday: '15/06/2005', gender: 'Nam' },
  { id: 2, name: 'Nguyễn Minh Anh', initials: 'MA', relationship: 'Em', birthday: '12/03/2015', gender: 'Nữ' },
];
const vaccines = [
  { id: 1, name: 'HPV Gardasil 9', prevention: 'HPV và các bệnh liên quan', manufacturer: 'MSD', origin: 'Hoa Kỳ', price: 2950000, available: true },
  { id: 2, name: 'Vaxigrip Tetra', prevention: 'Cúm mùa', manufacturer: 'Sanofi Pasteur', origin: 'Pháp', price: 350000, available: true },
  { id: 3, name: 'Prevenar 13', prevention: 'Các bệnh do phế cầu', manufacturer: 'Pfizer', origin: 'Bỉ', price: 1250000, available: true },
  { id: 4, name: 'Varivax', prevention: 'Thủy đậu', manufacturer: 'MSD', origin: 'Hoa Kỳ', price: 900000, available: false },
];
const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
const fullSlots = ['09:00', '14:30'];
const steps = ['Người tiêm', 'Vắc xin', 'Thời gian', 'Xác nhận'];
const headings = [
  ['Chọn người tiêm', 'Vui lòng chọn hồ sơ cần đăng ký tiêm chủng'],
  ['Chọn vắc xin', 'Chọn loại vắc xin bạn muốn đăng ký'],
  ['Chọn thời gian tiêm', 'Chọn ngày và khung giờ phù hợp với bạn'],
  ['Xác nhận đăng ký', 'Vui lòng kiểm tra lại thông tin trước khi xác nhận'],
];
function todayInVietnam() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
}
function validSchedule(date, time, today) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && !Number.isNaN(Date.parse(date)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date && timeSlots.includes(time) && !fullSlots.includes(time);
}
function money(value) { return `${value.toLocaleString('vi-VN')}đ`; }
function displayDate(value) { return value.split('-').reverse().join('/'); }
function normalizeSearch(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim(); }

function Stepper({ currentStep }) {
  return <ol className="vr-stepper" aria-label="Các bước đăng ký">{steps.map((label, index) => <li key={label} className={index + 1 === currentStep ? 'vr-step-active' : index + 1 < currentStep ? 'vr-step-complete' : ''} aria-current={index + 1 === currentStep ? 'step' : undefined}><span className="vr-step-number">{index + 1 < currentStep ? <Icon name="check" /> : index + 1}</span><span>{label}</span></li>)}</ol>;
}

function ProfileSelection({ selectedProfile, onSelect }) {
  return <div className="vr-grid" role="group" aria-label="Chọn một người tiêm">{profiles.map((profile) => <button type="button" key={profile.id} className={`vr-choice vr-profile${selectedProfile?.id === profile.id ? ' vr-selected' : ''}`} aria-pressed={selectedProfile?.id === profile.id} onClick={() => onSelect(profile)}><span className="vr-choice-top"><span className="cd-avatar">{profile.initials}</span><span className="vr-check">{selectedProfile?.id === profile.id && <Icon name="check" />}</span></span><strong>{profile.name}</strong><span className="cd-relation">{profile.relationship}</span><span className="vr-profile-info"><span>Ngày sinh: {profile.birthday}</span><span>Giới tính: {profile.gender}</span></span></button>)}</div>;
}

function VaccineSelection({ selectedVaccine, onSelect }) {
  const [search, setSearch] = useState('');
  const filtered = vaccines.filter((vaccine) => normalizeSearch(`${vaccine.name} ${vaccine.prevention} ${vaccine.manufacturer} ${vaccine.origin}`).includes(normalizeSearch(search)));
  return <><label className="vr-search-label" htmlFor="vr-search">Tìm kiếm vắc xin</label><input id="vr-search" className="vr-input vr-search" type="search" placeholder="Tìm kiếm vắc xin..." value={search} onChange={(event) => setSearch(event.target.value)} />
    <div className="vr-grid" role="group" aria-label="Chọn một vắc xin">{filtered.map((vaccine) => <button type="button" className={`vr-choice${selectedVaccine?.id === vaccine.id ? ' vr-selected' : ''}`} key={vaccine.id} disabled={!vaccine.available} aria-pressed={selectedVaccine?.id === vaccine.id} onClick={() => onSelect(vaccine)}><span className="vr-choice-top"><span className={`cd-badge${!vaccine.available ? ' vr-unavailable' : ''}`}>{vaccine.available ? 'Còn vắc xin' : 'Tạm hết'}</span><span className="vr-check">{selectedVaccine?.id === vaccine.id && <Icon name="check" />}</span></span><strong>{vaccine.name}</strong><span className="vr-vaccine-info">Phòng bệnh: {vaccine.prevention}</span><span className="vr-vaccine-info">Nhà sản xuất: {vaccine.manufacturer}</span><span className="vr-vaccine-info">Xuất xứ: {vaccine.origin}</span><span className="vr-price">{money(vaccine.price)}</span></button>)}</div>
    {!filtered.length && <p className="vr-empty" role="status">Không tìm thấy vắc xin phù hợp. Hãy thử từ khóa khác.</p>}
  </>;
}

function ScheduleSelection({ selectedDate, selectedTime, note, onDate, onTime, onNote }) {
  const today = todayInVietnam();
  return <div className="vr-schedule"><label htmlFor="vr-date">Ngày tiêm *</label><input id="vr-date" type="date" className="vr-input vr-date" min={today} required value={selectedDate} onChange={(event) => onDate(event.target.value)} aria-describedby={selectedDate && selectedDate < today ? 'vr-date-error' : undefined} aria-invalid={Boolean(selectedDate && selectedDate < today)} />{selectedDate && selectedDate < today && <p id="vr-date-error" className="vr-error" role="alert">Vui lòng chọn ngày hôm nay hoặc ngày trong tương lai.</p>}
    <fieldset className="vr-times"><legend>Chọn giờ</legend><div className="vr-time-grid">{timeSlots.map((time) => <button type="button" key={time} className={`vr-time${selectedTime === time ? ' vr-time-selected' : ''}`} disabled={fullSlots.includes(time)} aria-pressed={selectedTime === time} onClick={() => onTime(time)}>{time}{fullSlots.includes(time) && <small>Đã đầy</small>}</button>)}</div></fieldset>
    <label htmlFor="vr-note">Ghi chú</label><textarea id="vr-note" className="vr-input" rows={3} placeholder="Nhập ghi chú nếu có..." value={note} onChange={(event) => onNote(event.target.value)} />
  </div>;
}

function Confirmation({ profile, vaccine, date, time, note }) {
  return <><dl className="vr-summary"><div><dt><Icon name="users" />NGƯỜI TIÊM</dt><dd><strong>{profile.name}</strong><span>{profile.relationship} · {profile.birthday}</span></dd></div><div><dt><Icon name="vaccine" />VẮC XIN</dt><dd><strong>{vaccine.name}</strong><span>{vaccine.manufacturer} - {vaccine.origin}</span><b className="vr-price">{money(vaccine.price)}</b></dd></div><div><dt><Icon name="calendar" />THỜI GIAN</dt><dd><strong>{displayDate(date)}</strong><span>{time}</span></dd></div><div><dt><Icon name="overview" />GHI CHÚ</dt><dd className="vr-note-value">{note.trim() || 'Không có ghi chú'}</dd></div></dl><aside className="vr-info"><h3>Lưu ý trước khi tiêm</h3><ul><li>Vui lòng đến trước giờ hẹn khoảng 15 phút.</li><li>Mang theo giấy tờ cá nhân và thông tin tiêm chủng nếu có.</li><li>Thông báo cho nhân viên y tế về tiền sử dị ứng hoặc phản ứng sau tiêm.</li></ul></aside></>;
}

function SuccessModal({ date, time, onClose, onOverview, onAppointments }) {
  const ref = useRef(null);
  const appointmentId = `LH${date.replaceAll('-', '')}001`;
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="vr-success" aria-labelledby="vr-success-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><button type="button" className="vr-close" aria-label="Đóng thông báo" onClick={onClose}>×</button><span className="vr-success-icon"><Icon name="check" /></span><h2 id="vr-success-title">Đăng ký tiêm thành công!</h2><p>Lịch tiêm của bạn đã được ghi nhận.</p><dl><div><dt>Mã lịch hẹn</dt><dd>{appointmentId}</dd></div><div><dt>Ngày</dt><dd>{displayDate(date)}</dd></div><div><dt>Giờ</dt><dd>{time}</dd></div></dl><div className="vr-success-actions"><button type="button" className="cd-button cd-button-primary" onClick={onAppointments || (() => console.log('Xem lịch hẹn', { appointmentId, date, time }))}>Xem lịch hẹn</button><button type="button" className="cd-button" onClick={onOverview || (() => console.log('Về trang tổng quan'))}>Về trang tổng quan</button></div></dialog>;
}

export default function VaccinationRegistration({ onOverview, onAppointments, onNavigate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const headingRef = useRef(null);
  const validProfile = profiles.some((profile) => profile.id === selectedProfile?.id);
  const validVaccine = vaccines.some((vaccine) => vaccine.id === selectedVaccine?.id && vaccine.available);
  const scheduleValid = validSchedule(selectedDate, selectedTime, todayInVietnam());
  const canContinue = validProfile && (currentStep < 2 || validVaccine) && (currentStep < 3 || scheduleValid);

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [currentStep]);
  function handleSubmit(event) {
    event.preventDefault();
    if (!canContinue) return;
    if (currentStep < 4) setCurrentStep((step) => step + 1);
    else if (validSchedule(selectedDate, selectedTime, todayInVietnam())) setShowSuccess(true);
  }

  return <div className="customer-dashboard vaccination-registration"><a href="#cd-main" className="cd-skip-link">Đến nội dung chính</a><Sidebar activeMenu="vaccine" onNavigate={onNavigate} /><div className="cd-workspace"><DashboardHeader customer={{ name: 'Nguyễn Văn An', initials: 'NA' }} /><main id="cd-main" className="cd-main" tabIndex={-1}><div className="cd-page-heading"><h1>Đăng ký tiêm</h1><p>Đặt lịch tiêm chủng cho bạn và người thân</p></div><div className="vr-content"><Stepper currentStep={currentStep} /><form className="cd-panel vr-form" onSubmit={handleSubmit}><header className="vr-form-heading"><span>BƯỚC {currentStep} / 4</span><h2 ref={headingRef} tabIndex={-1}>{headings[currentStep - 1][0]}</h2><p>{headings[currentStep - 1][1]}</p></header>
    {currentStep === 1 && <ProfileSelection selectedProfile={selectedProfile} onSelect={setSelectedProfile} />}
    {currentStep === 2 && <VaccineSelection selectedVaccine={selectedVaccine} onSelect={setSelectedVaccine} />}
    {currentStep === 3 && <ScheduleSelection selectedDate={selectedDate} selectedTime={selectedTime} note={note} onDate={setSelectedDate} onTime={setSelectedTime} onNote={setNote} />}
    {currentStep === 4 && <Confirmation profile={selectedProfile} vaccine={selectedVaccine} date={selectedDate} time={selectedTime} note={note} />}
    <footer className="vr-actions">{currentStep > 1 && <button type="button" className="cd-button" onClick={() => setCurrentStep((step) => step - 1)}>Quay lại</button>}<button type="submit" className="cd-button cd-button-primary vr-next" disabled={!canContinue}>{currentStep === 4 ? 'Xác nhận đăng ký' : 'Tiếp tục'}<Icon name={currentStep === 4 ? 'check' : 'arrow'} /></button></footer></form></div><footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer></main></div>{showSuccess && <SuccessModal date={selectedDate} time={selectedTime} onClose={() => setShowSuccess(false)} onOverview={onOverview} onAppointments={onAppointments} />}</div>;
}
