import { createContext } from 'react';

export const initialNotifications = [
  { id: 1, type: 'reminder', title: 'Nhắc lịch tiêm sắp tới', message: 'Nguyễn Minh Anh có lịch tiêm HPV Gardasil 9 - Mũi 2 vào lúc 09:30 ngày 08/10/2026.', date: '04/10/2026', time: '08:00', isRead: false, appointmentId: 'LH20261008001' },
  { id: 2, type: 'appointment', title: 'Lịch tiêm đã được xác nhận', message: 'Lịch tiêm HPV Gardasil 9 của Nguyễn Minh Anh ngày 08/10/2026 đã được xác nhận.', date: '03/10/2026', time: '14:25', isRead: false, appointmentId: 'LH20261008001' },
  { id: 3, type: 'reminder', title: 'Đến lịch tiêm mũi tiếp theo', message: 'Nguyễn Minh Anh sắp đến lịch tiêm HPV Gardasil 9 - Mũi 2. Vui lòng kiểm tra và sắp xếp thời gian.', date: '01/10/2026', time: '08:00', isRead: true, appointmentId: null },
  { id: 4, type: 'appointment', title: 'Đăng ký lịch tiêm thành công', message: 'Yêu cầu đăng ký tiêm Vaxigrip Tetra của Nguyễn Văn An đã được ghi nhận và đang chờ xác nhận.', date: '30/09/2026', time: '16:10', isRead: true, appointmentId: 'LH20261012002' },
  { id: 5, type: 'system', title: 'Chào mừng đến với Tiêm Chủng Care', message: 'Cảm ơn bạn đã sử dụng hệ thống quản lý và nhắc lịch tiêm chủng.', date: '25/09/2026', time: '09:00', isRead: true, appointmentId: null },
];
export function unreadCount(items) { return items.filter((item) => !item.isRead).length; }
export function markRead(items, id) { return items.map((item) => (id === undefined || item.id === id) && !item.isRead ? { ...item, isRead: true } : item); }
export function filterNotifications(items, filter) { return items.filter((item) => filter === 'all' || (filter === 'unread' ? !item.isRead : item.type === filter)); }
export const NotificationContext = createContext({ notifications: initialNotifications });
