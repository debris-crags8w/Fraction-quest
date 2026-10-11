import { useEffect, useState, type KeyboardEvent } from 'react';
import { MathText } from './MathText';
import { AREA_CUTS, areaFeedback, areaLabel, areaTaskDone, type AreaFigure, type AreaTask } from './area-shapes';

const SIZE = 160; const PAD = 4;
const pts = (points: [number, number][]) => points.map(([x, y]) => `${PAD + x * SIZE},${PAD + y * SIZE}`).join(' ');

/** A square whole cut into pieces (read-only picture). */
export function AreaSvg({ figure, label }: { figure: AreaFigure; label?: string }) {
  const shaded = figure.shaded ?? [];
  return (
    <svg className="fq-svg-area" viewBox={`0 0 ${SIZE + PAD * 2} ${SIZE + PAD * 2}`} role="img" aria-label={label ?? areaLabel(figure.cut, shaded)}>
      {AREA_CUTS[figure.cut].map((piece, i) => <polygon key={i} className={shaded.includes(i) ? 'shaded' : 'empty'} points={pts(piece.points)} />)}
      <rect className="frame" x={PAD} y={PAD} width={SIZE} height={SIZE} fill="none" />
    </svg>
  );
}

/** Paper box: the same fraction colored two different ways. */
export function ColorTwoWays() {
  return (
    <section className="fq-print-draw fq-area-two-ways" data-testid="print-two-ways">
      <h2>Color it two ways</h2>
      <p><MathText text="Color 1/4 of each square. Use a different way each time." /></p>
      <div className="fq-area-idea-row">
        <AreaSvg figure={{ cut: 'quarter-and-triangles' }} label="A square to color" />
        <AreaSvg figure={{ cut: 'quarter-and-triangles' }} label="A square to color" />
      </div>
      <p className="fq-print-why">How do you know both show 1/4? <i /><i /></p>
    </section>
  );
}

/** Tap pieces to color n/d of the square. Any correct way counts (1 small square, or 2 triangles...). */
export function AreaShade({ figure, task, disabled, statusId, onMatchChange }: {
  figure: AreaFigure; task: AreaTask; disabled: boolean; statusId: string; onMatchChange: (done: boolean) => void;
}) {
  const [shaded, setShaded] = useState<number[]>([]);
  const done = areaTaskDone(figure.cut, task, shaded);
  useEffect(() => { onMatchChange(done); }, [done, onMatchChange]);
  const toggle = (i: number) => { if (!disabled) setShaded((s) => (s.includes(i) ? s.filter((k) => k !== i) : [...s, i])); };
  const onKey = (event: KeyboardEvent, i: number) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(i); } };
  return (
    <div className="fq-ll-copy fq-area-shade" data-testid="area-shade">
      <p className="fq-ll-copy-instruction">Tap pieces to color them. Tap again to clear.</p>
      <svg className="fq-svg-area interactive" viewBox={`0 0 ${SIZE + PAD * 2} ${SIZE + PAD * 2}`} aria-label={areaLabel(figure.cut)}>
        {AREA_CUTS[figure.cut].map((piece, i) => (
          <polygon
            key={i} points={pts(piece.points)} role="button" tabIndex={disabled ? -1 : 0}
            className={`${shaded.includes(i) ? 'shaded' : 'empty'} ${task.avoid?.includes(i) ? 'avoid' : ''}`}
            aria-pressed={shaded.includes(i)} aria-label={`${piece.shape === 'rect' ? 'rectangle' : piece.shape} piece ${i + 1}`}
            onClick={() => toggle(i)} onKeyDown={(e) => onKey(e, i)} data-testid={`button-area-piece-${i + 1}`}
          />
        ))}
        <rect className="frame" x={PAD} y={PAD} width={SIZE} height={SIZE} fill="none" pointerEvents="none" />
      </svg>
      <p id={statusId} className={`fq-ll-copy-status ${done ? 'matched' : ''}`} role="status" aria-live="polite" data-testid="status-area">
        {areaFeedback(figure.cut, task, shaded)}
      </p>
    </div>
  );
}

/** Lessons that teach "same size, not always same shape". */
export const SHAPE_LESSONS = ['equal-parts', 'unit-fractions'];

/** Lesson idea card: the same 1/4, four different shapes. */
export function SameSizeIdea() {
  const cuts: AreaFigure[] = [
    { cut: 'fourths-squares', shaded: [0] }, { cut: 'fourths-strips', shaded: [0] },
    { cut: 'fourths-triangles', shaded: [0] }, { cut: 'quarter-and-triangles', shaded: [1, 2] },
  ];
  return (
    <section className="fq-area-idea" data-testid="same-size-idea">
      <h3>Same size, different shapes</h3>
      <div className="fq-area-idea-row">
        {cuts.map((figure) => <AreaSvg key={figure.cut} figure={figure} label="One fourth of a square is shaded" />)}
      </div>
      <p><MathText text="Each square shows 1/4." /> The shapes look different, but each colored part is the same size: 4 of them fill the square. Equal parts are the same <b>size</b>, not always the same <b>shape</b>.</p>
    </section>
  );
}
