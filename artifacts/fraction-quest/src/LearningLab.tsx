import { type CSSProperties, Fragment, type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { playHaptic, recordIntro, type IntroKind, type IntroStage } from './lib/fun';
import { useOptionalFun } from './fun-ui';
import { storyLessonTitle } from './story';
import { IntroTry, IntroWatch, NewWords, useLessonHelper } from './model-intro';
import { newWordsFor } from './new-words';
import { LearningListenButton, LearningText, spokenLearningText, useReadAloud } from './LearningText';
import { BUILD_ERROR_HEADINGS, BUILD_SLIPS as M, LAB_SECTION_SPEECH, PART_CHECK_OPENERS, buildErrors, buildHints, worksheetSpeech } from './lab-copy';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, CircleHelp, Lightbulb, Minus, Plus, RotateCcw, Star } from 'lucide-react';
import { getMission, numberLineWholeCount, type Progress } from './game';
import { answerIsWholes, answerMatches, getBuildCheckStage, getBuildPracticeChecks, getModelFeedback, getReasonFeedback, getReviewCheck, getWorksheet, isYesNoProblem, type BuildCheck, type LearningModel, type WorksheetProblem, yesNoPrompt } from './learning-content';
import {
  checkRedoRow, checkLessonWorksheet, checkWorksheet, editWorksheet, emptyLearningRecord, finishRedo, getLearningRecord, hasLearningGate, redoChecks, redoDone, redoWorksheet, requiredBuildChecks,
  redoWorksheetCount, startRedo, targetedPracticeCount, targetedPracticePlans, updateLearning, worksheetProblemProgress, type LearningRecord, type RedoAttempt, type RedoPart,
} from './learning';
import { denomColor } from './fun-ui';
import { BarSvg, MODEL_CONCEPTS, ModelTag, WholeBracket } from './models';
import { canEnterWorksheetAnswer, WorksheetBarCopy } from './WorksheetBarCopy';
import { AreaShade, AreaSvg } from './AreaModel';
import { PrintMenu, PrintModel } from './Printables';
import { amountsIn } from './auto-picture';
import { YesNoCards } from './YesNoCards';
import { worksheetFeedbackSpeech, worksheetWhy, worksheetWrongReason } from './wrong-answer';
import { LessonTeachingSupport } from './LessonTeachingSupport';
import './learning-lab.css';
import { TaskBar } from './TaskBar';
import { LiveFraction, TickLabel } from './fraction-ui';
import { MathText } from './MathText';
import { AnswerTiles } from './AnswerTiles';
import { answerShape } from './answer-shape';
import { useRevealWhen } from './lib/reveal';

/* A step button's name is its own text (the number or tick, then the step), so voice control can say what it sees
   ("click 1 Watch"); this hidden note says what it does. */
const GO_TO_STEP = <span className="fq-sr">, go to this step</span>;
const GO_BACK_TO_STEP = <span className="fq-sr">, go back to this step</span>;

const WORKSHEET_ROUND = 4;

type Kind = LearningModel['kind'];
type St = { d: number; wholes: number; count: number };
const blank = (): St => ({ d: 0, wholes: 1, count: 0 });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)));


/** Label a worksheet bar only when the prompt writes that exact fraction. "Write 1 1/3 as a single fraction" draws
    4/3, which is the answer, so it stays unlabelled until the row is right; so does a bar that is the answer itself. */
function namesItsBar(p: WorksheetProblem): boolean {
  if (!p.model) return false;
  if (p.answer.trim() === `${p.model.n}/${p.model.d}`) return false;
  return new RegExp(`(?<![\\d/])(?<!\\d )${p.model.n}\\s*/\\s*${p.model.d}(?![\\d/])`).test(p.prompt)
    && amountsIn(p.prompt).some((a) => a.numerator === p.model!.n && a.denominator === p.model!.d);
}

function SectionListenHeader({ children, text, label, className = '', testId }: {
  children: ReactNode;
  text: string;
  label: string;
  className?: string;
  testId?: string;
}) {
  return (
    <header className={`fq-ll-section-header ${className}`.trim()} data-testid={testId}>
      {children}
      <LearningListenButton text={text} label={label} />
    </header>
  );
}

const buildStepName = (check: BuildCheck, index: number) => check.stepLabel?.replace(/^Step \d+ · /, '') ?? (index === 0 ? 'Build it' : 'On your own');

const validate = (kind: Kind, t: LearningModel, s: St) => buildErrors(kind, t, s);


/* Read-only preview for worksheet visuals */
function Preview({ m, named = false, wholeMarks = true }: { m: LearningModel; named?: boolean; wholeMarks?: boolean }) {
  return (
    <div className="fq-ll-preview-wrap"><ModelTag kind={m.kind} />
    {m.kind === 'bar' ? (
      <div className="fq-ll-preview-svg">
        <BarSvg n={m.n} d={m.d} wholes={m.wholes} sizes={m.sizes} fraction={named && m.n > 0} bracket={wholeMarks} label={m.sizes ? `A bar cut into ${m.sizes.length} pieces` : m.n ? `${m.d} equal parts per whole, ${m.n} ${m.n === 1 ? 'part' : 'parts'} shaded` : `A bar cut into ${m.d} parts`} />
      </div>
    ) : <div className={'fq-ll-preview' + (m.kind === 'line' ? ' fq-ll-preview-line' : '')} style={{ '--piece': denomColor(m.d) } as CSSProperties} role="img" aria-label={m.kind === 'set' ? `${m.n} of ${m.d} groups selected from ${m.total} objects` : `${m.d} equal parts per whole, marked after ${m.n} parts`}>
      {m.kind === 'line' ? (
        <div className="fq-ll-pline">{Array.from({ length: m.d * m.wholes + 1 }, (_, i) => <i key={i} className={i === m.n ? 'on' : ''} style={{ left: `${(i / (m.d * m.wholes)) * 100}%` }}>{i % m.d === 0 && <span>{i / m.d}</span>}</i>)}</div>
      ) : (
        m.kind === 'set' ? <div className="fq-ll-groups">{Array.from({ length: m.d }, (_, g) => <div className={`fq-ll-group ${g < m.n ? 'on' : ''}`} key={g}>
          {Array.from({ length: (m.total ?? 0) / m.d }, (_, i) => <i key={i} />)}
        </div>)}</div> :
        <div className="fq-ll-preview-bars">
          {Array.from({ length: m.wholes }, (_, w) => (
            <div className="fq-ll-preview-whole" key={w}>
              <div className="fq-ll-pcells" style={{ gridTemplateColumns: `repeat(${gridColumns(m.d)}, minmax(0,1fr))` }}>
                {Array.from({ length: m.d }, (_, i) => <i key={i} className={w * m.d + i < m.n ? 'on' : ''} />)}
              </div>
              {wholeMarks && <WholeBracket />}
            </div>
          ))}
        </div>
      )}
    </div>}
    </div>
  );
}
function gridColumns(d: number): number {
  if (d <= 12) return d;
  for (let columns = 10; columns >= 2; columns--) if (d % columns === 0) return columns;
  return d;
}

function rulerLabel(tick: number, denominator: number): string {
  const whole = Math.floor(tick / denominator); const part = tick % denominator;
  return whole && part ? `${whole} ${part}/${denominator}` : whole ? String(whole) : part ? `${part}/${denominator}` : '0';
}

/** `checkIn` (no hints): any tick opens the answer box and the status stays neutral; correctness is reported separately. */
export function RulerInteraction({ task, onReady, disabled, checkIn = false }: {
  task: NonNullable<WorksheetProblem['rulerTask']>; onReady: (ready: boolean, correct?: boolean) => void; disabled: boolean; checkIn?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const ticks = task.denominator * task.wholes;
  useEffect(() => { onReady(checkIn ? selected !== null : selected === task.end, selected === task.end); }, [onReady, selected, task.end, checkIn]);
  return (
    <div className="fq-ll-custom-model" data-testid="ruler-model">
      <p>Line up the blue strip with zero. Tap the tick at its end.</p>
      <div className="fq-ruler-track" role="group" aria-label={`Ruler divided into ${task.denominator} equal spaces per inch`}>
        <span className="fq-ruler-strip" style={{ width: `${(task.end / ticks) * 100}%` }} />
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <button type="button" key={i} className={`fq-ruler-tick ${selected === i ? 'selected' : ''} ${i % task.denominator === 0 ? 'inch' : ''}`}
            style={{ left: `${(i / ticks) * 100}%` }} aria-pressed={selected === i} disabled={disabled}
             aria-label={`Mark ${rulerLabel(i, task.denominator)} inches`} onClick={() => {
               if (disabled || selected === i) return;
               playHaptic('selection');
               setSelected(i);
             }}>
            <i />{i % task.denominator === 0 && <span>{i / task.denominator}</span>}
          </button>
        ))}
      </div>
      <p className="fq-ll-custom-status" role="status" aria-live="polite">
        {checkIn ? (selected === null ? 'Use the tick marks to measure the strip.' : 'Tick marked. Now enter the length.')
          : selected === task.end ? 'Right at the endpoint. Now enter the length.' : selected === null ? 'Use the tick marks to measure the strip.' : 'That tick does not match the strip end. Try another.'}
      </p>
    </div>
  );
}

