/* The animated Teach first (teach-scenes.ts): one step at a time, each with a short picture that plays once and
   rests on its last frame. Back, Replay and Next move between steps; Listen reads the step. With reduced motion
   each step opens on its last frame. */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { AREA_CUTS, areaOutline, type Point } from './area-shapes';
import type { LessonIntro } from './lesson-intros';
import { LearningListenButton, LearningText } from './LearningText';
import { MathText } from './MathText';
import type { AreaRow, BarRow, LessonScene, LineRow, SceneRow, SetRow, StepScene } from './teach-scenes';
import './teach-scene.css';

/** Is motion turned down (the grown-ups' setting, or the device's)? */
function motionReduced(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.classList.contains('fq-reduced-motion')) return true;
  try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Plays a step's frames once (or shows the last one at once). `take` restarts it. */
function useFrame(scene: StepScene, take: number): number {
  const last = scene.length - 1;
  const [index, setIndex] = useState(() => (motionReduced() ? last : 0));
  useEffect(() => {
    if (motionReduced()) { setIndex(last); return; }
    setIndex(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    scene.forEach((frame, i) => {
      if (i === last) return;
      at += frame.ms;
      timers.push(setTimeout(() => setIndex(i + 1), at));
    });
    return () => timers.forEach(clearTimeout);
  }, [scene, take, last]);
  return Math.min(index, last);
}

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6" /></svg>
);

function Bar({ row }: { row: BarRow }) {
  const total = row.parts.reduce((sum, part) => sum + part, 0);
  const starts = row.parts.map((_, i) => row.parts.slice(0, i).reduce((sum, part) => sum + part, 0));
  const checkerWidth = row.checkerSize ?? row.parts[0] ?? 1;
  const has = (list: number[] | undefined, i: number) => !!list?.includes(i);
  return (
    <div className={`fq-ts-row ${row.hidden ? 'is-hidden' : ''}`}>
      {row.label && <span className={`fq-ts-label is-${row.tone ?? 'plain'}`}><MathText text={row.label} /></span>}
      <div className="fq-ts-bar" data-testid="teach-scene-bar">
        {row.parts.map((part, i) => (
          <span key={i} style={{ flexGrow: part }}
            className={`fq-ts-part ${i > 0 && row.cut && i % (row.group ?? 1) === 0 ? 'is-cut' : ''} ${has(row.shaded, i) ? 'is-shaded' : ''} ${has(row.shaded2, i) ? 'is-shaded2' : ''} ${has(row.counted, i) ? 'is-counted' : ''} ${has(row.glow, i) ? 'is-glow' : ''}`}>
            <span className="fq-ts-count" aria-hidden="true">{has(row.counted, i) ? row.counted!.indexOf(i) + (row.countFrom ?? 1) : ''}</span>
            <span className={`fq-ts-tick ${has(row.ticks, i) ? 'is-on' : ''}`}><Tick /></span>
          </span>
        ))}
        <span className={`fq-ts-checker ${row.checker == null ? '' : 'is-on'}`} aria-hidden="true"
          style={{ left: `${((starts[row.checker ?? 0] ?? 0) / total) * 100}%`, width: `${(checkerWidth / total) * 100}%` }} />
      </div>
      <div className={`fq-ts-bracket ${row.bracket ? 'is-on' : ''}`} aria-hidden={!row.bracket}>
        <span className="fq-ts-bracket-line" />
        <span className="fq-ts-bracket-label">{row.bracket ? <LearningText text={row.bracket} emphasize /> : null}</span>
      </div>
    </div>
  );
}

const pointsOf = (points: Point[], size: number) => points.map(([x, y]) => `${(x * size).toFixed(2)},${(y * size).toFixed(2)}`).join(' ');
const centerOf = (points: Point[]) => points.reduce(([sx, sy], [x, y]) => [sx + x / points.length, sy + y / points.length], [0, 0]);

function Area({ row, small = false }: { row: AreaRow; small?: boolean }) {
  const size = 100;
  const pieces = AREA_CUTS[row.cut];
  const has = (list: number[] | undefined, i: number) => !!list?.includes(i);
  return (
    <div className={`fq-ts-row fq-ts-area-row ${row.hidden ? 'is-hidden' : ''}`}>
      <svg className={`fq-ts-area ${small ? 'is-small' : ''} ${pieces.length > 30 ? 'is-fine' : ''}`} viewBox="-3 -3 106 106" role="img" aria-label={row.label ?? 'A shape cut into parts'}>
        {pieces.map((piece, i) => (
          <polygon key={i} points={pointsOf(piece.points, size)}
            className={`fq-ts-piece ${row.edges ? 'is-cut' : ''} ${has(row.shaded, i) ? 'is-shaded' : ''} ${has(row.shaded2, i) ? 'is-shaded2' : ''} ${has(row.counted, i) ? 'is-counted' : ''} ${has(row.glow, i) ? 'is-glow' : ''}`} />
        ))}
        <polygon points={pointsOf(areaOutline(row.cut), size)} className="fq-ts-outline" />
        {pieces.map((piece, i) => {
          const [x, y] = centerOf(piece.points);
          return has(row.counted, i)
            ? <text key={`n${i}`} x={x * size} y={y * size} className={`fq-ts-piece-count ${has(row.shaded, i) ? 'is-on-dark' : ''}`} aria-hidden="true">{row.counted!.indexOf(i) + 1}</text>
            : null;
        })}
      </svg>
      {row.label && <span className={`fq-ts-label is-${row.tone ?? 'plain'}`}><MathText text={row.label} /></span>}
    </div>
  );
}

