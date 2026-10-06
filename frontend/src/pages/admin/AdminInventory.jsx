import { useEffect, useRef, useState } from 'react';
import { adjustAdminBatch, createAdminBatch, getAdminBatch, getAdminBatches, getAdminBatchTransactions, getAdminInventoryTransactions, restockAdminBatch, updateAdminBatch } from '../../services/adminInventoryService.js';
import { getAdminVaccines } from '../../services/adminVaccineService.js';
import { Icon } from '../customer/CustomerDashboard';
import { AdminHeader, AdminSidebar } from './AdminDashboard';
import './AdminInventory.css';

const batchStatuses = { DANG_SU_DUNG: 'Đang sử dụng', TAM_NGUNG: 'Tạm ngừng', HET_HAN: 'Hết hạn' };
const transactionTypes = { NHAP: 'Nhập kho', DIEU_CHINH_TANG: 'Điều chỉnh tăng', DIEU_CHINH_GIAM: 'Điều chỉnh giảm', XUAT_TIEM: 'Xuất tiêm' };
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const dateText = (value) => value ? String(value).slice(0, 10).split('-').reverse().join('/') : 'Chưa cập nhật';
const dateTimeText = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Chưa cập nhật';
const priceText = (value) => value == null ? 'Chưa cập nhật' : `${new Intl.NumberFormat('vi-VN').format(Number(value))} đ`;
const statusText = (value) => batchStatuses[value] || value;
const typeText = (value) => transactionTypes[value] || value;

