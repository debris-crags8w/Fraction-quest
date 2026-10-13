import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/* Top-bar symbols a child can tap to find out what they mean ("3 days in a row!"). One tip is open at a time;
   a tap anywhere else, Escape, or scrolling closes it. */

const OPEN_EVENT = 'fq-stat-tip-open';

export function StatTip({ tip, label, className = '', testId, children }: {
  /** The one-line explanation. */
  tip: ReactNode;
  /** What a screen reader says for the button ("Day streak: 3"). */
  label: string;
  className?: string;
  testId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    const others = (event: Event) => { if ((event as CustomEvent).detail !== tipId) setOpen(false); };
    window.addEventListener(OPEN_EVENT, others);
    return () => window.removeEventListener(OPEN_EVENT, others);
  }, [tipId]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!button.current?.contains(target) && !bubble.current?.contains(target)) close();
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { close(); button.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const box = button.current?.getBoundingClientRect();
    // Under the symbol, kept inside the screen (16px from each side; the bubble is at most 260px wide).
    if (box) {
      const width = Math.min(260, window.innerWidth - 32);
      setPlace({ top: box.bottom + 8, left: Math.max(16, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - 16 - width)) });
    }
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: tipId }));
    setOpen(true);
  };

  return (
    <>
      <button ref={button} type="button" className={`fq-stat-tip ${className}`} aria-label={label} aria-expanded={open}
        aria-describedby={open ? tipId : undefined} onClick={toggle} data-testid={testId}>
        {children}
      </button>
      {open && (
        <span ref={bubble} id={tipId} className="fq-stat-bubble" role="status" style={place ? { top: place.top, left: place.left } : undefined} data-testid={`${testId}-tip`}>
          {tip}
        </span>
      )}
    </>
  );
}