function NumberLine({ row }: { row: LineRow }) {
  const total = row.max * row.spaces;
  const at = (space: number) => `${4 + (92 * space) / total}%`;
  const ticks = Array.from({ length: total + 1 }, (_, k) => k);
  const xs = new Map(row.xs ?? []);
  return (
    <div className={`fq-ts-row ${row.hidden ? 'is-hidden' : ''}`}>
      {row.label && <span className={`fq-ts-label is-${row.tone ?? 'plain'}`}><MathText text={row.label} /></span>}
      <div className={`fq-ts-line ${row.ruler ? 'is-ruler' : ''} ${row.xs ? 'has-xs' : ''}`} data-testid="teach-scene-line" role="img"
        aria-label={`A number line from 0 to ${row.max}${row.cut ? `, cut into ${row.spaces} equal spaces in each whole` : ''}`}>
        <span className="fq-ts-stretch" style={{ left: at(row.stretchFrom ?? 0), width: `${(92 * Math.max(0, (row.stretch ?? 0) - (row.stretchFrom ?? 0))) / total}%`, opacity: row.stretch ? 1 : 0 }} />
        <span className="fq-ts-axis" style={{ left: at(0), right: '4%' }} />
        {ticks.map((k) => {
          const whole = k % row.spaces === 0;
          return (
            <span key={k} className={`fq-ts-tick-mark ${whole ? 'is-whole' : ''} ${whole || (row.cut && k % (row.group ?? 1) === 0) ? 'is-on' : ''}`} style={{ left: at(k) }}>
              {whole && <span className="fq-ts-whole-label">{k / row.spaces}{k > 0 && (row.unit ?? (row.ruler ? 'in' : '')) ? ` ${row.unit ?? 'in'}` : ''}</span>}
            </span>
          );
        })}
        {ticks.slice(1).map((k) => (
          <span key={`j${k}`} className={`fq-ts-jump ${k <= (row.jumps ?? 0) ? 'is-on' : ''}`} style={{ left: at(k - 1), width: `${92 / total}%` }} />
        ))}
        {[...xs].map(([k, n]) => (
          <span key={`x${k}`} className="fq-ts-xs" style={{ left: at(k) }} aria-hidden="true">
            {Array.from({ length: n }, (_, i) => <span key={i}>X</span>)}
          </span>
        ))}
        <span className={`fq-ts-point ${row.point == null ? '' : 'is-on'}`} style={{ left: at(row.point ?? 0) }}>
          {row.pointLabel && <span className="fq-ts-point-label"><MathText text={row.pointLabel} /></span>}
        </span>
        {(row.marks ?? []).map((mark) => (
          <span key={`m${mark.at}`} className="fq-ts-mark" style={{ left: at(mark.at) }}><MathText text={mark.label} /></span>
        ))}
      </div>
    </div>
  );
}

