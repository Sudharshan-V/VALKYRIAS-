import { ApiError, apiUrl, authenticatedRequest, normalizeApiError } from '../api';
import { supabase } from '../supabaseClient';
import type { FileCategory, FileResponse } from '../types';

export const listOrderFiles = (orderId: string) =>
  authenticatedRequest<FileResponse[]>(`/orders/${encodeURIComponent(orderId)}/files`);
export const uploadOrderFile = async (
  orderId: string,
  category: FileCategory,
  file: File,
  onProgress?: (percentage: number) => void,
) => {
  const body = new FormData();
  body.append('file', file, file.name);
  const path = `/orders/${encodeURIComponent(orderId)}/files?category=${encodeURIComponent(category)}`;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new ApiError({ status: 401, error: 'Unauthorized', message: 'No active Supabase session was found. Please sign in again.', path: apiUrl(path) });
  }

  return new Promise<FileResponse>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', apiUrl(path));
    request.setRequestHeader('Accept', 'application/json');
    request.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    });
    request.addEventListener('error', () => reject(new ApiError({
      status: 0,
      error: 'Network error',
      message: 'Unable to reach the Spring Boot backend. Check that it is running and that the API URL is configured.',
      path: apiUrl(path),
    })));
    request.addEventListener('load', () => {
      let payload: unknown;
      try {
        payload = request.responseText ? JSON.parse(request.responseText) : undefined;
      } catch {
        payload = request.responseText;
      }
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve(payload as FileResponse);
      } else {
        reject(new ApiError(normalizeApiError(request.status, payload, apiUrl(path))));
      }
    });
    request.send(body);
  });
};
export const getFileDownload = (fileId: string) =>
  authenticatedRequest<{ id: string; filename: string; contentType: string; signedUrl: string; expiresInSeconds: number }>(
    `/files/${encodeURIComponent(fileId)}/download`,
  );
export const deleteFile = (fileId: string) =>
  authenticatedRequest<void>(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
