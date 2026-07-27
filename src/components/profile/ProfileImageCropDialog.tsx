import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Crop, Move, RotateCcw, X, ZoomIn } from 'lucide-react';

interface ProfileImageCropDialogProps {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onApply: (file: File) => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  target: HTMLDivElement;
  startX: number;
  startY: number;
  startOffset: Point;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MAX_OUTPUT_SIZE = 1024;
const OUTPUT_QUALITY = 0.92;

function cropMetrics(
  dimensions: ImageDimensions,
  viewportSize: number,
  zoom: number,
) {
  const baseScale = Math.max(
    viewportSize / dimensions.width,
    viewportSize / dimensions.height,
  );
  const scale = baseScale * zoom;

  return {
    scale,
    renderedWidth: dimensions.width * scale,
    renderedHeight: dimensions.height * scale,
  };
}

function constrainOffset(
  next: Point,
  dimensions: ImageDimensions | null,
  viewportSize: number,
  zoom: number,
): Point {
  if (!dimensions || viewportSize <= 0) return { x: 0, y: 0 };

  const { renderedWidth, renderedHeight } = cropMetrics(
    dimensions,
    viewportSize,
    zoom,
  );
  const maximumX = Math.max(0, (renderedWidth - viewportSize) / 2);
  const maximumY = Math.max(0, (renderedHeight - viewportSize) / 2);

  return {
    x: Math.min(maximumX, Math.max(-maximumX, next.x)),
    y: Math.min(maximumY, Math.max(-maximumY, next.y)),
  };
}

function extensionForType(type: string): string {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}

function croppedFilename(file: File, outputType: string): string {
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'profile-image';
  return `${baseName}-cropped.${extensionForType(outputType)}`;
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('The browser could not create the cropped image.'));
        }
      },
      type,
      OUTPUT_QUALITY,
    );
  });
}

async function createCroppedFile(
  sourceFile: File,
  image: HTMLImageElement,
  dimensions: ImageDimensions,
  viewportSize: number,
  zoom: number,
  offset: Point,
): Promise<File> {
  if (viewportSize <= 0) {
    throw new Error('The crop area is not ready. Please try again.');
  }

  const { scale } = cropMetrics(dimensions, viewportSize, zoom);
  const sourceSize = Math.min(
    dimensions.width,
    dimensions.height,
    viewportSize / scale,
  );
  const sourceX = Math.min(
    dimensions.width - sourceSize,
    Math.max(0, dimensions.width / 2 - offset.x / scale - sourceSize / 2),
  );
  const sourceY = Math.min(
    dimensions.height - sourceSize,
    Math.max(0, dimensions.height / 2 - offset.y / scale - sourceSize / 2),
  );

  // Retain extra density on high-DPI displays without producing oversized
  // profile files. The server still receives a normal square image File.
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const outputSize = Math.min(
    MAX_OUTPUT_SIZE,
    Math.max(256, Math.round(sourceSize * pixelRatio)),
  );
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Image cropping is not supported in this browser.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    outputSize,
    outputSize,
  );

  const requestedType = sourceFile.type;
  const blob = await canvasBlob(canvas, requestedType);
  const outputType = blob.type || requestedType;

  return new File([blob], croppedFilename(sourceFile, outputType), {
    type: outputType,
    lastModified: Date.now(),
  });
}

