import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { RotateCcw } from 'lucide-react';
import { MathText } from './MathText';
import { useOptionalFun } from './fun-ui';
import { useReadAloud } from './LearningText';

/* A virtual paper strip: fold it in halves or thirds, then unfold to see equal pieces.
   This is how kids *make* fractions: 1 → 1/2 → 1/4 → 1/8. */

const MAX_PIECES = 16;
const FLAP_MS = 680;
const COLLAPSE_MS = 420;
const COUNT_MS = 160;

/** Which fold made the crease at piece boundary `i` (1 = the first fold). Each fold keeps its own line style,
    so after unfolding you still see the halves inside the fourths (1/2 = 2/4). */
export function creaseLevel(i: number, factors: number[]): number {
  const pieces = factors.reduce((a, b) => a * b, 1);
  let size = pieces;
  for (let level = 0; level < factors.length; level++) {
    size /= factors[level];
    if (i % size === 0) return level + 1;
  }
  return factors.length;
}

/** The shaded amount, and the same amount in an earlier fold's pieces when it fits ("2/4 = 1/2"). */
export function shadedName(shaded: number, factors: number[]): string {
  const pieces = factors.reduce((a, b) => a * b, 1);
  if (!shaded) return '';
  let denominator = 1;
  for (const f of factors) {
    denominator *= f;
    if (denominator < pieces && (shaded * denominator) % pieces === 0) return `${shaded}/${pieces} = ${(shaded * denominator) / pieces}/${denominator}`;
  }
  return `${shaded}/${pieces}`;
}

type Phase = 'flat' | 'collapsing' | 'folding' | 'folded' | 'unfolding';

export function PaperFold({ allowThirds = true, shadeHalf = false, intro }: { allowThirds?: boolean; shadeHalf?: boolean; intro?: string }) {
  const [factors, setFactors] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('flat');
  const [flap, setFlap] = useState<number>(2);
  const [shaded, setShaded] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  const sound = useOptionalFun()?.fun.sound ?? false;

  const pieces = factors.reduce((a, b) => a * b, 1);
  const trail = factors.reduce<number[]>((list, f) => [...list, list[list.length - 1] * f], [1]);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const busy = phase === 'collapsing' || phase === 'folding' || phase === 'unfolding';
  const open = phase === 'flat' || phase === 'unfolding';

  const fold = (factor: number) => {
    if (busy || pieces * factor > MAX_PIECES) return;
    setShaded([]);
    const commit = () => { setFactors((list) => [...list, factor]); setPhase('folded'); };
    if (reduceMotion) { commit(); return; }
    const flip = () => { setFlap(factor); setPhase('folding'); later(factor === 3 ? FLAP_MS + 420 : FLAP_MS, commit); };
    // An opened strip with creases folds back up along them first, then folds again.
    if (phase === 'flat' && pieces > 1) { setPhase('collapsing'); later(COLLAPSE_MS, flip); } else flip();
  };
  const unfold = () => {
    if (phase !== 'folded') return;
    setRound((r) => r + 1);
    setShaded(shadeHalf && pieces % 2 === 0 ? Array.from({ length: pieces / 2 }, (_, i) => i) : []);
    if (reduceMotion) { setPhase('flat'); return; }
    setPhase('unfolding');
    later(pieces * COUNT_MS + 900, () => setPhase('flat'));
  };
  const reset = () => { if (!busy) { setFactors([]); setPhase('flat'); setShaded([]); } };
  const toggle = (i: number) => { if (phase === 'flat' && pieces > 1) setShaded((list) => list.includes(i) ? list.filter((x) => x !== i) : [...list, i]); };

  const layers = Math.min(pieces, 8);
  const blockWidth = open ? 100 : 100 / pieces;
  const equivalence = trail.length > 2 ? trail.slice(1).map((d) => `${d / trail[1]}/${d}`).join(' = ') : '';

  let message = 'A paper strip is 1 whole. Fold it!';
  if (phase === 'collapsing') message = 'Folding it back up along the creases…';
  else if (phase === 'folding') message = flap === 2 ? 'Folding in half…' : 'Folding in thirds…';
  else if (phase === 'folded') message = `Folded ${factors.length} ${factors.length === 1 ? 'time' : 'times'}: ${pieces} layers thick. Unfold to see the pieces.`;
  else if (phase === 'unfolding') message = 'Unfolding… count the pieces!';
  else if (pieces > 1) message = shaded.length
    ? `You shaded ${shadedName(shaded.length, factors)} of the strip.`
    : `${pieces} equal pieces. Each piece is 1/${pieces}. Tap pieces to shade them.`;
  // Each opened strip is said aloud once: how many folds, how many equal pieces.
  useReadAloud(phase === 'unfolding' && sound ? `${factors.length} ${factors.length === 1 ? 'fold' : 'folds'}. ${pieces} equal pieces. Each piece is 1/${pieces}.` : null, phase === 'unfolding' ? round : null);

  return (
    <section className={`fq-fold ${shadeHalf ? 'shade-half' : ''}`} aria-label="Fold the paper" data-testid="section-paper-fold">
      {intro && <p className="fq-fold-intro"><MathText text={intro} /></p>}
      <div className="fq-fold-stage">
        {/* The whole strip stays as a faint outline, so a folded stack is still seen as part of 1 whole. */}
        <div className={`fq-fold-ghost ${open ? 'hidden' : ''}`} aria-hidden="true" />
        <div className={`fq-fold-paper ${open ? 'open' : 'folded'} phase-${phase}`} style={{ width: `${blockWidth}%` } as CSSProperties} role="img"
          aria-label={open ? `Paper strip with ${pieces} equal pieces` : `Paper folded into ${pieces} layers`} data-testid="paper-fold-strip">
          {phase === 'folding' ? (
            <>
              {/* The panel that stays put (with the layers under it), and the flap(s) that swing over on a hinge. */}
              <span className="fq-fold-rest" style={{ left: flap === 3 ? '33.333%' : 0, width: `${100 / flap}%`, '--layers': layers } as CSSProperties} />
              <span className="fq-fold-flap right" style={{ left: `${100 - 100 / flap}%`, width: `${100 / flap}%` } as CSSProperties}>
                <i className="front" /><i className="back" />
              </span>
              {flap === 3 && (
                <span className="fq-fold-flap left" style={{ left: 0, width: '33.333%' } as CSSProperties}>
                  <i className="front" /><i className="back" />
                </span>
              )}
              <i className="fq-fold-crease-draw" style={{ left: `${100 / flap * (flap === 3 ? 2 : 1)}%` } as CSSProperties} aria-hidden="true" />
              {flap === 3 && <i className="fq-fold-crease-draw second" style={{ left: '33.333%' }} aria-hidden="true" />}
            </>
          ) : open ? (
            <span className="fq-fold-sheet" key={round}>
              {pieces > 1 && Array.from({ length: pieces }, (_, i) => (
                <button key={i} type="button" className={`fq-fold-piece ${shaded.includes(i) ? 'shaded' : ''} crease-${i ? creaseLevel(i, factors) : 0}`}
                  style={{ '--i': i, '--n': pieces } as CSSProperties} onClick={() => toggle(i)} disabled={phase !== 'flat'}
                  aria-pressed={shaded.includes(i)} aria-label={`Piece ${i + 1} of ${pieces}${shaded.includes(i) ? ', shaded' : ''}`} data-testid={`button-fold-piece-${i}`}>
                  {phase === 'unfolding' && <b className="fq-fold-count" aria-hidden="true">{i + 1}</b>}
                  {pieces <= 8 && <small>1/{pieces}</small>}
                </button>
              ))}
            </span>
          ) : (
            <span className="fq-fold-stack" style={{ '--layers': layers } as CSSProperties}>
              {Array.from({ length: layers }, (_, k) => <i key={k} style={{ '--k': k } as CSSProperties} />)}
            </span>
          )}
        </div>
        {phase === 'folded' && <span className="fq-fold-layers" data-testid="text-fold-layers">{pieces} layers</span>}
      </div>
      <p className="fq-fold-message" aria-live="polite" data-testid="text-paper-fold">{message}</p>
      {phase === 'flat' && equivalence && <p className="fq-fold-equal" data-testid="text-fold-equivalence">{equivalence}</p>}
      <div className="fq-fold-trail" aria-label="Fractions made so far">
        {trail.map((p, i) => <span key={i} className={i === trail.length - 1 ? 'now' : ''}>{p === 1 ? '1' : `1/${p}`}</span>)}
      </div>
      <div className="fq-fold-buttons">
        <button type="button" className="fq-button" onClick={() => fold(2)} disabled={busy || pieces * 2 > MAX_PIECES} data-testid="button-fold-half">Fold in half</button>
        {allowThirds && <button type="button" className="fq-button secondary" onClick={() => fold(3)} disabled={busy || pieces * 3 > MAX_PIECES} data-testid="button-fold-thirds">Fold in thirds</button>}
        <button type="button" className="fq-button ghost" onClick={unfold} disabled={phase !== 'folded'} data-testid="button-unfold">Unfold</button>
        <button type="button" className="fq-icon-button" onClick={reset} aria-label="Start over with a flat strip" disabled={!factors.length || busy} data-testid="button-fold-reset"><RotateCcw size={18} /></button>
      </div>
    </section>
  );
}

