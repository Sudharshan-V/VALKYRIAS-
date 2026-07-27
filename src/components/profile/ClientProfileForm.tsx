import React from 'react';
import type {
  ClientProfileRequest,
  ClientType,
  PreferredCommunication,
} from '../../types';

interface ClientProfileFormProps {
  value: ClientProfileRequest;
  onChange: (value: ClientProfileRequest) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

const CLIENT_TYPES: Array<{ value: ClientType; label: string }> = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'AGENCY', label: 'Agency' },
  { value: 'NON_PROFIT', label: 'Non-profit' },
  { value: 'OTHER', label: 'Other' },
];

const COMMUNICATION_OPTIONS: Array<{ value: PreferredCommunication; label: string }> = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'VIDEO_CALL', label: 'Video call' },
  { value: 'OTHER', label: 'Other' },
];

const inputClass = 'neu-input w-full rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary-gold/35';

function errorFor(errors: Record<string, string>, field: string): string | undefined {
  return errors[`clientProfile.${field}`] ?? errors[field];
}

export const ClientProfileForm: React.FC<ClientProfileFormProps> = ({
  value,
  onChange,
  fieldErrors = {},
  disabled = false,
}) => (
  <fieldset disabled={disabled} className="space-y-4">
    <legend className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider text-white">
      Client details
    </legend>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Company name</span>
        <input
          type="text"
          value={value.companyName ?? ''}
          onChange={(event) => onChange({ ...value, companyName: event.target.value || null })}
          maxLength={150}
          className={inputClass}
          placeholder="Your company or studio"
          aria-invalid={Boolean(errorFor(fieldErrors, 'companyName'))}
        />
        {errorFor(fieldErrors, 'companyName') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'companyName')}</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Client type</span>
        <select
          value={value.clientType ?? ''}
          onChange={(event) => onChange({ ...value, clientType: (event.target.value || null) as ClientType | null })}
          className={`${inputClass} neu-select`}
          aria-invalid={Boolean(errorFor(fieldErrors, 'clientType'))}
        >
          <option value="">Select a client type</option>
          {CLIENT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {errorFor(fieldErrors, 'clientType') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'clientType')}</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Preferred communication</span>
        <select
          value={value.preferredCommunication ?? ''}
          onChange={(event) => onChange({
            ...value,
            preferredCommunication: (event.target.value || null) as PreferredCommunication | null,
          })}
          className={`${inputClass} neu-select`}
          aria-invalid={Boolean(errorFor(fieldErrors, 'preferredCommunication'))}
        >
          <option value="">Select a channel</option>
          {COMMUNICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {errorFor(fieldErrors, 'preferredCommunication') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'preferredCommunication')}</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Default project category</span>
        <input
          type="text"
          value={value.defaultProjectCategory ?? ''}
          onChange={(event) => onChange({ ...value, defaultProjectCategory: event.target.value || null })}
          maxLength={100}
          className={inputClass}
          placeholder="e.g. Commercial production"
          aria-invalid={Boolean(errorFor(fieldErrors, 'defaultProjectCategory'))}
        />
        {errorFor(fieldErrors, 'defaultProjectCategory') && <span className="block text-[10px] text-red-400">{errorFor(fieldErrors, 'defaultProjectCategory')}</span>}
      </label>
    </div>
  </fieldset>
);
