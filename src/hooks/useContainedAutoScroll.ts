import { useEffect, useRef } from 'react';

/**
 * Keeps a scrollable panel pinned to its latest item without calling
 * Element.scrollIntoView(), which can move the entire browser page.
 */
export function useContainedAutoScroll<T extends HTMLElement>(
  itemKey: string | number | null | undefined,
  enabled = true,
) {
  const containerRef = useRef<T>(null);
  const previousKeyRef = useRef<string | number | null | undefined>(undefined);

  useEffect(() => {
    if (!enabled || itemKey == null || previousKeyRef.current === itemKey) return;
    previousKeyRef.current = itemKey;

    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [enabled, itemKey]);

  return containerRef;
}
