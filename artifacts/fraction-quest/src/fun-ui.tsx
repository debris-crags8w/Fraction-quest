import { createContext, useContext, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { MathText } from './MathText';
import { LearningText } from './LearningText';
import { Check, Gift, LockKeyhole, Sparkles, Star } from 'lucide-react';
import type { ModelSpec } from './game';
import { DAILY_GOAL, type FunState } from './lib/fun';
import { MODEL_NAMES, ModelTag, WholeBracket } from './models';
import { LinkedFraction, PieFraction } from './fraction-ui';

/* ---------- shared fun state ---------- */

type FunContextValue = { fun: FunState; setFun: (next: FunState) => void };
export const FunContext = createContext<FunContextValue | null>(null);
export function useOptionalFun(): FunContextValue | null {
  return useContext(FunContext);
}
export function useFun(): FunContextValue {
  const value = useOptionalFun();
  if (!value) throw new Error('useFun must be used inside FunContext');
  return value;
}

/* ---------- colors ---------- */

// Each denominator gets its own color, like a set of physical fraction tiles.
const DENOM_COLORS: Record<number, string> = {
  1: '#7C4DFF', 2: '#FF4B91', 3: '#FF9600', 4: '#58CC02', 5: '#1CB0F6', 6: '#9B5CFF',
  8: '#00B8A9', 10: '#FFC800', 12: '#FF6B4A',
};
export function denomColor(denominator: number): string {
  return DENOM_COLORS[denominator] ?? ['#1CB0F6', '#FF4B91', '#58CC02', '#FF9600'][denominator % 4];
}

// Deep enough for white text at 4.5:1 or better (unit headers and map nodes).
export const UNIT_COLORS = ['#6C3EE0', '#0F74AB', '#2F7D06', '#B35600', '#C41F5F', '#0B7A6B', '#9327B8', '#3B4BD6'];
export const unitColor = (unit: number) => UNIT_COLORS[(unit - 1) % UNIT_COLORS.length];

/* ---------- mascot ---------- */

export type MascotMood = 'happy' | 'thinking' | 'cheer' | 'oops';

export function Mascot({ mood = 'happy', size = 76 }: { mood?: MascotMood; size?: number }) {
  const closed = mood === 'cheer';
  return (
    <svg className={`fq-mascot fq-mascot-${mood}`} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <path d="M14 10 L30 30 L12 38 Z" fill="#FF9600" />
      <path d="M66 10 L50 30 L68 38 Z" fill="#FF9600" />
      <path d="M18 18 L27 30 L17 34 Z" fill="#FFD7A8" />
      <path d="M62 18 L53 30 L63 34 Z" fill="#FFD7A8" />
      <ellipse cx="40" cy="44" rx="28" ry="24" fill="#FF9600" />
      <path d="M16 46 Q40 80 64 46 Q52 58 40 58 Q28 58 16 46 Z" fill="#FFF4E6" />
      {closed ? (
        <>
          <path d="M25 43 Q30 36 35 43" stroke="#2B2D42" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M45 43 Q50 36 55 43" stroke="#2B2D42" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="30" cy="42" r="4.5" fill="#2B2D42" />
          <circle cx="50" cy="42" r="4.5" fill="#2B2D42" />
          <circle cx="31.5" cy="40.5" r="1.5" fill="#fff" />
          <circle cx="51.5" cy="40.5" r="1.5" fill="#fff" />
        </>
      )}
      {mood === 'oops' && (
        <>
          <path d="M24 34 L34 36" stroke="#2B2D42" strokeWidth="3" strokeLinecap="round" />
          <path d="M56 34 L46 36" stroke="#2B2D42" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mood === 'thinking' && <circle cx="66" cy="20" r="4" fill="#FFC800" />}
      <ellipse cx="40" cy="52" rx="4" ry="3" fill="#2B2D42" />
      <circle cx="22" cy="52" r="3.5" fill="#FF4B91" opacity=".35" />
      <circle cx="58" cy="52" r="3.5" fill="#FF4B91" opacity=".35" />
    </svg>
  );
}

/* ---------- confetti ---------- */

const CONFETTI_COLORS = ['#7C4DFF', '#1CB0F6', '#58CC02', '#FF9600', '#FF4B91', '#FFC800'];

/** Renders a fresh confetti burst each time `burst` changes to a new positive number. */
export function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, index) => ({
    left: Math.random() * 100,
    dx: Math.random() * 160 - 80,
    delay: Math.random() * 0.25,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  })), [burst]);
  if (burst <= 0) return null;
  return (
    <div className="fq-confetti" aria-hidden="true" key={burst}>
      {pieces.map((piece, index) => (
        <i key={index} style={{ left: `${piece.left}%`, background: piece.color, animationDelay: `${piece.delay}s`, '--dx': `${piece.dx}px` } as CSSProperties} />
      ))}
    </div>
  );
}

