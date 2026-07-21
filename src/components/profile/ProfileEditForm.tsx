import React, { useState } from 'react';
import { AlertCircle, Check, LoaderCircle, X } from 'lucide-react';
import { ApiError, updateMyProfile } from '../../api';
import type {
  ClientProfileRequest,
  EditorProfileRequest,
  ProfileResponse,
  ProfileUpdateRequest,
} from '../../types';
import { ClientProfileForm } from './ClientProfileForm';
import { EditorProfileForm } from './EditorProfileForm';

interface ProfileEditFormProps {
  profile: ProfileResponse;
  onSaved: (profile: ProfileResponse) => void | Promise<void>;
  onCancel: () => void;
}

const EMPTY_CLIENT_PROFILE: ClientProfileRequest = {
  companyName: null,
  clientType: null,
  preferredCommunication: null,
  defaultProjectCategory: null,
};

const EMPTY_EDITOR_PROFILE: EditorProfileRequest = {
  professionalTitle: null,
  experienceYears: null,
  skills: [],
  softwareUsed: [],
  languages: [],
  startingPrice: null,
  hourlyRate: null,
  deliveryTime: null,
  availabilityStatus: null,
  portfolioSummary: null,
  certifications: [],
  location: null,
  websiteUrl: null,
  instagramUrl: null,
  linkedinUrl: null,
};

const inputClass = 'neu-input w-full rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary-gold/35';

