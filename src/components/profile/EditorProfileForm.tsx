import React from 'react';
import type { AvailabilityStatus, EditorProfileRequest } from '../../types';
import {
  CertificationsInput,
  LanguagesInput,
  SkillsInput,
  SoftwareInput,
} from './TagInput';

interface EditorProfileFormProps {
  value: EditorProfileRequest;
  onChange: (value: EditorProfileRequest) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

const inputClass = 'neu-input w-full rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary-gold/35';

function errorFor(errors: Record<string, string>, field: string): string | undefined {
  return errors[`editorProfile.${field}`] ?? errors[field];
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const EditorProfileForm: React.FC<EditorProfileFormProps> = ({
  value,
  onChange,
  fieldErrors = {},
  disabled = false,
}) => (
  <fieldset disabled={disabled} className="space-y-5">
    <legend className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider text-white">
      Editor details
    </legend>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Professional title</span>
        <input
          type="text"
          value={value.professionalTitle ?? ''}
          onChange={(event) => onChange({ ...value, professionalTitle: event.target.value || null })}
          maxLength={120}
          className={inputClass}
          placeholder="e.g. Senior colorist"
          aria-invalid={Boolean(errorFor(fieldErrors, 'professionalTitle'))}
        />
        {errorFor(fieldErrors, 'professionalTitle') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'professionalTitle')}</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Experience (years)</span>
        <input
          type="number"
          min="0"
          max="80"
          step="1"
          value={value.experienceYears ?? ''}
          onChange={(event) => onChange({ ...value, experienceYears: optionalNumber(event.target.value) })}
          className={inputClass}
          aria-invalid={Boolean(errorFor(fieldErrors, 'experienceYears'))}
        />
        {errorFor(fieldErrors, 'experienceYears') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'experienceYears')}</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Starting price</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value.startingPrice ?? ''}
          onChange={(event) => onChange({ ...value, startingPrice: optionalNumber(event.target.value) })}
          className={inputClass}
          placeholder="0.00"
          aria-invalid={Boolean(errorFor(fieldErrors, 'startingPrice'))}
        />
        {errorFor(fieldErrors, 'startingPrice') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'startingPrice')}</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Hourly rate</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value.hourlyRate ?? ''}
          onChange={(event) => onChange({ ...value, hourlyRate: optionalNumber(event.target.value) })}
          className={inputClass}
          placeholder="0.00"
          aria-invalid={Boolean(errorFor(fieldErrors, 'hourlyRate'))}
        />
        {errorFor(fieldErrors, 'hourlyRate') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'hourlyRate')}</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Typical delivery time</span>
        <input
          type="text"
          value={value.deliveryTime ?? ''}
          onChange={(event) => onChange({ ...value, deliveryTime: event.target.value || null })}
          maxLength={100}
          className={inputClass}
          placeholder="e.g. 3-5 business days"
          aria-invalid={Boolean(errorFor(fieldErrors, 'deliveryTime'))}
        />
        {errorFor(fieldErrors, 'deliveryTime') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'deliveryTime')}</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Availability</span>
        <select
          value={value.availabilityStatus ?? ''}
          onChange={(event) => onChange({
            ...value,
            availabilityStatus: (event.target.value || null) as AvailabilityStatus | null,
          })}
          className={`${inputClass} neu-select`}
          aria-invalid={Boolean(errorFor(fieldErrors, 'availabilityStatus'))}
        >
          <option value="">Select availability</option>
          <option value="AVAILABLE">Available</option>
          <option value="LIMITED">Limited availability</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </select>
        {errorFor(fieldErrors, 'availabilityStatus') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'availabilityStatus')}</span>}
      </label>

      <label className="space-y-2 md:col-span-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Location</span>
        <input
          type="text"
          value={value.location ?? ''}
          onChange={(event) => onChange({ ...value, location: event.target.value || null })}
          maxLength={150}
          className={inputClass}
          placeholder="City, country or Remote"
          aria-invalid={Boolean(errorFor(fieldErrors, 'location'))}
        />
        {errorFor(fieldErrors, 'location') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'location')}</span>}
      </label>
    </div>

    <SkillsInput value={value.skills} onChange={(skills) => onChange({ ...value, skills })} error={errorFor(fieldErrors, 'skills')} disabled={disabled} />
    <SoftwareInput value={value.softwareUsed} onChange={(softwareUsed) => onChange({ ...value, softwareUsed })} error={errorFor(fieldErrors, 'softwareUsed')} disabled={disabled} />
    <LanguagesInput value={value.languages} onChange={(languages) => onChange({ ...value, languages })} error={errorFor(fieldErrors, 'languages')} disabled={disabled} />
    <CertificationsInput value={value.certifications} onChange={(certifications) => onChange({ ...value, certifications })} error={errorFor(fieldErrors, 'certifications')} disabled={disabled} />

    <label className="space-y-2">
      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Portfolio summary</span>
      <textarea
        value={value.portfolioSummary ?? ''}
        onChange={(event) => onChange({ ...value, portfolioSummary: event.target.value || null })}
        maxLength={3000}
        rows={4}
        className={`${inputClass} resize-y`}
        placeholder="Describe the kind of work and clients represented in your portfolio."
        aria-invalid={Boolean(errorFor(fieldErrors, 'portfolioSummary'))}
      />
      <div className="flex justify-between gap-3 text-[9px]">
        <span className="text-red-400">{errorFor(fieldErrors, 'portfolioSummary')}</span>
        <span className="font-mono text-gray-600">{(value.portfolioSummary ?? '').length}/3000</span>
      </div>
    </label>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {([
        ['websiteUrl', 'Website URL', 'https://your-site.com'],
        ['instagramUrl', 'Instagram URL', 'https://instagram.com/you'],
        ['linkedinUrl', 'LinkedIn URL', 'https://linkedin.com/in/you'],
      ] as const).map(([field, label, placeholder]) => (
        <label key={field} className="space-y-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
          <input
            type="url"
            value={value[field] ?? ''}
            onChange={(event) => onChange({ ...value, [field]: event.target.value || null })}
            maxLength={2048}
            className={inputClass}
            placeholder={placeholder}
            aria-invalid={Boolean(errorFor(fieldErrors, field))}
          />
          {errorFor(fieldErrors, field) && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, field)}</span>}
        </label>
      ))}
    </div>
  </fieldset>
);
