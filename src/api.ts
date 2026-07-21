import { supabase } from './supabaseClient';
import type {
  ActionItem,
  ApiErrorResponse,
  ChatMessage,
  Note,
  ProfileResponse,
  ProfileUpdateRequest,
  Project,
} from './types';

const API_BASE_URL = '/api';

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

function apiUrl(path: string): string {
  if (path.startsWith('/api/')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeApiError(status: number, payload: unknown): ApiErrorResponse {
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
      : `Request failed with status ${status}.`,
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
      message: 'Your session has expired. Please sign in again.',
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
      message: error instanceof Error
        ? error.message
        : 'The backend is unavailable. Please try again.',
      path: apiUrl(path),
    });
  }

  const responseText = await response.text();
  let payload: unknown;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    throw new ApiError(normalizeApiError(response.status, payload));
  }

  return payload as T;
}

/** Existing Spring Boot data operations retained for current dashboards. */
export async function fetchProjects(userId: string) {
  try {
    return await authenticatedRequest<Project[]>(`/projects/user/${encodeURIComponent(userId)}`);
  } catch (error) {
    console.warn('Backend unavailable, falling back to local state:', error);
    return null;
  }
}

export async function saveProject(project: unknown) {
  try {
    return await authenticatedRequest<unknown>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  } catch (error) {
    console.error('Error saving project to Spring Boot backend:', error);
    return null;
  }
}

export async function fetchActionItems(userId: string) {
  try {
    return await authenticatedRequest<ActionItem[]>(`/action-items/user/${encodeURIComponent(userId)}`);
  } catch {
    return null;
  }
}

export async function saveActionItem(item: unknown) {
  try {
    return await authenticatedRequest<unknown>('/action-items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  } catch {
    return null;
  }
}

export async function fetchChatMessages(userId: string) {
  try {
    return await authenticatedRequest<ChatMessage[]>(`/chat-messages/user/${encodeURIComponent(userId)}`);
  } catch {
    return null;
  }
}

export async function saveChatMessage(message: unknown) {
  try {
    return await authenticatedRequest<unknown>('/chat-messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  } catch {
    return null;
  }
}

export async function fetchNotes(userId: string) {
  try {
    return await authenticatedRequest<Note[]>(`/notes/user/${encodeURIComponent(userId)}`);
  } catch {
    return null;
  }
}

export async function saveNote(note: unknown) {
  try {
    return await authenticatedRequest<unknown>('/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  } catch {
    return null;
  }
}

export async function deleteNoteFromApi(id: string) {
  try {
    await authenticatedRequest<void>(`/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (error) {
    console.error('Error deleting note:', error);
  }
}

export function getMyProfile(): Promise<ProfileResponse> {
  return authenticatedRequest<ProfileResponse>('/profile/me');
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
