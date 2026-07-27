import { useEffect } from 'react';
import './scroll-reveal.css';

type ScrollDirection = 'down' | 'up';

export interface ScrollRevealOptions {
  /**
   * Limits the amount of IntersectionObserver work on data-heavy dashboards.
   * Elements removed from the DOM release their slot automatically.
   */
  maxObservedElements?: number;
  /**
   * Additional opt-in selector. `data-scroll-reveal` is always supported.
   */
  selector?: string;
}

const AUTO_CANDIDATE_SELECTOR = [
  '[data-scroll-reveal]',
  'main > section',
  'main > article',
  'main > div',
  'section',
  'article',
  'footer',
].join(',');

const EXCLUDED_SELF_SELECTOR = [
  'button',
  'input',
  'textarea',
  'select',
  'option',
  'label',
  'form',
  'fieldset',
  'legend',
  'dialog',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[data-scroll-reveal-ignore]',
].join(',');

const EXCLUDED_TREE_SELECTOR = [
  '.valk-intro-root',
  '.studio-intro',
  '.theme-switcher',
  '[id*="laura-ai"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
  'dialog',
  '.fixed',
  '.sticky',
  '[data-scroll-reveal-ignore]',
].join(',');

const ACTIVE_ATTRIBUTE = 'data-scroll-reveal-active';
const DIRECTION_ATTRIBUTE = 'data-scroll-reveal-from';
const VISIBLE_CLASS = 'scroll-reveal--visible';
const ENTERING_CLASS = 'scroll-reveal--entering';
const RESETTING_CLASS = 'scroll-reveal--resetting';
const ENTER_DURATION_MS = 920;
const DEFAULT_MAX_OBSERVED = 180;
const MAX_STRUCTURAL_DEPTH = 4;
const MAX_EXPANSION_CHILDREN = 24;
const STRUCTURAL_HEIGHT_RATIO = 0.85;
const MIN_STRUCTURAL_HEIGHT_PX = 420;

const MEANINGFUL_REVEAL_UNIT_SELECTOR = [
  'section',
  'article',
  'footer',
  '.neumorphic-card',
  '.neumorphic-flat',
  '.neumorphic-inset',
].join(',');

function getScrollTop(target: EventTarget | null): number {
  if (target instanceof HTMLElement) {
    return target.scrollTop;
  }

  return window.scrollY || document.documentElement.scrollTop;
}

function isDeepestViewRoot(element: Element): boolean {
  return element.classList.contains('min-h-screen') && !element.querySelector('.min-h-screen');
}

function isExcluded(element: HTMLElement): boolean {
  if (element.matches(EXCLUDED_SELF_SELECTOR) || element.closest(EXCLUDED_TREE_SELECTOR)) {
    return true;
  }

  const styles = window.getComputedStyle(element);
  if (
    styles.display === 'none'
    || styles.visibility === 'hidden'
    || styles.position === 'fixed'
    || styles.position === 'sticky'
    || styles.position === 'absolute'
  ) {
    return true;
  }

  return element.childElementCount === 0 && !(element.textContent?.trim());
}

function hasObservedAncestor(element: HTMLElement, boundary: Element): boolean {
  let ancestor = element.parentElement;

  while (ancestor && ancestor !== boundary) {
    if (ancestor.getAttribute(ACTIVE_ATTRIBUTE) === 'true') {
      return true;
    }
    ancestor = ancestor.parentElement;
  }

  return false;
}

function getRevealableChildren(element: HTMLElement): HTMLElement[] {
  return Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !isExcluded(child),
  );
}

