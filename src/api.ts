import { supabase } from './supabaseClient';
import type {
  ApiErrorResponse,
  Note,
  ProfileRole,
  ProfileResponse,
  ProfileUpdateRequest,
} from './types';

function configuredApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configured) return '/api';

  const withoutTrailingSlash = configured.replace(/\/+$/, '');
  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
}

const API_BASE_URL = configuredApiBaseUrl();

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  readonly details: ApiErrorResponse;

  constructor(details: ApiErrorResponse) {
    super(details.message || 'The request could not be completed.');
    this.name = 'ApiError';
    this.status = details.status;
    this.fieldErrors = details.fieldErrors ?? {};
    this.details = details;
  }
}

export function apiUrl(path: string): string {
  const apiPath = path.startsWith('/api/') ? path.slice('/api'.length) : path;
  return `${API_BASE_URL}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
}

async function parseResponse<T>(response: Response, path: string): Promise<T> {
  const responseText = await response.text();
  let payload: unknown;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }
  if (!response.ok) throw new ApiError(normalizeApiError(response.status, payload, apiUrl(path)));
  return payload as T;
}

export async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  try {
    const response = await fetch(apiUrl(path), { ...init, headers, credentials: 'same-origin' });
    return await parseResponse<T>(response, path);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({ status: 0, error: 'Network error',
      message: 'Unable to reach the Spring Boot backend. Check that it is running and that the API URL is configured.',
      path: apiUrl(path) });
  }
}

export function normalizeApiError(status: number, payload: unknown, path: string): ApiErrorResponse {
  if (status === 404) {
    return {
      status,
      error: 'Backend endpoint not found',
      message: `The backend endpoint ${path} was not found. Check the Vite proxy or VITE_API_BASE_URL configuration.`,
      path,
    };
  }

  if (payload && typeof payload === 'object') {
    const body = payload as Partial<ApiErrorResponse>;
    return {
      timestamp: body.timestamp,
      status: body.status ?? status,
      error: body.error,
      message: body.message || body.error || `Request failed with status ${status}.`,
      path: body.path,
      fieldErrors: body.fieldErrors,
    };
  }

  return {
    status,
    message: typeof payload === 'string' && payload.trim()
      ? payload
        : `The backend request failed with status ${status}.`,
    path,
  };
}

/**
 * Sends a request to the Spring Boot API with the current Supabase access token.
 * Authentication remains owned by the existing Supabase session; the backend
 * uses the bearer token to resolve the current user for protected operations.
 */
export async function authenticatedRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new ApiError({
      status: 401,
      error: 'Unauthorized',
      message: 'No active Supabase session was found. Please sign in again.',
      path: apiUrl(path),
    });
  }

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${session.access_token}`);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: 'same-origin',
    });
  } catch (error) {
    throw new ApiError({
      status: 0,
      error: 'Network error',
      message: 'Unable to reach the Spring Boot backend. Check that it is running and that the API URL is configured.',
      path: apiUrl(path),
    });
  }

  return parseResponse<T>(response, path);
}

export async function fetchNotes() {
  return authenticatedRequest<Note[]>('/notes');
}

export function getMyProfile(selectedRole?: ProfileRole): Promise<ProfileResponse> {
  return authenticatedRequest<ProfileResponse>('/profile/me', {
    headers: selectedRole ? { 'X-Requested-Role': selectedRole } : undefined,
  });
}

export function updateMyProfile(request: ProfileUpdateRequest): Promise<ProfileResponse> {
  return authenticatedRequest<ProfileResponse>('/profile/me', {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

export function uploadMyAvatar(file: File): Promise<ProfileResponse> {
  const body = new FormData();
  body.append('file', file, file.name);
  return authenticatedRequest<ProfileResponse>('/profile/me/avatar', {
    method: 'POST',
    body,
  });
}

export function deleteMyAvatar(): Promise<void> {
  return authenticatedRequest<void>('/profile/me/avatar', {
    method: 'DELETE',
  });
}
