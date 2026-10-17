import React, { createContext, useContext, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { MathText } from './MathText';
import { LearningListenButton, LearningText } from './LearningText';
import { Check, Gift, LockKeyhole, Sparkles, Star } from 'lucide-react';
import type { ModelSpec } from './game';
import { DAILY_GOAL, type FunState } from './lib/fun';
import { MODEL_NAMES, ModelTag, WholeBracket } from './models';
import { LinkedFraction, PieFraction, TickLabel } from './fraction-ui';
import { activeSeason, nextCostume, seasonLessonCount, seasonLine, unlockedCostumes, type Season } from './seasons';

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

/* ---------- seasonal theme ---------- */

/** The seasonal theme showing now (null when off), and the costumes Numi has earned this season. */
export function useSeason(): { season: Season | null; costumes: string[] } {
  const fun = useOptionalFun()?.fun;
  const season = activeSeason(fun);
  return { season, costumes: season ? unlockedCostumes(season, seasonLessonCount(fun, season)).map((costume) => costume.id) : [] };
}

/** A candy cane: what points look like at Christmas. */
function CandyCaneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="fq-candy-icon fq-candy-cane">
      <path d="M7 19 V7 a4 4 0 0 1 8 0" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M7 19 V7 a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="2.6 2.6" />
    </svg>
  );
}

/** What points look like during a season: candy at Halloween, a candy cane at Christmas. */
export function SeasonPointsIcon({ size = 18 }: { size?: number }) {
  return useSeason().season?.id === 'christmas' ? <CandyCaneIcon size={size} /> : <CandyIcon size={size} />;
}

/** A wrapped sweet: what points look like during Halloween. */
export function CandyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size * 1.3} height={size} viewBox="0 0 26 20" aria-hidden="true" className="fq-candy-icon">
      <path d="M1 10 L7 5 V15 Z M25 10 L19 5 V15 Z" fill="currentColor" opacity=".75" />
      <circle cx="13" cy="10" r="7" fill="currentColor" />
      <path d="M9.5 7.5 Q13 13 16.5 7.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

/** A witch hat sized for an 80-wide character; `glow` gives it the glow-in-the-dark band. */
function WitchHat({ x = 0, y = 0, glow = false }: { x?: number; y?: number; glow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className="fq-witch-hat">
      <path d="M27 6 L42 -14 L53 6 Z" fill="#2B1B4D" />
      <rect x="20" y="4" width="40" height="5.5" rx="2.75" fill="#2B1B4D" />
      <rect x="29" y="0.5" width="22" height="4" fill={glow ? '#B6FF5C' : '#FF8A1F'} />
      {glow && <circle cx="42" cy="-14" r="2.6" fill="#B6FF5C" />}
    </g>
  );
}

/** A Santa hat sized for an 80-wide character; `twinkle` gives it a glowing star pom-pom. */
function SantaHat({ x = 0, y = 0, twinkle = false }: { x?: number; y?: number; twinkle?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className="fq-santa-hat">
      <path d="M25 6 Q32 -15 55 -8 L52 6 Z" fill="#D23B3B" />
      <rect x="21" y="2.5" width="38" height="6.5" rx="3.25" fill="#fff" />
      {twinkle
        ? <path d="M56 -14 l1.8 4.2 4.4 .4 -3.4 2.9 1 4.4 -3.8-2.4 -3.8 2.4 1-4.4 -3.4-2.9 4.4-.4z" fill="#FFE27A" />
        : <circle cx="56" cy="-8" r="4" fill="#fff" />}
    </g>
  );
}

/** Numi's striped scarf: a Christmas costume. */
function Scarf() {
  return (
    <g className="fq-scarf">
      <rect x="27" y="33.5" width="26" height="6" rx="3" fill="#2E8B57" />
      <path d="M33 33.5 v6 M39 33.5 v6 M45 33.5 v6" stroke="#D23B3B" strokeWidth="2.2" />
      <rect x="44" y="36" width="6" height="13" rx="2" fill="#2E8B57" />
      <path d="M44 41 h6 M44 45 h6" stroke="#D23B3B" strokeWidth="2" />
    </g>
  );
}

