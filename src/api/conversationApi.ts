import { authenticatedRequest } from '../api';
import type { MessageResponse, PageResponse } from '../types';

export const listMessages = (conversationId: string, page = 0, size = 50) =>
  authenticatedRequest<PageResponse<MessageResponse>>(`/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&size=${size}`);
export const sendMessage = (conversationId: string, content: string, clientRequestId = crypto.randomUUID()) =>
  authenticatedRequest<MessageResponse>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST', body: JSON.stringify({ content, clientRequestId }),
  });
