import { useEffect, useRef, type RefObject } from 'react';

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
