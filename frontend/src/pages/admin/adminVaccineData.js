export const initialVaccines = [
  { id: 1, name: 'HPV Gardasil 9', manufacturer: 'Merck', country: 'Mỹ', diseasePrevention: 'Các bệnh do HPV', description: 'Vắc xin phòng các bệnh do virus HPV.', price: 2900000, status: true, schedules: [
    { doseNumber: 1, doseName: 'Mũi 1', intervalDays: 0, description: 'Mũi đầu tiên' },
    { doseNumber: 2, doseName: 'Mũi 2', intervalDays: 60, description: 'Cách mũi 1 khoảng 2 tháng' },
    { doseNumber: 3, doseName: 'Mũi 3', intervalDays: 120, description: 'Theo phác đồ' },
  ] },
  { id: 2, name: 'Vaxigrip Tetra', manufacturer: 'Sanofi', country: 'Pháp', diseasePrevention: 'Cúm mùa', description: 'Thông tin mẫu phục vụ giao diện.', price: 350000, status: true, schedules: [{ doseNumber: 1, doseName: 'Mũi 1', intervalDays: 0, description: 'Mũi đầu tiên' }] },
  { id: 3, name: 'Prevenar 13', manufacturer: 'Pfizer', country: 'Bỉ', diseasePrevention: 'Các bệnh do phế cầu', description: 'Thông tin mẫu phục vụ giao diện.', price: 1200000, status: true, schedules: [{ doseNumber: 1, doseName: 'Mũi 1', intervalDays: 0, description: 'Mũi đầu tiên' }] },
  { id: 4, name: 'Varivax', manufacturer: 'Merck', country: 'Mỹ', diseasePrevention: 'Thủy đậu', description: 'Thông tin mẫu phục vụ giao diện.', price: 950000, status: true, schedules: [{ doseNumber: 1, doseName: 'Mũi 1', intervalDays: 0, description: 'Mũi đầu tiên' }] },
  { id: 5, name: 'Engerix-B', manufacturer: 'GSK', country: 'Bỉ', diseasePrevention: 'Viêm gan B', description: 'Thông tin mẫu phục vụ giao diện.', price: 250000, status: false, schedules: [] },
  { id: 6, name: 'Priorix', manufacturer: 'GSK', country: 'Bỉ', diseasePrevention: 'Sởi, quai bị, rubella', description: 'Thông tin mẫu phục vụ giao diện.', price: 450000, status: false, schedules: [] },
];