/* ---------- daily goal ring ---------- */

/** Today's goal as a pie cut into one slice per correct answer (tenths): a fraction model, not just a ring. */
export function DailyRing({ answered }: { answered: number }) {
  const got = Math.min(answered, DAILY_GOAL);
  return (
    <span className="fq-daily" title={`Daily goal: ${got}/${DAILY_GOAL} of today's correct answers`} aria-label={`Daily goal ${got} of ${DAILY_GOAL}`} role="img">
      <PieFraction n={got} d={DAILY_GOAL} size={34} fill="var(--fq-tangerine)" empty="color-mix(in srgb, var(--fq-tangerine) 10%, #fff)" stroke="color-mix(in srgb, var(--fq-tangerine) 70%, #000)" />
      {got >= DAILY_GOAL && <Check className="fq-daily-done" size={14} strokeWidth={4} />}
    </span>
  );
}

/* ---------- hands-on model for the guided example ---------- */

type TapTarget = { kind: 'bar'; d: number; wholes: number; n: number } | { kind: 'line'; d: number; wholes: number; n: number } | { kind: 'set'; total: number; n: number };

function tapTargetFor(model: ModelSpec): TapTarget | null {
  if (model.kind === 'bars' && model.bars.length) {
    const first = model.bars[model.bars.length > 1 && model.bars[0].numerator === model.bars[0].denominator ? 1 : 0];
    const d = first.denominator;
    if (d < 2 || d > 12) return null;
    return { kind: 'bar', d, wholes: Math.max(1, Math.ceil(first.numerator / d)), n: first.numerator };
  }
  if (model.kind === 'decimal') return { kind: 'bar', d: 10, wholes: 1, n: model.tenths };
  if (model.kind === 'line' && model.denominator <= 12) return { kind: 'line', d: model.denominator, wholes: model.wholes ?? 1, n: model.numerator };
  if (model.kind === 'set' && model.total <= 24) return { kind: 'set', total: model.total, n: model.selected };
  return null;
}