function nullable(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

function cleanTags(values: string[]): string[] {
  const unique = new Map<string, string>();
  values.forEach((value) => {
    const normalized = value.trim();
    if (normalized) unique.set(normalized.toLocaleLowerCase(), normalized);
  });
  return [...unique.values()];
}

function draftFromProfile(profile: ProfileResponse): ProfileUpdateRequest {
  const draft: ProfileUpdateRequest = {
    fullName: profile.fullName ?? '',
    displayName: profile.displayName,
    phoneNumber: profile.phoneNumber,
    country: profile.country,
    timezone: profile.timezone,
    bio: profile.bio,
  };

  if (profile.role === 'CLIENT') {
    draft.clientProfile = { ...EMPTY_CLIENT_PROFILE, ...profile.clientProfile };
  } else if (profile.role === 'EDITOR') {
    draft.editorProfile = {
      ...EMPTY_EDITOR_PROFILE,
      ...profile.editorProfile,
      skills: [...(profile.editorProfile?.skills ?? [])],
      softwareUsed: [...(profile.editorProfile?.softwareUsed ?? [])],
      languages: [...(profile.editorProfile?.languages ?? [])],
      certifications: [...(profile.editorProfile?.certifications ?? [])],
    };
  }

  return draft;
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validate(draft: ProfileUpdateRequest, profile: ProfileResponse): Record<string, string> {
  const errors: Record<string, string> = {};
  const fullName = draft.fullName.trim();

  if (!fullName) errors.fullName = 'Full name is required.';
  else if (fullName.length < 2 || fullName.length > 100) errors.fullName = 'Use between 2 and 100 characters.';

  if ((draft.displayName?.trim().length ?? 0) > 80) errors.displayName = 'Display name must be 80 characters or fewer.';
  if (draft.phoneNumber && !/^\+?[0-9()\-\.\s]{7,25}$/.test(draft.phoneNumber.trim())) {
    errors.phoneNumber = 'Enter a valid phone number.';
  }
  if ((draft.country?.trim().length ?? 0) > 100) errors.country = 'Country must be 100 characters or fewer.';
  if (draft.timezone && !isValidTimeZone(draft.timezone.trim())) errors.timezone = 'Enter a valid IANA timezone, such as Asia/Kolkata.';
  if ((draft.bio?.length ?? 0) > 2000) errors.bio = 'Bio must be 2,000 characters or fewer.';

  if (profile.role === 'EDITOR' && draft.editorProfile) {
    const editor = draft.editorProfile;
    if (editor.experienceYears !== null && (!Number.isInteger(editor.experienceYears) || editor.experienceYears < 0 || editor.experienceYears > 80)) {
      errors['editorProfile.experienceYears'] = 'Experience must be a whole number from 0 to 80.';
    }
    if (editor.startingPrice !== null && editor.startingPrice < 0) errors['editorProfile.startingPrice'] = 'Starting price cannot be negative.';
    if (editor.hourlyRate !== null && editor.hourlyRate < 0) errors['editorProfile.hourlyRate'] = 'Hourly rate cannot be negative.';
    if ((editor.portfolioSummary?.length ?? 0) > 3000) errors['editorProfile.portfolioSummary'] = 'Portfolio summary must be 3,000 characters or fewer.';

    (['websiteUrl', 'instagramUrl', 'linkedinUrl'] as const).forEach((field) => {
      const value = editor[field]?.trim();
      if (value && !isValidHttpUrl(value)) errors[`editorProfile.${field}`] = 'Enter a complete http:// or https:// URL.';
    });
  }

  return errors;
}

function normalizeDraft(draft: ProfileUpdateRequest, profile: ProfileResponse): ProfileUpdateRequest {
  const request: ProfileUpdateRequest = {
    fullName: draft.fullName.trim(),
    displayName: nullable(draft.displayName),
    phoneNumber: nullable(draft.phoneNumber),
    country: nullable(draft.country),
    timezone: nullable(draft.timezone),
    bio: nullable(draft.bio),
  };

  if (profile.role === 'CLIENT' && draft.clientProfile) {
    request.clientProfile = {
      ...draft.clientProfile,
      companyName: nullable(draft.clientProfile.companyName),
      defaultProjectCategory: nullable(draft.clientProfile.defaultProjectCategory),
    };
  } else if (profile.role === 'EDITOR' && draft.editorProfile) {
    request.editorProfile = {
      ...draft.editorProfile,
      professionalTitle: nullable(draft.editorProfile.professionalTitle),
      deliveryTime: nullable(draft.editorProfile.deliveryTime),
      portfolioSummary: nullable(draft.editorProfile.portfolioSummary),
      location: nullable(draft.editorProfile.location),
      websiteUrl: nullable(draft.editorProfile.websiteUrl),
      instagramUrl: nullable(draft.editorProfile.instagramUrl),
      linkedinUrl: nullable(draft.editorProfile.linkedinUrl),
      skills: cleanTags(draft.editorProfile.skills),
      softwareUsed: cleanTags(draft.editorProfile.softwareUsed),
      languages: cleanTags(draft.editorProfile.languages),
      certifications: cleanTags(draft.editorProfile.certifications),
    };
  }

  return request;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ profile, onSaved, onCancel }) => {
  const [draft, setDraft] = useState<ProfileUpdateRequest>(() => draftFromProfile(profile));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate(draft, profile);
    setFieldErrors(validationErrors);
    setSubmitError('');
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const updated = await updateMyProfile(normalizeDraft(draft, profile));
      await onSaved(updated);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setSubmitError(error instanceof Error ? error.message : 'Unable to save your profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  const sharedError = (field: string) => fieldErrors[field] ?? fieldErrors[`profile.${field}`];

  return (
    <form onSubmit={handleSubmit} className="space-y-7" noValidate>
      {submitError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-950/20 p-3 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <fieldset disabled={saving} className="space-y-4">
        <legend className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider text-white">
          Account identity
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Full name *</span>
            <input
              type="text"
              value={draft.fullName}
              onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
              maxLength={100}
              className={inputClass}
              autoComplete="name"
              aria-invalid={Boolean(sharedError('fullName'))}
            />
            {sharedError('fullName') && <span className="block text-[10px] text-red-400">{sharedError('fullName')}</span>}
          </label>

          <label className="space-y-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Display name</span>
            <input
              type="text"
              value={draft.displayName ?? ''}
              onChange={(event) => setDraft({ ...draft, displayName: event.target.value || null })}
              maxLength={80}
              className={inputClass}
              aria-invalid={Boolean(sharedError('displayName'))}
            />
            {sharedError('displayName') && <span className="block text-[10px] text-red-400">{sharedError('displayName')}</span>}
          </label>

          <label className="space-y-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Email</span>
            <input type="email" value={profile.email} disabled className={`${inputClass} cursor-not-allowed opacity-55`} />
            <span className="block font-mono text-[9px] text-gray-600">Email is managed by your authenticated account.</span>
          </label>

          <label className="space-y-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Role</span>
            <input type="text" value={profile.role} disabled className={`${inputClass} cursor-not-allowed opacity-55`} />
            <span className="block font-mono text-[9px] text-gray-600">Roles cannot be changed from your profile.</span>
          </label>

          <label className="space-y-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Phone number</span>
            <input
              type="tel"
              value={draft.phoneNumber ?? ''}
              onChange={(event) => setDraft({ ...draft, phoneNumber: event.target.value || null })}
              maxLength={25}
              className={inputClass}
              autoComplete="tel"
              placeholder="+91 98765 43210"
              aria-invalid={Boolean(sharedError('phoneNumber'))}
            />
            {sharedError('phoneNumber') && <span className="block text-[10px] text-red-400">{sharedError('phoneNumber')}</span>}
          </label>

          <label className="space-y-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Country</span>
            <input
              type="text"
              value={draft.country ?? ''}
              onChange={(event) => setDraft({ ...draft, country: event.target.value || null })}
              maxLength={100}
              className={inputClass}
              autoComplete="country-name"
              placeholder="India"
              aria-invalid={Boolean(sharedError('country'))}
            />
            {sharedError('country') && <span className="block text-[10px] text-red-400">{sharedError('country')}</span>}
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Timezone</span>
            <input
              type="text"
              value={draft.timezone ?? ''}
              onChange={(event) => setDraft({ ...draft, timezone: event.target.value || null })}
              maxLength={100}
              className={inputClass}
              list="valkyrias-timezones"
              placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'}
              aria-invalid={Boolean(sharedError('timezone'))}
            />
            <datalist id="valkyrias-timezones">
              <option value="Asia/Kolkata" />
              <option value="Europe/London" />
              <option value="America/New_York" />
              <option value="America/Los_Angeles" />
              <option value="Australia/Sydney" />
              <option value="UTC" />
            </datalist>
            {sharedError('timezone') && <span className="block text-[10px] text-red-400">{sharedError('timezone')}</span>}
          </label>
        </div>

        <label className="space-y-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Bio</span>
          <textarea
            value={draft.bio ?? ''}
            onChange={(event) => setDraft({ ...draft, bio: event.target.value || null })}
            maxLength={2000}
            rows={4}
            className={`${inputClass} resize-y`}
            placeholder="Tell collaborators a little about yourself."
            aria-invalid={Boolean(sharedError('bio'))}
          />
          <div className="flex justify-between gap-3 text-[9px]">
            <span className="text-red-400">{sharedError('bio')}</span>
            <span className="font-mono text-gray-600">{(draft.bio ?? '').length}/2000</span>
          </div>
        </label>
      </fieldset>

      {profile.role === 'CLIENT' && draft.clientProfile && (
        <ClientProfileForm
          value={draft.clientProfile}
          onChange={(clientProfile) => setDraft({ ...draft, clientProfile })}
          fieldErrors={fieldErrors}
          disabled={saving}
        />
      )}

      {profile.role === 'EDITOR' && draft.editorProfile && (
        <EditorProfileForm
          value={draft.editorProfile}
          onChange={(editorProfile) => setDraft({ ...draft, editorProfile })}
          fieldErrors={fieldErrors}
          disabled={saving}
        />
      )}

      <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-white/5 bg-[#111520]/95 py-4 backdrop-blur-xl sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="neumorphic-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" /> Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-gold px-5 py-3 text-xs font-extrabold text-obsidian shadow-lg transition hover:bg-champagne disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? 'Saving profile...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};
