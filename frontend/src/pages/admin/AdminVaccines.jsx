import { useEffect, useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import { AdminSidebar, AdminHeader } from './AdminDashboard';
import './AdminVaccines.css';

// UI examples only; schedule configuration is independent of inventory.
import { initialVaccines } from './adminVaccineData';
const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
const priceText = (price) => `${new Intl.NumberFormat('vi-VN').format(price)} đ`;
const statusText = (status) => status ? 'Đang sử dụng' : 'Ngừng sử dụng';
const sorted = (schedules) => [...schedules].sort((a, b) => a.doseNumber - b.doseNumber);

function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current; const trigger = document.activeElement; const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={ref} className="av-modal" aria-labelledby="av-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><header><h2 id="av-modal-title">{title}</h2><button type="button" className="av-close" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>{children}</dialog>;
}
function Fields({ fields, form, setForm, errors }) {
  return fields.map(([name, label, type = 'text', required = false]) => <div key={name}><label htmlFor={`av-${name}`}>{label}{required && ' *'}</label>{type === 'textarea' ? <textarea id={`av-${name}`} name={name} rows={3} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} /> : <input id={`av-${name}`} name={name} type={type} required={required} value={form[name]} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `av-${name}-error` : undefined} onChange={(event) => setForm({ ...form, [name]: event.target.value })} />}{errors[name] && <p className="av-error" id={`av-${name}-error`} role="alert">{errors[name]}</p>}</div>);
}
function VaccineForm({ vaccine, vaccines, onSave, onClose }) {
  const [form, setForm] = useState(() => ({ name: vaccine?.name || '', manufacturer: vaccine?.manufacturer || '', country: vaccine?.country || '', diseasePrevention: vaccine?.diseasePrevention || '', price: vaccine?.price ?? '', description: vaccine?.description || '' }));
  const [errors, setErrors] = useState({});
  function submit(event) {
    event.preventDefault(); const next = {};
    for (const [key, label] of [['name', 'tên vắc xin'], ['manufacturer', 'nhà sản xuất'], ['diseasePrevention', 'phòng bệnh']]) if (!form[key].trim()) next[key] = `Vui lòng nhập ${label}.`;
    if (form.name.trim() && vaccines.some((item) => item.id !== vaccine?.id && normalize(item.name) === normalize(form.name))) next.name = 'Tên vắc xin đã tồn tại.';
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) next.price = 'Giá tham khảo phải lớn hơn 0.';
    setErrors(next);
    if (Object.keys(next).length) { event.currentTarget.elements.namedItem(Object.keys(next)[0])?.focus(); return; }
    onSave({ name: form.name.trim(), manufacturer: form.manufacturer.trim(), country: form.country.trim(), diseasePrevention: form.diseasePrevention.trim(), description: form.description.trim(), price: Number(form.price) }, vaccine?.id);
  }
  return <Modal title={vaccine ? 'Chỉnh sửa vắc xin' : 'THÊM VẮC XIN'} onClose={onClose}><form onSubmit={submit} noValidate><div className="av-modal-body av-form"><Fields form={form} setForm={setForm} errors={errors} fields={[
    ['name', 'Tên vắc xin', 'text', true], ['manufacturer', 'Nhà sản xuất', 'text', true], ['country', 'Quốc gia sản xuất'], ['diseasePrevention', 'Phòng bệnh', 'text', true], ['price', 'Giá tham khảo', 'number', true], ['description', 'Mô tả', 'textarea'],
  ]} />{!vaccine && <p>Trạng thái: <strong>Đang sử dụng</strong></p>}</div><footer><button type="button" className="cd-button" onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary av-save">{vaccine ? 'Lưu thay đổi' : 'Thêm vắc xin'}</button></footer></form></Modal>;
}
function ScheduleList({ schedules }) {
  return schedules.length ? <ol className="av-timeline">{sorted(schedules).map((dose) => <li key={dose.doseNumber}><strong>{dose.doseName}</strong><p>{dose.intervalDays === 0 ? 'Khoảng cách: 0 ngày' : `Sau mũi trước ${dose.intervalDays} ngày`}</p>{dose.description && <p>{dose.description}</p>}</li>)}</ol> : <p>Vắc xin này chưa có phác đồ tiêm.</p>;
}
function ScheduleManager({ vaccine, onUpdate, onClose }) {
  const [draft, setDraft] = useState(null);
  const [editingNumber, setEditingNumber] = useState(null);
  const [deletingNumber, setDeletingNumber] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  function start(dose) {
    setDeletingNumber(null); setErrors({}); setEditingNumber(dose?.doseNumber ?? null);
    setDraft(dose ? { ...dose } : { doseNumber: Math.max(0, ...vaccine.schedules.map((item) => item.doseNumber)) + 1, doseName: '', intervalDays: 0, description: '' });
  }
  function save(event) {
    event.preventDefault(); const next = {}; const number = Number(draft.doseNumber); const interval = Number(draft.intervalDays);
    if (!Number.isInteger(number) || number <= 0) next.doseNumber = 'Số thứ tự phải là số nguyên lớn hơn 0.';
    else if (vaccine.schedules.some((dose) => dose.doseNumber !== editingNumber && dose.doseNumber === number)) next.doseNumber = 'Số thứ tự mũi đã tồn tại.';
    if (!draft.doseName.trim()) next.doseName = 'Vui lòng nhập tên mũi.';
    if (String(draft.intervalDays).trim() === '' || !Number.isInteger(interval) || interval < 0) next.intervalDays = 'Khoảng cách phải là số nguyên không âm.';
    setErrors(next);
    if (Object.keys(next).length) { event.currentTarget.elements.namedItem(Object.keys(next)[0])?.focus(); return; }
    const dose = { doseNumber: number, doseName: draft.doseName.trim(), intervalDays: interval, description: draft.description.trim() };
    onUpdate(sorted(editingNumber == null ? [...vaccine.schedules, dose] : vaccine.schedules.map((item) => item.doseNumber === editingNumber ? dose : item)));
    setDraft(null); setMessage('Đã lưu mũi tiêm.');
  }
  return <Modal title="PHÁC ĐỒ TIÊM" onClose={onClose}><div className="av-modal-body"><h3>{vaccine.name}</h3><p className="av-schedule-message" role="status">{message}</p>
    {!vaccine.schedules.length && <p>Vắc xin này chưa có phác đồ tiêm.</p>}
    <ul className="av-dose-list">{sorted(vaccine.schedules).map((dose) => <li key={dose.doseNumber}><div><strong>{dose.doseNumber}. {dose.doseName}</strong><p>Khoảng cách: {dose.intervalDays} ngày</p><p>{dose.description}</p></div><div className="av-dose-actions"><button type="button" className="cd-text-button av-dose-edit" onClick={() => start(dose)}>Chỉnh sửa</button><button type="button" className="cd-text-button av-dose-delete" onClick={() => { setDraft(null); setDeletingNumber(dose.doseNumber); }}>Xóa mũi</button></div></li>)}</ul>
    {deletingNumber != null && <section className="av-delete-confirm" role="group" aria-label="Xác nhận xóa mũi"><p>Bạn có chắc muốn xóa mũi này khỏi phác đồ?</p><strong>{vaccine.schedules.find((dose) => dose.doseNumber === deletingNumber)?.doseName}</strong><div className="av-dose-actions"><button type="button" className="cd-button av-cancel-delete" onClick={() => setDeletingNumber(null)}>Hủy</button><button type="button" className="cd-button cd-button-primary av-confirm-delete" onClick={() => { onUpdate(vaccine.schedules.filter((dose) => dose.doseNumber !== deletingNumber)); setDeletingNumber(null); setMessage('Đã xóa mũi khỏi phác đồ.'); }}>Xóa mũi</button></div></section>}
    {draft ? <form className="av-form av-dose-form" onSubmit={save} noValidate><h3>{editingNumber == null ? 'Thêm mũi' : 'Chỉnh sửa mũi'}</h3><Fields form={draft} setForm={setDraft} errors={errors} fields={[
      ['doseNumber', 'Số thứ tự mũi', 'number', true], ['doseName', 'Tên mũi', 'text', true], ['intervalDays', 'Khoảng cách ngày', 'number', true], ['description', 'Mô tả', 'textarea'],
    ]} /><div className="av-dose-actions"><button type="button" className="cd-button" onClick={() => setDraft(null)}>Hủy</button><button type="submit" className="cd-button cd-button-primary av-dose-save">Lưu mũi</button></div></form> : <button type="button" className="cd-button av-dose-add" onClick={() => start()}><Icon name="plus" />{vaccine.schedules.length ? 'Thêm mũi' : 'Thêm mũi đầu tiên'}</button>}
  </div><footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></Modal>;
}

