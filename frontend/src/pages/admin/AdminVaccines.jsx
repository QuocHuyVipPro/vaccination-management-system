import { useEffect, useRef, useState } from 'react';
import {
  createAdminVaccine,
  createAdminVaccineScheduleItem,
  getAdminVaccine,
  getAdminVaccines,
  getAdminVaccineSchedule,
  updateAdminVaccine,
  updateAdminVaccineScheduleItem,
} from '../../services/adminVaccineService.js';
import { Icon } from '../customer/CustomerDashboard';
import { AdminSidebar, AdminHeader } from './AdminDashboard';
import './AdminVaccines.css';

const statusText = (status) => status ? 'Đang sử dụng' : 'Ngừng sử dụng';
const priceText = (price) => price == null ? 'Chưa cập nhật' : `${new Intl.NumberFormat('vi-VN').format(Number(price))} đ`;

function displayDateTime(value) {
  if (!value) return 'Không có';
  const [datePart, timePart = ''] = String(value).split(/[T ]/);
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`;
}

function emptyVaccineForm() {
  return { ten_vac_xin: '', nha_san_xuat: '', quoc_gia_san_xuat: '', phong_benh: '', mo_ta: '', gia: '', trang_thai: true };
}

function emptyScheduleForm() {
  return { so_thu_tu_mui: '', ten_mui: '', khoang_cach_ngay: '0', mo_ta: '' };
}

function validateVaccine(form) {
  const errors = {};
  if (!form.ten_vac_xin.trim()) errors.ten_vac_xin = 'Vui lòng nhập tên vắc xin.';
  if (form.ten_vac_xin.trim().length > 150) errors.ten_vac_xin = 'Tên vắc xin không được quá 150 ký tự.';
  if (form.nha_san_xuat.trim().length > 150) errors.nha_san_xuat = 'Nhà sản xuất không được quá 150 ký tự.';
  if (form.quoc_gia_san_xuat.trim().length > 100) errors.quoc_gia_san_xuat = 'Quốc gia không được quá 100 ký tự.';
  if (form.phong_benh.trim().length > 255) errors.phong_benh = 'Thông tin phòng bệnh không được quá 255 ký tự.';
  if (form.gia !== '' && (!Number.isFinite(Number(form.gia)) || Number(form.gia) < 0)) errors.gia = 'Giá phải là số không âm.';
  return errors;
}

function validateSchedule(form, schedules, editingId) {
  const errors = {};
  const dose = Number(form.so_thu_tu_mui);
  const interval = Number(form.khoang_cach_ngay);
  if (!Number.isInteger(dose) || dose <= 0) errors.so_thu_tu_mui = 'Số thứ tự mũi phải là số nguyên lớn hơn 0.';
  if (schedules.some((item) => item.ma_phac_do !== editingId && item.so_thu_tu_mui === dose)) errors.so_thu_tu_mui = 'Số thứ tự mũi đã tồn tại trong phác đồ.';
  if (!Number.isInteger(interval) || interval < 0) errors.khoang_cach_ngay = 'Khoảng cách ngày phải là số nguyên không âm.';
  if (form.ten_mui.trim().length > 100) errors.ten_mui = 'Tên mũi không được quá 100 ký tự.';
  return errors;
}

function VaccineModal({ mode, vaccineId, onClose, onSuccess }) {
  const dialogRef = useRef(null);
  const submitLockRef = useRef(false);
  const creating = mode === 'create';
  const [vaccine, setVaccine] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [form, setForm] = useState(emptyVaccineForm);
  const [scheduleDraft, setScheduleDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [scheduleErrors, setScheduleErrors] = useState({});
  const [loading, setLoading] = useState(!creating);
  const [loadError, setLoadError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);

  useEffect(() => {
    if (creating) return undefined;
    let active = true;
    const scheduleRequest = ['view', 'schedule'].includes(mode) ? getAdminVaccineSchedule(vaccineId) : Promise.resolve([]);
    Promise.all([getAdminVaccine(vaccineId), scheduleRequest])
      .then(([vaccineResult, scheduleResult]) => {
        if (!active) return;
        setVaccine(vaccineResult);
        setSchedule(Array.isArray(scheduleResult) ? scheduleResult : []);
        setForm({
          ten_vac_xin: vaccineResult.ten_vac_xin,
          nha_san_xuat: vaccineResult.nha_san_xuat || '',
          quoc_gia_san_xuat: vaccineResult.quoc_gia_san_xuat || '',
          phong_benh: vaccineResult.phong_benh || '',
          mo_ta: vaccineResult.mo_ta || '',
          gia: vaccineResult.gia ?? '',
          trang_thai: vaccineResult.trang_thai,
        });
      })
      .catch((error) => { if (active) setLoadError(error.message || 'Không thể tải thông tin vắc xin.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [creating, mode, retryKey, vaccineId]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setRequestError('');
  }

  function vaccinePayload() {
    return {
      ten_vac_xin: form.ten_vac_xin.trim(),
      nha_san_xuat: form.nha_san_xuat.trim() || null,
      quoc_gia_san_xuat: form.quoc_gia_san_xuat.trim() || null,
      phong_benh: form.phong_benh.trim() || null,
      mo_ta: form.mo_ta.trim() || null,
      gia: form.gia === '' ? null : Number(form.gia),
      trang_thai: form.trang_thai,
    };
  }

  async function submitVaccine(event) {
    event.preventDefault();
    if (submitLockRef.current) return;
    const nextErrors = validateVaccine(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setRequestError('');
    try {
      const result = creating
        ? await createAdminVaccine(vaccinePayload())
        : await updateAdminVaccine(vaccineId, vaccinePayload());
      onSuccess(creating ? 'create' : 'edit', result);
    } catch (error) {
      setRequestError(error.message || 'Không thể lưu vắc xin.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  async function toggleStatus() {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setRequestError('');
    try {
      const result = await updateAdminVaccine(vaccineId, { trang_thai: !vaccine.trang_thai });
      onSuccess('toggle', result);
    } catch (error) {
      setRequestError(error.message || 'Không thể cập nhật trạng thái.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  function startScheduleEdit(item = null) {
    setScheduleDraft(item ? {
      ma_phac_do: item.ma_phac_do,
      so_thu_tu_mui: String(item.so_thu_tu_mui),
      ten_mui: item.ten_mui || '',
      khoang_cach_ngay: String(item.khoang_cach_ngay),
      mo_ta: item.mo_ta || '',
    } : emptyScheduleForm());
    setScheduleErrors({});
    setRequestError('');
    setScheduleMessage('');
  }

  async function submitSchedule(event) {
    event.preventDefault();
    if (submitLockRef.current) return;
    const editingId = scheduleDraft.ma_phac_do;
    const nextErrors = validateSchedule(scheduleDraft, schedule, editingId);
    setScheduleErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload = {
      so_thu_tu_mui: Number(scheduleDraft.so_thu_tu_mui),
      ten_mui: scheduleDraft.ten_mui.trim() || null,
      khoang_cach_ngay: Number(scheduleDraft.khoang_cach_ngay),
      mo_ta: scheduleDraft.mo_ta.trim() || null,
    };
    submitLockRef.current = true;
    setSubmitting(true);
    setRequestError('');
    try {
      if (editingId) await updateAdminVaccineScheduleItem(vaccineId, editingId, payload);
      else await createAdminVaccineScheduleItem(vaccineId, payload);
      const refreshed = await getAdminVaccineSchedule(vaccineId);
      setSchedule(Array.isArray(refreshed) ? refreshed : []);
      setScheduleDraft(null);
      setScheduleMessage(editingId ? 'Đã cập nhật mũi trong phác đồ.' : 'Đã thêm mũi vào phác đồ.');
    } catch (error) {
      setRequestError(error.message || 'Không thể lưu mũi trong phác đồ.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  const titles = {
    create: 'Thêm vắc xin', edit: 'Chỉnh sửa vắc xin', view: 'CHI TIẾT VẮC XIN',
    schedule: 'QUẢN LÝ PHÁC ĐỒ TIÊM', toggle: vaccine ? vaccine.trang_thai ? 'Ngừng sử dụng vắc xin?' : 'Kích hoạt lại vắc xin?' : 'Cập nhật trạng thái',
  };

  const vaccineFields = <div className="av-modal-body av-form">
    <div><label htmlFor="av-name">Tên vắc xin *</label><input id="av-name" value={form.ten_vac_xin} disabled={submitting} aria-invalid={!!errors.ten_vac_xin} onChange={(event) => setField('ten_vac_xin', event.target.value)} />{errors.ten_vac_xin && <p className="av-error">{errors.ten_vac_xin}</p>}</div>
    <div><label htmlFor="av-manufacturer">Nhà sản xuất</label><input id="av-manufacturer" value={form.nha_san_xuat} disabled={submitting} aria-invalid={!!errors.nha_san_xuat} onChange={(event) => setField('nha_san_xuat', event.target.value)} />{errors.nha_san_xuat && <p className="av-error">{errors.nha_san_xuat}</p>}</div>
    <div><label htmlFor="av-country">Quốc gia sản xuất</label><input id="av-country" value={form.quoc_gia_san_xuat} disabled={submitting} aria-invalid={!!errors.quoc_gia_san_xuat} onChange={(event) => setField('quoc_gia_san_xuat', event.target.value)} />{errors.quoc_gia_san_xuat && <p className="av-error">{errors.quoc_gia_san_xuat}</p>}</div>
    <div><label htmlFor="av-disease">Phòng bệnh</label><input id="av-disease" value={form.phong_benh} disabled={submitting} aria-invalid={!!errors.phong_benh} onChange={(event) => setField('phong_benh', event.target.value)} />{errors.phong_benh && <p className="av-error">{errors.phong_benh}</p>}</div>
    <div><label htmlFor="av-price">Giá tham khảo</label><input id="av-price" type="number" min="0" step="0.01" value={form.gia} disabled={submitting} aria-invalid={!!errors.gia} onChange={(event) => setField('gia', event.target.value)} />{errors.gia && <p className="av-error">{errors.gia}</p>}</div>
    <div><label htmlFor="av-status">Trạng thái</label><select id="av-status" value={String(form.trang_thai)} disabled={submitting} onChange={(event) => setField('trang_thai', event.target.value === 'true')}><option value="true">Đang sử dụng</option><option value="false">Ngừng sử dụng</option></select></div>
    <div><label htmlFor="av-description">Mô tả</label><textarea id="av-description" rows={4} value={form.mo_ta} disabled={submitting} onChange={(event) => setField('mo_ta', event.target.value)} /></div>
  </div>;

  const scheduleList = schedule.length ? <ol className="av-timeline">{schedule.map((item) => <li key={item.ma_phac_do}><div><strong>{item.ten_mui || `Mũi ${item.so_thu_tu_mui}`}</strong><span>Mũi {item.so_thu_tu_mui} · Cách mũi trước {item.khoang_cach_ngay} ngày</span>{item.mo_ta && <p>{item.mo_ta}</p>}</div>{mode === 'schedule' && <button type="button" className="cd-text-button" disabled={submitting} onClick={() => startScheduleEdit(item)}>Chỉnh sửa</button>}</li>)}</ol> : <p className="av-empty-schedule">Chưa có mũi nào trong phác đồ.</p>;

  return <dialog ref={dialogRef} className="av-modal" aria-labelledby="av-modal-title" onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }}>
    <header><h2 id="av-modal-title">{titles[mode]}</h2><button type="button" className="av-close" disabled={submitting} aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>
    {loading ? <div className="av-modal-state" role="status">Đang tải dữ liệu vắc xin...</div> : loadError ? <div className="av-modal-state av-request-error" role="alert"><p>{loadError}</p><button type="button" className="cd-button" onClick={() => { setLoading(true); setLoadError(''); setRetryKey((value) => value + 1); }}>Thử lại</button></div> : creating || mode === 'edit' ? <form onSubmit={submitVaccine} noValidate>{vaccineFields}{requestError && <p className="av-submit-error" role="alert">{requestError}</p>}<footer><button type="button" className="cd-button" disabled={submitting} onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : creating ? 'Thêm vắc xin' : 'Lưu thay đổi'}</button></footer></form> : mode === 'view' ? <><div className="av-modal-body"><dl>{[
      ['Mã vắc xin', vaccine.ma_vac_xin], ['Tên vắc xin', vaccine.ten_vac_xin], ['Nhà sản xuất', vaccine.nha_san_xuat || 'Chưa cập nhật'],
      ['Quốc gia sản xuất', vaccine.quoc_gia_san_xuat || 'Chưa cập nhật'], ['Phòng bệnh', vaccine.phong_benh || 'Chưa cập nhật'],
      ['Giá', priceText(vaccine.gia)], ['Trạng thái', statusText(vaccine.trang_thai)], ['Ngày tạo', displayDateTime(vaccine.ngay_tao)],
      ['Cập nhật', displayDateTime(vaccine.ngay_cap_nhat)], ['Mô tả', vaccine.mo_ta || 'Không có'],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><section><h3>PHÁC ĐỒ TIÊM</h3>{scheduleList}</section></div><footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></> : mode === 'schedule' ? <><div className="av-modal-body"><h3>{vaccine.ten_vac_xin}</h3>{scheduleMessage && <p className="av-schedule-message" role="status">{scheduleMessage}</p>}{scheduleList}{scheduleDraft ? <form className="av-dose-form av-form" onSubmit={submitSchedule} noValidate><div><label htmlFor="av-dose-number">Số thứ tự mũi *</label><input id="av-dose-number" type="number" min="1" step="1" value={scheduleDraft.so_thu_tu_mui} disabled={submitting} aria-invalid={!!scheduleErrors.so_thu_tu_mui} onChange={(event) => setScheduleDraft((current) => ({ ...current, so_thu_tu_mui: event.target.value }))} />{scheduleErrors.so_thu_tu_mui && <p className="av-error">{scheduleErrors.so_thu_tu_mui}</p>}</div><div><label htmlFor="av-dose-name">Tên mũi</label><input id="av-dose-name" value={scheduleDraft.ten_mui} disabled={submitting} aria-invalid={!!scheduleErrors.ten_mui} onChange={(event) => setScheduleDraft((current) => ({ ...current, ten_mui: event.target.value }))} />{scheduleErrors.ten_mui && <p className="av-error">{scheduleErrors.ten_mui}</p>}</div><div><label htmlFor="av-dose-interval">Khoảng cách ngày *</label><input id="av-dose-interval" type="number" min="0" step="1" value={scheduleDraft.khoang_cach_ngay} disabled={submitting} aria-invalid={!!scheduleErrors.khoang_cach_ngay} onChange={(event) => setScheduleDraft((current) => ({ ...current, khoang_cach_ngay: event.target.value }))} />{scheduleErrors.khoang_cach_ngay && <p className="av-error">{scheduleErrors.khoang_cach_ngay}</p>}</div><div><label htmlFor="av-dose-description">Mô tả</label><textarea id="av-dose-description" rows={3} value={scheduleDraft.mo_ta} disabled={submitting} onChange={(event) => setScheduleDraft((current) => ({ ...current, mo_ta: event.target.value }))} /></div>{requestError && <p className="av-submit-error" role="alert">{requestError}</p>}<div className="av-dose-actions"><button type="button" className="cd-button" disabled={submitting} onClick={() => setScheduleDraft(null)}>Hủy</button><button type="submit" className="cd-button cd-button-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu mũi'}</button></div></form> : <button type="button" className="cd-button av-dose-add" onClick={() => startScheduleEdit()}><Icon name="plus" />{schedule.length ? 'Thêm mũi' : 'Thêm mũi đầu tiên'}</button>}</div><footer><button type="button" className="cd-button" disabled={submitting} onClick={onClose}>Đóng</button></footer></> : <><div className="av-modal-body"><h3>{vaccine.ten_vac_xin}</h3><p>{vaccine.trang_thai ? 'Vắc xin sẽ không còn xuất hiện trong danh sách đăng ký tiêm mới.' : 'Vắc xin sẽ được chuyển về trạng thái đang sử dụng.'}</p>{requestError && <p className="av-submit-error" role="alert">{requestError}</p>}</div><footer><button type="button" className="cd-button" disabled={submitting} onClick={onClose}>Hủy</button><button type="button" className="cd-button cd-button-primary" disabled={submitting} onClick={toggleStatus}>{submitting ? 'Đang cập nhật...' : vaccine.trang_thai ? 'Ngừng sử dụng' : 'Kích hoạt lại'}</button></footer></>}
  </dialog>;
}

export default function AdminVaccines({ currentUser, onNavigate }) {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getAdminVaccines(filters)
      .then((result) => { if (active) setVaccines(Array.isArray(result) ? result : []); })
      .catch((requestError) => { if (active) { setVaccines([]); setError(requestError.message || 'Không thể tải danh sách vắc xin.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, reloadKey]);

  function applyFilters(event) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    setFilters({ search, trangThai: status });
  }
  function resetFilters() {
    setSearch(''); setStatus(''); setLoading(true); setError(''); setFilters({});
  }
  function retry() { setLoading(true); setError(''); setReloadKey((value) => value + 1); }
  function mutationSucceeded(mode) {
    const messages = { create: 'Thêm vắc xin thành công', edit: 'Cập nhật vắc xin thành công', toggle: 'Cập nhật trạng thái thành công' };
    setMessage(messages[mode]); setModal(null); setLoading(true); setError(''); setReloadKey((value) => value + 1);
  }
  const statistics = [
    ['Tổng kết quả', vaccines.length], ['Đang sử dụng', vaccines.filter((item) => item.trang_thai).length], ['Ngừng sử dụng', vaccines.filter((item) => !item.trang_thai).length],
  ];

  return <div className="customer-dashboard admin-dashboard admin-vaccines"><a href="#av-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar activePage="admin-vaccines" onNavigate={onNavigate} /><div className="cd-workspace"><AdminHeader currentUser={currentUser} onNotifications={() => onNavigate('admin-dashboard')} /><main id="av-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading av-heading"><div><h1>Quản lý vắc xin</h1><p>Quản lý danh mục và phác đồ tiêm của các loại vắc xin</p></div><button type="button" className="cd-button cd-button-primary av-add" onClick={() => setModal({ mode: 'create' })}><Icon name="plus" />Thêm vắc xin</button></div>
    <section className="cd-statistics av-statistics" aria-label="Thống kê vắc xin">{statistics.map(([label, value]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name="vaccine" /></span></div><strong className="cd-stat-value">{loading || error ? '—' : value}</strong></article>)}</section>
    <form className="cd-panel av-filters" aria-label="Lọc vắc xin" onSubmit={applyFilters}><div className="av-filter-grid"><div><label htmlFor="av-search">Tìm vắc xin</label><input id="av-search" type="search" placeholder="Tìm theo tên vắc xin hoặc nhà sản xuất..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div><label htmlFor="av-status-filter">Trạng thái</label><select id="av-status-filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option><option value="true">Đang sử dụng</option><option value="false">Ngừng sử dụng</option></select></div><div className="av-filter-actions"><button type="submit" className="cd-button cd-button-primary" disabled={loading}>Lọc</button><button type="button" className="cd-button" disabled={loading} onClick={resetFilters}>Đặt lại</button></div></div></form>
    {message && <p className="av-success" role="status">{message}</p>}
    {loading ? <section className="cd-panel av-empty" role="status"><h2>Đang tải danh sách vắc xin...</h2></section> : error ? <section className="cd-panel av-empty av-request-error" role="alert"><h2>Không thể tải danh sách</h2><p>{error}</p><button type="button" className="cd-button" onClick={retry}>Thử lại</button></section> : <><p className="av-count" role="status">Hiển thị {vaccines.length} vắc xin</p>{vaccines.length ? <div className="av-table-card"><table className="av-table"><caption>Danh mục vắc xin</caption><thead><tr>{['Vắc xin', 'Nhà sản xuất', 'Phòng bệnh', 'Giá tham khảo', 'Trạng thái', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{vaccines.map((item) => <tr key={item.ma_vac_xin}><td data-label="Vắc xin"><strong>{item.ten_vac_xin}</strong></td><td data-label="Nhà sản xuất">{item.nha_san_xuat || 'Chưa cập nhật'}{item.quoc_gia_san_xuat && ` · ${item.quoc_gia_san_xuat}`}</td><td data-label="Phòng bệnh">{item.phong_benh || 'Chưa cập nhật'}</td><td data-label="Giá tham khảo">{priceText(item.gia)}</td><td data-label="Trạng thái"><span className={`av-badge ${item.trang_thai ? 'av-active' : 'av-locked'}`}>{statusText(item.trang_thai)}</span></td><td data-label="Thao tác"><details className="av-actions"><summary aria-label={`Thao tác cho ${item.ten_vac_xin}`}>•••</summary><div><button type="button" onClick={() => setModal({ mode: 'view', vaccineId: item.ma_vac_xin })}>Xem chi tiết</button><button type="button" onClick={() => setModal({ mode: 'edit', vaccineId: item.ma_vac_xin })}>Chỉnh sửa</button><button type="button" onClick={() => setModal({ mode: 'schedule', vaccineId: item.ma_vac_xin })}>Quản lý phác đồ</button><button type="button" onClick={() => setModal({ mode: 'toggle', vaccineId: item.ma_vac_xin })}>{item.trang_thai ? 'Ngừng sử dụng' : 'Kích hoạt lại'}</button></div></details></td></tr>)}</tbody></table></div> : <section className="cd-panel av-empty"><h2>Chưa có vắc xin phù hợp.</h2><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></section>}</>}
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div>{modal && <VaccineModal mode={modal.mode} vaccineId={modal.vaccineId} onClose={() => setModal(null)} onSuccess={mutationSucceeded} />}</div>;
}
