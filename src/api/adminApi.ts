import { authenticatedRequest } from '../api';
import type { AdminUserResponse, AvailableEditorResponse, CouponResponse, ProfileResponse } from '../types';

export const listAvailableEditors = () =>
  authenticatedRequest<AvailableEditorResponse[]>('/admin/editors/available');

export const listUsers = () =>
  authenticatedRequest<AdminUserResponse[]>('/admin/users');

export const updateUserAccess = (
  userId: string,
  update: { role?: ProfileResponse['role']; accountStatus?: ProfileResponse['accountStatus'] },
) => authenticatedRequest<AdminUserResponse>(`/admin/users/${encodeURIComponent(userId)}`, {
  method: 'PATCH',
  body: JSON.stringify(update),
});

export const createSystemNotification = (request: { userId: string; type: string; title: string; body: string }) =>
  authenticatedRequest('/admin/notifications', { method: 'POST', body: JSON.stringify(request) });

export const deleteUser = (userId: string) =>
  authenticatedRequest<void>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });

export const listCoupons = () =>
  authenticatedRequest<CouponResponse[]>('/admin/coupons');

export const createCoupon = (request: {
  code?: string;
  discountPercent: number;
  active: boolean;
  expiresAt: string | null;
}) => authenticatedRequest<CouponResponse>('/admin/coupons', {
  method: 'POST',
  body: JSON.stringify(request),
});

export const setCouponActive = (couponId: string, active: boolean) =>
  authenticatedRequest<CouponResponse>(
    `/admin/coupons/${encodeURIComponent(couponId)}/active?active=${active}`,
    { method: 'PATCH' },
  );
