import type { ProfileRole } from '../types';

export function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value == null ? fallback : String(value);
}

export function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

export function safeProfileRole(value: unknown, fallback: ProfileRole = 'CLIENT'): ProfileRole {
  const normalized = safeString(value).trim().toUpperCase();
  return normalized === 'ADMIN' || normalized === 'EDITOR' || normalized === 'CLIENT'
    ? normalized
    : fallback;
}

export function safePortalRole(value: unknown): 'admin' | 'client' | 'editor' {
  return safeProfileRole(value).toLowerCase() as 'admin' | 'client' | 'editor';
}

export function clampProgress(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}