/** "Your turn": tap pieces, jumps or counters to rebuild the example's fraction. Practice only, never graded. */
export function TapModel({ model }: { model: ModelSpec }) {
  const target = tapTargetFor(model);
  const [count, setCount] = useState(0);
  if (!target) return null;
  const toggle = (i: number) => setCount((current) => (current === i + 1 ? i : i + 1));
  const matched = count === target.n;
  const label = target.kind === 'set' ? `${count} of ${target.total}` : `${count}/${target.d}`;
  const goal = target.kind === 'set' ? `${target.n} of ${target.total}` : `${target.n}/${target.d}`;
  return (
    <section className={`fq-tap ${matched ? 'matched' : ''}`} aria-label="Your turn: build it" data-testid="section-tap-model">
      <div className="fq-tap-head">
        <span className="fq-tap-kicker"><Sparkles size={14} /> Your turn · <ModelTag kind={target.kind}>{MODEL_NAMES[target.kind]}</ModelTag></span>
        <strong><MathText text={target.kind === 'line' ? `Tap the number line to land on ${goal}.` : target.kind === 'set' ? `Tap counters to light up ${goal}.` : `Tap pieces to shade ${goal}.`} /></strong>
      </div>
      {target.kind === 'bar' && (
        <div className="fq-tap-bars" style={{ '--piece': denomColor(target.d) } as CSSProperties}>
          {Array.from({ length: target.wholes }, (_, w) => (
            <div className="fq-tap-whole" key={w}>
              <div className="fq-tap-bar" role="group" aria-label={`Whole ${w + 1}, split into ${target.d} equal parts`}>
                {Array.from({ length: target.d }, (_, p) => {
                  const i = w * target.d + p;
                  return <button type="button" key={p} className={i < count ? 'on' : ''} aria-pressed={i < count} aria-label={`Part ${p + 1} of ${target.d} equal parts`} onClick={() => toggle(i)} data-testid={`button-tap-piece-${i}`} />;
                })}
              </div>
              <WholeBracket />
            </div>
          ))}
        </div>
      )}
      {target.kind === 'line' && (
        <div className="fq-tap-line" style={{ '--piece': denomColor(target.d) } as CSSProperties}>
          <div className="fq-tap-track"><b style={{ width: `${(count / (target.d * target.wholes)) * 100}%` }} /></div>
          {Array.from({ length: target.d * target.wholes + 1 }, (_, i) => (
            <button type="button" key={i} className={`${i === count ? 'on' : ''} ${i % target.d === 0 ? 'whole' : ''}`} style={{ left: `${(i / (target.d * target.wholes)) * 100}%` }}
              aria-label={`Land after ${i} jumps`} aria-pressed={i === count} onClick={() => setCount(i)} data-testid={`button-tap-tick-${i}`}>
              <span>{i % target.d === 0 ? i / target.d : ''}</span>
            </button>
          ))}
        </div>
      )}
      {target.kind === 'set' && (
        <div className="fq-tap-set">
          {Array.from({ length: target.total }, (_, i) => (
            <button type="button" key={i} className={i < count ? 'on' : ''} aria-pressed={i < count} aria-label={`Counter ${i + 1}`} onClick={() => toggle(i)} data-testid={`button-tap-counter-${i}`} />
          ))}
        </div>
      )}
      <p className="fq-tap-readout" aria-live="polite">
        {matched ? <><Check size={16} strokeWidth={3} /> You built <MathText text={goal} />!</> : <>You have <b><MathText text={label} /></b></>}
      </p>
    </section>
  );
}

/* ---------- winding lesson path ---------- */

export type PathNode = {
  id: string;
  number: number;
  title: string;
  state: 'done' | 'now' | 'open' | 'lock';
  stars: number;
  /** Lesson steps finished (build checks, then the worksheet): the badge is a pie cut into that many slices. */
  steps?: { done: number; total: number };
  detail: ReactNode;
};

const OFFSETS = [0, -1, -1.4, -0.6, 0.6, 1.4, 1, 0.3];

export type ChallengeInfo = { best: number | null; max: number; onStart: () => void };