function CounterSet({ row }: { row: SetRow }) {
  const groups = row.groups ?? 0;
  const dealt = groups ? Math.min(row.dealt ?? row.count, row.count) : 0;
  const perGroup = groups ? Math.ceil(row.count / groups) : 0;
  const has = (list: number[] | undefined, i: number) => !!list?.includes(i);
  // Numbers run through the counted groups in order when they count on, else start at 1 in each group.
  const countStart = (group: number) => (row.countOn ? (row.counted ?? []).filter((g) => g < group).length * perGroup : 0);
  return (
    <div className={`fq-ts-row fq-ts-set-row ${row.hidden ? 'is-hidden' : ''}`}>
      {row.label && <span className={`fq-ts-label is-${row.tone ?? 'plain'}`}><MathText text={row.label} /></span>}
      <div className="fq-ts-set" data-testid="teach-scene-set" role="img"
        aria-label={groups ? `${row.count} things shared into ${groups} equal groups` : `${row.count} things`}>
        {row.count - dealt > 0 && (
          <div className="fq-ts-pile">
            {Array.from({ length: row.count - dealt }, (_, i) => <span key={i} className="fq-ts-counter" />)}
          </div>
        )}
        {groups > 0 && (
          <div className="fq-ts-groups">
            {Array.from({ length: groups }, (_, g) => {
              // Counters go round the groups in turn: group g holds counters g, g + groups, g + 2 × groups ...
              const filled = Array.from({ length: perGroup }, (_, k) => g + k * groups < dealt);
              return (
                <div key={g} className={`fq-ts-group ${has(row.shaded, g) ? 'is-shaded' : ''} ${has(row.glow, g) ? 'is-glow' : ''}`}
                  style={{ gridTemplateColumns: `repeat(${Math.min(perGroup, perGroup > 4 ? 3 : 2)}, var(--ts-counter))` }}>
                  {filled.map((on, k) => (
                    <span key={k} className={`fq-ts-counter ${on ? 'is-on' : 'is-slot'}`}>
                      {on && has(row.counted, g) && <span className="fq-ts-count">{countStart(g) + k + 1}</span>}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ row }: { row: SceneRow }) {
  if (row.kind === 'line') return <NumberLine row={row} />;
  if (row.kind === 'set') return <CounterSet row={row} />;
  if (row.kind === 'bar') return <Bar row={row} />;
  if (row.kind === 'area') return <Area row={row} />;
  if (row.kind === 'text') return <p className={`fq-ts-text ${row.hidden ? 'is-hidden' : ''}`}><LearningText text={row.text} emphasize /></p>;
  return (
    <div className={`fq-ts-pair ${row.hidden ? 'is-hidden' : ''}`}>
      {row.items.map((item, i) => (item.kind === 'bar' ? <Bar key={i} row={item} /> : <Area key={i} row={item} small />))}
    </div>
  );
}

/** One step's picture, playing. */
export function TeachScenePicture({ scene, take }: { scene: StepScene; take: number }) {
  const frame = useFrame(scene, take);
  return (
    <div className="fq-ts-stage" data-testid="teach-scene" data-frame={frame} data-frames={scene.length}>
      {scene[frame]!.rows.map((row, i) => <Row key={i} row={row} />)}
    </div>
  );
}

/** The Teach first card, one animated step at a time. `onFinish` is the last step's "Next: see it" (Teach first);
    without it (under "How it works") the last step just rests. */
export function AnimatedLessonIntro({ intro, scene, onFinish }: { intro: LessonIntro; scene: LessonScene; onFinish?: () => void }) {
  const pages = useMemo(() => [
    ...intro.steps.map((text, i) => ({ label: `Step ${i + 1} of ${intro.steps.length}`, text, scene: scene.steps[i]! })),
    { label: 'Why it works', text: intro.why, scene: scene.why },
  ], [intro, scene]);
  const [page, setPage] = useState(0);
  const [take, setTake] = useState(0);
  const current = pages[page]!;
  const last = page === pages.length - 1;
  const go = (next: number) => { setPage(next); setTake((count) => count + 1); };
  // The first step also says what the lesson is for.
  const listen = page === 0 ? `${intro.goal} ${current.text}` : current.text;
  return (
    <section className="fq-example-intro fq-teach-card fq-ts-card" aria-labelledby="lesson-intro-heading" data-testid="lesson-introduction" data-teach-first={onFinish ? '' : undefined}>
      <div className="fq-example-card-head">
        <h2 id="lesson-intro-heading">{intro.heading}</h2>
        <LearningListenButton key={page} text={listen} label={`Listen to ${current.label.toLowerCase()}`} prefetch />
      </div>
      <div className="fq-ts-progress">
        <span className="fq-ts-step-label" data-testid="teach-step-label">{current.label}</span>
        <span className="fq-ts-dots" aria-hidden="true">
          {pages.map((_, i) => <span key={i} className={i === page ? 'is-on' : i < page ? 'is-done' : ''} />)}
        </span>
      </div>
      {page === 0 && <p className="fq-ts-goal"><LearningText text={intro.goal} emphasize /></p>}
      <p className="fq-ts-step" data-testid="teach-step-text" aria-live="polite"><LearningText text={current.text} emphasize /></p>
      <TeachScenePicture key={`${page}-${take}`} scene={current.scene} take={take} />
      <div className="fq-ts-nav">
        <button type="button" className="fq-button ghost fq-ts-back" onClick={() => go(page - 1)} disabled={page === 0} data-testid="button-teach-step-back">Back</button>
        <button type="button" className="fq-button ghost fq-ts-replay" onClick={() => go(page)} aria-label="Play the picture again" data-testid="button-teach-replay">
          <RotateCcw size={20} aria-hidden="true" />
        </button>
        {!last && (
          <button type="button" className="fq-button primary fq-ts-next" onClick={() => go(page + 1)} data-testid="button-teach-step-next">
            Next <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
        {last && onFinish && (
          <button type="button" className="fq-button primary fq-ts-next" onClick={onFinish} data-testid="button-teach-next">
            Next: see it <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