function shouldExpandStructuralWrapper(
  element: HTMLElement,
  children: HTMLElement[],
  depth: number,
): boolean {
  if (
    depth >= MAX_STRUCTURAL_DEPTH
    || children.length === 0
    || children.length > MAX_EXPANSION_CHILDREN
    || element.dataset.scrollReveal !== undefined
    || element.matches(MEANINGFUL_REVEAL_UNIT_SELECTOR)
  ) {
    return false;
  }

  if (element.matches('main')) {
    return true;
  }

  const containsPageLandmarks = children.some((child) => child.matches('header, main'));
  const hasChunkedLayout = (
    children.length > 1
    && Array.from(element.classList).some(
      (className) => className === 'grid' || className.startsWith('space-y-'),
    )
  );
  const tallThreshold = Math.max(
    MIN_STRUCTURAL_HEIGHT_PX,
    window.innerHeight * STRUCTURAL_HEIGHT_RATIO,
  );

  return (
    containsPageLandmarks
    || hasChunkedLayout
    || element.getBoundingClientRect().height > tallThreshold
  );
}

function collectCandidates(
  source: Element,
  selector: string,
  maxCandidates: number,
): HTMLElement[] {
  const candidates: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const add = (element: Element) => {
    if (
      element instanceof HTMLElement
      && !seen.has(element)
      && candidates.length < maxCandidates
      && (
        element.dataset.scrollReveal !== undefined
        || !candidates.some((candidate) => element.contains(candidate))
      )
    ) {
      seen.add(element);
      candidates.push(element);
    }
  };

  const addRevealBlocks = (element: Element, depth = 0) => {
    if (
      !(element instanceof HTMLElement)
      || candidates.length >= maxCandidates
      || isExcluded(element)
    ) {
      return;
    }

    const children = getRevealableChildren(element);
    if (shouldExpandStructuralWrapper(element, children, depth)) {
      const candidateCountBeforeExpansion = candidates.length;
      children.forEach((child) => addRevealBlocks(child, depth + 1));

      if (candidates.length === candidateCountBeforeExpansion) {
        add(element);
      }
      return;
    }

    add(element);
  };

  const viewRoots: Element[] = [];
  if (isDeepestViewRoot(source)) {
    viewRoots.push(source);
  }
  source.querySelectorAll('.min-h-screen').forEach((element) => {
    if (isDeepestViewRoot(element)) {
      viewRoots.push(element);
    }
  });

  viewRoots.forEach((viewRoot) => {
    Array.from(viewRoot.children).forEach((child) => {
      if (child.matches('main')) {
        addRevealBlocks(child);
      } else {
        addRevealBlocks(child);
      }
    });
  });

  if (source.matches(selector)) {
    addRevealBlocks(source);
  }
  source.querySelectorAll(selector).forEach((element) => addRevealBlocks(element));

  return candidates;
}

/**
 * Adds bidirectional, repeatable viewport reveals to every rendered view.
 *
 * Mount this hook once near the application shell. Page components do not need
 * individual edits; use `data-scroll-reveal` only when an extra block should
 * explicitly participate, and `data-scroll-reveal-ignore` to opt out a subtree.
 */
