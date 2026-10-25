/* The model intros, as two lesson steps: Watch (a short demo that plays like a video: the finger cuts the whole into
   equal parts, then shades or hops) and Try (two guided tries with the same controls). The first lesson with a build
   opens both, one kind after the other (the builder, then the number line). Both stay in each lesson's Helper. */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, LifeBuoy, Minus, Plus, RotateCcw } from 'lucide-react';
import { playHaptic } from './lib/fun';
import type { IntroKind, IntroStage } from './lib/fun';
import { TaskBar } from './TaskBar';
import { LearningListenButton } from './LearningText';
import { TickLabel } from './fraction-ui';
import { FRACTION_WORDS, HELPER_PICKS, HELPER_PICK_SPEECH, INTRO_DEMOS, INTRO_TEXT, INTRO_TRIES, PART_NAMES, WHAT_IS_A_FRACTION, fractionWordsSpeech, introHint, newWordSpeech, whatIsAFractionSpeech } from './intro-copy';
import './model-intro.css';

const SHOT_MS = 2300;

/** One over the other, the school way. */
const Frac = ({ n, d }: { n: number | string; d: number | string }) => (
  <span className="fq-mi-frac" aria-label={`${n} over ${d}`}><b>{n}</b><b>{d}</b></span>
);

type StepProps = {
  kind: IntroKind;
  /** "Step 1 · Watch" in a lesson; the Helper's copy names only the step. */
  kicker: string;
  /** The last button's words ("Next: Try", "Next: number line", "Done"). */
  nextLabel: string;
  onDone: () => void;
  /** "I know how": skip both steps. Without it, no skip button (the Helper's copy). */
  onSkip?: () => void;
  /** In the Helper, which scrolls its own panel. */
  helper?: boolean;
};

/** On a short phone the step starts below the lesson's header and steps, so its button is off screen: when the card
    doesn't fit, bring its top into view. */
