import { useEffect, useRef, useState } from 'react';
import { Icon } from '../customer/CustomerDashboard';
import { AdminSidebar, AdminHeader } from './AdminDashboard';
import { applyInventory, batchStatus, batchStatuses, inventoryToday, transactionTypes, validateInventory } from './inventoryState';
import './AdminInventory.css';

const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
const dateText = (value) => value ? value.split('-').reverse().join('/') : 'Chưa cập nhật';
const priceText = (value) => `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
const timeText = (value) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
function Badge({ batch }) { const status = batchStatus(batch); return <span className={`ai-badge ai-${status}`}>{batchStatuses[status]}</span>; }
function Details({ fields }) { return <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }

function InventoryModal({ mode, batch, inventory, vaccines, onClose, onSave }) {
  const ref = useRef(null); const submitted = useRef(false);
  const [form, setForm] = useState(() => mode === 'import' ? { vaccineId: '', batchNumber: '', manufactureDate: '', expiryDate: '', importedQuantity: '', purchasePrice: '', importDate: inventoryToday() } : { quantity: mode === 'adjust' ? batch.remainingQuantity : '', reason: '', note: '' });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    const dialog = ref.current; const trigger = document.activeElement; const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  function submit(event) {
    event.preventDefault(); if (submitted.current) return;
    const next = validateInventory(inventory, mode, form, vaccines, batch?.id); setErrors(next);
    if (Object.keys(next).length) { event.currentTarget.elements.namedItem(Object.keys(next)[0])?.focus(); return; }
    submitted.current = true; onSave(mode, form, batch?.id);
  }
  const fields = mode === 'import' ? [
    ['vaccineId', 'Vắc xin', 'select', true], ['batchNumber', 'Số lô', 'text', true], ['manufactureDate', 'Ngày sản xuất', 'date'], ['expiryDate', 'Hạn sử dụng', 'date', true], ['importedQuantity', 'Số lượng nhập', 'number', true], ['purchasePrice', 'Giá nhập', 'number', true], ['importDate', 'Ngày nhập', 'date', true],
  ] : [['quantity', mode === 'adjust' ? 'Số lượng thực tế' : 'Số lượng loại bỏ', 'number', true], ['reason', mode === 'adjust' ? 'Lý do điều chỉnh' : 'Lý do', 'text', true], ['note', 'Ghi chú', 'textarea']];
  const title = { import: 'NHẬP LÔ VẮC XIN', view: 'CHI TIẾT LÔ VẮC XIN', adjust: 'ĐIỀU CHỈNH TỒN KHO', discard: 'LOẠI BỎ VẮC XIN' }[mode];
  return <dialog ref={ref} className="ai-modal" aria-labelledby="ai-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id="ai-modal-title">{title}</h2><button type="button" className="ai-close" aria-label="Đóng hộp thoại" onClick={onClose}>×</button></header>
    {mode === 'view' ? <><div className="ai-modal-body">
      <section><h3>Thông tin vắc xin</h3><Details fields={[[ 'Tên vắc xin', batch.vaccineName]]} /></section>
      <section><h3>Thông tin lô</h3><Details fields={[[ 'Số lô', batch.batchNumber], ['Ngày sản xuất', dateText(batch.manufactureDate)], ['Hạn sử dụng', dateText(batch.expiryDate)], ['Ngày nhập', dateText(batch.importDate)]]} /></section>
      <section><h3>Số lượng</h3><Details fields={[[ 'Số lượng nhập', batch.importedQuantity], ['Số lượng còn', batch.remainingQuantity], ['Số lượng đã sử dụng', batch.importedQuantity - batch.remainingQuantity]]} /><p className="ai-helper">Chênh lệch giữa số lượng nhập ban đầu và số lượng còn, bao gồm các điều chỉnh và loại bỏ.</p></section>
      <section><Details fields={[[ 'Giá nhập', priceText(batch.purchasePrice)], ['Trạng thái', <Badge key="status" batch={batch} />]]} /></section>
    </div><footer><button type="button" className="cd-button" onClick={onClose}>Đóng</button></footer></> : <form onSubmit={submit} noValidate><div className="ai-modal-body">
      {batch && <div className="ai-current"><Details fields={[[ 'Vắc xin', batch.vaccineName], ['Số lô', batch.batchNumber], ['Số lượng hiện tại', `${batch.remainingQuantity} liều`]]} /></div>}
      <div className="ai-form">{fields.map(([name, label, type, required]) => {
        const props = { id: `ai-${name}`, name, value: form[name], required: !!required, 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `ai-${name}-error` : undefined, onChange: (event) => setForm((current) => ({ ...current, [name]: event.target.value })) };
        return <div key={name}><label htmlFor={props.id}>{label}{required && ' *'}</label>{type === 'select' ? <select {...props}><option value="">Chọn vắc xin</option>{vaccines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : type === 'textarea' ? <textarea {...props} rows={3} /> : <input {...props} type={type} list={name === 'reason' ? 'ai-reasons' : undefined} />}{errors[name] && <p id={`ai-${name}-error`} className="ai-error" role="alert">{errors[name]}</p>}</div>;
      })}</div><datalist id="ai-reasons">{['Kiểm kê thực tế', 'Hư hỏng', 'Sai lệch số liệu', 'Hết hạn', 'Khác'].map((value) => <option key={value} value={value} />)}</datalist>
      {mode === 'adjust' && <p className="ai-helper">Nhập số lượng thực tế hiện tại, không nhập số tăng hoặc giảm.</p>}
      {mode === 'discard' && <p className="ai-confirm-note">Xác nhận loại bỏ số liều đã nhập khỏi lô này. Lô và lịch sử giao dịch vẫn được giữ lại.</p>}
    </div><footer><button type="button" className="cd-button" onClick={onClose}>Hủy</button><button type="submit" className="cd-button cd-button-primary ai-save">{mode === 'import' ? 'Nhập lô' : mode === 'adjust' ? 'Lưu điều chỉnh' : 'Xác nhận loại bỏ'}</button></footer></form>}
  </dialog>;
}
function DataTable({ caption, headers, rows }) {
  return <div className="ai-table-card"><table className="ai-table"><caption>{caption}</caption><thead><tr>{headers.map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(({ id, cells }) => <tr key={id}>{cells.map((cell, index) => <td key={headers[index]} data-label={headers[index]}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export default function AdminInventory({ inventory, setInventory, vaccines, onNavigate }) {
  const [tab, setTab] = useState('stock'); const [search, setSearch] = useState(''); const [vaccine, setVaccine] = useState('all'); const [status, setStatus] = useState('all');
  const [transactionSearch, setTransactionSearch] = useState(''); const [type, setType] = useState('all'); const [modal, setModal] = useState(null); const [message, setMessage] = useState('');
  const selected = inventory.batches.find((batch) => batch.id === modal?.id);
  const visible = inventory.batches.filter((batch) => (vaccine === 'all' || String(batch.vaccineId) === vaccine) && (status === 'all' || batchStatus(batch) === status) && normalize(`${batch.vaccineName} ${batch.batchNumber}`).includes(normalize(search)));
  const transactions = inventory.transactions.filter((item) => (type === 'all' || item.type === type) && normalize(`${item.vaccineName} ${item.batchNumber} ${item.performedBy}`).includes(normalize(transactionSearch))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);
  const stats = [
    ['Tổng số liều còn', inventory.batches.reduce((sum, batch) => sum + batch.remainingQuantity, 0)],
    ['Lô đang sử dụng', inventory.batches.filter((batch) => ['active', 'expiring'].includes(batchStatus(batch))).length],
    ['Sắp hết hàng', inventory.batches.filter((batch) => batch.remainingQuantity > 0 && batch.remainingQuantity <= 10).length],
    ['Lô sắp hết hạn', inventory.batches.filter((batch) => batchStatus(batch) === 'expiring').length],
  ];
  function save(mode, form, id) {
    const createdAt = new Date().toISOString();
    setInventory((current) => applyInventory(current, mode, form, vaccines, id, createdAt));
    setMessage(mode === 'import' ? 'Đã nhập lô và tạo giao dịch nhập kho.' : mode === 'adjust' ? 'Đã điều chỉnh tồn kho và ghi nhận giao dịch.' : 'Đã loại bỏ và ghi nhận giao dịch.'); setModal(null);
  }
  function open(mode, batch, event) { const details = event.currentTarget.closest('details'); details.open = false; details.querySelector('summary').focus(); setModal({ mode, id: batch.id }); }
  const batchRows = visible.map((batch) => ({ id: batch.id, cells: [<strong key="vaccine">{batch.vaccineName}</strong>, batch.batchNumber, dateText(batch.importDate), dateText(batch.expiryDate), batch.importedQuantity, <span key="remaining">{batch.remainingQuantity}{batch.remainingQuantity > 0 && batch.remainingQuantity <= 10 && <small className="ai-low">Sắp hết hàng</small>}</span>, priceText(batch.purchasePrice), <Badge key="status" batch={batch} />, <details key="actions" className="ai-actions"><summary aria-label={`Thao tác lô ${batch.batchNumber}`}>•••</summary><div>{[['view', 'Xem chi tiết'], ['adjust', 'Điều chỉnh tồn kho'], ['discard', 'Loại bỏ']].map(([mode, label]) => <button type="button" className={`ai-${mode}`} key={mode} onClick={(event) => open(mode, batch, event)} disabled={mode === 'discard' && batch.remainingQuantity === 0}>{label}</button>)}</div></details>] }));
  const transactionRows = transactions.map((item) => ({ id: item.id, cells: [timeText(item.createdAt), item.vaccineName, item.batchNumber, transactionTypes[item.type], <strong key="quantity" className={item.quantity > 0 ? 'ai-positive' : 'ai-negative'}>{item.quantity > 0 ? '+' : ''}{item.quantity}</strong>, item.performedBy, item.note || 'Không có'] }));
  return <div className="customer-dashboard admin-dashboard admin-inventory"><a href="#ai-main" className="cd-skip-link">Đến nội dung chính</a><AdminSidebar activePage="admin-inventory" onNavigate={onNavigate} /><div className="cd-workspace"><AdminHeader onNotifications={() => onNavigate('admin-dashboard')} /><main id="ai-main" className="cd-main" tabIndex={-1}>
    <div className="cd-page-heading ai-heading"><div><h1>Quản lý lô &amp; kho</h1><p>Theo dõi lô vắc xin, hạn sử dụng và số lượng tồn kho</p></div><button type="button" className="cd-button cd-button-primary ai-add" onClick={() => setModal({ mode: 'import' })}><Icon name="plus" />Nhập lô vắc xin</button></div>
    <section className="cd-statistics" aria-label="Thống kê kho">{stats.map(([label, value]) => <article className="cd-stat-card" key={label}><div className="cd-stat-top"><h2>{label}</h2><span className="cd-icon-box"><Icon name="vaccine" /></span></div><strong className="cd-stat-value">{value}</strong>{label === 'Sắp hết hàng' && <p>Lô còn từ 1 đến 10 liều</p>}</article>)}</section>
    <section className="cd-panel ai-filters" aria-label="Tra cứu kho"><div className="ai-tabs" role="group" aria-label="Nội dung kho"><button type="button" aria-pressed={tab === 'stock'} onClick={() => setTab('stock')}>Tồn kho &amp; lô vắc xin</button><button type="button" aria-pressed={tab === 'transactions'} onClick={() => setTab('transactions')}>Lịch sử giao dịch</button></div>
      {tab === 'stock' ? <div className="ai-filter-grid"><div><label htmlFor="ai-search">Tìm lô vắc xin</label><input id="ai-search" type="search" placeholder="Tìm theo tên vắc xin hoặc số lô..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div><label htmlFor="ai-vaccine-filter">Vắc xin</label><select id="ai-vaccine-filter" value={vaccine} onChange={(event) => setVaccine(event.target.value)}><option value="all">Tất cả vắc xin</option>{vaccines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label htmlFor="ai-status">Trạng thái</label><select id="ai-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(batchStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div> : <div className="ai-filter-grid ai-transaction-filters"><div><label htmlFor="ai-transaction-search">Tìm giao dịch</label><input id="ai-transaction-search" type="search" placeholder="Tìm theo vắc xin, số lô hoặc người thực hiện..." value={transactionSearch} onChange={(event) => setTransactionSearch(event.target.value)} /></div><div><label htmlFor="ai-type">Loại giao dịch</label><select id="ai-type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">Tất cả</option>{Object.entries(transactionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>}
    </section>
    <p className="ai-count" role="status">{message} Hiển thị {tab === 'stock' ? `${visible.length} lô` : `${transactions.length} giao dịch`}</p>
    {tab === 'stock' ? visible.length ? <DataTable caption="Danh sách lô vắc xin" headers={['Vắc xin', 'Số lô', 'Ngày nhập', 'Hạn sử dụng', 'SL nhập', 'SL còn', 'Giá nhập', 'Trạng thái', 'Thao tác']} rows={batchRows} /> : <section className="cd-panel ai-empty"><h2>{inventory.batches.length ? 'Không tìm thấy lô vắc xin phù hợp' : 'Chưa có lô vắc xin'}</h2></section> : transactions.length ? <DataTable caption="Lịch sử giao dịch, mới nhất trước" headers={['Thời gian', 'Vắc xin', 'Số lô', 'Loại giao dịch', 'Số lượng', 'Người thực hiện', 'Ghi chú']} rows={transactionRows} /> : <section className="cd-panel ai-empty"><h2>{inventory.transactions.length ? 'Không tìm thấy giao dịch phù hợp' : 'Chưa có giao dịch kho'}</h2></section>}
    <footer className="cd-footer"><Icon name="shield" />An toàn · Chủ động · Vì sức khỏe cộng đồng</footer>
  </main></div>{modal && (modal.mode === 'import' || selected) && <InventoryModal mode={modal.mode} batch={selected} inventory={inventory} vaccines={vaccines} onSave={save} onClose={() => setModal(null)} />}</div>;
}