export function ProfileImageCropDialog({
  open,
  file,
  onCancel,
  onApply,
}: ProfileImageCropDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const applyButtonRef = useRef<HTMLButtonElement>(null);
  const busyStatusRef = useRef<HTMLParagraphElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const applyingRef = useRef(false);

  const [sourceUrl, setSourceUrl] = useState('');
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [viewportSize, setViewportSize] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const clearDragState = useCallback(() => {
    const activeDrag = dragRef.current;
    if (activeDrag?.target.hasPointerCapture(activeDrag.pointerId)) {
      activeDrag.target.releasePointerCapture(activeDrag.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  }, []);

  const reset = useCallback(() => {
    clearDragState();
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setError('');
  }, [clearDragState]);

  const cancelDialog = useCallback(() => {
    if (applyingRef.current) return;
    clearDragState();
    onCancel();
  }, [clearDragState, onCancel]);

  useEffect(() => {
    if (!open || !file) return undefined;

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    let cancelled = false;

    setSourceUrl(objectUrl);
    setDimensions(null);
    setLoading(true);
    setApplying(false);
    applyingRef.current = false;
    reset();
    sourceImageRef.current = image;

    image.onload = () => {
      if (cancelled) return;

      if (!image.naturalWidth || !image.naturalHeight) {
        setError('The selected image has invalid dimensions.');
      } else {
        setDimensions({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      }
      setLoading(false);
    };
    image.onerror = () => {
      if (cancelled) return;
      setError('The selected image could not be decoded. Choose another image.');
      setLoading(false);
    };
    image.src = objectUrl;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
      sourceImageRef.current = null;
      const activeDrag = dragRef.current;
      if (activeDrag?.target.hasPointerCapture(activeDrag.pointerId)) {
        activeDrag.target.releasePointerCapture(activeDrag.pointerId);
      }
      dragRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, open, reset]);

  useEffect(() => {
    if (!open) clearDragState();
  }, [clearDragState, open]);

  useEffect(() => {
    if (!open || !viewportRef.current) return undefined;

    const cropViewport = viewportRef.current;
    const updateSize = () => {
      setViewportSize(cropViewport.getBoundingClientRect().width);
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(cropViewport);
    return () => observer.disconnect();
  }, [open, dimensions]);

  useEffect(() => {
    if (!dimensions || viewportSize <= 0) return;
    setOffset((current) => constrainOffset(
      current,
      dimensions,
      viewportSize,
      zoom,
    ));
  }, [dimensions, viewportSize, zoom]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelDialog();
        return;
      }

      if (event.key === 'Tab' && applyingRef.current) {
        event.preventDefault();
        busyStatusRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable: HTMLElement[] = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
        ),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [cancelDialog, open]);

  const metrics = useMemo(() => {
    if (!dimensions || viewportSize <= 0) return null;
    return cropMetrics(dimensions, viewportSize, zoom);
  }, [dimensions, viewportSize, zoom]);

  const updateZoom = (nextZoom: number) => {
    const safeZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(safeZoom);
    setOffset((current) => constrainOffset(
      current,
      dimensions,
      viewportSize,
      safeZoom,
    ));
  };

  const updateOffset = (next: Point) => {
    setOffset(constrainOffset(next, dimensions, viewportSize, zoom));
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dimensions || applyingRef.current) return;
    clearDragState();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      target: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offset,
    };
    setDragging(true);
  };

  const continueDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    updateOffset({
      x: drag.startOffset.x + event.clientX - drag.startX,
      y: drag.startOffset.y + event.clientY - drag.startY,
    });
  };

  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    clearDragState();
  };

  const handleCropKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (applyingRef.current) return;

    const step = event.shiftKey ? 24 : 8;
    const movement: Record<string, Point> = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };

    if (movement[event.key]) {
      event.preventDefault();
      updateOffset({
        x: offset.x + movement[event.key].x,
        y: offset.y + movement[event.key].y,
      });
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      updateZoom(zoom + 0.1);
    } else if (event.key === '-') {
      event.preventDefault();
      updateZoom(zoom - 0.1);
    }
  };

  const applyCrop = async () => {
    if (applyingRef.current) return;
    if (
      !file
      || !sourceImageRef.current
      || !dimensions
      || viewportSize <= 0
    ) return;

    clearDragState();
    applyingRef.current = true;
    setApplying(true);
    setError('');
    window.requestAnimationFrame(() => busyStatusRef.current?.focus());
    try {
      const croppedFile = await createCroppedFile(
        file,
        sourceImageRef.current,
        dimensions,
        viewportSize,
        zoom,
        offset,
      );
      clearDragState();
      onApply(croppedFile);
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : 'Unable to crop the selected image.',
      );
      applyingRef.current = false;
      setApplying(false);
      window.requestAnimationFrame(() => applyButtonRef.current?.focus());
    }
  };

  if (!open || !file || typeof document === 'undefined') return null;

  const imageStyle = metrics
    ? {
        width: metrics.renderedWidth,
        height: metrics.renderedHeight,
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
      }
    : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancelDialog();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="neumorphic-flat my-auto w-full max-w-3xl rounded-[28px] p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="neumorphic-inset flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-primary-gold">
              <Crop className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-primary-gold">
                Profile image
              </p>
              <h2 id={titleId} className="mt-1 font-display text-xl font-black text-white">
                Adjust your photo
              </h2>
              <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-gray-400">
                Drag to position the image, then zoom until the avatar looks right.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cancel profile image adjustment"
            disabled={applying}
            onClick={cancelDialog}
            className="neumorphic-button rounded-xl p-2.5 text-gray-400 hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_190px]">
          <div className="flex flex-col items-center">
            <div
              ref={viewportRef}
              role="application"
              tabIndex={dimensions && !applying ? 0 : -1}
              aria-label="Profile image crop area. Drag the image or use arrow keys to position it. Use plus and minus to zoom."
              onKeyDown={handleCropKeyboard}
              onPointerDown={startDrag}
              onPointerMove={continueDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              className={`neumorphic-inset relative aspect-square w-full max-w-[360px] select-none overflow-hidden rounded-3xl touch-none ${
                dimensions
                  ? dragging ? 'cursor-grabbing' : 'cursor-grab'
                  : 'cursor-wait'
              }`}
            >
              {sourceUrl && dimensions && metrics && (
                <img
                  src={sourceUrl}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={imageStyle}
                />
              )}
              {(loading || !dimensions) && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-center font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Decoding image…
                </div>
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 border-[1.5px] border-primary-gold/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, transparent 33.1%, var(--ui-line) 33.1%, var(--ui-line) 33.5%, transparent 33.5%, transparent 66.4%, var(--ui-line) 66.4%, var(--ui-line) 66.8%, transparent 66.8%), linear-gradient(to bottom, transparent 33.1%, var(--ui-line) 33.1%, var(--ui-line) 33.5%, transparent 33.5%, transparent 66.4%, var(--ui-line) 66.4%, var(--ui-line) 66.8%, transparent 66.8%)',
                }}
              />
              {dimensions && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface-container-low/85 px-3 py-1.5 font-mono text-[8px] uppercase tracking-wider text-gray-300 backdrop-blur-md">
                  <Move className="h-3 w-3" aria-hidden="true" />
                  Drag to move
                </div>
              )}
            </div>

            <div className="mt-5 flex w-full max-w-[360px] items-center gap-3">
              <ZoomIn className="h-4 w-4 shrink-0 text-primary-gold" aria-hidden="true" />
              <label htmlFor={`${titleId}-zoom`} className="sr-only">
                Image zoom
              </label>
              <input
                id={`${titleId}-zoom`}
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step="0.01"
                value={zoom}
                disabled={!dimensions || applying}
                onChange={(event) => updateZoom(Number(event.target.value))}
                className="h-2 min-w-0 flex-1 cursor-pointer accent-primary-gold disabled:cursor-wait disabled:opacity-50"
              />
              <output
                htmlFor={`${titleId}-zoom`}
                className="w-10 text-right font-mono text-[9px] text-gray-400"
              >
                {Math.round(zoom * 100)}%
              </output>
            </div>
          </div>

          <aside className="flex flex-col items-center rounded-2xl border border-white/5 bg-surface-container-low/55 p-4">
            <p className="self-start font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Avatar preview
            </p>
            <div className="neumorphic-inset relative mt-5 h-32 w-32 overflow-hidden rounded-full">
              {sourceUrl && dimensions && metrics && (
                <img
                  src={sourceUrl}
                  alt="Circular profile avatar preview"
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: metrics.renderedWidth * (128 / viewportSize),
                    height: metrics.renderedHeight * (128 / viewportSize),
                    transform: `translate(calc(-50% + ${offset.x * (128 / viewportSize)}px), calc(-50% + ${offset.y * (128 / viewportSize)}px))`,
                  }}
                />
              )}
            </div>
            <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-500">
              This circular preview shows how your picture will appear across the portal.
            </p>
            <button
              type="button"
              disabled={!dimensions || applying}
              onClick={reset}
              className="neumorphic-button mt-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-300 hover:text-primary-gold disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset crop
            </button>
          </aside>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-500/25 bg-red-950/20 px-4 py-3 text-xs text-red-300"
          >
            {error}
          </p>
        )}

        <p
          ref={busyStatusRef}
          role="status"
          aria-live="polite"
          tabIndex={-1}
          className="sr-only"
        >
          {applying ? 'Creating your cropped profile image.' : ''}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/5 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={applying}
            onClick={cancelDialog}
            className="neumorphic-button min-h-11 rounded-xl px-5 text-xs font-bold text-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={applyButtonRef}
            type="button"
            disabled={!dimensions || applying}
            onClick={() => void applyCrop()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-gold px-5 text-xs font-black uppercase tracking-wider text-obsidian shadow-lg transition hover:bg-champagne disabled:cursor-wait disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {applying ? 'Creating image…' : 'Apply crop'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
