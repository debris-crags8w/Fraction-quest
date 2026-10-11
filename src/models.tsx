import type { ReactNode } from 'react';

/* Shared drawings for the two core fraction models (plus sets), used on screen and on paper.
   Bars and number lines use the same x-scale, so a bar drawn above a line lines up exactly. */

export type ModelKind = 'bar' | 'line' | 'set';

export const MODEL_NAMES: Record<ModelKind, string> = { bar: 'Bar model', line: 'Number line', set: 'Set model' };

export const MODEL_CONCEPTS: Record<ModelKind, string> = {
  bar: 'The whole bar is 1. Split it into equal pieces. The bottom number counts all the pieces; the top number counts the shaded ones.',
  line: 'The distance from 0 to 1 is one whole. Split it into equal spaces and jump from 0. The fraction is the point where you land.',
  set: 'The whole collection is 1. Share it into equal groups. The bottom number counts the groups; the top number counts the ones you pick.',
};

export function BarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1.5" y="7" width="21" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="1.5" y="7" width="10.5" height="10" rx="2" fill="currentColor" />
      <path d="M7 7v10M12 7v10M17 7v10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function LineIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 15h20M3 11v8M21 11v8M9 13v4M15 13v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M3 10q3-5 6 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="15" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function SetIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="8" r="3" fill="currentColor" /><circle cx="12" cy="8" r="3" fill="currentColor" />
      <circle cx="18" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="16" r="3" fill="currentColor" /><circle cx="12" cy="16" r="3" fill="currentColor" />
      <circle cx="18" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function ModelTag({ kind, children }: { kind: ModelKind; children?: ReactNode }) {
  const Icon = kind === 'bar' ? BarIcon : kind === 'line' ? LineIcon : SetIcon;
  return <span className={`fq-model-tag kind-${kind}`}><Icon size={16} />{children ?? MODEL_NAMES[kind]}</span>;
}

const W = 320; // drawing width for 0 → wholes
const PAD = 22;

/** Bar model: each whole is one bar split into d equal pieces; the first n pieces are shaded. Omit d for an empty bar to partition by hand. */
export function BarSvg({ n = 0, d, wholes = 1, label }: { n?: number; d?: number; wholes?: number; label?: string }) {
  const unit = W / wholes;
  return (
    <svg className="fq-svg-bar" viewBox={`0 0 ${W + PAD * 2} 46`} role="img" aria-label={label ?? (d ? `Bar model: ${n}/${d}, each whole split into ${d} equal pieces` : 'Empty bar model to split into equal pieces')}>
      {Array.from({ length: wholes }, (_, w) => {
        const x0 = PAD + w * unit + (w ? 3 : 0);
        const width = unit - (wholes > 1 ? 3 : 0);
        return (
          <g key={w}>
            {d && Array.from({ length: d }, (_, p) => {
              const i = w * d + p;
              return <rect key={p} className={i < n ? 'shaded' : 'empty'} x={x0 + (p * width) / d} y={6} width={width / d} height={32} />;
            })}
            {!d && <rect className="empty" x={x0} y={6} width={width} height={32} />}
            <rect className="frame" x={x0} y={6} width={width} height={32} fill="none" />
          </g>
        );
      })}
    </svg>
  );
}

/** Number line: 0 → wholes, each whole split into d equal spaces, with jump arcs from 0 to the point n/d. Omit d for a bare 0-to-1 line. */
export function LineSvg({ n = 0, d, wholes = 1, showPoint = true, label }: { n?: number; d?: number; wholes?: number; showPoint?: boolean; label?: string }) {
  const spaces = d ? d * wholes : wholes;
  const step = W / spaces;
  const y = 40;
  return (
    <svg className="fq-svg-line" viewBox={`0 0 ${W + PAD * 2} 74`} role="img" aria-label={label ?? (d ? `Number line from 0 to ${wholes}, each whole split into ${d} equal spaces${showPoint ? `, point at ${n}/${d}` : ''}` : 'Empty number line from 0 to 1 to split into equal spaces')}>
      <line className="axis" x1={PAD - 12} y1={y} x2={W + PAD + 12} y2={y} />
      <path className="axis-arrow" d={`M${W + PAD + 14} ${y} l-7 -5 v10 z`} />
      {Array.from({ length: spaces + 1 }, (_, i) => {
        const whole = d ? i % d === 0 : true;
        const x = PAD + i * step;
        return (
          <g key={i}>
            <line className={whole ? 'tick whole' : 'tick'} x1={x} y1={y - (whole ? 10 : 6)} x2={x} y2={y + (whole ? 10 : 6)} />
            {whole && <text x={x} y={y + 27} textAnchor="middle">{d ? i / d : i}</text>}
          </g>
        );
      })}
      {d && showPoint && n > 0 && Array.from({ length: n }, (_, j) => {
        const x1 = PAD + j * step; const x2 = PAD + (j + 1) * step;
        return <path key={j} className="jump" d={`M${x1 + 2} ${y - 4} Q${(x1 + x2) / 2} ${y - 26} ${x2 - 2} ${y - 4}`} />;
      })}
      {d && showPoint && <circle className="point" cx={PAD + n * step} cy={y} r={7} />}
    </svg>
  );
}

/** Set model: `total` objects shared into d equal groups; n groups selected. */
export function SetSvg({ n, d, total }: { n: number; d: number; total: number }) {
  const per = Math.max(1, Math.round(total / d));
  const cols = Math.min(per, 4);
  const rows = Math.ceil(per / cols);
  const gw = cols * 16 + 12; const gh = rows * 16 + 12;
  const perRow = Math.max(1, Math.floor((W + PAD * 2) / (gw + 8)));
  const height = Math.ceil(d / perRow) * (gh + 8);
  return (
    <svg className="fq-svg-set" viewBox={`0 0 ${W + PAD * 2} ${height}`} role="img" aria-label={`Set model: ${total} objects in ${d} equal groups, ${n} groups selected`}>
      {Array.from({ length: d }, (_, g) => {
        const gx = (g % perRow) * (gw + 8); const gy = Math.floor(g / perRow) * (gh + 8);
        return (
          <g key={g} transform={`translate(${gx + 2} ${gy + 2})`}>
            <rect className={g < n ? 'group on' : 'group'} width={gw} height={gh} rx={8} />
            {Array.from({ length: per }, (_, k) => (
              <circle key={k} className={g < n ? 'dot on' : 'dot'} cx={14 + (k % cols) * 16} cy={14 + Math.floor(k / cols) * 16} r={5.5} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** The same fraction drawn as a bar directly above a number line, so the shaded length matches the distance from 0. */
export function ModelPair({ n, d, wholes = Math.max(1, Math.ceil(n / d)) }: { n: number; d: number; wholes?: number }) {
  const reach = PAD + (n / (d * wholes)) * W;
  return (
    <figure className="fq-model-pair">
      <div className="fq-model-pair-row"><ModelTag kind="bar" /><BarSvg n={n} d={d} wholes={wholes} /></div>
      <div className="fq-model-pair-guide" aria-hidden="true">
        <svg viewBox={`0 0 ${W + PAD * 2} 14`}><line x1={reach} y1={0} x2={reach} y2={14} /></svg>
      </div>
      <div className="fq-model-pair-row"><ModelTag kind="line" /><LineSvg n={n} d={d} wholes={wholes} /></div>
      <figcaption>Same fraction, two models: the shaded part of the bar reaches exactly as far as the point on the number line.</figcaption>
    </figure>
  );
}
