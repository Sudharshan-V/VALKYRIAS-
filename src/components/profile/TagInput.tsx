import React, { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';

export interface TagInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helpText?: string;
  error?: string;
  disabled?: boolean;
  maxItems?: number;
  maxTagLength?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Type a value and press Enter',
  helpText = 'Press Enter or comma to add an item.',
  error,
  disabled = false,
  maxItems = 30,
  maxTagLength = 80,
}) => {
  const id = useId();
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const tag = inputValue.trim().replace(/^,+|,+$/g, '');
    if (!tag || disabled) return;

    const alreadyExists = value.some(
      (item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase(),
    );
    if (!alreadyExists && value.length < maxItems) {
      onChange([...value, tag]);
    }
    setInputValue('');
  };

  const removeTag = (index: number) => {
    if (!disabled) onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="font-mono text-[9px] text-gray-400 block font-bold uppercase tracking-wider">
        {label}
      </label>
      <div className={`neu-input min-h-12 rounded-xl px-3 py-2.5 ${error ? 'border-red-500/50' : ''}`}>
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-primary-gold/20 bg-primary-gold/10 px-2.5 py-1 text-[10px] text-champagne"
            >
              <span className="truncate">{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                disabled={disabled}
                aria-label={`Remove ${tag}`}
                className="rounded text-primary-gold/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="flex min-w-[180px] flex-1 items-center gap-2">
            <input
              id={id}
              type="text"
              maxLength={maxTagLength}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              disabled={disabled || value.length >= maxItems}
              placeholder={value.length >= maxItems ? `Maximum ${maxItems} items` : placeholder}
              aria-invalid={Boolean(error)}
              aria-describedby={`${id}-help`}
              className="min-w-0 flex-1 bg-transparent py-1 text-xs text-white outline-none placeholder:text-gray-600 disabled:cursor-not-allowed"
            />
            {inputValue.trim() && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={addTag}
                disabled={disabled}
                aria-label={`Add ${inputValue.trim()}`}
                className="rounded-lg p-1 text-primary-gold transition hover:bg-primary-gold/10 hover:text-champagne"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p id={`${id}-help`} className={`font-mono text-[9px] ${error ? 'text-red-400' : 'text-gray-600'}`}>
        {error || helpText}
      </p>
    </div>
  );
};

type NamedTagInputProps = Omit<TagInputProps, 'label'>;

export const SkillsInput: React.FC<NamedTagInputProps> = (props) => (
  <TagInput label="Skills" placeholder="e.g. Color grading" maxItems={50} maxTagLength={80} {...props} />
);

export const SoftwareInput: React.FC<NamedTagInputProps> = (props) => (
  <TagInput label="Software used" placeholder="e.g. DaVinci Resolve" maxItems={50} maxTagLength={80} {...props} />
);

export const LanguagesInput: React.FC<NamedTagInputProps> = (props) => (
  <TagInput label="Languages" placeholder="e.g. English" maxItems={50} maxTagLength={80} {...props} />
);

export const CertificationsInput: React.FC<NamedTagInputProps> = (props) => (
  <TagInput label="Certifications" placeholder="e.g. Adobe Certified Professional" maxItems={30} maxTagLength={150} {...props} />
);
