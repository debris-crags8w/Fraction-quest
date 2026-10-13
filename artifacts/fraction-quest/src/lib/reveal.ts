import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** When `when` turns from false to true (not on first render), gently scroll `ref` into view if it is off
    screen or under the browser's bottom toolbar (buttons carry a bottom scroll margin, see theme-pop.css). */
export function useRevealWhen(ref: RefObject<HTMLElement | null>, when: boolean) {
  const before = useRef(when);
  useEffect(() => {
    const turnedOn = when && !before.current;
    before.current = when;
    if (!turnedOn) return;
    const frame = requestAnimationFrame(() => {
      const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ref.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [ref, when]);
}

/** A new step on the same screen (next question, next round, results) starts at the top of the page, like a new
    screen does (App scrolls to the top whenever the view changes). Not on first render. */
export function useScrollTopOn(key: unknown) {
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo?.(0, 0);
  }, [key]);
}