export function LinePlotInteraction({ task, onReady, disabled, checkIn = false }: {
  task: NonNullable<WorksheetProblem['linePlotTask']>; onReady: (ready: boolean, correct?: boolean) => void; disabled: boolean; checkIn?: boolean;
}) {
  const tickCount = task.denominator * task.wholes;
  const expected = Array.from({ length: tickCount + 1 }, (_, tick) => task.values.filter(value => value === tick).length);
  const [marks, setMarks] = useState<number[]>(() => Array(tickCount + 1).fill(0));
  const complete = marks.every((count, i) => count === expected[i]);
  const placed = marks.reduce((sum, count) => sum + count, 0);
  useEffect(() => { onReady(checkIn ? placed > 0 : complete, complete); }, [complete, placed, checkIn, onReady]);
  return (
    <div className="fq-ll-custom-model fq-lineplot" data-testid="line-plot-model">
      <p>Tap the tick for each measurement to stack its X. Tap again to remove an X.</p>
      {/* One column per tick, so a phone keeps the whole line on one row (very long lines still scroll). */}
      <div className="fq-lineplot-grid" role="group" aria-label={`Line plot with ${task.denominator} equal spaces per whole`}
        style={tickCount < 12 ? { gridTemplateColumns: `repeat(${tickCount + 1}, minmax(0, 1fr))` } : undefined}>
        {Array.from({ length: tickCount + 1 }, (_, i) => (
          <button type="button" key={i} className="fq-lineplot-tick" aria-label={`${rulerLabel(i, task.denominator)}, ${marks[i]} X marks. Add or remove one.`}
            aria-pressed={checkIn ? marks[i] > 0 : marks[i] === expected[i]} disabled={disabled}
             onClick={() => {
               const limit = checkIn ? task.values.length : expected[i];
               if (disabled || limit === 0) return;
               playHaptic('selection');
               setMarks(current => current.map((count, index) => index === i ? (count >= limit ? 0 : count + 1) : count));
             }}>
            <span className="fq-lineplot-xs" aria-hidden="true">{Array.from({ length: marks[i] }, (_, j) => <b key={j}>×</b>)}</span>
            <i />
            <small><MathText text={rulerLabel(i, task.denominator)} /></small>
          </button>
        ))}
      </div>
      <p className="fq-ll-custom-status" role="status" aria-live="polite">{checkIn ? `${placed} X ${placed === 1 ? 'mark' : 'marks'} placed.` : complete ? 'Your plot matches the measurements. Now answer.' : 'Keep adding X marks until every measurement is plotted.'}</p>
    </div>
  );
}

export function ScaleInteraction({ task, onReady, disabled, id }: {
  task: NonNullable<WorksheetProblem['scaleTask']>; onReady: (ready: boolean) => void; disabled: boolean; id: string;
}) {
  // The slider moves in steps of the fraction's own parts (fourths for 3/4), from 0 to 2 wholes, and says where it is
  // as a fraction: lesson 59 comes long before percents (lesson 75), so nothing here is written as a percent.
  const parts = task.denominator;
  const [steps, setSteps] = useState(parts);
  const complete = steps * task.denominator === task.numerator * parts;
  useEffect(() => { onReady(complete); }, [complete, onReady]);
  const factor = `${steps}/${parts}`;
  return (
    <div className="fq-ll-custom-model fq-scale-model" data-testid="scale-model">
      <label htmlFor={`scale-factor-slider-${id}`}>Move the slider to <strong><MathText text={`${task.numerator}/${task.denominator}`} /></strong> of the whole.</label>
      <input id={`scale-factor-slider-${id}`} type="range" min="0" max={2 * parts} step="1" value={steps} disabled={disabled}
        aria-valuetext={`${steps} over ${parts} of ${task.whole}`} onChange={event => setSteps(Number(event.target.value))} />
      <div className="fq-scale-compare" aria-label={`The whole is ${task.whole}; the slider shows ${steps} over ${parts} of it`}>
        <div><b>Whole: {task.whole}</b><span className="fq-scale-whole" /></div>
        <div><b><MathText text={factor} /> × {task.whole}</b><span className="fq-scale-track"><i style={{ width: `${(steps / (2 * parts)) * 100}%` }} /></span></div>
        <small>Times 1 keeps the same amount. Less than 1 makes less; more than 1 makes more.</small>
      </div>
      <p className="fq-ll-custom-status" role="status" aria-live="polite">{complete ? 'The slider shows the factor. Now compare the new amount with the whole.' : 'Move the slider to the fraction named above.'}</p>
    </div>
  );
}

