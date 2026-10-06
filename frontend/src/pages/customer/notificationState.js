import { createContext } from 'react';

export const initialNotifications = [];
export function unreadCount(items) { return items.filter((item) => !item.da_doc).length; }
export const NotificationContext = createContext({ notifications: initialNotifications });