function useBroughtIntoView(helper: boolean) {
  const sectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (helper) return;
    const frame = requestAnimationFrame(() => {
      const box = sectionRef.current?.getBoundingClientRect();
      if (box && box.bottom > window.innerHeight) sectionRef.current?.scrollIntoView?.({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [helper]);
  return sectionRef;
}

function StepHead({ kind, kicker, speech }: { kind: IntroKind; kicker: string; speech: string }) {
  const text = INTRO_TEXT[kind];
  return (
    <header className="fq-mi-head">
      <div>
        <span className="fq-mi-kicker">{kicker}</span>
        <h3 id={`intro-title-${kind}`}>{text.title}</h3>
      </div>
      <LearningListenButton text={speech} label={`Listen to ${text.title.toLowerCase()}`} />
    </header>
  );
}

const Skip = ({ onSkip }: { onSkip?: () => void }) => onSkip
  ? <button type="button" className="fq-mi-skip" onClick={onSkip} data-testid="button-intro-skip">I know how: skip</button> : null;

/** Watch: the demo plays by itself; Replay starts it over. */
export function IntroWatch({ kind, kicker, nextLabel, onDone, onSkip, helper = false }: StepProps) {
  const shots = INTRO_DEMOS[kind];
  const [shot, setShot] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const play = () => {
    clearInterval(timer.current);
    setShot(0); setPlaying(true);
    timer.current = setInterval(() => setShot((current) => {
      if (current >= shots.length - 1) { clearInterval(timer.current); setPlaying(false); return current; }
      return current + 1;
    }), SHOT_MS);
  };
  useEffect(() => { play(); return () => clearInterval(timer.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const sectionRef = useBroughtIntoView(helper);
  const demo = shots[shot];
  return (
    <section ref={sectionRef} className={`fq-mi is-${kind}`} aria-labelledby={`intro-title-${kind}`} data-testid={`intro-${kind}`} data-step="watch">
      <StepHead kind={kind} kicker={kicker} speech={shots.map((item) => item.caption).join(' ')} />
      <div className="fq-mi-watch">
        <div className="fq-mi-screen" data-testid={`intro-demo-${kind}`}>
          <div className="fq-mi-screen-controls" aria-hidden="true">
            <span>{kind === 'builder' ? 'Equal parts' : 'Equal spaces'}</span>
            <span className="fq-mi-fake-step">−</span><b>{demo.parts}</b><span className={`fq-mi-fake-step ${demo.at === 'plus' ? 'is-tapped' : ''}`}>+</span>
          </div>
          {kind === 'builder' ? (
            <div className="fq-mi-demo-bar" role="img" aria-label={`A bar cut into ${demo.parts} equal parts, ${demo.count} shaded`}>
              {Array.from({ length: demo.parts }, (_, i) => (
                <span key={i} className={`${i < demo.count ? 'is-on' : ''} ${(demo.at === 'first' && i === 0) || (demo.at === 'last' && i === demo.count - 1) ? 'is-tapped' : ''}`} />
              ))}
            </div>
          ) : (
            <div className="fq-mi-demo-line" role="img" aria-label={`A number line from 0 to 1 cut into ${demo.parts} equal spaces, ${demo.count} jumps from 0`}>
              <span className="fq-mi-walked" style={{ width: `${(demo.count / demo.parts) * 100}%` }} />
              {Array.from({ length: demo.parts + 1 }, (_, i) => <i key={`${demo.parts}-${i}`} style={{ left: `${(i / demo.parts) * 100}%` }} />)}
              {Array.from({ length: demo.count }, (_, i) => <em key={i} style={{ left: `${(i / demo.parts) * 100}%`, width: `${100 / demo.parts}%` }} />)}
              <span className="fq-mi-frog" style={{ left: `${(demo.count / demo.parts) * 100}%` } as CSSProperties} />
              {/* Every mark is named: 0 and 1 at the ends, and 1/4, 2/4… at the jumps in between. */}
              {Array.from({ length: demo.parts + 1 }, (_, i) => <small key={`label-${demo.parts}-${i}`} style={{ left: `${(i / demo.parts) * 100}%` }}><TickLabel i={i} d={demo.parts} /></small>)}
            </div>
          )}
          <div className="fq-mi-readout">
            {demo.named && <Frac n={demo.count} d={demo.parts} />}
            <span>{kind === 'builder' ? (demo.parts > 1 ? `${demo.count} of ${demo.parts} parts` : 'one whole') : `${demo.count} ${demo.count === 1 ? 'jump' : 'jumps'} from 0`}</span>
          </div>
          <p key={shot} className="fq-mi-caption" aria-live="polite">{demo.caption}</p>
        </div>
        <ol className="fq-mi-dots" aria-label={`Shot ${shot + 1} of ${shots.length}`}>
          {shots.map((_, i) => <li key={i} className={i === shot ? 'is-on' : i < shot ? 'is-seen' : ''} />)}
        </ol>
        <div className="fq-mi-actions">
          <button type="button" className="fq-button ghost" onClick={play} disabled={playing} data-testid="button-intro-replay"><RotateCcw size={16} aria-hidden="true" /> {playing ? 'Playing…' : 'Replay'}</button>
          <button type="button" className="fq-button" onClick={() => { clearInterval(timer.current); onDone(); }} data-testid="button-intro-watched">{nextLabel} <ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <Skip onSkip={onSkip} />
    </section>
  );
}

/** Try: two guided tries with the builder's controls. The nudge says what to do next, never the answer's picture. */
export function IntroTry({ kind, kicker, nextLabel, onDone, onSkip, helper = false }: StepProps) {
  const text = INTRO_TEXT[kind];
  const tries = INTRO_TRIES[kind];
  const [tryIndex, setTryIndex] = useState(0);
  const [parts, setParts] = useState(1);
  // Parts shaded (bar) or the tick tapped (line; -1 until one is).
  const [count, setCount] = useState(kind === 'builder' ? 0 : -1);
  const sectionRef = useBroughtIntoView(helper);
  const target = tries[tryIndex];
  const hint = introHint(kind, target, parts, count);
  const changeParts = (by: number) => {
    const next = Math.max(1, Math.min(8, parts + by));
    if (next === parts) return;
    playHaptic('selection');
    setParts(next);
    setCount(kind === 'builder' ? Math.min(count, next) : -1);
  };
  return (
    <section ref={sectionRef} className={`fq-mi is-${kind}`} aria-labelledby={`intro-title-${kind}`} data-testid={`intro-${kind}`} data-step="try">
      <StepHead kind={kind} kicker={kicker} speech={`${text.build} ${target.word}. ${hint.text}`} />
      <div className="fq-mi-try">
        <div className="fq-mi-target">
          <Frac n={target.n} d={target.d} />
          <div><small>Try {tryIndex + 1} of 2</small><strong>{text.build} {target.word}</strong></div>
        </div>
        <div className="fq-mi-stepper" role="group" aria-labelledby={`intro-parts-${kind}`}>
          <span id={`intro-parts-${kind}`}>{kind === 'builder' ? 'Equal parts' : 'Equal spaces'}</span>
          <div>
            <button type="button" className={`fq-ll-step ${parts !== target.d ? 'is-hot' : ''}`} onClick={() => changeParts(-1)} disabled={parts <= 1} aria-label={kind === 'builder' ? 'Fewer equal parts' : 'Fewer equal spaces'} data-testid="button-intro-minus"><Minus size={16} /></button>
            <output aria-live="polite" data-testid="value-intro-parts">{parts}</output>
            <button type="button" className={`fq-ll-step ${parts !== target.d ? 'is-hot' : ''}`} onClick={() => changeParts(1)} disabled={parts >= 8} aria-label={kind === 'builder' ? 'More equal parts' : 'More equal spaces'} data-testid="button-intro-plus"><Plus size={16} /></button>
          </div>
        </div>
        {kind === 'builder' ? (
          <div className={`fq-mi-bar ${parts === target.d && !hint.done ? 'is-hot' : ''}`} role="group" aria-label="The whole bar: tap parts to shade them">
            {Array.from({ length: parts }, (_, i) => (
              <button key={i} type="button" className={i < count ? 'is-on' : ''} aria-pressed={i < count} aria-label={`Part ${i + 1} of ${parts}${i < count ? ', shaded' : ''}`}
                onClick={() => { playHaptic('selection'); setCount(count === i + 1 ? i : i + 1); }} data-testid={`intro-piece-${i}`} />
            ))}
          </div>
        ) : (
          <div className={`fq-mi-line ${parts === target.d && !hint.done ? 'is-hot' : ''}`} role="group" aria-label="Number line from 0 to 1: tap where you land">
            {Array.from({ length: parts + 1 }, (_, i) => (
              <button key={i} type="button" className={i === count ? 'is-on' : ''} style={{ left: `${(i / parts) * 100}%` }} aria-pressed={i === count}
                aria-label={i === 0 ? 'Zero' : i === parts ? 'One' : `${i} ${i === 1 ? 'jump' : 'jumps'} from 0`}
                onClick={() => { playHaptic('selection'); setCount(i); }} data-testid={`intro-tick-${i}`}>
                {/* Named for the spaces the child chose: 3 spaces read 1/3 and 2/3, so the labels follow their cuts. */}
                <i /><small><TickLabel i={i} d={parts} /></small>
              </button>
            ))}
          </div>
        )}
        <p className={`fq-mi-hint ${hint.done ? 'is-done' : ''}`} role="status" data-testid="status-intro-hint">{hint.text}</p>
        <button type="button" className="fq-button" disabled={!hint.done} data-testid="button-intro-next"
          onClick={() => {
            if (!hint.done) return;
            playHaptic('correct');
            if (tryIndex === 0) { setTryIndex(1); setParts(1); setCount(kind === 'builder' ? 0 : -1); } else onDone();
          }}>
          {tryIndex === 0 ? 'Next try' : nextLabel} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      <Skip onSkip={onSkip} />
    </section>
  );
}

/** A small bar with one part shaded, beside each fraction name. */
const MiniBar = ({ d, n = 1 }: { d: number; n?: number }) => (
  <span className="fq-mi-mini" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${d}, 1fr)` }}>
    {Array.from({ length: d }, (_, i) => <i key={i} className={i < n ? 'is-on' : ''} />)}
  </span>
);

/** Words, two pages: what a fraction is (1/4 means 1 of 4 equal parts), then the fraction names (1/3 is one third),
    before Try asks the child to build them. Nothing about fractions is assumed: page 1 explains the two numbers first. */
export function FractionWords({ kicker, nextLabel, onDone, onSkip }: { kicker: string; nextLabel: string; onDone: () => void; onSkip?: () => void }) {
  const [page, setPage] = useState<'what' | 'names'>('what');
  if (page === 'what') return (
    <section className="fq-mi fq-mi-words" aria-labelledby="what-is-a-fraction-title" data-testid="what-is-a-fraction" data-step="words">
      <header className="fq-mi-head">
        <div>
          <span className="fq-mi-kicker">{kicker} · page 1 of 2</span>
          <h3 id="what-is-a-fraction-title">{WHAT_IS_A_FRACTION.title}</h3>
        </div>
        <LearningListenButton text={whatIsAFractionSpeech().join(' ')} label="Listen to what a fraction is" />
      </header>
      <p className="fq-mi-rule">A <u>fraction</u> names part of a <u>whole</u>. The whole must be cut into <u>equal parts</u>.</p>
      <div className="fq-mi-what-bar">
        <span className="fq-mi-big-bar" role="img" aria-label="A bar cut into 4 equal parts, 1 shaded">{[0, 1, 2, 3].map((i) => <i key={i} className={i === 0 ? 'is-on' : ''} />)}</span>
        <small>{WHAT_IS_A_FRACTION.whole}</small>
      </div>
      <div className="fq-mi-what-numbers">
        <Frac n={1} d={4} />
        <dl>
          <div><dt>Top:</dt><dd>{WHAT_IS_A_FRACTION.top}</dd></div>
          <div><dt>Bottom:</dt><dd>{WHAT_IS_A_FRACTION.bottom}</dd></div>
        </dl>
      </div>
      <p className="fq-mi-rule">So <Frac n={1} d={4} /> means 1 of 4 equal parts. We say “one fourth”.</p>
      <button type="button" className="fq-button" onClick={() => setPage('names')} data-testid="button-what-next">Next: fraction names <ArrowRight size={16} aria-hidden="true" /></button>
      <Skip onSkip={onSkip} />
    </section>
  );
  return (
    <section className="fq-mi fq-mi-words" aria-labelledby="fraction-words-title" data-testid="fraction-words" data-step="words">
      <header className="fq-mi-head">
        <div>
          <span className="fq-mi-kicker">{kicker} · page 2 of 2</span>
          <h3 id="fraction-words-title">{FRACTION_WORDS.title}</h3>
        </div>
        <LearningListenButton text={fractionWordsSpeech().join(' ')} label="Listen to the fraction names" />
      </header>
      <p className="fq-mi-rule">The <u>bottom number</u> names the part. 2 parts are <u>halves</u>, 3 are <u>thirds</u>, 4 are <u>fourths</u>.</p>
      <ul className="fq-mi-word-rows">
        {FRACTION_WORDS.rows.map((row) => (
          <li key={row.d} data-testid={`fraction-word-${row.d}`}>
            <Frac n={1} d={row.d} />
            <span className="fq-mi-word">{row.word}{row.also && <small>{row.also}</small>}</span>
            <MiniBar d={row.d} />
            <LearningListenButton text={`${row.word}${row.also ? ', also called one quarter' : ''}.`} label={`Listen to ${row.word}`} compact />
          </li>
        ))}
      </ul>
      <p className="fq-mi-rule">More than one part: the <u>top number</u> counts them.{' '}
        {FRACTION_WORDS.examples.map((example, i) => <span key={example.word}>{i ? ' ' : ''}<Frac n={example.n} d={example.d} /> is {example.word}.</span>)}
      </p>
      <button type="button" className="fq-button" onClick={onDone} data-testid="button-words-next">{nextLabel} <ArrowRight size={16} aria-hidden="true" /></button>
      <Skip onSkip={onSkip} />
    </section>
  );
}

/** The first lesson to use a new part name (fifths, tenths…) opens with this card: the name, its stacked fraction and a bar. */
export function NewWords({ denominators }: { denominators: readonly number[] }) {
  return (
    <section className="fq-mi fq-mi-new-words" aria-labelledby="new-words-title" data-testid="new-words">
      <header className="fq-mi-head">
        <h3 id="new-words-title">{denominators.length > 1 ? 'New words' : 'New word'}</h3>
        <LearningListenButton text={denominators.map(newWordSpeech).join(' ')} label="Listen to the new words" />
      </header>
      <ul className="fq-mi-word-rows">
        {denominators.map((d) => (
          <li key={d} data-testid={`new-word-${d}`}>
            <Frac n={1} d={d} />
            <span className="fq-mi-word">one {PART_NAMES[d].one}<small>{d} equal parts are {PART_NAMES[d].many}</small></span>
            {d <= 12 ? <MiniBar d={d} /> : <span />}
            <LearningListenButton text={newWordSpeech(d)} label={`Listen to one ${PART_NAMES[d].one}`} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}

export const INTRO_KINDS: readonly IntroKind[] = ['builder', 'line'];

/** The intros a child still has to do: Watch for the unwatched ones, Try for every one not done. */
export function introsDue(seen: Partial<Record<IntroKind, IntroStage>> | undefined) {
  return { toWatch: INTRO_KINDS.filter((kind) => seen?.[kind] === undefined), toTry: INTRO_KINDS.filter((kind) => seen?.[kind] !== true) };
}

/** A child's first lesson, between Teach first and the first question: Watch, then Words (the fraction names), then
    Try, each its own screen, so the models and their names are known before anything is asked. Each finished step is saved (`onSeen`); the last Try goes on (`onDone`). */
export function IntroSteps({ title, lessonNumber, seen, wordsSeen, onSeen, onWordsSeen, onSkip, onDone, onExit }: {
  title: string; lessonNumber: number; seen: Partial<Record<IntroKind, IntroStage>> | undefined; wordsSeen: boolean;
  onSeen: (kind: IntroKind, stage: IntroStage) => void; onWordsSeen: () => void; onSkip: () => void; onDone: () => void; onExit: () => void;
}) {
  const { toWatch, toTry } = introsDue(seen);
  return (
    <div className="fq-app">
      <main className="fq-shell fq-teach-shell" data-testid="intro-steps">
        <TaskBar onBack={onExit} backLabel="Map" title={title} />
        <p className="fq-play-kicker">Lesson {String(lessonNumber).padStart(2, '0')} · Before you start</p>
        {toWatch.length > 0 ? (
          <IntroWatch key={`watch-${toWatch[0]}`} kind={toWatch[0]} kicker="Step 1 of 3 · Watch" onSkip={onSkip}
            nextLabel={toWatch.length > 1 ? 'Next: number line' : wordsSeen ? 'Next: Try' : 'Next: Words'} onDone={() => onSeen(toWatch[0], 'watched')} />
        ) : !wordsSeen ? (
          <FractionWords kicker="Step 2 of 3 · Words" onSkip={onSkip} nextLabel={toTry.length ? 'Next: Try' : 'Start the lesson'}
            onDone={() => { onWordsSeen(); if (!toTry.length) onDone(); }} />
        ) : toTry.length > 0 && (
          <IntroTry key={`try-${toTry[0]}`} kind={toTry[0]} kicker="Step 3 of 3 · Try" onSkip={onSkip}
            nextLabel={toTry.length > 1 ? 'Next: number line' : 'Start the lesson'}
            onDone={() => { onSeen(toTry[0], true); if (toTry.length === 1) onDone(); }} />
        )}
      </main>
    </div>
  );
}

/** Each lesson's Helper: a top-bar button that opens both intros to watch and try again. It never changes progress. */
export function useLessonHelper({ compact = false }: { /** An icon-only button, for a tight header. */ compact?: boolean } = {}): { button: ReactNode; panel: ReactNode; openWords: () => void } {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<{ kind: IntroKind; step: 'watch' | 'try' } | 'words' | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const close = () => { setOpen(false); setShown(null); };
  const button = (
    <button type="button" className={compact ? 'fq-icon-button fq-mi-helper-button' : 'fq-button ghost fq-mi-helper-button'} aria-expanded={open} aria-label="Helper: how to build and number lines" onClick={() => {
      if (open) { close(); return; }
      setOpen(true);
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    }} data-testid="button-lesson-helper">
      <LifeBuoy size={compact ? 20 : 17} aria-hidden="true" />{!compact && <span className="fq-hide-narrow">Helper</span>}
    </button>
  );
  const panel = open ? (
    <section className="fq-mi-helper" ref={panelRef} aria-labelledby="lesson-helper-title" data-testid="lesson-helper">
      <div className="fq-mi-helper-head">
        <h2 id="lesson-helper-title">Helper</h2>
        <button type="button" className="fq-button ghost" onClick={close} data-testid="button-lesson-helper-close">Close</button>
      </div>
      {shown === 'words' ? <FractionWords kicker="Words" nextLabel="Done" onDone={() => setShown(null)} />
        : shown ? (shown.step === 'watch'
        ? <IntroWatch key={`${shown.kind}-watch`} kind={shown.kind} kicker="Watch" nextLabel="Done" helper onDone={() => setShown(null)} />
        : <IntroTry key={`${shown.kind}-try`} kind={shown.kind} kicker="Try" nextLabel="Done" helper onDone={() => setShown(null)} />) : (
        <div className="fq-mi-helper-picks">
          <div className="fq-listen-row"><p>{HELPER_PICK_SPEECH[0]}</p><LearningListenButton text={HELPER_PICK_SPEECH.join(' ')} label="Listen to the Helper" compact /></div>
          {(['builder', 'line'] as const).map((kind) => (
            <div key={kind} className="fq-mi-helper-pick">
              <strong>{INTRO_TEXT[kind].title}</strong><span>{HELPER_PICKS[kind]}</span>
              <div className="fq-mi-helper-pick-buttons">
                <button type="button" className="fq-button secondary" onClick={() => setShown({ kind, step: 'watch' })} data-testid={`button-helper-${kind}`}>Watch</button>
                <button type="button" className="fq-button secondary" onClick={() => setShown({ kind, step: 'try' })} data-testid={`button-helper-${kind}-try`}>Try</button>
              </div>
            </div>
          ))}
          <div className="fq-mi-helper-pick">
            <strong>{FRACTION_WORDS.title}</strong><span>{HELPER_PICKS.words}</span>
            <div className="fq-mi-helper-pick-buttons">
              <button type="button" className="fq-button secondary" onClick={() => setShown('words')} data-testid="button-helper-words">Open</button>
            </div>
          </div>
        </div>
      )}
    </section>
  ) : null;
  /** Open the Helper straight on the fraction words (from a hint, where the Helper button isn't shown). */
  const openWords = () => {
    setOpen(true);
    setShown('words');
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };
  return { button, panel, openWords };
}