/** A number set with buttons only (no typing): − and +, plus −10 and +10 when the number can get big. */
function Stepper({ label, value, min, max, onSet, id, hint }: { label: string; value: number; min: number; max: number; onSet: (v: number) => void; id: string; hint?: string }) {
  const big = max > 20;
  const step = (by: number) => {
    const next = clamp(value + by, min, max);
    if (next === value) return;
    playHaptic('selection');
    onSet(next);
  };
  return (
    <div className="fq-ll-stepper" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="fq-ll-stepper-label">{label}</span>
      <div>
        {big && <button type="button" className="fq-ll-step wide" aria-label={`Take 10 from ${label}`} onClick={() => step(-10)} disabled={value <= min} data-testid={`button-${id}-minus10`}>−10</button>}
        <button type="button" className="fq-ll-step" aria-label={`Decrease ${label}`} onClick={() => step(-1)} disabled={value <= min} data-testid={`button-${id}-minus`}><Minus size={16} /></button>
        <output className="fq-ll-step-value" aria-live="polite" data-testid={'value-' + id}>{value === 0 && min === 0 ? '?' : value}</output>
        <button type="button" className="fq-ll-step" aria-label={`Increase ${label}`} onClick={() => step(1)} disabled={value >= max} data-testid={`button-${id}-plus`}><Plus size={16} /></button>
        {big && <button type="button" className="fq-ll-step wide" aria-label={`Add 10 to ${label}`} onClick={() => step(10)} disabled={value >= max} data-testid={`button-${id}-plus10`}>+10</button>}
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Builder({ kind, total, st, set, id, title, lineWholes = 1, need = 0, inPart = false }: { kind: Kind; total?: number; st: St; set: (s: St) => void; id: string; title: string; lineWholes?: number; need?: number;
  /** Inside a build Part card, which names the step: no tag or title of its own, and no box around it. */
  inPart?: boolean }) {
  // Lines usually stop at 12 spaces, but a hundredths target (like 25/100) must still be possible.
  const maxD = kind === 'line' ? Math.max(12, need) : kind === 'set' ? Math.min(total ?? 24, 24) : 100;
  const wholes = kind === 'line' ? lineWholes : st.wholes;
  const pieces = kind === 'set' ? st.d : st.d * wholes;
  const setCount = (c: number) => set({ ...st, count: clamp(c, 0, pieces) });
  const toggle = (i: number) => {
    const count = st.count === i + 1 ? i : i + 1;
    if (count === st.count) return;
    playHaptic('selection');
    setCount(count);
  };
  const per = kind === 'set' && st.d && total ? total / st.d : 0;
  const wrap = st.d > 12;
  return (
    <section className={`fq-ll-builder kind-${kind}${inPart ? ' is-in-part' : ''}`} aria-label={spokenLearningText(title)} data-testid={'model-' + id}>
      {inPart ? <p className="fq-ll-model-how">{MODEL_CONCEPTS[kind]}</p> : <header className="fq-ll-model-head">
        <ModelTag kind={kind} />
        <h4><LearningText text={title} interactiveTerms={false} /></h4>
        <p>{MODEL_CONCEPTS[kind]}</p>
      </header>}
      <div className="fq-ll-controls">
        <Stepper id={id + '-d'} label={kind === 'set' ? 'Equal groups' : kind === 'line' ? 'Total equal spaces in one whole' : 'Total equal parts in one whole'} value={st.d} min={0} max={maxD}
          onSet={v => set({ ...st, d: v, count: Math.min(st.count, kind === 'set' ? v : v * wholes) })} hint={kind === 'set' ? total + ' dots in all' : undefined} />
        {/* Extra whole bars are only offered when the target is bigger than 1 (e.g. 7/4); otherwise one bar is always right. */}
        {kind === 'bar' && lineWholes > 1 && <Stepper id={id + '-wholes'} label="Whole bars" value={st.wholes} min={1} max={3}
          onSet={v => set({ ...st, wholes: v, count: Math.min(st.count, st.d * v) })} />}
        <Stepper id={id + '-count'} label={kind === 'line' ? 'Jumps from 0' : kind === 'set' ? 'Groups selected' : 'Pieces shaded'} value={st.count} min={0} max={Math.max(pieces, 0)} onSet={setCount} />
      </div>
      <div className="fq-ll-stage" style={{ '--piece': denomColor(st.d) } as CSSProperties}>
        {kind === 'line' && <p className="fq-ll-line-guide" data-testid={'text-line-guide-' + id}>{wholes === 1 ? 'The line goes from 0 to 1. Each space is one jump.' : `The line goes from 0 to ${wholes}. Each whole gets the same spaces.`}</p>}
        {st.d === 0 ? <p className="fq-ll-empty">Pick how many equal parts to start.</p> :
          kind === 'bar' ? (
            <div className="fq-ll-bar-models">
              {Array.from({ length: st.wholes }, (_, w) => (
                <div className="fq-ll-whole-wrap" key={w}>
                  <div className={'fq-ll-bar ' + (wrap ? 'wrap' : '')} style={{ gridTemplateColumns: 'repeat(' + gridColumns(st.d) + ', minmax(0,1fr))' }} role="group" aria-label={'Whole ' + (w + 1) + ', split into ' + st.d + ' equal parts'}>
                    {Array.from({ length: st.d }, (_, p) => {
                      const i = w * st.d + p;
                      return <button key={p} type="button" className={'fq-ll-piece ' + (i < st.count ? 'on' : '')} aria-pressed={i < st.count} aria-label={'Part ' + (p + 1) + ' of ' + st.d + ' equal parts' + (i < st.count ? ', shaded' : ', not shaded')} onClick={() => toggle(i)} data-testid={'piece-' + id + '-' + i} />;
                    })}
                  </div>
                  <WholeBracket />
                </div>
              ))}
            </div>
          ) : kind === 'set' ? (
            <div className="fq-ll-groups">
              {Array.from({ length: st.d }, (_, g) => (
                <button key={g} type="button" className={'fq-ll-group ' + (g < st.count ? 'on' : '')} aria-pressed={g < st.count} aria-label={'Group ' + (g + 1) + ' of ' + st.d} onClick={() => toggle(g)} data-testid={'group-' + id + '-' + g}>
                  {per > 0 && Number.isInteger(per) ? Array.from({ length: per }, (_, k) => <i key={k} />) : <span>Unequal grouping</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="fq-ll-line" style={{ minWidth: Math.min(st.d * wholes * 30, 900) }} role="group" aria-label={'Number line from 0 to ' + wholes}>
              <div className="fq-ll-track"><b style={{ width: ((st.count / (st.d * wholes)) * 100) + '%' }} /></div>
              {Array.from({ length: st.d * wholes + 1 }, (_, i) => (
                <button key={i} type="button" className={'fq-ll-tick ' + (i === st.count ? 'on ' : '') + (i % st.d === 0 ? 'whole' : '')} style={{ left: ((i / (st.d * wholes)) * 100) + '%' }}
                  aria-label={i % st.d === 0 ? (i / st.d) + ': tick ' + i + ' of ' + (st.d * wholes) + ' equal spaces' : undefined} aria-pressed={i === st.count} onClick={() => setCount(i)} data-testid={'tick-' + id + '-' + i}>
                  {/* A tick that shows a fraction has no aria-label: its name is built from the fraction, so it holds the words and numbers a child sees. */}
                  {i % st.d !== 0 && <span className="fq-sr">Tick {i} of {st.d * wholes} equal spaces, </span>}
                  <TickLabel i={i} d={st.d} />
                </button>
              ))}
            </div>
          )}
      </div>
      <LiveFraction n={st.count} d={st.d} unit={kind} wholes={wholes} color={denomColor(st.d)} testId={'text-' + id + '-readout'} />
    </section>
  );
}

type Outcome = { supported: boolean; attempts: number };
/** One part of a build (build it, show it the other way, say why): its own card with a number, a title and, once
    right, a green check line inside. A part not reached yet shows greyed, so the child sees what comes next. */
function BuildPart({ n, title, state, testId, children }: { n: 1 | 2 | 3; title: ReactNode; state: 'open' | 'done' | 'locked'; testId: string; children: ReactNode }) {
  return (
    <section className={`fq-ll-part is-${state}`} aria-labelledby={`${testId}-title`} data-testid={testId} data-state={state}>
      <header className="fq-ll-part-head">
        <span className="fq-ll-part-num" aria-hidden="true">{state === 'done' ? <Check size={17} /> : n}</span>
        <div><small>Part {n} of 3</small><h4 id={`${testId}-title`}>{title}</h4></div>
      </header>
      {children}
    </section>
  );
}

/** "Your bar is right." and the model feedback, inside its Part card, with Listen. */
function PartCheck({ kind, feedback, testId }: { kind: Kind; feedback: string; testId: string }) {
  const text = `${PART_CHECK_OPENERS[kind]} ${feedback}`;
  return (
    <div className="fq-ll-model-status success" role="status" data-testid={testId}>
      <Check size={18} />
      <span className="fq-ll-model-status-copy"><LearningText text={text} /></span>
      <LearningListenButton text={text} label="Listen to the check" />
    </div>
  );
}

function CheckRunner({ check, onHelp, onPass, review, headingRef, onWrong, onSuccess, onNext, nextLabel, initiallyPassed = false }: {
  check: BuildCheck; review: boolean;
  /** The number line intro, while it is still to watch: it takes the place of the first number line builder. */
  initiallyPassed?: boolean;
  /** After it passes, the check stays on screen with its explanation until the child presses Next. */
  onNext?: () => void; nextLabel?: string;
  onHelp: (kind: 'hint' | 'error', keys: string[]) => void; onPass: (o: Outcome) => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onWrong?: () => void; onSuccess?: () => void;
}) {
  const t = check.target; const k = t.kind; const lineWholes = numberLineWholeCount(t.n, t.d);
  const tk: Kind = k === 'line' ? 'bar' : 'line';
  const [a, setA] = useState<St>(blank()); const [b, setB] = useState<St>(blank());
  const [reason, setReason] = useState<number | null>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const [failedSig, setFailedSig] = useState<string | null>(null);
  const [hints, setHints] = useState(0); const [supported, setSupported] = useState(false); const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(initiallyPassed);
  const passedActionsRef = useRef<HTMLDivElement>(null);
  useRevealWhen(passedActionsRef, done);
  const [restoredPassed] = useState(initiallyPassed);
  const secondTarget: LearningModel = { ...t, kind: tk, total: undefined, wholes: Math.max(1, Math.ceil(t.n / t.d)) };
  const primaryValidation = validate(k, t, a);
  const secondaryValidation = validate(tk, secondTarget, b);
  const primaryReady = primaryValidation.msgs.length === 0;
  const secondaryReady = primaryReady && secondaryValidation.msgs.length === 0;
  const stage = getBuildCheckStage(primaryReady, secondaryReady);
  const sig = JSON.stringify([a, b, reason]);
  const locked = failedSig === sig;
  // Part 2 names the amount the child just built (shown stacked), so "show it" is never a guess.
  const amount = `${t.n}/${t.d}`;
  const transLabel = tk === 'line' ? `Show ${amount} on a number line` : `Show ${amount} with a bar`;
  const hintTexts = buildHints(t, k);

  // Once a build passes, it stays as built: editing it used to hide Next, and a later wrong check undid the pass.
  const updatePrimary = (next: St) => {
    if (done || JSON.stringify(next) === JSON.stringify(a)) return;
    setA(next); setB(blank()); setReason(null); setErrs([]); setFailedSig(null); setDone(false);
  };
  const updateSecondary = (next: St) => {
    if (done) return;
    setB(next); setReason(null); setErrs([]); setFailedSig(null); setDone(false);
  };

  const submit = () => {
    if (locked || done || stage !== 'reason' || reason === null) return;
    const r1 = validate(k, t, a);
    const r2 = validate(tk, secondTarget, b);
    const keys = [...r1.keys, ...r2.keys.map(() => M.trans)];
    const msgs = [...r1.msgs, ...r2.msgs];
    const reasonFeedback = getReasonFeedback(check, reason, msgs.length === 0);
    if (reasonFeedback) {
      msgs.push(reasonFeedback.message);
      if (!reasonFeedback.correct) keys.push(M.reason);
    }
    if (msgs.length) {
      playHaptic('retry');
      setErrs(msgs); setFailedSig(sig); setSupported(true); setAttempts(n => n + 1); onHelp('error', Array.from(new Set(keys))); onWrong?.();
    } else {
      playHaptic('correct');
      setErrs([]); setDone(true); onSuccess?.(); onPass({ supported, attempts: attempts + 1 });
    }
  };
  const hint = () => { setHints(h => h + 1); setSupported(true); onHelp('hint', []); };
  const currentHint = hintTexts[Math.min(hints, 2) - 1];
  const primaryFeedback = getModelFeedback(t, k);
  const secondaryFeedback = getModelFeedback(t, tk);
  const errorHeading = BUILD_ERROR_HEADINGS[locked ? 0 : 1];
  const errorSpeechText = `${errorHeading} ${errs.join(' ')}`;
  // After a wrong check, what to fix is read aloud (with sound on), as in the game's questions.
  const sound = useOptionalFun()?.fun.sound ?? false;
  useReadAloud(sound && errs.length > 0 ? errorSpeechText : null, errs.length > 0 ? `${check.id}:${attempts}` : null);

  return (
    <div className="fq-ll-check" data-testid={`check-${check.id}`}>
      <p className="fq-ll-kicker">{review ? 'Review' : check.stepLabel ?? (check.transfer ? 'Step 2 · On your own' : 'Step 1 · Build it')}</p>
       {/* The question is a "Your task" card at the top of the check. */}
       <SectionListenHeader text={check.prompt} label="Listen to the question" className="fq-ll-check-heading fq-task-card" testId={`task-${check.id}`}>
         <span className="fq-task-label">Your task</span>
         <h3 ref={headingRef} tabIndex={-1}><LearningText text={check.prompt} /></h3>
       </SectionListenHeader>
        {!restoredPassed && <>
          <BuildPart n={1} state={primaryReady ? 'done' : 'open'} testId={`part-${check.id}-1`}
            title={k === 'set' ? 'Build it as equal groups' : k === 'line' ? 'Build it on a number line' : 'Build it with a bar'}>
            <Builder inPart kind={k} total={t.total} st={a} set={updatePrimary} id={`${check.id}-a`} title={`Build it ${k === 'set' ? 'as a set of equal groups' : k === 'line' ? 'on a number line' : 'with a bar model'}`} lineWholes={lineWholes} need={t.d} />
            {!primaryReady && a.d > 0 && primaryValidation.msgs[0] && <p className="fq-ll-model-status retry" role="status" data-testid={`status-primary-${check.id}`}>{primaryValidation.msgs[0]}</p>}
            {primaryReady && <PartCheck kind={k} feedback={primaryFeedback} testId={`status-primary-${check.id}`} />}
          </BuildPart>
          <BuildPart n={2} state={stage === 'primary' ? 'locked' : secondaryReady ? 'done' : 'open'} testId={`part-${check.id}-2`}
            title={<LearningText text={transLabel} interactiveTerms={false} />}>
            {stage === 'primary' ? <p className="fq-ll-part-locked">Opens when your {k === 'line' ? 'number line' : k === 'bar' ? 'bar' : 'model'} is right.</p> : <>
              <p className="fq-ll-part-lead"><LearningText text={`Your first model shows ${amount}. Show the same amount ${tk === 'line' ? 'on the number line' : 'with the bar'}.`} interactiveTerms={false} /></p>
              <Builder inPart kind={tk} st={b} set={updateSecondary} id={`${check.id}-b`} title={`Show ${amount} ${tk === 'line' ? 'on a number line' : 'with a bar model'}`} lineWholes={lineWholes} need={t.d} />
              {!secondaryReady && b.d > 0 && secondaryValidation.msgs[0] && <p className="fq-ll-model-status retry" role="status" data-testid={`status-secondary-${check.id}`}>{secondaryValidation.msgs[0]}</p>}
              {secondaryReady && <PartCheck kind={tk} feedback={secondaryFeedback} testId={`status-secondary-${check.id}`} />}
            </>}
          </BuildPart>
          <BuildPart n={3} state={stage !== 'reason' ? 'locked' : done ? 'done' : 'open'} testId={`part-${check.id}-3`} title="Why do they match?">
            {stage !== 'reason' ? <p className="fq-ll-part-locked">Opens when both models are right.</p> : (
              <fieldset className="fq-ll-reasons" data-testid={`reasons-${check.id}`}>
                <legend className="fq-ll-sr-only">Both models match. Which idea explains why?</legend>
                {check.reasons.map((r, i) => (
                  <label key={i} className={reason === i ? 'on' : ''}>
                    <input type="radio" name={`reason-${check.id}`} checked={reason === i} disabled={done} onChange={() => {
                      if (done) return;
                      if (reason !== i) playHaptic('selection');
                      setReason(i); setErrs([]); setFailedSig(null);
                    }} data-testid={`radio-reason-${check.id}-${i}`} />
                    <span><LearningText text={r} interactiveTerms={false} /></span>
                  </label>
                ))}
              </fieldset>
            )}
          </BuildPart>
           {hints > 0 && <div className="fq-ll-hint" data-testid={`text-hint-${check.id}`}>
             <SectionListenHeader text={currentHint} label="Listen to the hint"><strong>Hint</strong></SectionListenHeader>
             <LearningText text={currentHint} />
           </div>}
          {errs.length > 0 && (
            <div className="fq-ll-feedback retry" role="alert" data-testid={`status-errors-${check.id}`}>
              <CircleHelp size={20} />
               <div className="fq-ll-feedback-copy">
                 <SectionListenHeader text={errorSpeechText} label="Listen to all feedback"><strong>{errorHeading}</strong></SectionListenHeader>
                 <ul>{errs.map((e, i) => <li key={i}><LearningText text={e} /></li>)}</ul>
              </div>
            </div>
          )}
        </>}
         {done && <div className="fq-ll-feedback ok" role="status" data-testid={`status-pass-${check.id}`}>
           <Check size={20} />
           <div className="fq-ll-feedback-copy">
             <strong>Correct! Both models use equal parts and show the same number of parts—shaded, marked, or selected.</strong>
             <details className="fq-ll-full-explanation">
               <summary>Read the full explanation</summary>
               <SectionListenHeader text={check.explanation} label="Listen to the explanation"><strong>Explanation</strong></SectionListenHeader>
               <LearningText text={check.explanation} />
             </details>
           </div>
         </div>}
      {/* Next sits right under "Correct!", so it is on screen on a phone. */}
      {done ? (
        <>
        <div ref={passedActionsRef} className="fq-ll-actions fq-ll-actions-complete">
          <span className="fq-ll-check-passed" aria-hidden="true"><Check size={17} /> Passed</span>
          {onNext && <button type="button" className="fq-button fq-ll-finish" data-testid={`button-next-${check.id}`} onClick={onNext}>{nextLabel ?? 'Next'} <ArrowRight size={17} /></button>}
          {!onNext && review && <button type="button" className="fq-button secondary fq-ll-finish" data-testid="button-review-finish" onClick={() => onPass({ supported, attempts: -1 })}>Finish review</button>}
        </div>
        </>
      ) : (
        <div className="fq-ll-actions">
          <button type="button" className="fq-hint-button" onClick={hint} data-testid={`button-hint-${check.id}`}><Lightbulb size={17} /> {hints ? 'Another hint' : 'Hint'}</button>
          {stage === 'reason' && <button type="button" className="fq-button" onClick={submit} disabled={locked || reason === null} data-testid={`button-check-${check.id}`}>Check <Check size={17} /></button>}
        </div>
      )}
    </div>
  );
}

export function Row({ p, rec, onEdit, onCheck, onHint, onNewQuestion, numberLabel, sequenceLabel, onWrong, onSuccess }: {
  p: WorksheetProblem; rec: LearningRecord; onEdit: (v: string) => void; onCheck: () => void; onHint: () => void;
  onNewQuestion?: () => void; numberLabel?: string; sequenceLabel?: string; onWrong?: () => void; onSuccess?: () => void;
}) {
  const e = rec.worksheet[p.id]; const draft = e?.draft ?? '';
  const ok = !!e && e.checkedValue === e.draft && answerMatches(p, draft);
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  // After a wrong answer, the reason is read aloud (with sound on), as in the game's questions.
  const sound = useOptionalFun()?.fun.sound ?? false;
  useReadAloud(sound && !ok && wrong !== null && wrong === draft ? worksheetFeedbackSpeech(p, draft) : null, wrong !== null && wrong === draft ? `${p.id}:${misses}` : null);
  const yesNo = isYesNoProblem(p);
  const promptText = yesNo ? yesNoPrompt(p) : p.prompt;
  const problemNumber = numberLabel ?? p.id.slice(1);
  const shape = answerShape(p);
  const checkRef = useRef<HTMLButtonElement>(null);
  // A right answer disables Check; move focus to "Correct!" so keyboard and screen-reader users keep their place.
  const okRef = useRef<HTMLParagraphElement>(null);
  const wasOk = useRef(ok);
  useEffect(() => {
    if (ok && !wasOk.current && (document.activeElement === checkRef.current || document.activeElement === document.body)) okRef.current?.focus({ preventScroll: true });
    wasOk.current = ok;
  }, [ok]);
  useRevealWhen(checkRef, !!draft.trim() && !ok);
  const promptId = `ws-prompt-${p.id}`;
  const targetBar = p.modelRequired && p.model?.kind === 'bar' ? p.model : null;
  const gated = !!targetBar || !!(p.area && p.areaTask) || !!p.rulerTask || !!p.linePlotTask || !!p.scaleTask;
  // Once the model matches, the answer tiles stay open for this question: tapping the model again afterwards doesn't
  // lock an answer already built. A question with a saved answer (coming back to it) opens unlocked too.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [modelReady, setModelReady] = useState(!gated || !!draft.trim());
  const openModel = useCallback((ready: boolean) => { if (ready) setModelReady(true); }, []);
  const answerEnabled = canEnterWorksheetAnswer(gated, modelReady);
  const modelStatusId = `ws-model-status-${p.id}`;
  const modelKey = JSON.stringify([p.rulerTask, p.linePlotTask, p.scaleTask, p.areaTask]);
  useEffect(() => {
    setModelReady(!gated || !!draftRef.current.trim());
    setWrong(null);
    setOpen(false);
  }, [gated, modelKey, p.answer, p.prompt]);
  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!draft.trim() || !answerEnabled) return;
    const correct = answerMatches(p, draft);
    setWrong(correct ? null : draft);
    if (!correct) setMisses(n => n + 1);
    playHaptic(correct ? 'correct' : 'retry');
    if (correct) onSuccess?.();
    else onWrong?.();
    onCheck();
  };
  const why = worksheetWhy(p);
  // A wrong answer is answered for the pick: the slip behind it, then the row's hint.
  const pickReason = !ok && wrong === draft ? worksheetWrongReason(p.prompt, p.answer, draft) : null;
  return (
    <li className={'fq-ll-row ' + (ok ? 'ok' : '')} data-testid={'row-worksheet-' + p.id}>
      <form onSubmit={submit}>
        <div className="fq-ll-row-question">
          <span className="fq-ll-num" aria-hidden="true">{numberLabel ?? p.id.slice(1)}</span>
          <div className="fq-ll-row-prompt">
            {sequenceLabel && <span className="fq-ll-sequence">{sequenceLabel}</span>}
            <div className="fq-ll-row-prompt-header">
              <span id={promptId} className="fq-question-text"><LearningText text={promptText} emphasize /></span>
              <LearningListenButton text={promptText} label={`Listen to question ${problemNumber}`} />
            </div>
          </div>
        </div>
        {/* For counting and shading, the tappable bar is the picture, so it is not drawn twice. */}
        {p.model && (!p.task || p.task.kind === 'copy') && !p.picture && <Preview m={p.model} named={namesItsBar(p) || ok} wholeMarks={!answerIsWholes(p) || ok} />}
        {p.picture && (!p.model || p.task?.kind === 'copy') && <div className="fq-ll-preview-wrap fq-ll-auto-picture"><PrintModel model={p.picture} labels={false} oneBracket /></div>}
        {p.area && (p.areaTask
          ? <AreaShade figure={p.area} task={p.areaTask} disabled={ok} statusId={modelStatusId} onMatchChange={openModel} />
          : <div className="fq-ll-preview fq-area-preview"><AreaSvg figure={p.area} /></div>)}
        {p.rulerTask && <RulerInteraction key={modelKey} task={p.rulerTask} disabled={ok} onReady={openModel} />}
        {p.linePlotTask && <LinePlotInteraction key={modelKey} task={p.linePlotTask} disabled={ok} onReady={openModel} />}
        {p.scaleTask && <ScaleInteraction key={modelKey} id={p.id} task={p.scaleTask} disabled={ok} onReady={openModel} />}
        {targetBar && <WorksheetBarCopy target={targetBar} task={p.task} disabled={ok} statusId={modelStatusId} onMatchChange={openModel} wholeMarks={!answerIsWholes(p) || ok} />}
        {yesNo && <YesNoCards
          value={draft}
          onChange={value => { setWrong(null); onEdit(value); }}
          disabled={!answerEnabled}
          testIdPrefix={`worksheet-${p.id}`}
        />}
        {!yesNo && <AnswerTiles key={p.id + p.prompt} shape={shape} value={draft} onChange={value => { setWrong(null); onEdit(value); }}
          disabled={!answerEnabled || ok} testIdPrefix={'ws-' + p.id} />}
        <div className="fq-ll-answer" aria-busy={!answerEnabled}>
          <button ref={checkRef} type="submit" className="fq-button" disabled={!draft.trim() || ok || !answerEnabled || wrong === draft} data-testid={'button-check-worksheet-' + p.id}>{ok ? 'Correct' : 'Check'}</button>
          <button type="button" className="fq-ll-hintbtn" aria-expanded={open} onClick={() => { if (!open) onHint(); setOpen(o => !o); }} data-testid={'button-hint-worksheet-' + p.id}><Lightbulb size={16} /> Hint</button>
        </div>
        <div id={'ws-fb-' + p.id} aria-live="polite">
          {ok && <p ref={okRef} tabIndex={-1} className="fq-ll-ws ok" data-testid={'status-worksheet-' + p.id}><Check size={15} /> Correct!
            {onNewQuestion && <button type="button" className="fq-ll-hintbtn fq-ll-newq" onClick={onNewQuestion} data-testid={'button-new-question-' + p.id}><RotateCcw size={15} /> New question</button>}</p>}
          {ok && why && <div className="fq-ll-ws why" data-testid={'text-why-worksheet-' + p.id}>
            <div className="fq-ll-ws-section-copy">
              <SectionListenHeader text={`Why it works. ${why}`} label="Listen to why it works"><strong>Why it works</strong></SectionListenHeader>
              <LearningText text={why} emphasize interactiveTerms={false} />
            </div>
          </div>}
          {!ok && wrong === draft && <div className="fq-ll-ws bad" role="alert" data-testid={'status-worksheet-' + p.id}>
            <div className="fq-ll-ws-section-copy">
              <SectionListenHeader text={worksheetFeedbackSpeech(p, draft)} label="Listen to the feedback"><strong>Not yet.</strong></SectionListenHeader>
              {pickReason && <LearningText text={pickReason} />}
              <LearningText text={p.hint} />
            </div>
          </div>}
          {!ok && e && e.attempts > 0 && e.checkedValue === undefined && wrong !== draft && draft.trim() && <p className="fq-ll-ws" data-testid={'status-worksheet-' + p.id}>Changed. Press Check.</p>}
          {open && !ok && wrong !== draft && <div className="fq-ll-ws hint" data-testid={'text-hint-worksheet-' + p.id}>
            <div className="fq-ll-ws-section-copy">
              <SectionListenHeader text={`Hint. ${p.hint}`} label="Listen to the hint"><strong>Hint</strong></SectionListenHeader>
              <LearningText text={p.hint} />
            </div>
          </div>}
        </div>
      </form>
    </li>
  );
}

export default function LearningLab({ missionId, howItWorks, progress, onChange, onFinish, onBack, onPaper, onRedo, review = false, onWrong, onSuccess, onWorksheetCorrect }: {
  missionId: string;
  /** "How it works" for a lesson with ideas (its Learn pictures and worked example), from the app. */
  howItWorks?: ReactNode;
  progress: Progress; onChange: (progress: Progress) => void; onFinish: (nextProgress?: Progress) => void; onBack: () => void; onPaper?: () => void;
  /** Offered once the lesson is finished: practice a part again with new numbers. */
  onRedo?: (part: RedoPart) => void; review?: boolean; onWrong?: () => void; onSuccess?: () => void;
  onWorksheetCorrect?: (missionId: string, problemId: string) => void;
}) {
  const ref = useRef(progress); ref.current = progress;
  const storyOn = useOptionalFun()?.fun.displayPreferences?.storyMode !== false;
  const checks = requiredBuildChecks(progress, missionId);
  const sheet = getWorksheet(missionId);
  const [notice, setNotice] = useState('');
  const [reviewPassed, setReviewPassed] = useState(false);
  const [reviewSupported, setReviewSupported] = useState(() => (getLearningRecord(progress, missionId).reviewSupportedUntil ?? 0) > Date.now());
  const [buildPracticeBatch, setBuildPracticeBatch] = useState(0);
  const [buildPracticeIndex, setBuildPracticeIndex] = useState(0);
  const [buildPracticePassed, setBuildPracticePassed] = useState(0);
  const [buildPracticeSetsDone, setBuildPracticeSetsDone] = useState(0);
  const [buildPracticeActive, setBuildPracticeActive] = useState(false);
  const rec = getLearningRecord(progress, missionId);
  const buildPracticeChecks = getBuildPracticeChecks(missionId, buildPracticeBatch);
  const buildPracticeHeading = useRef<HTMLHeadingElement | null>(null);
  const buildPracticeSectionHeading = useRef<HTMLHeadingElement | null>(null);
  // A check that just passed stays on screen (explanation + Next) until the child moves on.
  const [held, setHeld] = useState<string | null>(() => {
    const pendingId = rec.pendingBuildCheckId;
    return pendingId && rec.checks[pendingId]?.passed ? pendingId : null;
  });
  const firstOpen = checks.findIndex(c => !rec.checks[c.id]?.passed);
  const heldIndex = held ? checks.findIndex(c => c.id === held) : -1;
  const activeCheckIndex = heldIndex !== -1 ? heldIndex : firstOpen;
  const activeCheckId = !review && activeCheckIndex !== -1 ? checks[activeCheckIndex].id : null;
  const activeCheckHeading = useRef<HTMLHeadingElement | null>(null);
  const stepsList = useRef<HTMLOListElement | null>(null);
  // The model intros are two lesson steps before the first build: Watch (the builder's demo, then the number line's)
  // and Try (their guided tries). Each step is saved, so a finished one never comes back by itself; the Helper keeps
  // both. Without the fun context (an isolated screen) they count as done. The kinds due when the lesson opened stay
  // in the step row, ticked, for the rest of the visit.
  const funContext = useOptionalFun();
  const introStage = (kind: IntroKind): IntroStage | undefined => funContext ? funContext.fun.introsSeen?.[kind] : true;
  const [introKinds] = useState<IntroKind[]>(() => review || firstOpen === -1 ? [] : (['builder', 'line'] as const).filter((kind) => introStage(kind) !== true));
  const toWatch = introKinds.filter((kind) => introStage(kind) === undefined);
  const toTry = introKinds.filter((kind) => introStage(kind) !== true);
  const introStep: 'watch' | 'try' | null = toWatch.length ? 'watch' : toTry.length ? 'try' : null;
  const seeIntro = (kind: IntroKind, stage: IntroStage) => { if (funContext) funContext.setFun(recordIntro(funContext.fun, kind, stage)); };
  const skipIntros = () => {
    if (!funContext) return;
    funContext.setFun(introKinds.reduce((state, kind) => recordIntro(state, kind), funContext.fun));
  };
  // Every later lesson: a short Watch (the demo for Build it's model) before Build it, each visit until Build it is
  // done, with "I know how: skip". Try is not repeated: it stays done once done.
  const [quickWatchKind] = useState<IntroKind | null>(() => review || firstOpen !== 0 || introKinds.length || checks[0]?.target.kind === 'set'
    ? null : checks[0].target.kind === 'line' ? 'line' : 'builder');
  const [quickWatched, setQuickWatched] = useState(false);
  const quickWatchStep = !!quickWatchKind && !quickWatched;
  const introOffset = introKinds.length ? 2 : quickWatchKind ? 1 : 0;
  const helper = useLessonHelper();
  /** A step shortcut: scroll its part of the page into view and move focus there (for keyboards and screen readers). */
  const jumpTo = (target: Element | null) => {
    if (!(target instanceof HTMLElement)) return;
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const heading = target.matches('h2, h3') ? target : target.querySelector<HTMLElement>('h2, h3');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  };
  // A finished build stays on the page where it was, folded to one line: its prompt, the models it asked for and why
  // they show the fraction open in place. Its green step scrolls back up to it. "Build it again" is practice only.
  const [opened, setOpened] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState<string | null>(null);
  const openStep = (id: string) => {
    setOpened(id);
    requestAnimationFrame(() => {
      const card = document.getElementById(`done-${id}`);
      card?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      card?.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
    });
  };
  // On a phone the steps scroll sideways: keep the current one (often the worksheet, at the end) in view.
  useEffect(() => {
    const list = stepsList.current;
    const now = list?.querySelector<HTMLElement>('li.now');
    if (list && now && list.scrollWidth > list.clientWidth) list.scrollLeft = Math.max(0, now.offsetLeft - list.offsetLeft - 12);
  }, [activeCheckIndex]);
  const save = (r: LearningRecord) => { const p = updateLearning(ref.current, missionId, r); ref.current = p; onChange(p); };
  const cur = () => getLearningRecord(ref.current, missionId);
  const bump = (r: LearningRecord, keys: string[]): LearningRecord => ({
    ...r, helpUses: r.helpUses + (keys.length === 0 ? 1 : 1),
    misconceptions: keys.reduce((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), r.misconceptions),
  });

  // After Next, show the top of the next part (the next check, or the worksheet), not the middle of the page.
  const scrollToNext = useRef(false);
  useEffect(() => {
    if (!scrollToNext.current) return;
    scrollToNext.current = false;
    requestAnimationFrame(() => {
      const target = activeCheckHeading.current?.closest('.fq-ll-check')
        ?? document.querySelector('[data-testid="section-build-practice"]')
        ?? document.querySelector('[data-testid="section-worksheet"]');
      if (!target) return;
      (activeCheckHeading.current ?? buildPracticeSectionHeading.current)?.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }, [activeCheckId, held]);
  useEffect(() => {
    if (!buildPracticeActive) return;
    requestAnimationFrame(() => {
      const target = buildPracticeHeading.current?.closest('.fq-ll-check');
      if (!target) return;
      buildPracticeHeading.current?.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }, [buildPracticeActive, buildPracticeIndex, buildPracticeBatch]);

  if (review) {
    const check = getReviewCheck(missionId, progress.reviewQueue.find(item => item.missionId === missionId)?.reviewCount ?? 0);
    return (
      <div className="fq-ll" role="main" data-testid="learning-lab-review">
        <button className="fq-back" onClick={onBack} data-testid="button-lab-back"><ArrowLeft size={17} /> Back</button>
        <header className="fq-ll-head"><span className="fq-ll-badge"><RotateCcw size={16} /> Later review</span><h2>Show it again</h2>
          <p>Build this one from scratch.</p></header>
        <CheckRunner key={`review-${missionId}`} review check={check}
          onWrong={onWrong}
          onSuccess={onSuccess}
          onHelp={(kind, keys) => { if (kind === 'hint' || keys.length) save({ ...bump(cur(), keys), reviewSupportedUntil: Date.now() + 24 * 3600 * 1000, confirmedAt: undefined }); setReviewSupported(true); }}
          onPass={o => {
            if (o.attempts === -1) {
              const r = cur(); const independent = !o.supported && !reviewSupported && (r.reviewSupportedUntil ?? 0) <= Date.now();
              const aged = !!r.completedAt && Date.now() - r.completedAt >= 24 * 3600 * 1000;
              const next = updateLearning(ref.current, missionId, { ...r, confirmedAt: independent && aged ? Date.now() : undefined });
              onChange(next);
              onFinish(next);
            } else { setReviewPassed(true); if (o.supported) setReviewSupported(true); }
          }} />
        {reviewPassed && <p className="fq-ll-note" data-testid="status-review-passed">{reviewSupported ? 'You did it with help! Try once more on your own another day.' : 'You did it on your own!'}</p>}
      </div>
    );
  }

  const idx = activeCheckIndex;
  const problemProgress = worksheetProblemProgress(rec, sheet);
  const count = problemProgress.filter(problem => problem.status === 'complete').length;
  const requiredDone = sheet.length > 0 && count === sheet.length;
  const progressText = `${count} of ${sheet.length} worksheet questions complete`;
  const reteachPlans = targetedPracticePlans(missionId, rec);
  const reteachProgress = targetedPracticeCount(missionId, rec);
  const gate = hasLearningGate(progress, missionId);
  const finished = progress.completedMissionIds.includes(missionId);
  // Continue (once the builds are done) goes to the first open part below: a worksheet question, then extra practice.
  const openRow = problemProgress.find(problem => problem.status !== 'complete');
  const continueTo = openRow
    ? { label: `Worksheet question ${sheet.findIndex(p => p.id === openRow.problemId) + 1}`, target: () => document.querySelector(`[data-testid="row-worksheet-${openRow.problemId}"]`) }
    : reteachProgress.done < reteachProgress.total
      ? { label: 'Extra practice', target: () => document.querySelector('[data-testid="section-targeted-reteach"]') }
      : null;

  return (
    <div className="fq-ll" role="main" data-testid="learning-lab">
      <TaskBar onBack={onBack} backAriaLabel="Back to the map" testId="button-lab-back" title={storyLessonTitle(getMission(missionId).shortTitle, storyOn)}
        actions={<div className="fq-ll-print" role="group" aria-label="Print and help">
          {helper.button}
          <PrintMenu missionId={missionId} />
          {onPaper && <button type="button" className="fq-button ghost" onClick={onPaper} data-testid="button-check-paper" aria-label="Check my paper"><ClipboardCheck size={17} /><span className="fq-hide-narrow"> Check my paper</span></button>}
        </div>} />

      {helper.panel}
      <LessonTeachingSupport missionId={missionId} />
      {howItWorks}

      {/* The steps double as shortcuts: tap one to go to its part of the page (the worksheet once the builds are done). */}
      <ol className="fq-ll-steps" aria-label="Lab progress" data-testid="list-lab-steps" ref={stepsList}>
        {introKinds.length > 0 && (['watch', 'try'] as const).map((step, i) => {
          const done = step === 'watch' ? !toWatch.length : !toTry.length;
          const name = step === 'watch' ? 'Watch' : 'Try';
          const label = <>{done ? <Check size={15} /> : i + 1}{' '}<span>{name}</span></>;
          return <li key={step} className={done ? 'done' : introStep === step ? 'now' : ''} data-testid={`step-intro-${step}`}>
            {introStep === step ? <button type="button" onClick={() => jumpTo(document.querySelector('[data-step]'))}>{label}{GO_TO_STEP}</button> : label}</li>;
        })}
        {quickWatchKind && <li className={quickWatched ? 'done' : 'now'} data-testid="step-quick-watch">
          {quickWatchStep ? <button type="button" onClick={() => jumpTo(document.querySelector('[data-testid="quick-watch"]'))}>1{' '}<span>Watch</span>{GO_TO_STEP}</button>
            : <><Check size={15} /><span>Watch</span></>}</li>}
        {checks.map((c, i) => {
          const e = rec.checks[c.id];
          const label = <>{e?.passed ? <Check size={15} /> : introOffset + i + 1}{' '}<span>{buildStepName(c, i)}{e?.passed ? (e.supported ? ' · with help' : ' · solo') : ''}</span></>;
          return <li key={c.id} className={e?.passed ? 'done' : i === idx && !introStep && !quickWatchStep ? 'now' : ''} data-testid={`step-${c.id}`}>
            {i === idx ? <button type="button" onClick={() => jumpTo(activeCheckHeading.current)}>{label}{GO_TO_STEP}</button>
              : e?.passed ? <button type="button" onClick={() => openStep(c.id)} data-testid={`button-see-step-${c.id}`}>{label}{GO_BACK_TO_STEP}</button>
              : label}</li>;
        })}
        <li className={idx === -1 ? (requiredDone ? 'done' : 'now') : ''} data-testid="step-worksheet">
          {idx === -1
            ? <button type="button" onClick={() => jumpTo(document.querySelector('[data-testid="section-worksheet"]'))} data-testid="button-go-worksheet">{requiredDone ? <Check size={15} /> : introOffset + checks.length + 1}<span>Worksheet · {requiredDone ? 'done' : 'go to it'}</span></button>
            : <>{introOffset + checks.length + 1}<span>Worksheet · after the builds</span></>}
        </li>
        {reteachProgress.total > 0 && <li className={reteachProgress.done === reteachProgress.total ? 'done' : ''}>
          <button type="button" onClick={() => jumpTo(document.querySelector('[data-testid="section-targeted-reteach"]'))} data-testid="button-go-reteach">{introOffset + checks.length + 2}<span>Extra practice {reteachProgress.done}/{reteachProgress.total}</span></button>
        </li>}
      </ol>

      {/* A lesson that first uses a part name the Words screen didn't teach (fifths, tenths…) names it up top. */}
      {newWordsFor(missionId).length > 0 && <NewWords denominators={newWordsFor(missionId)} />}

      {gate && onRedo && (
        <section className="fq-ll-redo" aria-labelledby="redo-title" data-testid="section-redo">
          <SectionListenHeader text={LAB_SECTION_SPEECH.redo} label="Listen to Do it again">
            <h3 id="redo-title"><RotateCcw size={18} /> Do it again</h3>
          </SectionListenHeader>
          <p>Want more practice? Try a part again with new numbers. Your lesson stays finished.</p>
          <div className="fq-ll-redo-buttons">
            <button type="button" className="fq-button secondary" onClick={() => onRedo('builds')} data-testid="button-redo-builds">
              {rec.redo?.part === 'builds' && !rec.redo.finishedAt ? 'Keep going: builds' : 'Redo builds'}
            </button>
            <button type="button" className="fq-button secondary" onClick={() => onRedo('worksheet')} data-testid="button-redo-worksheet">
              {rec.redo?.part === 'worksheet' && !rec.redo.finishedAt ? 'Keep going: worksheet' : 'Redo worksheet'}
            </button>
          </div>
          {!!rec.redosFinished && <p className="fq-ll-note" data-testid="text-redos-finished">Done again {rec.redosFinished} {rec.redosFinished === 1 ? 'time' : 'times'}. Nice practice!</p>}
        </section>
      )}

      {checks.map((check, index) => {
        const entry = rec.checks[check.id];
        if (index === idx || !entry?.passed) return null;
        const t = check.target;
        const second: LearningModel = { ...t, kind: t.kind === 'line' ? 'bar' : 'line', total: undefined, wholes: Math.max(1, Math.ceil(t.n / t.d)) };
        const name = buildStepName(check, index);
        return (
          <details key={check.id} id={`done-${check.id}`} className="fq-ll-done" open={opened === check.id} data-testid={`section-done-${check.id}`}
            onToggle={(event) => { const open = event.currentTarget.open; setOpened((current) => open ? check.id : current === check.id ? null : current); }}>
            <summary data-testid={`button-done-${check.id}`}><Check size={18} aria-hidden="true" /><h3>{name} · done{entry.supported ? ' with help' : ' solo'}</h3><span className="fq-ll-done-see">{opened === check.id ? 'Hide' : 'See it'}</span></summary>
            <div className="fq-ll-done-body">
              <SectionListenHeader text={`${name}. ${check.prompt} ${check.explanation}`} label={`Listen to ${name}`}>
                <p><LearningText text={check.prompt} /></p>
              </SectionListenHeader>
              <div className="fq-ll-done-models"><Preview m={t} named /><Preview m={second} named /></div>
              <p className="fq-ll-note"><LearningText text={check.explanation} interactiveTerms={false} /></p>
              {rebuilding === check.id ? (
                <CheckRunner key={`again-${check.id}`} check={check} review={false} onHelp={() => {}} onPass={() => {}} onWrong={onWrong} onSuccess={onSuccess}
                  nextLabel="Done practising" onNext={() => setRebuilding(null)} />
              ) : (
                <button type="button" className="fq-button secondary" onClick={() => setRebuilding(check.id)} data-testid={`button-build-again-${check.id}`}>Build it again</button>
              )}
            </div>
          </details>
        );
      })}

      {notice && idx !== -1 && <div className="fq-ll-feedback ok" role="status" data-testid="status-check-saved"><Check size={20} /><div>{notice}</div></div>}

      {idx !== -1 && introStep === 'watch' && (
        <IntroWatch key={`watch-${toWatch[0]}`} kind={toWatch[0]} kicker="Step 1 · Watch" onSkip={skipIntros}
          nextLabel={toWatch.length > 1 ? 'Next: number line' : 'Next: Try'} onDone={() => seeIntro(toWatch[0], 'watched')} />
      )}
      {idx !== -1 && introStep === 'try' && (
        <IntroTry key={`try-${toTry[0]}`} kind={toTry[0]} kicker="Step 2 · Try" onSkip={skipIntros}
          nextLabel={toTry.length > 1 ? 'Next: number line' : `Next: ${buildStepName(checks[idx], idx)}`} onDone={() => seeIntro(toTry[0], true)} />
      )}
      {idx !== -1 && !introStep && quickWatchStep && (
        <div data-testid="quick-watch">
          <IntroWatch kind={quickWatchKind!} kicker="Step 1 · Watch" nextLabel={`Next: ${buildStepName(checks[0], 0)}`}
            onDone={() => setQuickWatched(true)} onSkip={() => setQuickWatched(true)} />
        </div>
      )}
      {idx !== -1 && !introStep && !quickWatchStep && (
        <CheckRunner key={checks[idx].id} review={false} check={checks[idx]}
          headingRef={activeCheckHeading}
          onWrong={onWrong}
          onSuccess={onSuccess}
          onHelp={(kind, keys) => {
            const r = bump(cur(), keys); const id = checks[idx].id; const old = r.checks[id];
            // A hint or a miss never undoes a build that already passed.
            save({ ...r, checks: { ...r.checks, [id]: { passed: !!old?.passed, supported: true, attempts: (old?.attempts ?? 0) + (kind === 'error' ? 1 : 0) } } });
          }}
          onPass={o => {
            const r = cur(); const id = checks[idx].id; const old = r.checks[id];
            save({ ...r, checks: { ...r.checks, [id]: { passed: true, supported: !!old?.supported || o.supported, attempts: (old?.attempts ?? 0) + 1 } }, pendingBuildCheckId: id });
            setHeld(id);
          }}
          initiallyPassed={!!rec.checks[checks[idx].id]?.passed}
          nextLabel={(() => {
            const nextCheck = checks.slice(idx + 1).find(c => !rec.checks[c.id]?.passed);
            return nextCheck ? `Next: ${buildStepName(nextCheck, checks.indexOf(nextCheck))}` : 'Next: worksheet or extra builds';
          })()}
          onNext={() => { save({ ...cur(), pendingBuildCheckId: undefined }); setHeld(null); setNotice(''); scrollToNext.current = true; }} />
      )}

      {idx === -1 && (
        <section className="fq-ll-build-practice" aria-labelledby="build-practice-title" data-testid="section-build-practice">
          <SectionListenHeader text={LAB_SECTION_SPEECH.buildPractice} label="Listen to More build practice">
            <h3 id="build-practice-title" ref={buildPracticeSectionHeading} tabIndex={-1}>More build practice</h3>
          </SectionListenHeader>
          {!buildPracticeActive ? (
            <>
              <p>Try 10 new, optional questions with this lesson’s ideas. Extra practice does not change lesson completion.</p>
              <button type="button" className="fq-button secondary" onClick={() => {
                setBuildPracticeIndex(0);
                setBuildPracticePassed(0);
                setBuildPracticeActive(true);
              }} data-testid="button-start-build-practice">
                {buildPracticeSetsDone ? 'Try 10 more' : 'Try 10 extra builds'}
              </button>
              {!!buildPracticeSetsDone && <p className="fq-ll-note" data-testid="text-build-practice-sets">{buildPracticeSetsDone} optional {buildPracticeSetsDone === 1 ? 'set' : 'sets'} finished.</p>}
            </>
          ) : (
            <>
              <div className="fq-ll-practice-meter" role="progressbar" aria-valuemin={0} aria-valuemax={10} aria-valuenow={buildPracticePassed} aria-label="Optional build questions completed" data-testid="progress-build-practice">
                <b style={{ width: `${buildPracticePassed * 10}%` }} />
                <span>{buildPracticePassed} of 10 extra builds done</span>
              </div>
              <CheckRunner key={`${buildPracticeBatch}-${buildPracticeIndex}`} check={buildPracticeChecks[buildPracticeIndex]} review={false}
                headingRef={buildPracticeHeading}
                onWrong={onWrong}
                onSuccess={onSuccess}
                onHelp={() => {}}
                onPass={() => setBuildPracticePassed(buildPracticeIndex + 1)}
                nextLabel={buildPracticeIndex === buildPracticeChecks.length - 1 ? 'Finish these 10 builds' : 'Next extra build'}
                onNext={() => {
                  if (buildPracticeIndex < buildPracticeChecks.length - 1) setBuildPracticeIndex(index => index + 1);
                  else {
                    setBuildPracticeActive(false);
                    setBuildPracticePassed(0);
                    setBuildPracticeIndex(0);
                    setBuildPracticeBatch(batch => batch + 1);
                    setBuildPracticeSetsDone(done => done + 1);
                  }
                }} />
              <button type="button" className="fq-button ghost" onClick={() => {
                setBuildPracticeActive(false);
                requestAnimationFrame(() => document.querySelector('[data-testid="section-worksheet"]')?.scrollIntoView({ block: 'start', behavior: 'auto' }));
              }} data-testid="button-skip-build-practice">Skip to the worksheet</button>
            </>
          )}
        </section>
      )}

      {idx === -1 && (
        <section className="fq-ll-sheet" aria-labelledby="ws-title" data-testid="section-worksheet">
          <div className="fq-ll-sheet-head">
            <SectionListenHeader text={worksheetSpeech(sheet.length)} label="Listen to the worksheet steps">
              <h3 id="ws-title">Worksheet</h3>
            </SectionListenHeader>
            <p className="fq-ll-note">Answer all {sheet.length} questions to finish the lesson. Print the worksheet to hand in, then enter your answers here or with Check my paper.</p>
            <ol className="fq-ll-problem-progress" aria-label="Status of each worksheet problem" tabIndex={0} data-testid="worksheet-problem-progress">
              {problemProgress.map((problem, index) => {
                const statusText = problem.status === 'complete' ? 'Complete'
                  : problem.status === 'retry' ? 'Needs another try'
                    : problem.status === 'current' ? 'Up next' : 'Not started';
                return <li key={problem.problemId}
                  className={`fq-ll-problem-progress-item ${problem.status}${problem.current ? ' is-current' : ''}`}
                  aria-current={problem.current ? 'step' : undefined}
                  data-testid={`worksheet-progress-${problem.problemId}`}>
                  <span aria-hidden="true">{index + 1}</span>
                  {problem.status === 'complete' && <Check size={14} aria-hidden="true" />}
                  {problem.status === 'retry' && <RotateCcw size={13} aria-hidden="true" />}
                  {problem.status === 'current' && <i className="fq-ll-progress-current-dot" aria-hidden="true" />}
                  <span className="fq-ll-sr-only">Question {index + 1} of {sheet.length}: {statusText}{problem.current ? ', current question' : ''}</span>
                </li>;
              })}
            </ol>
            <div className="fq-ll-meter" role="progressbar" aria-valuemin={0} aria-valuemax={sheet.length} aria-valuenow={count} aria-valuetext={progressText} aria-label="Worksheet questions completed" data-testid="progress-worksheet">
              <b style={{ width: `${sheet.length ? (count / sheet.length) * 100 : 100}%` }} /><span>{progressText}</span>
            </div>
          </div>
          <ol className="fq-ll-rows">
            {sheet.map((p, index) => (
              <Fragment key={p.id}>
              {/* Short rounds of 4, so a long worksheet feels like a few quick wins. */}
              {index % WORKSHEET_ROUND === 0 && sheet.length > WORKSHEET_ROUND && (
                <li className="fq-ll-round" data-testid={`worksheet-round-${index / WORKSHEET_ROUND + 1}`}>Round {index / WORKSHEET_ROUND + 1} of {Math.ceil(sheet.length / WORKSHEET_ROUND)}</li>
              )}
              <Row p={p} rec={rec} numberLabel={String(index + 1)}
                sequenceLabel={`Question ${index + 1} of ${sheet.length} · ${problemProgress[index].status === 'complete' ? 'Complete' : problemProgress[index].status === 'retry' ? 'Needs another try' : problemProgress[index].status === 'current' ? 'Up next' : 'Not started'}`}
                onEdit={v => save(editWorksheet(cur(), p.id, v, p.answer))}
                onCheck={() => save(checkLessonWorksheet(cur(), p, missionId))}
                onWrong={onWrong}
                onSuccess={() => { onSuccess?.(); onWorksheetCorrect?.(missionId, p.id); }}
                onHint={() => { const r = cur(); const e = r.worksheet[p.id] ?? { draft: '', attempts: 0, supported: false };
                  save({ ...r, helpUses: r.helpUses + 1, worksheet: { ...r.worksheet, [p.id]: { ...e, supported: true } } }); }} />
              {(index + 1) % WORKSHEET_ROUND === 0 && index < sheet.length - 1
                && problemProgress.slice(index + 1 - WORKSHEET_ROUND, index + 1).every((item) => item.status === 'complete') && (
                <li className="fq-ll-round-cheer" data-testid={`worksheet-round-done-${(index + 1) / WORKSHEET_ROUND}`}>
                  {/* The status role sits inside the item: a list holds only list items. */}
                  <span role="status"><Star size={18} aria-hidden="true" /> Round {(index + 1) / WORKSHEET_ROUND} done! {index + 1 + WORKSHEET_ROUND >= sheet.length ? 'One round left!' : 'Great work, keep going!'}</span>
                </li>
              )}
              </Fragment>
            ))}
          </ol>
        </section>
      )}

      {reteachPlans.length > 0 && (
        <section className="fq-ll-reteach" aria-labelledby="reteach-title" data-testid="section-targeted-reteach">
          <SectionListenHeader text={LAB_SECTION_SPEECH.reteach} label="Listen to Make this idea clearer">
            <h3 id="reteach-title">Make this idea clearer</h3>
          </SectionListenHeader>
          <p>One idea has been tricky more than once: use each new model, then enter the answer. These extra checks help make the idea stick.</p>
          {reteachPlans.map((plan, planIndex) => (
            <div className="fq-ll-reteach-plan" key={plan.signal} data-testid={`targeted-reteach-${planIndex + 1}`}>
              <h4>{plan.signal.length > 110 ? `${plan.signal.slice(0, 107).trimEnd()}…` : plan.signal}</h4>
              <ol className="fq-ll-rows">
                {plan.problems.map((problem, problemIndex) => (
                  <Row key={problem.id} p={problem} rec={rec} numberLabel={`R${problemIndex + 1}`}
                    sequenceLabel={`Extra practice ${problemIndex + 1} of ${plan.problems.length}`}
                    onEdit={value => save(editWorksheet(cur(), problem.id, value, problem.answer))}
                    onCheck={() => save(checkWorksheet(cur(), problem, false))}
                    onWrong={onWrong}
                    onSuccess={() => { onSuccess?.(); onWorksheetCorrect?.(missionId, problem.id); }}
                    onHint={() => {
                      const record = cur();
                      const entry = record.worksheet[problem.id] ?? { draft: '', attempts: 0, supported: false };
                      save({ ...record, helpUses: record.helpUses + 1, worksheet: { ...record.worksheet, [problem.id]: { ...entry, supported: true } } });
                    }} />
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {/* After the last question on the page, one button says what comes next: finishing, or the first open step. */}
      {gate ? (
        <div className="fq-ll-finish-callout" data-testid="callout-lab-finish">
          <p><strong>You did it!</strong> {finished ? 'This lesson is done.' : 'You can finish the lesson now.'}</p>
          <button type="button" className="fq-button" onClick={() => onFinish()} data-testid="button-lab-finish">Finish lesson <ArrowRight size={17} /></button>
        </div>
      ) : idx === -1 && continueTo && (
        <div className="fq-ll-continue">
          <button type="button" className="fq-button" onClick={() => jumpTo(continueTo.target())} data-testid="button-lab-continue">
            Continue: {continueTo.label} <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

/** A second try at a finished lesson's builds or worksheet, with new numbers. Practice only: it is saved apart
    from the lesson's own answers, so completion, unlocks and first-try results never change. */
export function RedoLab({ missionId, progress, onChange, onBack, onWrong, onSuccess, onWorksheetCorrect }: {
  missionId: string; progress: Progress; onChange: (progress: Progress) => void; onBack: () => void; onWrong?: () => void; onSuccess?: () => void;
  onWorksheetCorrect?: (missionId: string, problemId: string) => void;
}) {
  const ref = useRef(progress); ref.current = progress;
  const [held, setHeld] = useState<string | null>(null);
  const redo = getLearningRecord(progress, missionId).redo;
  const cur = () => getLearningRecord(ref.current, missionId);
  const save = (r: LearningRecord) => { const p = updateLearning(ref.current, missionId, r); ref.current = p; onChange(p); };
  const change = (edit: (r: RedoAttempt) => RedoAttempt) => {
    const r = cur(); if (!r.redo) return;
    const next = { ...r, redo: edit(r.redo) };
    save(redoDone(missionId, next.redo) ? finishRedo(next) : next);
  };
  if (!redo) return null;
  const done = !!redo.finishedAt;
  const again = () => save(startRedo(cur(), redo.part));
  const asRecord = (worksheet: RedoAttempt['worksheet']): LearningRecord => ({ ...emptyLearningRecord(), worksheet });

  const checks = redo.part === 'builds' ? redoChecks(missionId, redo.round) : [];
  const heldIndex = held ? checks.findIndex(c => c.id === held) : -1;
  const idx = heldIndex !== -1 ? heldIndex : checks.findIndex(c => !redo.checks[c.id]?.passed);
  const rows = redo.part === 'worksheet' ? redoWorksheet(missionId, redo) : [];
  const count = redo.part === 'worksheet' ? redoWorksheetCount(missionId, redo) : 0;

  return (
    <div className="fq-ll fq-ll-redo-page" data-testid="redo-lab">
      <button className="fq-back" onClick={onBack} data-testid="button-redo-back"><ArrowLeft size={17} /> Back to the lesson</button>
      <header className="fq-ll-head">
        <span className="fq-ll-badge"><RotateCcw size={16} /> Do it again</span>
        <h2>{redo.part === 'worksheet' ? 'Worksheet with new numbers' : 'New builds'}</h2>
        <p>Practice only. Your lesson stays finished, whatever happens here.</p>
      </header>

      {redo.part === 'builds' && (
        <>
          <ol className="fq-ll-steps" aria-label="Redo progress">
            {checks.map((c, i) => <li key={c.id} className={redo.checks[c.id]?.passed ? 'done' : i === idx ? 'now' : ''}>{redo.checks[c.id]?.passed ? <Check size={15} /> : i + 1}<span>Build {i + 1}</span></li>)}
          </ol>
          {idx !== -1 && (
            <CheckRunner key={`${redo.round}-${checks[idx].id}`} review={false} check={checks[idx]}
              onWrong={onWrong}
              onSuccess={onSuccess}
              onHelp={(kind) => change(r => { const id = checks[idx].id; const old = r.checks[id];
                return { ...r, checks: { ...r.checks, [id]: { passed: false, supported: true, attempts: (old?.attempts ?? 0) + (kind === 'error' ? 1 : 0) } } }; })}
              onPass={o => { setHeld(checks[idx].id); change(r => { const id = checks[idx].id; const old = r.checks[id];
                return { ...r, checks: { ...r.checks, [id]: { passed: true, supported: !!old?.supported || o.supported, attempts: (old?.attempts ?? 0) + 1 } } }; }); }}
              nextLabel={idx < checks.length - 1 ? 'Next build' : 'Next'}
              onNext={() => { setHeld(null); window.scrollTo(0, 0); }} />
          )}
        </>
      )}

      {redo.part === 'worksheet' && (
        <section className="fq-ll-sheet" aria-labelledby="redo-ws-title" data-testid="section-redo-worksheet">
          <div className="fq-ll-sheet-head">
            <h3 id="redo-ws-title">Worksheet</h3>
            <div className="fq-ll-meter" role="progressbar" aria-valuemin={0} aria-valuemax={12} aria-valuenow={count} aria-label="Redo worksheet problems correct" data-testid="progress-redo-worksheet">
              <b style={{ width: `${(count / 12) * 100}%` }} /><span>{count} of 12 checked</span>
            </div>
          </div>
          <ol className="fq-ll-rows">
            {rows.map((p, index) => (
              <Row key={`${p.id}-${redo.round}-${redo.rowRounds[p.id] ?? 0}`} p={p} rec={asRecord(redo.worksheet)}
                numberLabel={String(index + 1)} sequenceLabel={`Question ${index + 1} of ${rows.length} · Redo practice`}
                onEdit={v => change(r => ({ ...r, worksheet: editWorksheet(asRecord(r.worksheet), p.id, v, p.answer).worksheet }))}
                onCheck={() => { const r = cur(); const next = checkRedoRow(r, p); if (next.redo) save(redoDone(missionId, next.redo) ? finishRedo(next) : next); }}
                onWrong={onWrong}
                onSuccess={() => {
                  onSuccess?.();
                  // XP once per redo question (not again for every "new numbers" round), so redo cannot be farmed for points.
                  onWorksheetCorrect?.(missionId, `${p.id}-redo`);
                }}
                onHint={() => change(r => { const e = r.worksheet[p.id] ?? { draft: '', attempts: 0, supported: false };
                  return { ...r, worksheet: { ...r.worksheet, [p.id]: { ...e, supported: true } } }; })}
                onNewQuestion={() => change(r => { const { [p.id]: _old, ...worksheet } = r.worksheet;
                  return { ...r, worksheet, rowRounds: { ...r.rowRounds, [p.id]: (r.rowRounds[p.id] ?? 0) + 1 } }; })} />
            ))}
          </ol>
        </section>
      )}

      {done && !held && (
        <section className="fq-ll-feedback ok fq-ll-redo-done" role="status" data-testid="status-redo-done">
          <Check size={22} />
          <div>
            <strong>You did it again!</strong>
            <p>{redo.part === 'worksheet' ? 'All 12 new questions are correct.' : 'Both new builds are done.'} Want another round?</p>
            <div className="fq-ll-redo-buttons">
              <button type="button" className="fq-button" onClick={again} data-testid="button-redo-again"><RotateCcw size={17} /> Again with new numbers</button>
              <button type="button" className="fq-button ghost" onClick={onBack} data-testid="button-redo-finish">Back to the lesson</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