export default function AdminVaccines({ vaccines: savedVaccines, setVaccines, onNavigate }) {
  const vaccines = savedVaccines ?? initialVaccines;
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [modal, setModal] = useState(null); const [message, setMessage] = useState('');
  const selected = vaccines.find((item) => item.id === modal?.id);
  const visible = vaccines.filter((item) => (status === 'all' || String(item.status) === status) && normalize(`${item.name} ${item.manufacturer} ${item.diseasePrevention}`).includes(normalize(search)));
  function update(id, fields) { setVaccines((current) => (current ?? initialVaccines).map((item) => item.id === id ? { ...item, ...fields } : item)); }
  function save(fields, id) {
    if (id == null) setVaccines((current) => { const list = current ?? initialVaccines; return [...list, { ...fields, id: Math.max(0, ...list.map((item) => item.id)) + 1, status: true, schedules: [] }]; });
    else update(id, fields);
    setModal(null); setMessage(id == null ? 'Thêm vắc xin thành công.' : 'Đã cập nhật vắc xin.');
  }
  function open(mode, item, event) { const details = event.currentTarget.closest('details'); details.open = false; details.querySelector('summary').focus(); setModal({ mode, id: item.id }); }
  const statistics = [['Tổng vắc xin', vaccines.length], ['Đang sử dụng', vaccines.filter((item) => item.status).length], ['Ngừng sử dụng', vaccines.filter((item) => !item.status).length]];
  return <div className="customer-dashboard admin-dashboard admin-vaccines"><a href="#av-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar activePage="admin-vaccines" onNavigate={onNavigate} /><div className="cd-workspace"><AdminHeader onNotifications={() => onNavigate('admin-dashboard')} /><main id="av-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading av-heading"><div><h1>Quản lý vắc xin</h1><p>Quản lý danh mục và phác đồ tiêm của các loại vắc xin</p></div><button type="button" className="cd-button cd-button-primary av-add" onClick={() => setModal({ mode: 'add' })}><Icon name="plus" />Thêm vắc xin</button></div>
    <section className="cd-statistics av-statistics" aria-label="Thống kê vắc xin">{statistics.map(([label, value]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name="vaccine" /></span></div><strong className="cd-stat-value">{value}</strong></article>)}</section>
    <section className="cd-panel av-filters" aria-label="Lọc vắc xin"><div className="av-filter-grid"><div><label htmlFor="av-search">Tìm vắc xin</label><input id="av-search" type="search" placeholder="Tìm theo tên vắc xin, nhà sản xuất hoặc bệnh phòng ngừa..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div><label htmlFor="av-status">Trạng thái</label><select id="av-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="true">Đang sử dụng</option><option value="false">Ngừng sử dụng</option></select></div></div></section>
    <p className="av-count" role="status">{message} Hiển thị {visible.length} / {vaccines.length} vắc xin</p>
    {visible.length ? <div className="av-table-card"><table className="av-table"><caption>Danh mục vắc xin</caption><thead><tr>{['Vắc xin', 'Nhà sản xuất', 'Phòng bệnh', 'Số mũi', 'Giá tham khảo', 'Trạng thái', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td data-label="Vắc xin"><strong>{item.name}</strong></td><td data-label="Nhà sản xuất">{item.manufacturer}{item.country && ` • ${item.country}`}</td><td data-label="Phòng bệnh">{item.diseasePrevention}</td><td data-label="Số mũi">{item.schedules.length} mũi</td><td data-label="Giá tham khảo">{priceText(item.price)}</td><td data-label="Trạng thái"><span className={`av-badge ${item.status ? 'av-active' : 'av-locked'}`}>{statusText(item.status)}</span></td><td data-label="Thao tác"><details className="av-actions"><summary aria-label={`Thao tác cho ${item.name}`}>•••</summary><div>{[['view', 'Xem chi tiết'], ['edit', 'Chỉnh sửa'], ['schedule', 'Quản lý phác đồ'], ['toggle', item.status ? 'Ngừng sử dụng' : 'Kích hoạt lại']].map(([mode, label]) => <button type="button" className={`av-${mode}`} key={mode} onClick={(event) => open(mode, item, event)}>{label}</button>)}</div></details></td></tr>)}</tbody></table></div> : <section className="cd-panel av-empty"><h2>Không tìm thấy vắc xin phù hợp</h2><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></section>}
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div>
  {modal?.mode === 'add' && <VaccineForm vaccines={vaccines} onSave={save} onClose={() => setModal(null)} />}
  {selected && modal.mode === 'edit' && <VaccineForm vaccine={selected} vaccines={vaccines} onSave={save} onClose={() => setModal(null)} />}
  {selected && modal.mode === 'schedule' && <ScheduleManager vaccine={selected} onUpdate={(schedules) => update(selected.id, { schedules })} onClose={() => setModal(null)} />}
  {selected && modal.mode === 'view' && <Modal title="CHI TIẾT VẮC XIN" onClose={() => setModal(null)}><div className="av-modal-body"><dl>{[['Tên vắc xin', selected.name], ['Nhà sản xuất', selected.manufacturer], ['Quốc gia sản xuất', selected.country || 'Chưa cập nhật'], ['Phòng bệnh', selected.diseasePrevention], ['Giá tham khảo', priceText(selected.price)], ['Trạng thái', statusText(selected.status)], ['Mô tả', selected.description || 'Không có']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><section><h3>PHÁC ĐỒ TIÊM</h3><ScheduleList schedules={selected.schedules} /></section></div><footer><button type="button" className="cd-button" onClick={() => setModal(null)}>Đóng</button></footer></Modal>}
  {selected && modal.mode === 'toggle' && <Modal title={selected.status ? 'Ngừng sử dụng vắc xin?' : 'Kích hoạt lại vắc xin?'} onClose={() => setModal(null)}><div className="av-modal-body"><h3>{selected.name}</h3><p>{selected.status ? 'Vắc xin sẽ không còn xuất hiện trong danh sách đăng ký tiêm mới.' : 'Vắc xin sẽ được chuyển về trạng thái đang sử dụng.'}</p></div><footer><button type="button" className="cd-button" onClick={() => setModal(null)}>Hủy</button><button type="button" className="cd-button cd-button-primary av-confirm" onClick={() => { update(selected.id, { status: !selected.status }); setMessage(selected.status ? 'Đã ngừng sử dụng vắc xin.' : 'Đã kích hoạt lại vắc xin.'); setModal(null); }}>{selected.status ? 'Ngừng sử dụng' : 'Kích hoạt lại'}</button></footer></Modal>}
  </div>;
}

