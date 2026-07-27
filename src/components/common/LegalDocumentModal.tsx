import React from 'react';
import { X } from 'lucide-react';

interface LegalDocumentModalProps {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({ open, title, content, onClose }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-surface-container shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-7">
          <div>
            <p className="font-mono text-[9px] font-bold tracking-[0.24em] text-primary-gold">VALKYRIAS LEGAL</p>
            <h2 className="mt-1 font-display text-xl font-black text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="neumorphic-button flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:text-white" aria-label={`Close ${title}`}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-6 md:px-8">
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-300">{content}</div>
        </div>
      </div>
    </div>
  );
};