/** Static picture of folding steps (for puzzles and paper): flat strip → folded once → folded again… then "open it". */
export function FoldIllustration({ folds }: { folds: number[] }) {
  const steps = folds.reduce<number[]>((list, f) => [...list, list[list.length - 1] * f], [1]);
  const W = 120; const gap = 36; const H = 30;
  let x = 4;
  const parts: ReactElement[] = [];
  steps.forEach((p, i) => {
    const w = W / p;
    const layers = Math.min(p, 6);
    const group: ReactElement[] = [];
    for (let k = layers - 1; k >= 0; k--) group.push(<rect key={`${i}-${k}`} className="fold-layer" x={x + k * 3} y={14 + k * 3} width={w} height={H} />);
    group.push(<text key={`t${i}`} x={x + w / 2} y={8} textAnchor="middle">{i === 0 ? 'Start' : `Fold ${i}`}</text>);
    parts.push(<g key={`g${i}`} className="fold-step" style={{ '--i': i * 2 } as CSSProperties}>{group}</g>);
    x += w + layers * 3 + 6;
    if (i < steps.length - 1) {
      parts.push(<path key={`a${i}`} className="fold-arrow fold-step" style={{ '--i': i * 2 + 1 } as CSSProperties} d={`M${x} ${14 + H / 2} h${gap - 14} m-6 -5 l6 5 l-6 5`} />);
      x += gap;
    }
  });
  parts.push(<path key="open" className="fold-arrow fold-step" style={{ '--i': steps.length * 2 - 1 } as CSSProperties} d={`M${x} ${14 + H / 2} h${gap - 14} m-6 -5 l6 5 l-6 5`} />);
  x += gap;
  parts.push(<text key="q" x={x + 14} y={14 + H / 2 + 6} textAnchor="middle" className="fold-question fold-step" style={{ '--i': steps.length * 2 } as CSSProperties}>Open?</text>);
  x += 36;
  return (
    <svg className="fq-svg-fold" viewBox={`0 0 ${x} ${14 + H + 22}`} role="img" aria-label={`A paper strip folded ${folds.length} times, then opened`}>
      {parts}
    </svg>
  );
}
