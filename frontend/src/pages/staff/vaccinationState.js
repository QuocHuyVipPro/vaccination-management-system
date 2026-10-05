import { initialAppointments, initialPatients } from './staffMockData.js';

export const initialBatches = [
  { id: 1, batchNumber: 'HPV240801', vaccine: 'HPV Gardasil 9', expiryDate: '2027-08-30', remainingQuantity: 25, status: 'available' },
  { id: 2, batchNumber: 'HPV240902', vaccine: 'HPV Gardasil 9', expiryDate: '2027-09-15', remainingQuantity: 8, status: 'available' },
  { id: 3, batchNumber: 'VAX260301', vaccine: 'Vaxigrip Tetra', expiryDate: '2027-03-30', remainingQuantity: 18, status: 'available' },
  { id: 4, batchNumber: 'PRE260401', vaccine: 'Prevenar 13', expiryDate: '2027-04-30', remainingQuantity: 12, status: 'available' },
  { id: 5, batchNumber: 'VAR260501', vaccine: 'Varivax', expiryDate: '2027-05-30', remainingQuantity: 10, status: 'available' },
  { id: 6, batchNumber: 'HPV-EXPIRED', vaccine: 'HPV Gardasil 9', expiryDate: '2020-01-01', remainingQuantity: 5, status: 'available' },
  { id: 7, batchNumber: 'HPV-EMPTY', vaccine: 'HPV Gardasil 9', expiryDate: '2027-09-15', remainingQuantity: 0, status: 'available' },
  { id: 8, batchNumber: 'HPV-HOLD', vaccine: 'HPV Gardasil 9', expiryDate: '2027-09-15', remainingQuantity: 9, status: 'unavailable' },
];
export const initialVaccinationState = { appointments: initialAppointments, batches: initialBatches, records: [] };
export function todayInVietnam() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
}
export function patientFor(appointment) {
  return initialPatients.find((patient) => patient.fullName === appointment.patientName && patient.phone === appointment.phone) || {
    id: `profile-${appointment.id}`, fullName: appointment.patientName, dateOfBirth: appointment.dateOfBirth,
    phone: appointment.phone, gender: 'Chưa cập nhật', guardian: 'Chưa cập nhật', allergies: 'Chưa cập nhật', healthNotes: 'Chưa cập nhật',
  };
}
export function availableBatches(batches, vaccine, date, today = todayInVietnam()) {
  return batches.filter((batch) => batch.vaccine === vaccine && batch.status === 'available' && batch.remainingQuantity > 0 && batch.expiryDate >= today && (!date || batch.expiryDate >= date));
}
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateVaccination(state, draft) {
  const errors = {};
  const appointment = state.appointments.find((item) => item.id === draft.appointmentId && item.status === 'confirmed');
  if (!appointment) errors.appointment = 'Vui lòng chọn lịch hẹn đã xác nhận.';
  if (!validDate(draft.vaccinationDate)) errors.date = 'Vui lòng chọn ngày tiêm hợp lệ.';
  if (!availableBatches(state.batches, appointment?.vaccine, draft.vaccinationDate).some((batch) => batch.id === draft.batchId)) errors.batch = 'Vui lòng chọn lô còn hạn, còn hàng và đúng vắc xin.';
  if (draft.hasNextDose && !validDate(draft.nextDoseDate)) errors.nextDate = 'Vui lòng chọn ngày dự kiến mũi tiếp theo.';
  else if (draft.hasNextDose && draft.nextDoseDate <= draft.vaccinationDate) errors.nextDate = 'Ngày mũi tiếp theo phải sau ngày tiêm.';
  return errors;
}
export function completeVaccination(state, draft) {
  if (Object.keys(validateVaccination(state, draft)).length) return state;
  const appointment = state.appointments.find((item) => item.id === draft.appointmentId);
  const batch = state.batches.find((item) => item.id === draft.batchId);
  const record = { ...draft, id: `record-${appointment.id}`, patientId: patientFor(appointment).id, patientName: appointment.patientName, dateOfBirth: patientFor(appointment).dateOfBirth, vaccine: appointment.vaccine, dose: appointment.dose, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, staffName: 'Trần Thị Lan', nextDoseDate: draft.hasNextDose ? draft.nextDoseDate : null };
  return {
    appointments: state.appointments.map((item) => item.id === appointment.id ? { ...item, status: 'completed' } : item),
    batches: state.batches.map((item) => item.id === batch.id ? { ...item, remainingQuantity: item.remainingQuantity - 1 } : item),
    records: [...state.records, record],
  };
}
