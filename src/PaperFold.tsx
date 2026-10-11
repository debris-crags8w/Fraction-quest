import { useState, type CSSProperties, type ReactElement } from 'react';
import { RotateCcw } from 'lucide-react';

/* A virtual paper strip: fold it in halves or thirds, then unfold to see equal pieces.
   This is how kids *make* fractions: 1 → 1/2 → 1/4 → 1/8. */

const MAX_PIECES = 16;

export function PaperFold({ allowThirds = true, shadeHalf = false, intro }: { allowThirds?: boolean; shadeHalf?: boolean; intro?: string }) {
  const [factors, setFactors] = useState<number[]>([]);
  const [folded, setFolded] = useState(false);
  const pieces = factors.reduce((a, b) => a * b, 1);
  const trail = factors.reduce<number[]>((list, f) => [...list, list[list.length - 1] * f], [1]);

  const fold = (factor: number) => {
    if (pieces * factor > MAX_PIECES) return;
    setFactors([...factors, factor]);
    setFolded(true);
  };
  const reset = () => { setFactors([]); setFolded(false); };

  const layers = folded ? Math.min(pieces, 8) : 1;
  const paperStyle = {
    width: folded ? `${100 / pieces}%` : '100%',
    boxShadow: Array.from({ length: layers - 1 }, (_, k) => `${(k + 1) * 3}px ${(k + 1) * 3}px 0 -1px var(--fq-fold-edge)`).join(', ') || 'none',
  } as CSSProperties;

  let message = 'A paper strip is 1 whole. Fold it!';
  if (pieces > 1 && folded) message = `Folded ${factors.length} ${factors.length === 1 ? 'time' : 'times'}: ${pieces} layers thick. Unfold to see the pieces.`;
  if (pieces > 1 && !folded) message = `${pieces} equal pieces. Each piece is 1/${pieces}.${shadeHalf && pieces % 2 === 0 ? ` The shaded half is ${pieces / 2}/${pieces}.` : ''}`;

  return (
    <section className={`fq-fold ${shadeHalf ? 'shade-half' : ''}`} aria-label="Fold the paper" data-testid="section-paper-fold">
      {intro && <p className="fq-fold-intro">{intro}</p>}
      <div className="fq-fold-stage">
        <div className={`fq-fold-paper ${folded ? 'folded' : 'open'}`} style={paperStyle} role="img"
          aria-label={folded ? `Paper folded into ${pieces} layers` : `Paper strip with ${pieces} equal pieces`} data-testid="paper-fold-strip">
          {!folded && pieces > 1 && Array.from({ length: pieces }, (_, i) => (
            <span key={i} className="fq-fold-piece">{pieces <= 8 && <small>1/{pieces}</small>}</span>
          ))}
        </div>
      </div>
      <p className="fq-fold-message" aria-live="polite" data-testid="text-paper-fold">{message}</p>
      <div className="fq-fold-trail" aria-label="Fractions made so far">
        {trail.map((p, i) => <span key={i} className={i === trail.length - 1 ? 'now' : ''}>{p === 1 ? '1' : `1/${p}`}</span>)}
      </div>
      <div className="fq-fold-buttons">
        <button type="button" className="fq-button" onClick={() => fold(2)} disabled={pieces * 2 > MAX_PIECES} data-testid="button-fold-half">Fold in half</button>
        {allowThirds && <button type="button" className="fq-button secondary" onClick={() => fold(3)} disabled={pieces * 3 > MAX_PIECES} data-testid="button-fold-thirds">Fold in thirds</button>}
        <button type="button" className="fq-button ghost" onClick={() => setFolded(false)} disabled={!folded} data-testid="button-unfold">Unfold</button>
        <button type="button" className="fq-icon-button" onClick={reset} aria-label="Start over with a flat strip" disabled={!factors.length} data-testid="button-fold-reset"><RotateCcw size={18} /></button>
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
    for (let k = layers - 1; k >= 0; k--) parts.push(<rect key={`${i}-${k}`} className="fold-layer" x={x + k * 3} y={14 + k * 3} width={w} height={H} />);
    parts.push(<text key={`t${i}`} x={x + w / 2} y={8} textAnchor="middle">{i === 0 ? 'Start' : `Fold ${i}`}</text>);
    x += w + layers * 3 + 6;
    if (i < steps.length - 1) {
      parts.push(<path key={`a${i}`} className="fold-arrow" d={`M${x} ${14 + H / 2} h${gap - 14} m-6 -5 l6 5 l-6 5`} />);
      x += gap;
    }
  });
  parts.push(<path key="open" className="fold-arrow" d={`M${x} ${14 + H / 2} h${gap - 14} m-6 -5 l6 5 l-6 5`} />);
  x += gap;
  parts.push(<text key="q" x={x + 14} y={14 + H / 2 + 6} textAnchor="middle" className="fold-question">Open?</text>);
  x += 36;
  return (
    <svg className="fq-svg-fold" viewBox={`0 0 ${x} ${14 + H + 22}`} role="img" aria-label={`A paper strip folded ${folds.length} times, then opened`}>
      {parts}
    </svg>
  );
}
