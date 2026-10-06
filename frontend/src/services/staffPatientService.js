import { getStaffAppointments } from './staffAppointmentService.js';


export function deduplicateStaffPatients(appointments) {
  const patients = new Map();
  for (const appointment of Array.isArray(appointments) ? appointments : []) {
    const existing = patients.get(appointment.ma_ho_so);
    if (existing) {
      existing.appointment_count += 1;
      continue;
    }
    patients.set(appointment.ma_ho_so, {
      ma_ho_so: appointment.ma_ho_so,
      ho_ten: appointment.ho_ten,
      ngay_sinh: appointment.ngay_sinh,
      gioi_tinh: appointment.gioi_tinh,
      so_dien_thoai: appointment.so_dien_thoai,
      appointment_count: 1,
    });
  }
  return [...patients.values()].sort((left, right) =>
    String(left.ho_ten).localeCompare(String(right.ho_ten), 'vi'));
}

export async function getStaffPatients() {
  return deduplicateStaffPatients(await getStaffAppointments());
}
