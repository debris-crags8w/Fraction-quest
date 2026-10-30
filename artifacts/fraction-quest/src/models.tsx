import React, { type CSSProperties, type ReactNode } from 'react';
import type { ChallengeFigure } from './challenges';
import { FoldIllustration } from './PaperFold';
import { LinePlotPicture } from './line-plot-picture';
import { RulerPicture } from './ruler-picture';
import { AreaSvg } from './AreaModel';
import { areaLabel } from './area-shapes';
import { sayFraction } from './lib/voice';

/* Shared drawings for the two core fraction models (plus sets), used on screen and on paper.
   Bars and number lines use the same x-scale, so a bar drawn above a line lines up exactly. */

export type ModelKind = 'bar' | 'line' | 'set';

export const MODEL_NAMES: Record<ModelKind, string> = { bar: 'Bar model', line: 'Number line', set: 'Set model' };

export const MODEL_CONCEPTS: Record<ModelKind, string> = {
  bar: 'The whole bar is 1. Cut it into equal pieces. Shade the ones you count.',
  line: '0 to 1 is one whole. Cut it into equal spaces. Jump from 0.',
  set: 'All the dots make one whole. Make equal groups. Pick the ones you count.',
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

/** The label under every whole: a bracket from one end of the whole to the other, marked "1 whole". */
export function WholeBracket({ label = 'one whole' }: { label?: string }) {
  return <span className="fq-whole-bracket" aria-hidden="true"><b>{label}</b></span>;
}
/** The same bracket drawn in an SVG, under a whole from x to x + width. */
export function SvgWholeBracket({ x, width, y = 54, label = 'one whole' }: { x: number; width: number; y?: number; label?: string }) {
  return <g className="fq-svg-whole-bracket" aria-hidden="true">
    <path d={`M${x} ${y} V${y + 6} H${x + width} V${y}`} fill="none" />
    <text className="fq-svg-model-label" x={x + width / 2} y={y + 17} textAnchor="middle">{label}</text>
  </g>;
}

const W = 320; // drawing width for 0 → wholes
const PAD = 22;
/** Room left of a bar for its stacked fraction label. */
const LABEL_W = 30;
const LABEL_X = PAD - LABEL_W / 2 - 6;

/** Bar model: each whole is one bar split into d equal pieces; the first n pieces are shaded. Omit d for an empty bar to partition by hand. */
/** `sizes` draws one whole cut into pieces of these relative sizes (they may be unequal), for "Is this cut into equal parts?". */
/** `fraction`: show the bar's fraction above its left end (when the question names it, or once it's answered). */
export function BarSvg({ n = 0, d, wholes = 1, sizes, label, fraction = false, labelSpace = fraction }: { n?: number; d?: number; wholes?: number; sizes?: number[]; label?: string; fraction?: boolean;
  /** Keep room for a fraction label even when this bar has none, so bars drawn together stay the same length. */
  labelSpace?: boolean }) {
  const unit = W / wholes;
  if (sizes?.length) {
    const sum = sizes.reduce((a, b) => a + b, 0);
    let x = PAD;
    return (
      <svg className="fq-svg-bar" viewBox={`0 0 ${W + PAD * 2} 74`} role="img" aria-label={label ?? `A bar cut into ${sizes.length} pieces`}>
        {sizes.map((size, i) => {
          const width = (size / sum) * W; const at = x; x += width;
          return <rect key={i} className={i < n ? 'shaded' : 'empty'} style={{ '--i': i } as CSSProperties} x={at} y={17} width={width} height={32} />;
        })}
        <rect className="frame" x={PAD} y={17} width={W} height={32} fill="none" />
        <SvgWholeBracket x={PAD} width={W} />
      </svg>
    );
  }
  const labelled = fraction && !!d;
  const room = labelled || labelSpace;
  return (
    <svg className="fq-svg-bar" viewBox={`${room ? -LABEL_W : 0} 0 ${W + PAD * 2 + (room ? LABEL_W : 0)} 74`} role="img" aria-label={label ?? (d ? `Bar model: each whole is split into ${d} equal parts, and ${n} ${n === 1 ? 'part is' : 'parts are'} shaded` : 'Whole bar ready to split into equal parts')}>
      {/* The fraction sits left of the bar, one number over the other. */}
      {labelled && <g className="fq-svg-fraction-label" aria-hidden="true">
        <text className="num" x={LABEL_X} y={30} textAnchor="middle">{n}</text>
        <line className="bar" x1={LABEL_X - 13} x2={LABEL_X + 13} y1={35} y2={35} />
        <text className="den" x={LABEL_X} y={51} textAnchor="middle">{d}</text>
      </g>}
      {Array.from({ length: wholes }, (_, w) => {
        const x0 = PAD + w * unit + (w ? 3 : 0);
        const width = unit - (wholes > 1 ? 3 : 0);
        const partCenter = x0 + width / (d ? d * 2 : 2);
        return (
          <g key={w}>
            {d && Array.from({ length: d }, (_, p) => {
              const i = w * d + p;
              return <rect key={p} className={i < n ? 'shaded' : 'empty'} style={{ '--i': i } as CSSProperties} x={x0 + (p * width) / d} y={17} width={width / d} height={32} />;
            })}
            {!d && <rect className="empty" x={x0} y={17} width={width} height={32} />}
            <rect className="frame" x={x0} y={17} width={width} height={32} fill="none" />
            <SvgWholeBracket x={x0} width={width} />
          </g>
        );
      })}
    </svg>
  );
}

/** Number line: 0 → wholes, each whole split into d equal spaces, with jump arcs from 0 to the point n/d. Omit d for a bare 0-to-1 line. */
export function LineSvg({ n = 0, d, wholes = 1, showPoint = true, jumps = true, label }: { n?: number; d?: number; wholes?: number; showPoint?: boolean; jumps?: boolean; label?: string }) {
  const spaces = d ? d * wholes : wholes;
  const step = W / spaces;
  const y = 40;
  return (
    <svg className="fq-svg-line" viewBox={`0 0 ${W + PAD * 2} 74`} role="img" aria-label={label ?? (d ? `Number line from 0 to ${wholes}, each whole split into ${d} equal spaces${showPoint ? `, point at ${sayFraction(n, d)}` : ''}` : 'Empty number line from 0 to 1 to split into equal spaces')}>
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
      {d && showPoint && jumps && n > 0 && Array.from({ length: n }, (_, j) => {
        const x1 = PAD + j * step; const x2 = PAD + (j + 1) * step;
        return <path key={j} className="jump" pathLength={1} style={{ '--i': j } as CSSProperties} d={`M${x1 + 2} ${y - 4} Q${(x1 + x2) / 2} ${y - 26} ${x2 - 2} ${y - 4}`} />;
      })}
      {d && showPoint && <circle className="point" style={{ '--jumps': jumps ? n : 0 } as CSSProperties} cx={PAD + n * step} cy={y} r={7} />}
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
    <svg className="fq-svg-set" viewBox={`0 0 ${W + PAD * 2} ${height}`} role="img" aria-label={`Set model: ${total} objects in ${d} equal groups of ${per}, ${n} ${n === 1 ? 'group' : 'groups'} selected.`}>
      {Array.from({ length: d }, (_, g) => {
        const gx = (g % perRow) * (gw + 8); const gy = Math.floor(g / perRow) * (gh + 8);
        return (
          <g key={g} transform={`translate(${gx + 2} ${gy + 2})`} data-testid="set-model-group" data-group-index={g + 1}>
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
      <figcaption>Same fraction, two models. The shading stops right where the jumps land.</figcaption>
    </figure>
  );
}

/** Pictures for Unit challenge puzzles. They never print a fraction, so the picture stays the puzzle. */
export function ChallengeFigureView({ figure }: { figure: ChallengeFigure }) {
  if (figure.kind === 'grid' || figure.kind === 'dots') {
    const size = figure.kind === 'grid' ? Math.min(44, Math.floor(260 / Math.max(figure.rows, figure.cols))) : 40;
    const shaded = new Set(figure.shaded);
    const total = figure.rows * figure.cols;
    return (
      <svg className={`fq-svg-figure ${figure.kind}`} viewBox={`0 0 ${figure.cols * size + 4} ${figure.rows * size + 4}`} role="img"
        aria-label={`${figure.kind === 'grid' ? 'A rectangle' : 'Dots'} in ${figure.rows} rows of ${figure.cols}, ${shaded.size} of ${total} shaded`}>
        {Array.from({ length: total }, (_, i) => {
          const x = 2 + (i % figure.cols) * size; const y = 2 + Math.floor(i / figure.cols) * size;
          return figure.kind === 'grid'
            ? <rect key={i} className={shaded.has(i) ? 'cell on' : 'cell'} x={x} y={y} width={size} height={size} />
            : <circle key={i} className={shaded.has(i) ? 'dot on' : 'dot'} cx={x + size / 2} cy={y + size / 2} r={size * 0.32} />;
        })}
        {figure.kind === 'grid' && <rect className="frame" x={2} y={2} width={figure.cols * size} height={figure.rows * size} fill="none" />}
      </svg>
    );
  }
  if (figure.kind === 'line') return <LineSvg n={figure.n} d={figure.d} wholes={figure.wholes} jumps={false} label={`Number line from 0 to ${figure.wholes ?? 1} with a dot`} />;
  if (figure.kind === 'ruler') return <RulerPicture denominator={figure.denominator} wholes={figure.wholes} end={figure.end} />;
  if (figure.kind === 'areas') return (
    <div className="fq-figure-areas">
      {figure.areas.map((area, i) => (
        <div className="fq-figure-area" key={i}>
          {area.label && <b>{area.label}</b>}
          <AreaSvg figure={area} label={`${area.label ? `Square ${area.label}: ` : ''}${areaLabel(area.cut, area.shaded).replace(/^A rectangle/, 'A square')}`} />
        </div>
      ))}
    </div>
  );
  if (figure.kind === 'fold') return <FoldIllustration folds={figure.folds} />;
  if (figure.kind === 'lineplot') return <LinePlotPicture denominator={figure.denominator} wholes={figure.wholes} values={figure.values} />;
  return (
    <div className="fq-figure-bars">
      {figure.bars.map((bar, i) => (
        <div className="fq-figure-bar" key={i}>
          {bar.label && <b>{bar.label}</b>}
          <BarSvg n={bar.n} d={bar.d} label={`${bar.label ? `Bar ${bar.label}: ` : ''}a bar split into ${bar.d} equal pieces, ${bar.n} shaded`} />
        </div>
      ))}
    </div>
  );
}
