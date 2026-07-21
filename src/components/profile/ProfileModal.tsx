import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ApiError, getMyProfile } from '../../api';
import { useAppState } from '../../context/StateContext';
import type { ProfileResponse } from '../../types';
import { AvatarUploader } from './AvatarUploader';
import { ProfileEditForm } from './ProfileEditForm';
import { ProfileView } from './ProfileView';

interface ProfilePanelProps {
  onClose?: () => void;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Sign in again to view your profile.';
    if (error.status === 403) return 'Your account is not permitted to access this profile.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unable to load your profile.';
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ onClose }) => {
  const { profile: cachedProfile, cacheProfile } = useAppState();
  const mountedRef = useRef(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(cachedProfile);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const loadProfile = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLoadError('');
    try {
      const loaded = await getMyProfile();
      if (mountedRef.current) {
        setProfile(loaded);
        cacheProfile(loaded);
      }
      return loaded;
    } catch (error) {
      if (mountedRef.current) setLoadError(friendlyError(error));
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [cacheProfile]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSaved = async (updated: ProfileResponse) => {
    setProfile(updated);
    cacheProfile(updated);
    setEditing(false);
    setLoadError('');
    setSuccessMessage('Profile changes saved successfully.');

    const refreshed = await loadProfile(false);
    if (!refreshed && mountedRef.current) {
      setProfile(updated);
      setLoadError('');
      setSuccessMessage('Profile saved. Fresh data will be loaded the next time you open it.');
    }
  };

  const handleAvatarChanged = async (updated: ProfileResponse | null, message: string) => {
    if (updated) {
      setProfile(updated);
      cacheProfile(updated);
    } else {
      const next = profile ? { ...profile, profileImageUrl: null } : profile;
      setProfile(next);
      cacheProfile(next);
    }
    setLoadError('');
    setSuccessMessage(message);

    const refreshed = await loadProfile(false);
    if (!refreshed && mountedRef.current) {
      const next = updated ?? (profile ? { ...profile, profileImageUrl: null } : profile);
      setProfile(next);
      cacheProfile(next);
      setLoadError('');
    }
  };

  return (
    <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-primary-gold/15 bg-[#111520] shadow-[20px_20px_60px_rgba(0,0,0,0.8)]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/5 bg-[#0d1018]/85 px-5 py-4 backdrop-blur-xl sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="neumorphic-inset flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-gold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-primary-gold">Secure account identity</p>
            <h2 className="truncate font-display text-xl font-black text-white">My profile</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile && (
            <span className="hidden rounded-lg border border-primary-gold/20 bg-primary-gold/10 px-2.5 py-1 font-mono text-[9px] font-bold text-primary-gold sm:inline-flex">
              {profile.role}
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile"
              className="neumorphic-button rounded-xl p-2.5 text-gray-400 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        {loading && !profile ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary-gold" />
            <div>
              <p className="text-sm font-bold text-white">Loading your profile</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-gray-500">Authorizing private identity data...</p>
            </div>
          </div>
        ) : loadError && !profile ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-950/20 text-red-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="max-w-md">
              <p className="text-sm font-bold text-white">Profile unavailable</p>
              <p role="alert" className="mt-2 text-xs leading-relaxed text-gray-400">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="neumorphic-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-primary-gold"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {successMessage && (
              <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3 text-xs text-emerald-300">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{successMessage}</span>
                <button type="button" onClick={() => setSuccessMessage('')} aria-label="Dismiss success message" className="text-emerald-300/60 hover:text-emerald-200"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}

            {loadError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs text-amber-100/80">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{loadError}</span>
              </div>
            )}

            <AvatarUploader profile={profile} onChanged={handleAvatarChanged} />

            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <p className="font-display text-base font-extrabold text-white">{editing ? 'Edit profile' : profile.displayName || profile.fullName || profile.email}</p>
                <p className="mt-1 text-[10px] text-gray-500">{editing ? 'Changes are saved securely to your account.' : 'Only you can edit this private profile.'}</p>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage('');
                    setEditing(true);
                  }}
                  className="neumorphic-button inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-bold text-primary-gold transition hover:text-champagne"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit profile
                </button>
              )}
            </div>

            {editing ? (
              <ProfileEditForm profile={profile} onSaved={handleSaved} onCancel={() => setEditing(false)} />
            ) : (
              <ProfileView profile={profile} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My profile"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
    >
      <ProfilePanel onClose={onClose} />
    </div>
  );
};