export function LessonPath({ unit, color, nodes, selectedId, onSelect, allDone, challenge }: {
  unit: number; color: string; nodes: PathNode[]; selectedId: string | null; onSelect: (id: string) => void; allDone: boolean; challenge?: ChallengeInfo;
}) {
  return (
    <ol className="fq-path" style={{ '--unit': color } as CSSProperties} aria-label={`Unit ${unit} lessons`}>
      {nodes.map((node, index) => {
        const offset = OFFSETS[(index + unit) % OFFSETS.length];
        const selected = node.id === selectedId;
        return (
          <li key={node.id} className={`fq-path-step ${selected ? 'selected' : ''}`} style={{ '--offset': offset } as CSSProperties} data-testid={`card-mission-${node.id}`}>
            {node.state === 'now' && !selected && <span className="fq-path-start" aria-hidden="true">Start</span>}
            <button
              type="button"
              className={`fq-node ${node.state}`}
              onClick={() => onSelect(node.id)}
              aria-expanded={selected}
              aria-label={`Lesson ${node.number}: ${node.title}${node.state === 'done' ? ', completed' : node.state === 'lock' ? ', locked' : node.steps?.done ? `, ${node.steps.done} of ${node.steps.total} steps done` : ''}`}
              data-testid={`button-node-${node.id}`}
            >
              {node.state !== 'lock' && node.steps && (
                <PieFraction className="fq-node-pie" n={node.state === 'done' ? node.steps.total : node.steps.done} d={node.steps.total} size={52}
                  fill="#fff" empty="rgb(255 255 255 / 0.25)" stroke="var(--unit-dark, #4b23c9)" />
              )}
              <span className="fq-node-icon">
                {node.state === 'done' ? <Check size={30} strokeWidth={4} /> : node.state === 'lock' ? <LockKeyhole size={24} strokeWidth={3} /> : !node.steps?.done && <Star size={node.steps ? 22 : 28} strokeWidth={3} fill="currentColor" />}
              </span>
            </button>
            {node.state !== 'done' && node.state !== 'lock' && !!node.steps?.done && (
              <span className="fq-node-steps" style={{ '--piece': color } as CSSProperties} data-testid={`text-node-steps-${node.id}`}>
                <LinkedFraction n={node.steps.done} d={node.steps.total} label={`${node.steps.done} of ${node.steps.total} steps done`} /> <small aria-hidden="true">done</small>
              </span>
            )}
            {node.state === 'done' && (
              <span className="fq-node-stars" role="img" aria-label={`${node.stars} of 3 stars`}>
                {[0, 1, 2].map((s) => <Star key={s} size={13} strokeWidth={2.5} className={s < node.stars ? 'filled' : ''} />)}
              </span>
            )}
            {selected && <div className="fq-node-card">{node.detail}</div>}
          </li>
        );
      })}
      <li className="fq-path-step fq-path-chest" style={{ '--offset': 0 } as CSSProperties}>
        {allDone && challenge ? (
          <button type="button" className="fq-chest open" onClick={challenge.onStart} aria-label={`Unit ${unit} challenge`} data-testid={`button-challenge-unit-${unit}`}>
            <Gift size={30} strokeWidth={2.5} />
          </button>
        ) : (
          <span className="fq-chest" aria-label="Finish the unit to open this challenge" role="img"><Gift size={30} strokeWidth={2.5} /></span>
        )}
        <span className="fq-chest-label" data-testid={`text-challenge-unit-${unit}`}>
          {allDone ? <>Unit challenge{challenge?.best != null ? ` · best ${challenge.best}/${challenge.max}` : ''}</> : 'Challenge: finish the unit'}
        </span>
      </li>
    </ol>
  );
}

/* ---------- long problems, one line at a time ---------- */

/** Splits a word problem into its story lines and the final question (only when it has 3+ sentences). */
export function splitStory(prompt: string): { lines: string[]; question: string } {
  const sentences = prompt.split(/(?<=[.?!])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length < 3) return { lines: [], question: prompt };
  return { lines: sentences.slice(0, -1), question: sentences[sentences.length - 1] };
}

/** Shows a long problem as numbered story lines with the question underneath. */
export function StoryPrompt({ prompt, id }: { prompt: string; id: string }) {
  const { lines, question } = splitStory(prompt);
  return (
    <>
      {lines.length > 0 && (
        <ol className="fq-story" aria-label="The story, one line at a time">
          {lines.map((line, i) => <li key={i}><span aria-hidden="true">{i + 1}</span><span><LearningText text={line} speak emphasize /></span></li>)}
        </ol>
      )}
      <h1 id={id} className="fq-question-text"><LearningText text={question} speak emphasize /></h1>
    </>
  );
}
