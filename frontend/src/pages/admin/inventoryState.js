export const transactionTypes = { NHAP_KHO: 'Nhập kho', XUAT_TIEM: 'Xuất tiêm', DIEU_CHINH: 'Điều chỉnh', HUY: 'Hủy / loại bỏ' };
export const batchStatuses = { active: 'Đang sử dụng', expiring: 'Sắp hết hạn', expired: 'Hết hạn', empty: 'Hết hàng' };
export function inventoryToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((key) => parts.find((part) => part.type === key).value).join('-');
}
export function batchStatus(batch, today = inventoryToday()) {
  if (batch.remainingQuantity <= 0) return 'empty';
  if (batch.expiryDate < today) return 'expired';
  return (Date.parse(batch.expiryDate) - Date.parse(today)) / 86400000 <= 30 ? 'expiring' : 'active';
}
const batches = [
  [1, 1, 'HPV Gardasil 9', 'HPV240801', '2026-08-01', '2027-08-30', 50, 25, 2200000, '2026-08-05'],
  [2, 2, 'Vaxigrip Tetra', 'VAX261001', '2026-06-01', '2027-06-01', 50, 8, 250000, '2026-07-01'],
  [3, 1, 'HPV Gardasil 9', 'HPV240701', '2025-10-01', '2026-10-20', 40, 18, 2100000, '2026-01-05'],
  [4, 3, 'Prevenar 13', 'PRE260401', '2026-04-01', '2027-04-30', 100, 70, 950000, '2026-04-10'],
  [5, 4, 'Varivax', 'VAR251001', '2025-09-01', '2026-10-25', 30, 6, 700000, '2025-10-01'],
  [6, 2, 'Vaxigrip Tetra', 'VAX250101', '2025-01-01', '2026-09-01', 20, 4, 230000, '2025-02-01'],
  [7, 3, 'Prevenar 13', 'PRE250501', '2025-05-01', '2027-05-01', 50, 0, 900000, '2025-06-01'],
  [8, 4, 'Varivax', 'VAR260901', '2026-09-01', '2027-09-01', 80, 60, 720000, '2026-09-05'],
].map(([id, vaccineId, vaccineName, batchNumber, manufactureDate, expiryDate, importedQuantity, remainingQuantity, purchasePrice, importDate]) => ({ id, vaccineId, vaccineName, batchNumber, manufactureDate, expiryDate, importedQuantity, remainingQuantity, purchasePrice, importDate, status: 'DANG_SU_DUNG' }));
const transactions = [
  { id: 1, batchId: 1, vaccineId: 1, vaccineName: 'HPV Gardasil 9', batchNumber: 'HPV240801', type: 'NHAP_KHO', quantity: 50, performedBy: 'Quản trị viên', note: 'Nhập lô mới', createdAt: '2026-08-05T09:15:00+07:00' },
  { id: 2, batchId: 1, vaccineId: 1, vaccineName: 'HPV Gardasil 9', batchNumber: 'HPV240801', type: 'XUAT_TIEM', quantity: -1, performedBy: 'Trần Thị Lan', note: 'Tiêm cho Nguyễn Minh Anh', createdAt: '2026-10-04T09:42:00+07:00' },
  { id: 3, batchId: 2, vaccineId: 2, vaccineName: 'Vaxigrip Tetra', batchNumber: 'VAX261001', type: 'DIEU_CHINH', quantity: -2, performedBy: 'Quản trị viên', reason: 'Kiểm kê thực tế', note: 'Kiểm kê thực tế', createdAt: '2026-10-04T10:00:00+07:00' },
  { id: 4, batchId: 6, vaccineId: 2, vaccineName: 'Vaxigrip Tetra', batchNumber: 'VAX250101', type: 'HUY', quantity: -2, performedBy: 'Quản trị viên', reason: 'Hết hạn', note: 'Hết hạn', createdAt: '2026-10-04T10:30:00+07:00' },
];
export const initialInventory = { batches, transactions };
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const whole = (value) => String(value).trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
export function validateInventory(state, mode, form, vaccines, batchId) {
  const errors = {};
  if (mode === 'import') {
    if (!vaccines.some((item) => item.id === Number(form.vaccineId))) errors.vaccineId = 'Vui lòng chọn vắc xin.';
    if (!form.batchNumber.trim()) errors.batchNumber = 'Vui lòng nhập số lô.';
    else if (state.batches.some((item) => item.batchNumber.toLowerCase() === form.batchNumber.trim().toLowerCase())) errors.batchNumber = 'Số lô đã tồn tại.';
    if (!validDate(form.expiryDate)) errors.expiryDate = 'Vui lòng chọn hạn sử dụng hợp lệ.';
    if (form.manufactureDate && !validDate(form.manufactureDate)) errors.manufactureDate = 'Ngày sản xuất không hợp lệ.';
    else if (form.manufactureDate && form.expiryDate <= form.manufactureDate) errors.expiryDate = 'Hạn sử dụng phải sau ngày sản xuất.';
    if (!whole(form.importedQuantity) || Number(form.importedQuantity) <= 0) errors.importedQuantity = 'Số lượng nhập phải là số nguyên lớn hơn 0.';
    if (String(form.purchasePrice).trim() === '' || !Number.isFinite(Number(form.purchasePrice)) || Number(form.purchasePrice) < 0) errors.purchasePrice = 'Giá nhập phải là số không âm.';
    if (!validDate(form.importDate)) errors.importDate = 'Vui lòng chọn ngày nhập hợp lệ.';
  } else {
    const batch = state.batches.find((item) => item.id === batchId);
    if (!batch) errors.quantity = 'Không tìm thấy lô vắc xin.';
    else if (!whole(form.quantity)) errors.quantity = 'Số lượng phải là số nguyên không âm.';
    else if (mode === 'discard' && (Number(form.quantity) <= 0 || Number(form.quantity) > batch.remainingQuantity)) errors.quantity = 'Số lượng loại bỏ phải lớn hơn 0 và không vượt quá số lượng còn.';
    else if (mode === 'adjust' && Number(form.quantity) === batch.remainingQuantity) errors.quantity = 'Số lượng thực tế chưa thay đổi.';
    if (!form.reason.trim()) errors.reason = 'Vui lòng nhập lý do.';
  }
  return errors;
}
export function applyInventory(state, mode, form, vaccines, batchId, createdAt) {
  if (!['import', 'adjust', 'discard'].includes(mode) || Object.keys(validateInventory(state, mode, form, vaccines, batchId)).length) return state;
  let batch; let nextBatches; let quantity;
  if (mode === 'import') {
    const vaccine = vaccines.find((item) => item.id === Number(form.vaccineId));
    batch = { id: Math.max(0, ...state.batches.map((item) => item.id)) + 1, vaccineId: vaccine.id, vaccineName: vaccine.name, batchNumber: form.batchNumber.trim(), manufactureDate: form.manufactureDate, expiryDate: form.expiryDate, importedQuantity: Number(form.importedQuantity), remainingQuantity: Number(form.importedQuantity), purchasePrice: Number(form.purchasePrice), importDate: form.importDate, status: 'DANG_SU_DUNG' };
    quantity = batch.importedQuantity; nextBatches = [...state.batches, batch];
  } else {
    batch = state.batches.find((item) => item.id === batchId);
    quantity = mode === 'adjust' ? Number(form.quantity) - batch.remainingQuantity : -Number(form.quantity);
    nextBatches = state.batches.map((item) => item.id === batchId ? { ...item, remainingQuantity: item.remainingQuantity + quantity } : item);
  }
  const transaction = { id: Math.max(0, ...state.transactions.map((item) => item.id)) + 1, batchId: batch.id, vaccineId: batch.vaccineId, vaccineName: batch.vaccineName, batchNumber: batch.batchNumber, type: mode === 'import' ? 'NHAP_KHO' : mode === 'adjust' ? 'DIEU_CHINH' : 'HUY', quantity, performedBy: 'Quản trị viên', reason: form.reason?.trim() || '', note: mode === 'import' ? 'Nhập lô mới' : [form.reason.trim(), form.note?.trim()].filter(Boolean).join(' — '), createdAt };
  return { batches: nextBatches, transactions: [...state.transactions, transaction] };
}
