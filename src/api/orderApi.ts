import { authenticatedRequest } from '../api';
import type { AssignmentResponse, OrderResponse, ReviewResponse } from '../types';

export const createOrder = (request: unknown) => authenticatedRequest<OrderResponse>('/orders', {
  method: 'POST', body: JSON.stringify(request),
});
export const assignEditor = (orderId: string, editorUserId: string) =>
  authenticatedRequest<AssignmentResponse>(`/orders/${encodeURIComponent(orderId)}/assignments`, {
    method: 'POST', body: JSON.stringify({ editorUserId }),
  });
export const markUnderReview = (orderId: string) => action(orderId, 'admin-review');
export const rejectOrder = (orderId: string, note?: string) =>
  authenticatedRequest<OrderResponse>(`/orders/${encodeURIComponent(orderId)}/admin-reject`, {
    method: 'POST', body: JSON.stringify({ note: note?.trim() || null }),
  });
export const respondToAssignment = (orderId: string, accept: boolean, note?: string) =>
  authenticatedRequest<AssignmentResponse>(`/orders/${encodeURIComponent(orderId)}/assignment/${accept ? 'accept' : 'reject'}`, {
    method: 'POST', body: JSON.stringify({ note: note || null }),
  });
export const startOrder = (orderId: string) => action(orderId, 'start');
export const updateProgress = (orderId: string, progress: number) =>
  authenticatedRequest<OrderResponse>(`/orders/${encodeURIComponent(orderId)}/progress`, {
    method: 'POST', body: JSON.stringify({ progress }),
  });
export const markPreviewReady = (orderId: string) => action(orderId, 'preview-ready');
export const approvePreview = (orderId: string) => action(orderId, 'approve-preview');
export const requestRevision = (orderId: string, note: string) =>
  authenticatedRequest<OrderResponse>(`/orders/${encodeURIComponent(orderId)}/request-revision`, {
    method: 'POST', body: JSON.stringify({ note }),
  });
export const deliverOrder = (orderId: string) => action(orderId, 'deliver');
export const completeOrder = (orderId: string) => action(orderId, 'complete');
export const submitReview = (orderId: string, rating: number, comment: string) =>
  authenticatedRequest<ReviewResponse>(`/orders/${encodeURIComponent(orderId)}/review`, {
    method: 'POST', body: JSON.stringify({ rating, comment: comment.trim() || null }),
  });

const action = (orderId: string, name: string) =>
  authenticatedRequest<OrderResponse>(`/orders/${encodeURIComponent(orderId)}/${name}`, { method: 'POST' });