function Details({ fields }) {
  return <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function TransactionTable({ items, compact = false }) {
  if (!items.length) return <p className="ai-empty-inline">Chưa có giao dịch kho.</p>;
  return <div className="ai-table-card"><table className={`ai-table${compact ? ' ai-compact' : ''}`}><caption>{compact ? 'Lịch sử giao dịch của lô' : 'Lịch sử giao dịch kho'}</caption><thead><tr>{['Mã', 'Thời gian', 'Vắc xin / lô', 'Loại', 'Số lượng', 'Người thực hiện', 'Ghi chú'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{items.map((item) => {
    const decreasing = ['DIEU_CHINH_GIAM', 'XUAT_TIEM'].includes(item.loai_giao_dich);
    return <tr key={item.ma_giao_dich}><td data-label="Mã">#{item.ma_giao_dich}</td><td data-label="Thời gian">{dateTimeText(item.ngay_tao)}</td><td data-label="Vắc xin / lô"><strong>{item.ten_vac_xin}</strong><br /><span className="ai-muted">{item.so_lo}</span></td><td data-label="Loại"><span className="ai-badge">{typeText(item.loai_giao_dich)}</span></td><td data-label="Số lượng"><strong className={decreasing ? 'ai-negative' : 'ai-positive'}>{decreasing ? '−' : '+'}{item.so_luong}</strong></td><td data-label="Người thực hiện">#{item.nguoi_thuc_hien}</td><td data-label="Ghi chú">{item.ghi_chu || 'Không có'}</td></tr>;
  })}</tbody></table></div>;
}

function initialForm(mode, batch) {
  if (mode === 'create') return { ma_vac_xin: '', so_lo: '', ngay_san_xuat: '', han_su_dung: '', so_luong_nhap: '', gia_nhap: '', ngay_nhap: today(), trang_thai: 'DANG_SU_DUNG' };
  if (mode === 'edit') return { ngay_san_xuat: batch?.ngay_san_xuat || '', han_su_dung: batch?.han_su_dung || '', gia_nhap: batch?.gia_nhap ?? '', ngay_nhap: batch?.ngay_nhap || '', trang_thai: batch?.trang_thai || 'DANG_SU_DUNG' };
  if (mode === 'restock') return { so_luong: '', ghi_chu: '' };
  return { so_luong_thay_doi: '', ghi_chu: '' };
}

function validateForm(mode, form) {
  const errors = {};
  if (mode === 'create') {
    if (!Number.isInteger(Number(form.ma_vac_xin)) || Number(form.ma_vac_xin) <= 0) errors.ma_vac_xin = 'Vui lòng chọn vắc xin.';
    if (!form.so_lo.trim()) errors.so_lo = 'Vui lòng nhập số lô.';
    if (form.so_lo.trim().length > 100) errors.so_lo = 'Số lô không được quá 100 ký tự.';
    if (!Number.isInteger(Number(form.so_luong_nhap)) || Number(form.so_luong_nhap) <= 0) errors.so_luong_nhap = 'Số lượng nhập phải là số nguyên lớn hơn 0.';
  }
  if (['create', 'edit'].includes(mode)) {
    if (!form.han_su_dung) errors.han_su_dung = 'Vui lòng chọn hạn sử dụng.';
    if (!form.ngay_nhap) errors.ngay_nhap = 'Vui lòng chọn ngày nhập.';
    if (form.ngay_san_xuat && form.han_su_dung && form.han_su_dung <= form.ngay_san_xuat) errors.han_su_dung = 'Hạn sử dụng phải sau ngày sản xuất.';
    if (mode === 'create' && form.han_su_dung && form.han_su_dung < today()) errors.han_su_dung = 'Hạn sử dụng không được ở trong quá khứ.';
    if (form.gia_nhap !== '' && (!Number.isFinite(Number(form.gia_nhap)) || Number(form.gia_nhap) < 0)) errors.gia_nhap = 'Giá nhập phải là số không âm.';
  }
  if (mode === 'restock' && (!Number.isInteger(Number(form.so_luong)) || Number(form.so_luong) <= 0)) errors.so_luong = 'Số lượng nhập thêm phải là số nguyên lớn hơn 0.';
  if (mode === 'adjust') {
    if (!Number.isInteger(Number(form.so_luong_thay_doi)) || Number(form.so_luong_thay_doi) === 0) errors.so_luong_thay_doi = 'Mức thay đổi phải là số nguyên khác 0.';
    if (!form.ghi_chu.trim()) errors.ghi_chu = 'Vui lòng nhập lý do điều chỉnh.';
  }
  return errors;
}

function BatchModal({ mode, batchId, vaccines, onClose, onSuccess }) {
  const dialogRef = useRef(null);
  const lockRef = useRef(false);
  const [batch, setBatch] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(() => initialForm(mode));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(mode !== 'create');
  const [loadError, setLoadError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);

  useEffect(() => {
    if (mode === 'create') return undefined;
    let active = true;
    Promise.all([getAdminBatch(batchId), ['view', 'transactions'].includes(mode) ? getAdminBatchTransactions(batchId) : Promise.resolve([])])
      .then(([batchResult, transactionResult]) => { if (active) { setBatch(batchResult); setTransactions(Array.isArray(transactionResult) ? transactionResult : []); setForm(initialForm(mode, batchResult)); } })
      .catch((error) => { if (active) setLoadError(error.status === 404 ? 'Lô vắc xin không còn tồn tại.' : error.message || 'Không thể tải chi tiết lô.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [batchId, mode, retryKey]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '' })); setRequestError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (lockRef.current) return;
    const nextErrors = validateForm(mode, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const metadata = { ngay_san_xuat: form.ngay_san_xuat || null, han_su_dung: form.han_su_dung, gia_nhap: form.gia_nhap === '' ? null : Number(form.gia_nhap), ngay_nhap: form.ngay_nhap, trang_thai: form.trang_thai };
    let request;
    if (mode === 'create') request = createAdminBatch({ ma_vac_xin: Number(form.ma_vac_xin), so_lo: form.so_lo.trim(), ...metadata, so_luong_nhap: Number(form.so_luong_nhap) });
    else if (mode === 'edit') request = updateAdminBatch(batchId, metadata);
    else if (mode === 'restock') request = restockAdminBatch(batchId, { so_luong: Number(form.so_luong), ghi_chu: form.ghi_chu.trim() || null });
    else request = adjustAdminBatch(batchId, { so_luong_thay_doi: Number(form.so_luong_thay_doi), ghi_chu: form.ghi_chu.trim() });
    lockRef.current = true; setSubmitting(true); setRequestError('');
    try { onSuccess(mode, await request); }
    catch (error) { setRequestError(error.message || 'Không thể lưu thay đổi.'); }
    finally { lockRef.current = false; setSubmitting(false); }
  }

  const titles = { create: 'NHẬP LÔ VẮC XIN', view: 'CHI TIẾT LÔ VẮC XIN', edit: 'CẬP NHẬT LÔ VẮC XIN', restock: 'NHẬP THÊM TỒN KHO', adjust: 'ĐIỀU CHỈNH TỒN KHO', transactions: 'LỊCH SỬ GIAO DỊCH THEO LÔ' };
  const readOnly = ['view', 'transactions'].includes(mode);
  const field = (name, label, element, required = false) => <div><label htmlFor={`ai-${name}`}>{label}{required ? ' *' : ''}</label>{element}{errors[name] && <p className="ai-error" role="alert">{errors[name]}</p>}</div>;
  const metadataFields = <>
    {field('ngay_san_xuat', 'Ngày sản xuất', <input id="ai-ngay_san_xuat" type="date" value={form.ngay_san_xuat} disabled={submitting} onChange={(event) => setField('ngay_san_xuat', event.target.value)} />)}
    {field('han_su_dung', 'Hạn sử dụng', <input id="ai-han_su_dung" type="date" value={form.han_su_dung} disabled={submitting} aria-invalid={!!errors.han_su_dung} onChange={(event) => setField('han_su_dung', event.target.value)} />, true)}
    {field('gia_nhap', 'Giá nhập', <input id="ai-gia_nhap" type="number" min="0" step="0.01" value={form.gia_nhap} disabled={submitting} aria-invalid={!!errors.gia_nhap} onChange={(event) => setField('gia_nhap', event.target.value)} />)}
    {field('ngay_nhap', 'Ngày nhập', <input id="ai-ngay_nhap" type="date" value={form.ngay_nhap} disabled={submitting} aria-invalid={!!errors.ngay_nhap} onChange={(event) => setField('ngay_nhap', event.target.value)} />, true)}
    {field('trang_thai', 'Trạng thái', <select id="ai-trang_thai" value={form.trang_thai} disabled={submitting} onChange={(event) => setField('trang_thai', event.target.value)}>{Object.entries(batchStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>, true)}
  </>;

  return <dialog ref={dialogRef} className="ai-modal" aria-labelledby="ai-modal-title" onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }}><header><h2 id="ai-modal-title">{titles[mode]}</h2><button type="button" className="ai-close" disabled={submitting} aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>
    {loading ? <div className="ai-modal-body" role="status">Đang tải chi tiết lô...</div> : loadError ? <div className="ai-modal-body ai-request-error" role="alert"><p>{loadError}</p><button type="button" className="cd-button" onClick={() => { setLoading(true); setLoadError(''); setRetryKey((value) => value + 1); }}>Thử lại</button></div> : readOnly ? <><div className="ai-modal-body"><section><h3>Thông tin lô</h3><Details fields={[[ 'Mã lô', `#${batch.ma_lo}`], ['Vắc xin', batch.ten_vac_xin], ['Số lô', batch.so_lo], ['Ngày sản xuất', dateText(batch.ngay_san_xuat)], ['Hạn sử dụng', dateText(batch.han_su_dung)], ['Ngày nhập', dateText(batch.ngay_nhap)], ['Số lượng nhập ban đầu', `${batch.so_luong_nhap} liều`], ['Số lượng còn', `${batch.so_luong_con} liều`], ['Giá nhập', priceText(batch.gia_nhap)], ['Trạng thái', statusText(batch.trang_thai)], ['Ngày tạo', dateTimeText(batch.ngay_tao)]]} /></section><section><TransactionTable items={transactions} compact /></section></div><footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></> : <form onSubmit={submit} noValidate><div className="ai-modal-body">{batch && <div className="ai-current"><Details fields={[[ 'Vắc xin', batch.ten_vac_xin], ['Số lô', batch.so_lo], ['Tồn hiện tại', `${batch.so_luong_con} liều`]]} /></div>}<div className="ai-form">
      {mode === 'create' && <>{field('ma_vac_xin', 'Vắc xin', <select id="ai-ma_vac_xin" value={form.ma_vac_xin} disabled={submitting} aria-invalid={!!errors.ma_vac_xin} onChange={(event) => setField('ma_vac_xin', event.target.value)}><option value="">Chọn vắc xin đang hoạt động</option>{vaccines.filter((item) => item.trang_thai).map((item) => <option key={item.ma_vac_xin} value={item.ma_vac_xin}>{item.ten_vac_xin}</option>)}</select>, true)}{field('so_lo', 'Số lô', <input id="ai-so_lo" value={form.so_lo} maxLength={100} disabled={submitting} aria-invalid={!!errors.so_lo} onChange={(event) => setField('so_lo', event.target.value)} />, true)}{field('so_luong_nhap', 'Số lượng nhập ban đầu', <input id="ai-so_luong_nhap" type="number" min="1" step="1" value={form.so_luong_nhap} disabled={submitting} aria-invalid={!!errors.so_luong_nhap} onChange={(event) => setField('so_luong_nhap', event.target.value)} />, true)}</>}
      {['create', 'edit'].includes(mode) && metadataFields}
      {mode === 'restock' && <>{field('so_luong', 'Số lượng nhập thêm', <input id="ai-so_luong" type="number" min="1" step="1" value={form.so_luong} disabled={submitting} aria-invalid={!!errors.so_luong} onChange={(event) => setField('so_luong', event.target.value)} />, true)}{field('ghi_chu', 'Ghi chú', <textarea id="ai-ghi_chu" rows={3} value={form.ghi_chu} disabled={submitting} onChange={(event) => setField('ghi_chu', event.target.value)} />)}</>}
      {mode === 'adjust' && <>{field('so_luong_thay_doi', 'Mức thay đổi (+/−)', <input id="ai-so_luong_thay_doi" type="number" step="1" value={form.so_luong_thay_doi} disabled={submitting} aria-invalid={!!errors.so_luong_thay_doi} onChange={(event) => setField('so_luong_thay_doi', event.target.value)} />, true)}{field('ghi_chu', 'Lý do điều chỉnh', <textarea id="ai-ghi_chu" rows={3} value={form.ghi_chu} disabled={submitting} aria-invalid={!!errors.ghi_chu} onChange={(event) => setField('ghi_chu', event.target.value)} />, true)}<p className="ai-helper">Nhập số dương để tăng hoặc số âm để giảm. Backend từ chối nếu tồn kho sẽ nhỏ hơn 0.</p></>}
    </div>{requestError && <p className="ai-request-error" role="alert">{requestError}</p>}</div><footer><button type="button" className="cd-button" disabled={submitting} onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : mode === 'create' ? 'Nhập lô' : mode === 'edit' ? 'Lưu thay đổi' : mode === 'restock' ? 'Nhập thêm' : 'Lưu điều chỉnh'}</button></footer></form>}
  </dialog>;
}

export default function AdminInventory({ currentUser, onNavigate }) {
  const [batches, setBatches] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('stock');
  const [draft, setDraft] = useState({ search: '', ma_vac_xin: '', trang_thai: '', con_hang: '', sap_het_han: '' });
  const [filters, setFilters] = useState({});
  const [transactionDraft, setTransactionDraft] = useState({ ma_vac_xin: '', loai_giao_dich: '' });
  const [transactionFilters, setTransactionFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getAdminVaccines().then((result) => { if (active) setVaccines(Array.isArray(result) ? result : []); }).catch(() => { if (active) setVaccines([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const request = tab === 'stock' ? getAdminBatches(filters) : getAdminInventoryTransactions(transactionFilters);
    request.then((result) => { if (!active) return; if (tab === 'stock') setBatches(Array.isArray(result) ? result : []); else setTransactions(Array.isArray(result) ? result : []); }).catch((requestError) => { if (active) setError(requestError.message || 'Không thể tải dữ liệu kho.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, reloadKey, tab, transactionFilters]);

  function applyBatchFilters(event) {
    event.preventDefault(); setLoading(true); setError(''); setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== '')));
  }
  function resetBatchFilters() {
    setLoading(true); setError(''); setDraft({ search: '', ma_vac_xin: '', trang_thai: '', con_hang: '', sap_het_han: '' }); setFilters({});
  }
  function applyTransactionFilters(event) {
    event.preventDefault(); setLoading(true); setError(''); setTransactionFilters(Object.fromEntries(Object.entries(transactionDraft).filter(([, value]) => value !== '')));
  }
  function mutationSucceeded(mode) {
    const messages = { create: 'Đã tạo lô và ghi nhận giao dịch nhập kho.', edit: 'Đã cập nhật metadata/trạng thái lô.', restock: 'Đã nhập thêm tồn kho và ghi nhận giao dịch.', adjust: 'Đã điều chỉnh tồn kho và ghi nhận giao dịch.' };
    setMessage(messages[mode]); setModal(null); setLoading(true); setError(''); setReloadKey((value) => value + 1);
  }
  const stockTotal = batches.reduce((sum, item) => sum + item.so_luong_con, 0);
  const expiring = batches.filter((item) => { const days = (Date.parse(item.han_su_dung) - Date.parse(today())) / 86400000; return days >= 0 && days <= 30; }).length;

  return <div className="customer-dashboard admin-dashboard admin-inventory"><a href="#ai-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar activePage="admin-inventory" onNavigate={onNavigate} /><div className="cd-workspace"><AdminHeader currentUser={currentUser} onNotifications={() => onNavigate('admin-dashboard')} /><main id="ai-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading ai-heading"><div><h1>Quản lý lô &amp; kho</h1><p>Theo dõi lô vắc xin, hạn sử dụng và giao dịch tồn kho thực</p></div><button type="button" className="cd-button cd-button-primary" onClick={() => setModal({ mode: 'create' })}><Icon name="plus" />Nhập lô vắc xin</button></div>
    <section className="cd-statistics" aria-label="Thống kê trên kết quả hiện tại">{[['Số lô hiển thị', batches.length], ['Tổng liều hiển thị', stockTotal], ['Lô còn hàng', batches.filter((item) => item.so_luong_con > 0).length], ['Lô sắp hết hạn', expiring]].map(([label, value]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name="vaccine" /></span></div><strong className="cd-stat-value">{loading || error ? '—' : value}</strong></article>)}</section>
    <section className="cd-panel ai-filters" aria-label="Tra cứu kho"><div className="ai-tabs" role="group" aria-label="Nội dung kho"><button type="button" aria-pressed={tab === 'stock'} onClick={() => { setLoading(true); setError(''); setTab('stock'); setMessage(''); }}>Tồn kho &amp; lô vắc xin</button><button type="button" aria-pressed={tab === 'transactions'} onClick={() => { setLoading(true); setError(''); setTab('transactions'); setMessage(''); }}>Lịch sử giao dịch</button></div>
      {tab === 'stock' ? <form className="ai-filter-grid" onSubmit={applyBatchFilters}><div><label htmlFor="ai-search">Tìm theo số lô</label><input id="ai-search" type="search" value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} /></div><div><label htmlFor="ai-vaccine-filter">Vắc xin</label><select id="ai-vaccine-filter" value={draft.ma_vac_xin} onChange={(event) => setDraft((current) => ({ ...current, ma_vac_xin: event.target.value }))}><option value="">Tất cả</option>{vaccines.map((item) => <option key={item.ma_vac_xin} value={item.ma_vac_xin}>{item.ten_vac_xin}</option>)}</select></div><div><label htmlFor="ai-status-filter">Trạng thái</label><select id="ai-status-filter" value={draft.trang_thai} onChange={(event) => setDraft((current) => ({ ...current, trang_thai: event.target.value }))}><option value="">Tất cả</option>{Object.entries(batchStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="ai-stock-filter">Tồn kho</label><select id="ai-stock-filter" value={draft.con_hang} onChange={(event) => setDraft((current) => ({ ...current, con_hang: event.target.value }))}><option value="">Tất cả</option><option value="true">Còn hàng</option><option value="false">Hết hàng</option></select></div><div><label htmlFor="ai-expiry-filter">Hạn dùng</label><select id="ai-expiry-filter" value={draft.sap_het_han} onChange={(event) => setDraft((current) => ({ ...current, sap_het_han: event.target.value }))}><option value="">Tất cả</option><option value="true">Sắp hết hạn (30 ngày)</option><option value="false">Ngoài khoảng 30 ngày</option></select></div><div className="ai-filter-actions"><button type="submit" className="cd-button cd-button-primary" disabled={loading}>Lọc</button><button type="button" className="cd-button" disabled={loading} onClick={resetBatchFilters}>Đặt lại</button></div></form> : <form className="ai-filter-grid ai-transaction-filters" onSubmit={applyTransactionFilters}><div><label htmlFor="ai-transaction-vaccine">Vắc xin</label><select id="ai-transaction-vaccine" value={transactionDraft.ma_vac_xin} onChange={(event) => setTransactionDraft((current) => ({ ...current, ma_vac_xin: event.target.value }))}><option value="">Tất cả</option>{vaccines.map((item) => <option key={item.ma_vac_xin} value={item.ma_vac_xin}>{item.ten_vac_xin}</option>)}</select></div><div><label htmlFor="ai-transaction-type">Loại giao dịch</label><select id="ai-transaction-type" value={transactionDraft.loai_giao_dich} onChange={(event) => setTransactionDraft((current) => ({ ...current, loai_giao_dich: event.target.value }))}><option value="">Tất cả</option>{Object.entries(transactionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="ai-filter-actions"><button type="submit" className="cd-button cd-button-primary" disabled={loading}>Lọc</button><button type="button" className="cd-button" disabled={loading} onClick={() => { setLoading(true); setError(''); setTransactionDraft({ ma_vac_xin: '', loai_giao_dich: '' }); setTransactionFilters({}); }}>Đặt lại</button></div></form>}
    </section>
    {message && <p className="ai-success" role="status">{message}</p>}
    {loading ? <section className="cd-panel ai-empty" role="status"><h2>Đang tải dữ liệu kho...</h2></section> : error ? <section className="cd-panel ai-empty ai-request-error" role="alert"><h2>Không thể tải dữ liệu</h2><p>{error}</p><button type="button" className="cd-button" onClick={() => { setLoading(true); setError(''); setReloadKey((value) => value + 1); }}>Thử lại</button></section> : tab === 'transactions' ? <><p className="ai-count" role="status">Hiển thị {transactions.length} giao dịch</p><TransactionTable items={transactions} /></> : <><p className="ai-count" role="status">Hiển thị {batches.length} lô</p>{batches.length ? <div className="ai-table-card"><table className="ai-table"><caption>Danh sách lô vắc xin</caption><thead><tr>{['Vắc xin', 'Số lô', 'Ngày nhập', 'Hạn sử dụng', 'SL nhập', 'SL còn', 'Giá nhập', 'Trạng thái', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{batches.map((batch) => <tr key={batch.ma_lo}><td data-label="Vắc xin"><strong>{batch.ten_vac_xin}</strong></td><td data-label="Số lô">{batch.so_lo}</td><td data-label="Ngày nhập">{dateText(batch.ngay_nhap)}</td><td data-label="Hạn sử dụng">{dateText(batch.han_su_dung)}</td><td data-label="SL nhập">{batch.so_luong_nhap}</td><td data-label="SL còn"><strong>{batch.so_luong_con}</strong></td><td data-label="Giá nhập">{priceText(batch.gia_nhap)}</td><td data-label="Trạng thái"><span className={`ai-badge ${batch.trang_thai === 'DANG_SU_DUNG' ? 'ai-active' : 'ai-locked'}`}>{statusText(batch.trang_thai)}</span></td><td data-label="Thao tác"><details className="ai-actions"><summary aria-label={`Thao tác lô ${batch.so_lo}`}>•••</summary><div><button type="button" onClick={() => setModal({ mode: 'view', batchId: batch.ma_lo })}>Xem chi tiết</button><button type="button" onClick={() => setModal({ mode: 'edit', batchId: batch.ma_lo })}>Sửa metadata</button><button type="button" disabled={batch.trang_thai !== 'DANG_SU_DUNG'} onClick={() => setModal({ mode: 'restock', batchId: batch.ma_lo })}>Nhập thêm</button><button type="button" onClick={() => setModal({ mode: 'adjust', batchId: batch.ma_lo })}>Điều chỉnh tồn</button><button type="button" onClick={() => setModal({ mode: 'transactions', batchId: batch.ma_lo })}>Lịch sử theo lô</button></div></details></td></tr>)}</tbody></table></div> : <section className="cd-panel ai-empty"><h2>Chưa có lô vắc xin phù hợp.</h2><p>Thử thay đổi bộ lọc hoặc nhập lô mới.</p></section>}</>}
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div>{modal && <BatchModal mode={modal.mode} batchId={modal.batchId} vaccines={vaccines} onClose={() => setModal(null)} onSuccess={mutationSucceeded} />}</div>;
}
