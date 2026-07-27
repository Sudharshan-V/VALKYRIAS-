import { authenticatedRequest } from '../api';
import type { NotificationResponse, PageResponse } from '../types';

export const listNotifications = (page = 0, size = 20) =>
  authenticatedRequest<PageResponse<NotificationResponse>>(
    `/notifications?page=${page}&size=${size}`,
  );

export const markNotificationRead = (id: string) =>
  authenticatedRequest<NotificationResponse>(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: 'POST' },
  );
