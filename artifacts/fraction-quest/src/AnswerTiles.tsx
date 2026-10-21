import React, { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Delete } from 'lucide-react';
import { MathText } from './MathText';
import { SLOT_DIGITS, SLOTS, slotAnswer, slotsFromAnswer, type AnswerShape } from './answer-shape';
import { playHaptic } from './lib/fun';

/* Answers are built, not typed: drag a tile into a box, or tap a box and then tap tiles (the same thing for
   small fingers, keyboards and screen readers). The component reports the answer as the usual string. */

type DropHandler = (payload: string, target: string) => void;

/** Pointer dragging that works with mouse, pen and touch. A short press without moving is a normal tap.
    `bind` goes on each draggable tile; `wasDrag()` tells a tile's onClick that the press was a drag (already handled). */
function useTileDrag(onDrop: DropHandler) {
  const drag = useRef<{ payload: string; label: string; x: number; y: number; moving: boolean } | null>(null);
  const ghost = useRef<HTMLDivElement | null>(null);
  const hovered = useRef<Element | null>(null);
  const dragged = useRef(false);
  const dropRef = useRef(onDrop); dropRef.current = onDrop;
  const targetAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest('[data-drop]') ?? null;
  const setHover = (next: Element | null) => {
    if (hovered.current === next) return;
    hovered.current?.classList.remove('is-drop-target');
    next?.classList.add('is-drop-target');
    hovered.current = next;
  };
  const end = () => { ghost.current?.remove(); ghost.current = null; setHover(null); drag.current = null; };
  useEffect(() => end, []);
  const bind = (payload: string, label: string, disabled = false) => disabled ? {} : {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      dragged.current = false;
      drag.current = { payload, label, x: event.clientX, y: event.clientY, moving: false };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const current = drag.current;
      if (!current) return;
      if (!current.moving && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8) return;
      if (!current.moving) {
        current.moving = true;
        const el = document.createElement('div');
        el.className = 'fq-tile-ghost'; el.textContent = current.label; el.setAttribute('aria-hidden', 'true');
        document.body.appendChild(el); ghost.current = el;
      }
      if (ghost.current) ghost.current.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -60%)`;
      setHover(targetAt(event.clientX, event.clientY));
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      const current = drag.current;
      if (current?.moving) {
        dragged.current = true;
        const target = targetAt(event.clientX, event.clientY) as HTMLElement | null;
        if (target?.dataset.drop) dropRef.current(current.payload, target.dataset.drop);
      }
      end();
    },
    onPointerCancel: end,
  };
  const wasDrag = () => { const was = dragged.current; dragged.current = false; return was; };
  return { bind, wasDrag };
}

export function AnswerTiles({ shape, value, onChange, disabled = false, testIdPrefix, label = 'Your answer' }: {
  shape: AnswerShape; value: string; onChange: (value: string) => void; disabled?: boolean; testIdPrefix: string; label?: string;
}) {
  if (shape.kind === 'yesno') return null;
  if (shape.kind === 'pick' || shape.kind === 'symbol') return <SingleChoice shape={shape} value={value} onChange={onChange} disabled={disabled} testIdPrefix={testIdPrefix} label={label} />;
  if (shape.kind === 'ordered') return <OrderCards shape={shape} value={value} onChange={onChange} disabled={disabled} testIdPrefix={testIdPrefix} />;
  return <NumberSlots shape={shape} value={value} onChange={onChange} disabled={disabled} testIdPrefix={testIdPrefix} label={label} />;
}

const SLOT_LABEL: Record<string, string> = {
  n: 'answer', num: 'numerator is the number of parts selected', den: 'denominator is the total number of equal parts in one whole', whole: 'wholes', dec: 'digits after the decimal point',
};

/** Number boxes (one number, a fraction, a mixed number, a decimal or a percent) and a tray of 0–9. */
function NumberSlots({ shape, value, onChange, disabled, testIdPrefix, label }: {
  shape: Extract<AnswerShape, { kind: 'number' | 'fraction' | 'mixed' | 'decimal' }>; value: string; onChange: (value: string) => void; disabled: boolean; testIdPrefix: string; label: string;
}) {
  const names = SLOTS[shape.kind];
  const [slots, setSlots] = useState<Record<string, string>>(() => slotsFromAnswer(shape, value));
  const [active, setActive] = useState(() => names.find((name) => !slotsFromAnswer(shape, value)[name]) ?? names[0]);
  const update = (next: Record<string, string>) => { setSlots(next); onChange(slotAnswer(shape, next)); };
  const put = (digit: string, slot = active) => {
    if (disabled) return;
    const current = slots[slot] ?? '';
    setActive(slot);
    if (current.length >= SLOT_DIGITS) return;
    const nextValue = current === '0' && shape.kind !== 'decimal' ? digit : current + digit;
    if (nextValue === current) return;
    playHaptic('selection');
    update({ ...slots, [slot]: nextValue });
  };
  const erase = () => {
    const current = slots[active] ?? '';
    if (disabled || !current) return;
    playHaptic('selection');
    update({ ...slots, [active]: current.slice(0, -1) });
  };
  const { bind, wasDrag } = useTileDrag((payload, target) => put(payload, target));
  const box = (name: string) => (
    <button key={name} type="button" data-drop={name} disabled={disabled}
      className={`fq-tile-slot slot-${name} ${active === name && !disabled ? 'active' : ''} ${slots[name] ? 'filled' : ''}`}
      aria-label={`${SLOT_LABEL[name]}: ${slots[name] || 'empty'}${active === name ? ', selected' : ''}`} aria-pressed={active === name}
      onClick={() => setActive(name)} data-testid={`slot-${testIdPrefix}-${name}`}>
      {slots[name] || ''}
    </button>
  );
  const fraction = (num: string, den: string) => <span className="fq-tile-fraction">{box(num)}<i aria-hidden="true" />{box(den)}</span>;
  return (
    <div className={`fq-tiles kind-${shape.kind}`} role="group" aria-label={label}>
      <div className="fq-tile-answer">
        {shape.kind === 'number' && <>{box('n')}{shape.suffix && <span className="fq-tile-fixed">{shape.suffix}</span>}</>}
        {shape.kind === 'fraction' && fraction('num', 'den')}
        {shape.kind === 'mixed' && <>{box('whole')}{fraction('num', 'den')}</>}
        {shape.kind === 'decimal' && <>{box('whole')}<span className="fq-tile-fixed point">.</span>{box('dec')}</>}
        <button type="button" className="fq-tile-erase" onClick={erase} disabled={disabled || !slots[active]} aria-label="Take away the last number" data-testid={`button-${testIdPrefix}-erase`}><Delete size={18} /></button>
      </div>
      <div className="fq-tile-tray" aria-label="Number tiles">
        {Array.from({ length: 10 }, (_, digit) => String(digit)).map((digit) => (
          <button key={digit} type="button" className="fq-tile" disabled={disabled} {...bind(digit, digit, disabled)}
            onClick={() => { if (!wasDrag()) put(digit); }}
            aria-label={`Put ${digit} in the ${SLOT_LABEL[active]}`} data-testid={`tile-${testIdPrefix}-digit-${digit}`}>{digit}</button>
        ))}
      </div>
      {!disabled && <p className="fq-tile-help">Drag numbers into the boxes, or tap a box and then tap numbers.{shape.kind === 'mixed' && shape.flexible ? ' Leave a box empty if your answer doesn’t need it.' : ''}</p>}
    </div>
  );
}

const SYMBOL_IDS: Record<string, string> = { '<': 'lt', '=': 'eq', '>': 'gt' };
const SYMBOL_NAMES: Record<string, string> = { '<': 'less than', '=': 'equal to', '>': 'greater than' };

/** One answer box: pick a named amount, or the sign that goes in the gap. */
function SingleChoice({ shape, value, onChange, disabled, testIdPrefix, label }: {
  shape: Extract<AnswerShape, { kind: 'pick' | 'symbol' }>; value: string; onChange: (value: string) => void; disabled: boolean; testIdPrefix: string; label: string;
}) {
  const options = shape.kind === 'symbol' ? ['<', '=', '>'] : shape.options;
  const choose = (next: string) => {
    if (disabled || next === value) return;
    playHaptic('selection');
    onChange(next);
  };
  const { bind, wasDrag } = useTileDrag((payload) => choose(payload));
  const slot = (
    <button type="button" data-drop="answer" disabled={disabled} className={`fq-tile-slot slot-choice ${value ? 'filled' : ''}`}
      aria-label={value ? `${label}: ${shape.kind === 'symbol' ? SYMBOL_NAMES[value] ?? value : value}. Tap to take it out.` : `${label}: empty`}
      onClick={() => choose('')} data-testid={`slot-${testIdPrefix}-answer`}>
      {value ? <MathText text={value} /> : ''}
    </button>
  );
  return (
    <div className={`fq-tiles kind-${shape.kind}`} role="group" aria-label={label}>
      <div className="fq-tile-answer">
        {shape.kind === 'symbol' ? <span className="fq-tile-sentence">{shape.left && <MathText text={shape.left} />}{slot}{shape.right && <MathText text={shape.right} />}</span> : slot}
      </div>
      <div className="fq-tile-tray" aria-label={shape.kind === 'symbol' ? 'Sign tiles' : 'Answer cards'}>
        {options.map((option, index) => (
          <button key={option} type="button" className={`fq-tile ${shape.kind === 'pick' ? 'card' : 'symbol'} ${value === option ? 'used' : ''}`} disabled={disabled}
            {...bind(option, option, disabled)} onClick={() => { if (!wasDrag()) choose(option); }}
            aria-label={shape.kind === 'symbol' ? `Put ${SYMBOL_NAMES[option]} in the gap` : `Choose ${option}`}
            data-testid={`tile-${testIdPrefix}-${shape.kind === 'symbol' ? `symbol-${SYMBOL_IDS[option]}` : `option-${index}`}`}>
            <MathText text={option} />
          </button>
        ))}
      </div>
      {!disabled && <p className="fq-tile-help">{shape.kind === 'symbol' ? 'Drag a sign into the gap, or tap it.' : 'Drag your answer into the box, or tap it.'}</p>}
    </div>
  );
}

/** Put amounts in order: drag cards into the numbered boxes (no commas). */
function OrderCards({ shape, value, onChange, disabled, testIdPrefix }: {
  shape: Extract<AnswerShape, { kind: 'ordered' }>; value: string; onChange: (value: string) => void; disabled: boolean; testIdPrefix: string;
}) {
  const [order, setOrder] = useState<(number | null)[]>(() => {
    const saved = value.split(',').map((item) => item.trim()).filter(Boolean);
    const restored = saved.map((item) => shape.items.indexOf(item));
    return restored.length === shape.items.length && restored.every((i) => i >= 0) ? restored : shape.items.map(() => null);
  });
  const update = (next: (number | null)[]) => {
    if (disabled || next.every((item, index) => item === order[index])) return;
    playHaptic('selection');
    setOrder(next);
    onChange(next.every((i) => i !== null) ? next.map((i) => shape.items[i!]).join(', ') : '');
  };
  const place = (card: number, slot: number) => {
    if (disabled) return;
    const next = [...order];
    const from = next.indexOf(card);
    const occupant = next[slot];
    if (from >= 0) next[from] = occupant ?? null;
    next[slot] = card;
    update(next);
  };
  const tapCard = (card: number) => { const empty = order.indexOf(null); if (empty >= 0) place(card, empty); };
  const { bind, wasDrag } = useTileDrag((payload, target) => place(Number(payload), Number(target)));
  const ends = shape.first === 'smallest' ? ['smallest', 'biggest'] : shape.first === 'biggest' ? ['biggest', 'smallest'] : ['first', 'last'];
  return (
    <div className="fq-tiles kind-ordered" role="group" aria-label={`Put the amounts in order, ${ends[0]} first`}>
      <div className="fq-tile-answer fq-tile-order">
        <span className="fq-tile-end">{ends[0]}</span>
        {order.map((card, slot) => (
          <button key={slot} type="button" data-drop={String(slot)} disabled={disabled} className={`fq-tile-slot slot-order ${card !== null ? 'filled' : ''}`}
            aria-label={`Place ${slot + 1}: ${card !== null ? shape.items[card] + '. Tap to take it out.' : 'empty'}`}
            onClick={() => { if (wasDrag() || card === null || disabled) return; const next = [...order]; next[slot] = null; update(next); }}
            {...(card !== null ? bind(String(card), shape.items[card], disabled) : {})}
            data-testid={`slot-${testIdPrefix}-${slot}`}>
            {card !== null ? <MathText text={shape.items[card]} /> : <small aria-hidden="true">{slot + 1}</small>}
          </button>
        ))}
        <span className="fq-tile-end">{ends[1]}</span>
      </div>
      <div className="fq-tile-tray" aria-label="Cards to put in order">
        {shape.items.map((item, card) => order.includes(card) ? null : (
          <button key={card} type="button" className="fq-tile card" disabled={disabled} {...bind(String(card), item, disabled)}
            onClick={() => { if (!wasDrag()) tapCard(card); }}
            aria-label={`Put ${item} in the next empty place`} data-testid={`tile-${testIdPrefix}-card-${card}`}>
            <MathText text={item} />
          </button>
        ))}
      </div>
      {!disabled && <p className="fq-tile-help">Drag the cards into order, or tap them in order. Tap a placed card to take it back.</p>}
    </div>
  );
}
