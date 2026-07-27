import React from 'react';
import { ValkyriasLogo } from '../ValkyriasLogo';

interface ValkyriasLoaderProps {
  label?: string;
  detail?: string;
  fullPage?: boolean;
  compact?: boolean;
  className?: string;
}

export const ValkyriasLoader: React.FC<ValkyriasLoaderProps> = ({
  label = 'Loading',
  detail,
  fullPage = false,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <span
        role="status"
        aria-label={label}
        className={`valkyrias-loader-mark relative inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md ${className}`}
      >
        <ValkyriasLogo size="sm" showText={false} />
        <span className="valkyrias-loader-sweep absolute inset-y-0 -left-full w-3/4" aria-hidden="true" />
      </span>
    );
  }

  const content = (
    <div role="status" className={`flex flex-col items-center justify-center gap-4 text-center ${className}`}>
      <div className="valkyrias-loader-shell relative overflow-hidden rounded-[28px] px-7 py-6">
        <ValkyriasLogo size="lg" centered />
        <span className="valkyrias-loader-sweep absolute inset-y-0 -left-full w-1/2" aria-hidden="true" />
      </div>
      <div>
        <p className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-white">{label}</p>
        {detail && (
          <p className="mt-1 max-w-sm font-mono text-[9px] uppercase tracking-[0.14em] text-gray-500">{detail}</p>
        )}
      </div>
    </div>
  );

  if (!fullPage) return content;

  return (
    <div className="min-h-screen bg-obsidian px-6 flex items-center justify-center">
      {content}
    </div>
  );
};
