import type { CSSProperties } from 'react';

/* Fraction pieces shared by every screen. One color rule everywhere: the numerator is the color of the
   shaded parts (parts selected), and the denominator is purple, the color of the part outlines (equal parts
   in one whole). `--piece` sets the shaded color; without it, sky blue. */

/** A stacked fraction whose numerator and denominator are colored like the model's parts. */
export function LinkedFraction({ n, d, className = '', label }: { n: number | null; d: number | null; className?: string; label?: string }) {
  return (
    <span className={`fq-linked-fraction ${className}`} role="img" aria-label={label ?? (n !== null && d !== null ? `${n} over ${d}` : 'fraction not built yet')}>
      <b className={`fq-num ${n === null ? 'ghost' : ''}`} key={`n${n}`}>{n ?? '?'}</b>
      <i aria-hidden="true" />
      <b className={`fq-den ${d === null ? 'ghost' : ''}`}>{d ?? '?'}</b>
    </span>
  );
}

type Unit = 'bar' | 'line' | 'set';
const WORDS: Record<Unit, { selected: (n: number) => string; whole: (d: number) => string }> = {
  bar: { selected: (n) => `${n} ${n === 1 ? 'part' : 'parts'} shaded`, whole: (d) => `${d} equal parts in 1 whole` },
  line: { selected: (n) => `${n} ${n === 1 ? 'jump' : 'jumps'} from 0`, whole: (d) => `${d} equal spaces from 0 to 1` },
  set: { selected: (n) => `${n} ${n === 1 ? 'group' : 'groups'} picked`, whole: (d) => `${d} equal groups in all` },
};

/** The fraction a child is building, written live under the model: choosing the parts writes the denominator,
    each tap changes the numerator, and a full whole glows gold. It only reads back the child's own model. */
export function LiveFraction({ n, d, unit = 'bar', wholes = 1, color, compact = false, testId }: {
  n: number; d: number; unit?: Unit; wholes?: number; color?: string; compact?: boolean; testId?: string;
}) {
  const built = d > 0;
  const whole = built && n > 0 && n % d === 0 && n / d <= wholes;
  const wholeCount = whole ? n / d : 0;
  return (
    <div className={`fq-live-fraction ${compact ? 'compact' : ''} ${whole ? 'is-whole' : ''}`} style={color ? { '--piece': color } as CSSProperties : undefined}
      aria-live="polite" data-testid={testId}>
      <LinkedFraction n={built ? n : null} d={built ? d : null} label={built ? `You made ${n} over ${d}` : 'Choose the equal parts first'} />
      <span className="fq-live-legend">
        <span className="fq-live-num"><i aria-hidden="true" />{compact ? (built ? `${n} shaded` : 'Shaded') : built ? WORDS[unit].selected(n) : unit === 'line' ? 'Jumps from 0' : 'Parts selected'}</span>
        <span className="fq-live-den"><i aria-hidden="true" />{compact ? (built ? `${d} equal parts` : 'Choose parts') : built ? WORDS[unit].whole(d) : unit === 'line' ? 'Choose the equal spaces' : 'Choose the equal parts'}</span>
        {whole && <strong className="fq-live-whole">= {wholeCount === 1 ? '1 whole' : `${wholeCount} wholes`}</strong>}
      </span>
    </div>
  );
}

/** A circle cut into `d` equal slices with `n` of them filled: a real fraction model, used for progress. */
export function PieFraction({ n, d, size = 40, className = '', fill = 'var(--fq-lime)', empty = 'hsl(var(--card))', stroke = 'currentColor' }: {
  n: number; d: number; size?: number; className?: string; fill?: string; empty?: string; stroke?: string;
}) {
  const parts = Math.max(1, d);
  const r = 18; const c = 20;
  const at = (k: number) => {
    const angle = (k / parts) * Math.PI * 2 - Math.PI / 2;
    return `${(c + r * Math.cos(angle)).toFixed(2)} ${(c + r * Math.sin(angle)).toFixed(2)}`;
  };
  return (
    <svg className={`fq-pie ${className}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill={empty} />
      {parts === 1 ? (n >= 1 && <circle cx={c} cy={c} r={r} fill={fill} />) : Array.from({ length: Math.min(n, parts) }, (_, k) => (
        <path key={k} d={`M${c} ${c} L${at(k)} A${r} ${r} 0 0 1 ${at(k + 1)} Z`} fill={fill} />
      ))}
      {parts > 1 && Array.from({ length: parts }, (_, k) => <path key={`l${k}`} d={`M${c} ${c} L${at(k)}`} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />)}
      <circle cx={c} cy={c} r={r} fill="none" stroke={stroke} strokeWidth="2.4" />
    </svg>
  );
}
