import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="neumorphic-flat w-full max-w-md rounded-[28px] p-6 sm:p-7"
      >
        <div className="flex items-start gap-4">
          <div className="neumorphic-inset flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-red-400">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-red-400">
              Confirmation required
            </p>
            <h2 id="confirm-dialog-title" className="mt-1 font-display text-xl font-black text-white">
              {title}
            </h2>
          </div>
        </div>

        <div id="confirm-dialog-description" className="mt-5 text-sm leading-relaxed text-gray-400">
          {description}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-500/25 bg-red-950/20 px-4 py-3 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="neumorphic-button min-h-11 rounded-xl px-5 text-xs font-bold text-gray-300 disabled:cursor-wait disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-red-600 px-5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