export function useScrollReveal({
  maxObservedElements = DEFAULT_MAX_OBSERVED,
  selector,
}: ScrollRevealOptions = {}): void {
  useEffect(() => {
    if (
      typeof window === 'undefined'
      || typeof IntersectionObserver === 'undefined'
      || typeof MutationObserver === 'undefined'
    ) {
      return;
    }

    const boundary = document.getElementById('root') ?? document.body;
    const candidateSelector = selector
      ? `${AUTO_CANDIDATE_SELECTOR},${selector}`
      : AUTO_CANDIDATE_SELECTOR;
    const observed = new Set<HTMLElement>();
    const pendingScanRoots = new Set<Element>();
    const scrollPositions = new WeakMap<EventTarget, number>();
    const entranceFrames = new Map<HTMLElement, number>();
    const resetFrames = new Map<HTMLElement, number>();
    const enterTimers = new Map<HTMLElement, number>();
    const enterTransitionListeners = new Map<
      HTMLElement,
      (event: TransitionEvent) => void
    >();
    let direction: ScrollDirection = 'down';
    let scanFrame = 0;

    const clearElementScheduling = (element: HTMLElement) => {
      const entranceFrame = entranceFrames.get(element);
      if (entranceFrame !== undefined) {
        window.cancelAnimationFrame(entranceFrame);
        entranceFrames.delete(element);
      }

      const resetFrame = resetFrames.get(element);
      if (resetFrame !== undefined) {
        window.cancelAnimationFrame(resetFrame);
        resetFrames.delete(element);
      }

      const enterTimer = enterTimers.get(element);
      if (enterTimer !== undefined) {
        window.clearTimeout(enterTimer);
        enterTimers.delete(element);
      }

      const transitionListener = enterTransitionListeners.get(element);
      if (transitionListener !== undefined) {
        element.removeEventListener('transitionend', transitionListener);
        enterTransitionListeners.delete(element);
      }
    };

    const setDirection = (element: HTMLElement, nextDirection: ScrollDirection) => {
      element.setAttribute(DIRECTION_ATTRIBUTE, nextDirection);
    };

    const reveal = (element: HTMLElement) => {
      clearElementScheduling(element);
      element.classList.remove(RESETTING_CLASS);
      setDirection(element, direction);

      const frame = window.requestAnimationFrame(() => {
        entranceFrames.delete(element);
        if (!element.isConnected || !observed.has(element)) {
          return;
        }

        const rect = element.getBoundingClientRect();
        const isStillInViewport = (
          rect.bottom > 0
          && rect.top < window.innerHeight
          && rect.right > 0
          && rect.left < window.innerWidth
        );
        if (!isStillInViewport) {
          const nextDirection: ScrollDirection = rect.bottom <= 0 ? 'up' : 'down';
          setDirection(element, nextDirection);
          return;
        }

        element.classList.add(ENTERING_CLASS, VISIBLE_CLASS);

        const finishEntering = () => {
          const timer = enterTimers.get(element);
          if (timer !== undefined) {
            window.clearTimeout(timer);
            enterTimers.delete(element);
          }
          const transitionListener = enterTransitionListeners.get(element);
          if (transitionListener !== undefined) {
            element.removeEventListener('transitionend', transitionListener);
            enterTransitionListeners.delete(element);
          }
          element.classList.remove(ENTERING_CLASS);
        };
        const onTransitionEnd = (event: TransitionEvent) => {
          if (event.target === element && event.propertyName === 'translate') {
            finishEntering();
          }
        };
        element.addEventListener('transitionend', onTransitionEnd);
        enterTransitionListeners.set(element, onTransitionEnd);

        const timer = window.setTimeout(finishEntering, ENTER_DURATION_MS);
        enterTimers.set(element, timer);
      });
      entranceFrames.set(element, frame);
    };

    const rearm = (element: HTMLElement, rect: DOMRectReadOnly) => {
      clearElementScheduling(element);
      element.classList.add(RESETTING_CLASS);
      element.classList.remove(ENTERING_CLASS, VISIBLE_CLASS);

      const nextDirection: ScrollDirection = rect.bottom <= 0
        ? 'up'
        : rect.top >= window.innerHeight
          ? 'down'
          : direction;
      setDirection(element, nextDirection);

      const frame = window.requestAnimationFrame(() => {
        element.classList.remove(RESETTING_CLASS);
        resetFrames.delete(element);
      });
      resetFrames.set(element, frame);
    };

    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target;
        if (!(element instanceof HTMLElement)) {
          return;
        }

        if (entry.isIntersecting && entry.intersectionRatio > 0) {
          if (!element.classList.contains(VISIBLE_CLASS)) {
            reveal(element);
          }
        } else if (
          element.classList.contains(VISIBLE_CLASS)
          || entranceFrames.has(element)
        ) {
          rearm(element, entry.boundingClientRect);
        }
      });
    }, {
      threshold: 0.01,
    });

    const unregister = (element: HTMLElement) => {
      if (!observed.delete(element)) {
        return;
      }

      clearElementScheduling(element);
      intersectionObserver.unobserve(element);
      element.classList.remove(VISIBLE_CLASS, ENTERING_CLASS, RESETTING_CLASS);
      element.removeAttribute(ACTIVE_ATTRIBUTE);
      element.removeAttribute(DIRECTION_ATTRIBUTE);
      element.style.removeProperty('--scroll-reveal-delay');
    };

    const unregisterTree = (source: Node) => {
      if (!(source instanceof Element)) {
        return;
      }

      if (source instanceof HTMLElement) {
        unregister(source);
      }
      source.querySelectorAll<HTMLElement>(`[${ACTIVE_ATTRIBUTE}="true"]`).forEach(unregister);
    };

    const register = (element: HTMLElement, order: number) => {
      if (
        observed.has(element)
        || observed.size >= Math.max(1, maxObservedElements)
        || isExcluded(element)
        || (
          element.dataset.scrollReveal === undefined
          && (
            hasObservedAncestor(element, boundary)
            || element.querySelector(`[${ACTIVE_ATTRIBUTE}="true"]`) !== null
          )
        )
      ) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const initialDirection: ScrollDirection = rect.bottom <= 0 ? 'up' : direction;
      element.setAttribute(ACTIVE_ATTRIBUTE, 'true');
      setDirection(element, initialDirection);
      element.style.setProperty('--scroll-reveal-delay', `${Math.min(order % 5, 4) * 35}ms`);
      observed.add(element);
      intersectionObserver.observe(element);
    };

    const scan = (source: Element) => {
      const remainingCapacity = Math.max(1, maxObservedElements) - observed.size;
      const candidates = collectCandidates(
        source,
        candidateSelector,
        Math.max(0, remainingCapacity),
      );
      candidates.forEach((candidate, index) => register(candidate, index));
    };

    const flushScans = () => {
      scanFrame = 0;
      const roots = Array.from(pendingScanRoots);
      pendingScanRoots.clear();

      roots.forEach((source) => {
        if (source.isConnected && observed.size < Math.max(1, maxObservedElements)) {
          scan(source);
        }
      });
    };

    const queueScan = (source: Element) => {
      pendingScanRoots.add(source);
      if (scanFrame === 0) {
        scanFrame = window.requestAnimationFrame(flushScans);
      }
    };

    const promoteStructuralAncestor = (source: Element): HTMLElement | null => {
      let current: HTMLElement | null = source instanceof HTMLElement
        ? source
        : source.parentElement;

      while (current && current !== boundary) {
        if (observed.has(current)) {
          const children = getRevealableChildren(current);
          if (shouldExpandStructuralWrapper(current, children, 0)) {
            unregister(current);
            return current;
          }
          return null;
        }
        current = current.parentElement;
      }

      return null;
    };

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.removedNodes.forEach(unregisterTree);
        if (record.target instanceof Element) {
          queueScan(promoteStructuralAncestor(record.target) ?? record.target);
        }
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            queueScan(node);
          }
        });
      });
    });

    const onScroll = (event: Event) => {
      const target = event.target ?? document;
      const currentPosition = getScrollTop(target);
      const previousPosition = scrollPositions.get(target) ?? currentPosition;
      const delta = currentPosition - previousPosition;

      if (Math.abs(delta) >= 2) {
        direction = delta > 0 ? 'down' : 'up';
      }
      scrollPositions.set(target, currentPosition);
    };

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    scrollPositions.set(document, window.scrollY || document.documentElement.scrollTop);
    mutationObserver.observe(boundary, { childList: true, subtree: true });
    queueScan(boundary);

    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
      if (scanFrame !== 0) {
        window.cancelAnimationFrame(scanFrame);
      }
      observed.forEach((element) => {
        clearElementScheduling(element);
        element.classList.remove(VISIBLE_CLASS, ENTERING_CLASS, RESETTING_CLASS);
        element.removeAttribute(ACTIVE_ATTRIBUTE);
        element.removeAttribute(DIRECTION_ATTRIBUTE);
        element.style.removeProperty('--scroll-reveal-delay');
      });
      observed.clear();
    };
  }, [maxObservedElements, selector]);
}

export function ScrollRevealController(options: ScrollRevealOptions) {
  useScrollReveal(options);
  return null;
}