/* ---------- mascot ---------- */

export type MascotMood = 'happy' | 'thinking' | 'cheer' | 'oops';

/** Numi, a living fraction: a head on top, the fraction bar for arms, and a round body cut into 2 equal halves
    with 1 shaded ("I am one half!"). The arms tilt with the mood. */
export function Mascot({ mood = 'happy', size = 76 }: { mood?: MascotMood; size?: number }) {
  const ink = '#2B2D42';
  const { season, costumes } = useSeason();
  const halloween = season?.id === 'halloween';
  const christmas = season?.id === 'christmas';
  const hatted = halloween || christmas;
  // The body is one half shaded in every season: a pumpkin at Halloween, a red ornament at Christmas.
  const body = halloween ? { shade: '#D95F00', rest: '#FFAE5C', line: '#8A3F00' } : christmas ? { shade: '#C62F2F', rest: '#FFD9D9', line: '#7E1A1A' } : { shade: '#00B8A9', rest: '#fff', line: '#00897B' };
  const arms = mood === 'cheer' ? 'rotate(-12 40 41)' : mood === 'oops' ? 'rotate(8 40 41)' : mood === 'thinking' ? 'rotate(-5 40 41)' : undefined;
  const look = mood === 'thinking' ? 1.3 : 0; // eyes glance up and to the side
  return (
    <svg className={`fq-mascot fq-mascot-${mood} ${season ? `is-${season.id}` : ''}`} width={size} height={size} viewBox={hatted ? '0 -14 80 94' : '0 0 80 80'} aria-hidden="true"
      data-costume={halloween ? ['witch-hat', ...costumes].join(' ') : christmas ? ['santa-hat', ...costumes].join(' ') : undefined}>
      {halloween && costumes.includes('bat-wings') && (
        <g className="fq-bat-wings">
          <path d="M30 56 C 22 40, 8 42, 0 48 C 6 51, 7 55, 6 60 C 11 56, 16 58, 18 62 C 21 57, 26 57, 30 60 Z" fill="#2B1B4D" />
          <path d="M50 56 C 58 40, 72 42, 80 48 C 74 51, 73 55, 74 60 C 69 56, 64 58, 62 62 C 59 57, 54 57, 50 60 Z" fill="#2B1B4D" />
        </g>
      )}
      <circle cx="40" cy="21" r="16" fill="#7C5CFF" />
      {!hatted && <path d="M30 7 Q34 1 38 6" stroke="#7C5CFF" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {mood === 'cheer' ? (
        <>
          <path d="M31.2 21 Q34.4 15.4 37.6 21" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M42.4 21 Q45.6 15.4 48.8 21" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M35.2 25.6 Q40 33.6 44.8 25.6 Z" fill={ink} />
          <path d="M37.6 28.8 Q40 31.2 42.4 28.8" fill="#FF6B8B" />
        </>
      ) : (
        <>
          <circle cx="34.4" cy="20" r="5.1" fill="#fff" />
          <circle cx="45.6" cy="20" r="5.1" fill="#fff" />
          <circle cx={34.4 + look} cy={20 - look} r="3.4" fill={ink} />
          <circle cx={45.6 + look} cy={20 - look} r="3.4" fill={ink} />
          <circle cx={35.5 + look} cy={18.9 - look} r="1.1" fill="#fff" />
          <circle cx={46.7 + look} cy={18.9 - look} r="1.1" fill="#fff" />
          {mood === 'happy' && <path d="M36 26.4 Q40 30.4 44 26.4" stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
          {mood === 'thinking' && <path d="M38.4 28 L43.2 27.2" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />}
          {mood === 'oops' && (
            <>
              <path d="M30.4 14.4 L37.6 12.4" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
              <path d="M49.6 14.4 L42.4 12.4" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
              <ellipse cx="40" cy="28" rx="2.2" ry="2.7" fill={ink} />
            </>
          )}
        </>
      )}
      <circle cx="30.4" cy="25.6" r="2.6" fill="#FF4B91" opacity=".35" />
      <circle cx="49.6" cy="25.6" r="2.6" fill="#FF4B91" opacity=".35" />
      {christmas && costumes.includes('scarf') && <Scarf />}
      <g transform={arms}>
        <rect x="8" y="38.5" width="64" height="5" rx="2.5" fill="#FF9600" />
        <circle cx="8" cy="41" r="4.5" fill="#FFB547" />
        <circle cx="72" cy="41" r="4.5" fill="#FFB547" />
      </g>
      {/* The body is always one whole cut into 2 equal halves with 1 shaded. */}
      <path d="M40 46 L40 74 A14 14 0 0 1 40 46 Z" fill={body.shade} />
      <path d="M40 46 A14 14 0 0 1 40 74 Z" fill={body.rest} />
      {halloween && <path d="M33 47.5 Q29.5 60 33 72.5 M47 47.5 Q50.5 60 47 72.5" stroke="#A84F00" strokeWidth="1.4" fill="none" />}
      <circle cx="40" cy="60" r="14" fill="none" stroke={body.line} strokeWidth="2.4" />
      <path d="M40 46 L40 74" stroke={body.line} strokeWidth="2.4" />
      <rect x="31" y="74" width="7" height="4" rx="2" fill={ink} />
      <rect x="42" y="74" width="7" height="4" rx="2" fill={ink} />
      {mood === 'thinking' && (
        <>
          <circle cx="66" cy="12" r="4" fill="#FFC800" />
          <circle cx="59" cy="20" r="2.4" fill="#FFC800" />
        </>
      )}
      {mood === 'cheer' && <path d="M66 6 l2 5 5 .5 -4 3 1.3 5 -4.3-2.8 -4.3 2.8 1.3-5 -4-3 5-.5z" fill="#FFC800" />}
      {halloween && <WitchHat glow={costumes.includes('glow-hat')} />}
      {christmas && <SantaHat twinkle={costumes.includes('twinkle-hat')} />}
    </svg>
  );
}

/** Hoot, the fix-it owl: shows up after a wrong answer to help look closer. Always curious and kind, never cross. */
export function Hoot({ size = 64 }: { size?: number }) {
  const seasonId = useSeason().season?.id;
  return (
    <svg className={`fq-hoot ${seasonId ? `is-${seasonId}` : ''}`} width={size} height={size} viewBox={seasonId ? '0 -12 80 92' : '0 0 80 80'} aria-hidden="true">
      <path d="M22 16 L28 28 L18 28 Z" fill="#6D4BD8" />
      <path d="M58 16 L52 28 L62 28 Z" fill="#6D4BD8" />
      <ellipse cx="40" cy="46" rx="25" ry="27" fill="#7C5CF0" />
      <ellipse cx="40" cy="56" rx="15" ry="14" fill="#E9E2FF" />
      <path d="M33 54 q3 3 7 0 q4 3 7 0" stroke="#B9A8F5" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="38" r="10" fill="#fff" />
      <circle cx="50" cy="38" r="10" fill="#fff" />
      <circle cx="31" cy="39" r="4.5" fill="#2B2D42" />
      <circle cx="51" cy="39" r="4.5" fill="#2B2D42" />
      <circle cx="32.5" cy="37.5" r="1.5" fill="#fff" />
      <circle cx="52.5" cy="37.5" r="1.5" fill="#fff" />
      {/* Raised, curious brows */}
      <path d="M22 26 Q29 22 36 26" stroke="#4B2FB0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 26 Q51 22 58 26" stroke="#4B2FB0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M37 45 L43 45 L40 50 Z" fill="#FFB020" />
      {/* Magnifying glass */}
      <circle cx="66" cy="60" r="7" fill="#DFF3FF" stroke="#2B2D42" strokeWidth="3" />
      <path d="M61 65 L55 71" stroke="#2B2D42" strokeWidth="3.5" strokeLinecap="round" />
      {seasonId === 'halloween' && <WitchHat y={12} />}
      {seasonId === 'christmas' && <SantaHat y={12} />}
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
              <TickLabel i={i} d={target.d} />
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
    <div className="fq-story-prompt">
      {lines.length > 0 && (
        <ol className="fq-story" aria-label="The story, one line at a time">
          {lines.map((line, i) => <li key={i}><span aria-hidden="true">{i + 1}</span><span><LearningText text={line} emphasize /></span></li>)}
        </ol>
      )}
      <div className="fq-story-question-heading">
        <h1 id={id} className="fq-question-text"><LearningText text={question} emphasize /></h1>
        <LearningListenButton text={prompt} label="Listen to the question" />
      </div>
    </div>
  );
}

/* ---------- seasonal theme pieces ---------- */

/** The map banner while a seasonal theme is on: Numi in costume and progress to the next costume. */
export function SeasonBanner() {
  const fun = useOptionalFun()?.fun;
  const { season } = useSeason();
  if (!season) return null;
  const count = seasonLessonCount(fun, season);
  const next = nextCostume(season, count);
  return (
    <section className="fq-season-banner" aria-labelledby="season-title" data-testid="season-banner">
      <Mascot mood="happy" size={84} />
      <div className="fq-season-banner-copy">
        <span className="fq-season-kicker">{season.name}</span>
        <h2 id="season-title">{season.title}</h2>
        {next
          ? <>
            <p>Finish <u>{next.lessons - count} more {next.lessons - count === 1 ? 'lesson' : 'lessons'}</u> to unlock {next.name}.</p>
            <div className="fq-season-progress" role="img" aria-label={`${count} of ${next.lessons} lessons`}>
              <span><b style={{ width: `${(count / next.lessons) * 100}%` }} /></span>
              <small>{count} of {next.lessons}</small>
            </div>
          </>
          : <p>You earned every costume. <u>{season.greeting}</u></p>}
      </div>
    </section>
  );
}

/** Numi's short seasonal story line above a question. It sets the scene; it never gives a hint. */
export function SeasonSay({ kind, id }: { kind: ModelSpec['kind'] | undefined; id: string }) {
  const { season } = useSeason();
  if (!season) return null;
  return (
    <div className="fq-season-say" data-testid="season-line">
      <Mascot mood="happy" size={44} />
      <p>{seasonLine(season, kind, id)}</p>
    </div>
  );
}

/** The reward card: a costume just earned, or how many lessons until the next one. */
export function SeasonReward({ missionId }: { missionId: string }) {
  const fun = useOptionalFun()?.fun;
  const { season } = useSeason();
  if (!season) return null;
  const lessons = fun?.seasonLessons?.[season.key] ?? [];
  const earned = lessons[lessons.length - 1] === missionId ? season.costumes.find((costume) => costume.lessons === lessons.length) : undefined;
  const next = nextCostume(season, lessons.length);
  if (!earned && !next) return null;
  return (
    <div className={`fq-season-reward ${earned ? 'is-earned' : ''}`} data-testid="season-reward">
      <span className="fq-season-reward-icon" aria-hidden="true">
        {season.id === 'christmas'
          ? <svg width="34" height="34" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="currentColor" /></svg>
          : <svg width="40" height="30" viewBox="0 0 56 40"><path d="M28 22 C 18 8, 8 12, 4 16 C 10 18, 10 22, 9 26 C 15 22, 19 24, 21 28 C 23 24, 26 24, 28 26 C 30 24, 33 24, 35 28 C 37 24, 41 22, 47 26 C 46 22, 46 18, 52 16 C 48 12, 38 8, 28 22 Z" fill="currentColor" /></svg>}
      </span>
      <span>
        {earned
          ? <><small>Costume unlocked</small><strong>{earned.name.charAt(0).toUpperCase() + earned.name.slice(1)}</strong>{next && <em>{next.lessons - lessons.length} more {next.lessons - lessons.length === 1 ? 'lesson' : 'lessons'} for {next.name}.</em>}</>
          : <><small>{season.name} costume</small><strong>{next!.lessons - lessons.length} more {next!.lessons - lessons.length === 1 ? 'lesson' : 'lessons'} for {next!.name}</strong></>}
      </span>
    </div>
  );
}
