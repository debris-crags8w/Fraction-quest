import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, LayoutGrid } from 'lucide-react';

export type AppMenuItem = {
  id: string;
  icon: ReactNode;
  label: string;
  /** A short line under the label (status, what it is). */
  note?: string;
  /** Something is waiting here (today's practice, due reviews): marked with a dot and counted on the button. */
  waiting?: boolean;
  onSelect: () => void;
  testId: string;
};
export type AppMenuSection = { title: string; items: AppMenuItem[] };

/** The "More" dropdown in the top bar: practice, games, check-ins and grown-ups, so the map shows only lessons.
    A real menu button: Enter/Space/Arrow Down opens it, arrows move, Escape closes, a click outside closes. */
export function AppMenu({ sections, footer }: { sections: AppMenuSection[]; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const waiting = sections.flatMap((section) => section.items).filter((item) => item.waiting).length;
  const items = () => [...(panel.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus(); };
  const onPanelKey = (event: React.KeyboardEvent) => {
    const list = items(); const at = list.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); list[(at + 1) % list.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); list[(at - 1 + list.length) % list.length]?.focus(); }
    else if (event.key === 'Home') { event.preventDefault(); list[0]?.focus(); }
    else if (event.key === 'End') { event.preventDefault(); list[list.length - 1]?.focus(); }
    else if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div className="fq-menu">
      <button ref={button} type="button" className="fq-menu-button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        onClick={() => setOpen((shown) => !shown)}
        onKeyDown={(event) => { if (event.key === 'ArrowDown' && !open) { event.preventDefault(); setOpen(true); } }}
        data-testid="button-app-menu">
        <LayoutGrid size={18} aria-hidden="true" />
        {/* The name is the button's own text, so voice control can say what it sees ("click More"). */}
        <span className="fq-menu-button-label">More</span>
        <span className="fq-sr">: practice, games and check-ins</span>
        {waiting > 0 && <span className="fq-menu-badge"><span className="fq-sr"> (</span>{waiting}<span className="fq-sr"> waiting)</span></span>}
        <ChevronDown size={16} aria-hidden="true" className="fq-menu-chevron" />
      </button>
      {open && (
        <div ref={panel} className="fq-menu-panel" onKeyDown={onPanelKey} data-testid="app-menu">
          {/* Only the menu items are in the menu: the footer note sits beside it (a menu may hold nothing else). */}
          <div id={menuId} role="menu" aria-label="More">
          {sections.map((section) => section.items.length > 0 && (
            <div key={section.title} className="fq-menu-section" role="group" aria-label={section.title}>
              <p className="fq-menu-section-title" aria-hidden="true">{section.title}</p>
              {section.items.map((item) => (
                <button key={item.id} type="button" role="menuitem" className={`fq-menu-item ${item.waiting ? 'is-waiting' : ''}`}
                  onClick={() => { close(false); item.onSelect(); }} data-testid={item.testId}>
                  <span className="fq-menu-item-icon" aria-hidden="true">{item.icon}</span>
                  <span className="fq-menu-item-copy"><strong>{item.label}</strong>{item.note && <small>{item.note}</small>}</span>
                  {item.waiting && <span className="fq-menu-dot" aria-label="waiting" />}
                </button>
              ))}
            </div>
          ))}
          </div>
          {footer && <div className="fq-menu-footer">{footer}</div>}
        </div>
      )}
    </div>
  );
}
