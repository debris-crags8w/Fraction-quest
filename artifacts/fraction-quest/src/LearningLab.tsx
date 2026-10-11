import { type CSSProperties, type RefObject, useEffect, useRef, useState } from 'react';
import { LearningText } from './LearningText';
import { ArrowLeft, Check, ClipboardCheck, CircleHelp, Lightbulb, Minus, Plus, RotateCcw } from 'lucide-react';
import { numberLineWholeCount, type Progress } from './game';
import { answerMatches, getBuildCheckStage, getBuildChecks, getModelFeedback, getReasonFeedback, getReviewCheck, getWorksheet, type BuildCheck, type LearningModel, type WorksheetProblem } from './learning-content';
import {
  checkRedoRow, checkWorksheet, editWorksheet, emptyLearningRecord, finishRedo, getLearningRecord, hasLearningGate, learningSummary, redoChecks, redoDone, redoWorksheet,
  redoWorksheetCount, startRedo, targetedPracticeCount, targetedPracticePlans, updateLearning, worksheetCount, type LearningRecord, type RedoAttempt, type RedoPart,
} from './learning';
import { denomColor } from './fun-ui';
import { BarSvg, MODEL_CONCEPTS, ModelPair, ModelTag } from './models';
import { canEnterWorksheetAnswer, WorksheetBarCopy } from './WorksheetBarCopy';
import { AreaShade, AreaSvg } from './AreaModel';
import { PrintMenu } from './Printables';
import { FractionEntry, usesFractionEntry } from './FractionEntry';
import { LessonTeachingSupport } from './LessonTeachingSupport';
import './learning-lab.css';

type Kind = LearningModel['kind'];
type St = { d: number; wholes: number; count: number };
const blank = (): St => ({ d: 0, wholes: 1, count: 0 });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)));

// Also shown to kids under "Things to practice", so keep these short and friendly.
const M = {
  parts: 'Picking the number of equal parts',
  count: 'Counting pieces, groups or jumps',
  wholes: 'Using the right number of wholes',
  trans: 'Showing it the second way',
  reason: 'Picking the reason',
};
const MODEL_LABEL: Record<Kind, string> = { bar: 'Bar', line: 'Number line', set: 'Groups' };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function validate(kind: Kind, t: LearningModel, s: St): { msgs: string[]; keys: string[] } {
  const msgs: string[] = []; const keys: string[] = [];
  const label = MODEL_LABEL[kind];
  const unit = kind === 'line' ? 'spaces' : kind === 'set' ? 'groups' : 'pieces';
  if (s.d === 0) return { msgs: [`${label}: choose how many equal ${unit} make one whole.`], keys: [M.parts] };
  if (kind === 'set') {
    const total = t.total ?? 0;
    if (total % s.d !== 0) { msgs.push(`${label}: ${total} can't split into ${s.d} equal groups. Try another number.`); keys.push(M.parts); }
  }
  // Point at the part of the fraction to check, without saying the number (that would build it for the child).
  if (s.d !== t.d && !msgs.length) { msgs.push(`${label}: not yet. Look at the denominator: how many equal ${unit} make one whole?`); keys.push(M.parts); }
  if (kind === 'bar' && s.wholes !== t.wholes) { msgs.push(`${label}: use ${t.wholes} whole ${t.wholes === 1 ? 'bar' : 'bars'}.`); keys.push(M.wholes); }
  if (s.count !== t.n && s.d === t.d) {
    const action = kind === 'line' ? 'mark' : kind === 'set' ? 'select' : 'shade';
    const counted = kind === 'line' ? 'jump' : kind === 'set' ? 'group' : 'piece';
    msgs.push(`${label}: not yet. Look at the numerator: how many ${counted}s should you ${action}?`);
    keys.push(M.count);
  }
  return { msgs, keys };
}

function Frac({ n, d }: { n: number; d: number }) { return <span className="fq-ll-frac" aria-label={`${n} over ${d}`}>{n}/{d}</span>; }

/* Read-only preview for worksheet visuals */
function Preview({ m }: { m: LearningModel }) {
  return (
    <div className="fq-ll-preview-wrap"><ModelTag kind={m.kind} />
    {m.kind === 'bar' ? (
      <div className="fq-ll-preview-svg">
        <BarSvg n={m.n} d={m.d} wholes={m.wholes} sizes={m.sizes} label={m.sizes ? `A bar cut into ${m.sizes.length} pieces` : m.n ? `${m.d} equal parts per whole, ${m.n} ${m.n === 1 ? 'part' : 'parts'} shaded` : `A bar cut into ${m.d} parts`} />
      </div>
    ) : <div className="fq-ll-preview" style={{ '--piece': denomColor(m.d) } as CSSProperties} role="img" aria-label={m.kind === 'set' ? `${m.n} of ${m.d} groups selected from ${m.total} objects` : `${m.d} equal parts per whole, marked after ${m.n} parts`}>
      {m.kind === 'line' ? (
        <div className="fq-ll-pline">{Array.from({ length: m.d * m.wholes + 1 }, (_, i) => <i key={i} className={i === m.n ? 'on' : ''} style={{ left: `${(i / (m.d * m.wholes)) * 100}%` }}>{i % m.d === 0 && <span>{i / m.d}</span>}</i>)}</div>
      ) : (
        m.kind === 'set' ? <div className="fq-ll-groups">{Array.from({ length: m.d }, (_, g) => <div className={`fq-ll-group ${g < m.n ? 'on' : ''}`} key={g}>
          {Array.from({ length: (m.total ?? 0) / m.d }, (_, i) => <i key={i} />)}
        </div>)}</div> :
        <div className="fq-ll-preview-bars">
          {Array.from({ length: m.wholes }, (_, w) => (
            <div className="fq-ll-preview-whole" key={w}>
              <span>Whole {w + 1}</span>
              <div className="fq-ll-pcells" style={{ gridTemplateColumns: `repeat(${gridColumns(m.d)}, minmax(0,1fr))` }}>
                {Array.from({ length: m.d }, (_, i) => <i key={i} className={w * m.d + i < m.n ? 'on' : ''} />)}
              </div>
            </div>
          ))}
          <span className="fq-ll-part-guide"><i aria-hidden="true" /> Part · one cell is one equal part</span>
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

export function RulerInteraction({ task, onReady, disabled }: {
  task: NonNullable<WorksheetProblem['rulerTask']>; onReady: (ready: boolean) => void; disabled: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const ticks = task.denominator * task.wholes;
  useEffect(() => { onReady(selected === task.end); }, [onReady, selected, task.end]);
  return (
    <div className="fq-ll-custom-model" data-testid="ruler-model">
      <p>Line up the blue strip with zero. Tap the tick at its end.</p>
      <div className="fq-ruler-track" role="group" aria-label={`Ruler divided into ${task.denominator} equal spaces per inch`}>
        <span className="fq-ruler-strip" style={{ width: `${(task.end / ticks) * 100}%` }} />
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <button type="button" key={i} className={`fq-ruler-tick ${selected === i ? 'selected' : ''} ${i % task.denominator === 0 ? 'inch' : ''}`}
            style={{ left: `${(i / ticks) * 100}%` }} aria-pressed={selected === i} disabled={disabled}
            aria-label={`Mark ${rulerLabel(i, task.denominator)} inches`} onClick={() => setSelected(i)}>
            <i />{i % task.denominator === 0 && <span>{i / task.denominator}</span>}
          </button>
        ))}
      </div>
      <p className="fq-ll-custom-status" role="status" aria-live="polite">
        {selected === task.end ? 'Right at the endpoint. Now enter the length.' : selected === null ? 'Use the tick marks to measure the strip.' : 'That tick does not match the strip end. Try another.'}
      </p>
    </div>
  );
}

export function LinePlotInteraction({ task, onReady, disabled }: {
  task: NonNullable<WorksheetProblem['linePlotTask']>; onReady: (ready: boolean) => void; disabled: boolean;
}) {
  const tickCount = task.denominator * task.wholes;
  const expected = Array.from({ length: tickCount + 1 }, (_, tick) => task.values.filter(value => value === tick).length);
  const [marks, setMarks] = useState<number[]>(() => Array(tickCount + 1).fill(0));
  const complete = marks.every((count, i) => count === expected[i]);
  useEffect(() => { onReady(complete); }, [complete, onReady]);
  return (
    <div className="fq-ll-custom-model fq-lineplot" data-testid="line-plot-model">
      <p>Tap the tick for each measurement to stack its X. Tap again to remove an X.</p>
      <div className="fq-lineplot-grid" role="group" aria-label={`Line plot with ${task.denominator} equal spaces per whole`}>
        {Array.from({ length: tickCount + 1 }, (_, i) => (
          <button type="button" key={i} className="fq-lineplot-tick" aria-label={`${rulerLabel(i, task.denominator)}, ${marks[i]} X marks. Add or remove one.`}
            aria-pressed={marks[i] === expected[i]} disabled={disabled}
            onClick={() => setMarks(current => current.map((count, index) => index === i ? (count >= expected[i] ? 0 : count + 1) : count))}>
            <span className="fq-lineplot-xs" aria-hidden="true">{Array.from({ length: marks[i] }, (_, j) => <b key={j}>×</b>)}</span>
            <i />
            <small>{rulerLabel(i, task.denominator)}</small>
          </button>
        ))}
      </div>
      <p className="fq-ll-custom-status" role="status" aria-live="polite">{complete ? 'Your plot matches the measurements. Now answer.' : 'Keep adding X marks until every measurement is plotted.'}</p>
    </div>
  );
}

export function ScaleInteraction({ task, onReady, disabled, id }: {
  task: NonNullable<WorksheetProblem['scaleTask']>; onReady: (ready: boolean) => void; disabled: boolean; id: string;
}) {
  const targetPercent = (task.numerator / task.denominator) * 100;
  const [percent, setPercent] = useState(100);
  const complete = Math.abs(percent - targetPercent) < .01;
  useEffect(() => { onReady(complete); }, [complete, onReady]);
  return (
    <div className="fq-ll-custom-model fq-scale-model" data-testid="scale-model">
      <label htmlFor={`scale-factor-slider-${id}`}>Move the slider to <strong>{task.numerator}/{task.denominator}</strong> of the whole.</label>
      <input id={`scale-factor-slider-${id}`} type="range" min="0" max="200" step="1" value={percent} disabled={disabled}
        aria-valuetext={`${percent}% of ${task.whole}`} onChange={event => setPercent(Number(event.target.value))} />
      <div className="fq-scale-compare" aria-label={`Original whole ${task.whole}; scaled amount ${((task.whole * percent) / 100).toFixed(1)}`}>
        <div><b>Whole: {task.whole}</b><span className="fq-scale-whole" /></div>
        <div><b>{percent}% of {task.whole}</b><span className="fq-scale-track"><i style={{ width: `${percent / 2}%` }} /></span></div>
        <small>100% keeps the same amount. Less than 100% makes less; more than 100% makes more.</small>
      </div>
      <p className="fq-ll-custom-status" role="status" aria-live="polite">{complete ? 'The slider shows the factor. Now compare the product with the whole.' : 'Move the slider to the fraction named above.'}</p>
    </div>
  );
}

function Stepper({ label, value, min, max, onSet, id, hint }: { label: string; value: number; min: number; max: number; onSet: (v: number) => void; id: string; hint?: string }) {
  const [draft, setDraft] = useState(value === 0 && min === 0 ? '' : String(value));
  useEffect(() => setDraft(value === 0 && min === 0 ? '' : String(value)), [value, min, max]);
  const commit = () => {
    const parsed = draft.trim() ? Number(draft) : min;
    const next = clamp(Number.isFinite(parsed) ? Math.trunc(parsed) : min, min, max);
    setDraft(String(next));
    onSet(next);
  };
  return (
    <div className="fq-ll-stepper">
      <label htmlFor={`${id}-input`}>{label}</label>
      <div>
        <button type="button" className="fq-ll-step" aria-label={`Decrease ${label}`} onClick={() => onSet(clamp(value - 1, min, max))} disabled={value <= min} data-testid={`button-${id}-minus`}><Minus size={16} /></button>
        <input id={id + '-input'} type="number" inputMode="numeric" min={min} max={max} value={draft} placeholder="?" onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} data-testid={'input-' + id} />
        <button type="button" className="fq-ll-step" aria-label={`Increase ${label}`} onClick={() => onSet(clamp(value + 1, min, max))} disabled={value >= max} data-testid={`button-${id}-plus`}><Plus size={16} /></button>
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Builder({ kind, total, st, set, id, title, lineWholes = 1, need = 0 }: { kind: Kind; total?: number; st: St; set: (s: St) => void; id: string; title: string; lineWholes?: number; need?: number }) {
  // Lines usually stop at 12 spaces, but a hundredths target (like 25/100) must still be possible.
  const maxD = kind === 'line' ? Math.max(12, need) : kind === 'set' ? Math.min(total ?? 24, 24) : 100;
  const wholes = kind === 'line' ? lineWholes : st.wholes;
  const pieces = kind === 'set' ? st.d : st.d * wholes;
  const setCount = (c: number) => set({ ...st, count: clamp(c, 0, pieces) });
  const toggle = (i: number) => setCount(st.count === i + 1 ? i : i + 1);
  const per = kind === 'set' && st.d && total ? total / st.d : 0;
  const wrap = st.d > 12;
  return (
    <section className={`fq-ll-builder kind-${kind}`} aria-label={title} data-testid={'model-' + id}>
      <header className="fq-ll-model-head">
        <ModelTag kind={kind} />
        <h4>{title}</h4>
        <p>{MODEL_CONCEPTS[kind]}</p>
      </header>
      <div className="fq-ll-controls">
        <Stepper id={id + '-d'} label={kind === 'set' ? 'Equal groups' : kind === 'line' ? 'Spaces in each whole' : 'Equal pieces in each whole'} value={st.d} min={0} max={maxD}
          onSet={v => set({ ...st, d: v, count: Math.min(st.count, kind === 'set' ? v : v * wholes) })} hint={kind === 'set' ? total + ' dots in all' : 'You pick'} />
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
                  <span className="fq-ll-whole-label">Whole {w + 1}</span>
                  <div className={'fq-ll-bar ' + (wrap ? 'wrap' : '')} style={{ gridTemplateColumns: 'repeat(' + gridColumns(st.d) + ', minmax(0,1fr))' }} role="group" aria-label={'Whole ' + (w + 1) + ', split into ' + st.d + ' equal parts'}>
                    {Array.from({ length: st.d }, (_, p) => {
                      const i = w * st.d + p;
                      return <button key={p} type="button" className={'fq-ll-piece ' + (i < st.count ? 'on' : '')} aria-pressed={i < st.count} aria-label={'Part ' + (p + 1) + ' of ' + st.d + ' equal parts' + (i < st.count ? ', shaded' : ', not shaded')} onClick={() => toggle(i)} data-testid={'piece-' + id + '-' + i} />;
                    })}
                  </div>
                  {w === 0 && <span className="fq-ll-part-marker" style={{ gridTemplateColumns: `repeat(${gridColumns(st.d)}, minmax(0,1fr))` }}><b>PART</b></span>}
                </div>
              ))}
              <span className="fq-ll-part-guide"><i aria-hidden="true" /> Part · tap a section to shade that many equal parts</span>
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
                  aria-label={'Tick ' + i + ' of ' + (st.d * wholes) + ' equal spaces'} aria-pressed={i === st.count} onClick={() => setCount(i)} data-testid={'tick-' + id + '-' + i}>
                  <span>{i % st.d === 0 ? i / st.d : ''}</span>
                </button>
              ))}
            </div>
          )}
      </div>
      <p className="fq-ll-readout" aria-live="polite" data-testid={'text-' + id + '-readout'}>
        {st.d ? <>You made <Frac n={st.count} d={st.d} /> · {kind === 'line' ? plural(st.count, 'jump', 'jumps') : kind === 'set' ? plural(st.count, 'group picked', 'groups picked') : plural(st.count, 'piece shaded', 'pieces shaded')}</> : 'Nothing built yet'}
      </p>
    </section>
  );
}

type Outcome = { supported: boolean; attempts: number };
function CheckRunner({ check, onHelp, onPass, review, headingRef, onWrong, onSuccess }: {
  check: BuildCheck; review: boolean;
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
  const [done, setDone] = useState(false);
  const secondTarget: LearningModel = { ...t, kind: tk, total: undefined, wholes: Math.max(1, Math.ceil(t.n / t.d)) };
  const primaryValidation = validate(k, t, a);
  const secondaryValidation = validate(tk, secondTarget, b);
  const primaryReady = primaryValidation.msgs.length === 0;
  const secondaryReady = primaryReady && secondaryValidation.msgs.length === 0;
  const stage = getBuildCheckStage(primaryReady, secondaryReady);
  const sig = JSON.stringify([a, b, reason]);
  const locked = failedSig === sig;
  const transLabel = tk === 'line' ? 'Now show it on a number line' : 'Now show it with a bar';
  const modelUnit = k === 'line' ? 'spaces' : k === 'set' ? 'groups' : 'parts';
  const hintTexts = [
    k === 'set' ? `Share ${t.total ?? t.d} objects into ${t.d} equal groups.` : `Split each whole into ${t.d} equal ${modelUnit}.`,
    `${k === 'line' ? 'Mark' : k === 'set' ? 'Select' : 'Shade'} ${plural(t.n, k === 'line' ? 'jump' : k === 'set' ? 'group' : 'part', `${k === 'line' ? 'jump' : k === 'set' ? 'group' : 'part'}s`)}.`,
  ];

  const updatePrimary = (next: St) => {
    if (JSON.stringify(next) === JSON.stringify(a)) return;
    setA(next); setB(blank()); setReason(null); setErrs([]); setFailedSig(null); setDone(false);
  };
  const updateSecondary = (next: St) => {
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
      setErrs(msgs); setFailedSig(sig); setSupported(true); setAttempts(n => n + 1); onHelp('error', Array.from(new Set(keys))); onWrong?.();
    } else { setErrs([]); setDone(true); onSuccess?.(); onPass({ supported, attempts: attempts + 1 }); }
  };
  const hint = () => { setHints(h => h + 1); setSupported(true); onHelp('hint', []); };

  return (
    <div className="fq-ll-check" data-testid={`check-${check.id}`}>
      <p className="fq-ll-kicker">{check.transfer ? (review ? 'Review' : 'Step 2 · On your own') : 'Step 1 · Build it'}</p>
       <h3 ref={headingRef} tabIndex={-1}><LearningText text={check.prompt} speak /></h3>
       <Builder kind={k} total={t.total} st={a} set={updatePrimary} id={`${check.id}-a`} title={`Build it ${k === 'set' ? 'as a set of equal groups' : k === 'line' ? 'on a number line' : 'with a bar model'}`} lineWholes={lineWholes} need={t.d} />
       {!primaryReady && a.d > 0 && primaryValidation.msgs[0] && <p className="fq-ll-model-status retry" role="status" data-testid={`status-primary-${check.id}`}>{primaryValidation.msgs[0]}</p>}
       {primaryReady && <div className="fq-ll-model-status success" role="status" data-testid={`status-primary-${check.id}`}><Check size={18} /><LearningText text={getModelFeedback(t, k)} speak /></div>}
       {stage !== 'primary' && <>
         <div className="fq-ll-translate">
           <strong>{transLabel}</strong>
           <span>Show the same amount with a new model.</span>
         </div>
         <Builder kind={tk} st={b} set={updateSecondary} id={`${check.id}-b`} title={`Show the same amount ${tk === 'line' ? 'on a number line' : 'with a bar model'}`} lineWholes={lineWholes} need={t.d} />
         {!secondaryReady && b.d > 0 && secondaryValidation.msgs[0] && <p className="fq-ll-model-status retry" role="status" data-testid={`status-secondary-${check.id}`}>{secondaryValidation.msgs[0]}</p>}
         {secondaryReady && <div className="fq-ll-model-status success" role="status" data-testid={`status-secondary-${check.id}`}><Check size={18} /><LearningText text={getModelFeedback(t, tk)} speak /></div>}
       </>}
       {stage === 'reason' && <fieldset className="fq-ll-reasons" data-testid={`reasons-${check.id}`}>
         <legend>Both models match. Which idea explains why?</legend>
         {check.reasons.map((r, i) => (
           <label key={i} className={reason === i ? 'on' : ''}>
             <input type="radio" name={`reason-${check.id}`} checked={reason === i} onChange={() => { setReason(i); setErrs([]); setFailedSig(null); }} data-testid={`radio-reason-${check.id}-${i}`} />
             <span><LearningText text={r} interactiveTerms={false} /></span>
           </label>
         ))}
       </fieldset>}
       {hints > 0 && <div className="fq-ll-hint" data-testid={`text-hint-${check.id}`}><strong>Hint:</strong> <LearningText text={hintTexts[Math.min(hints, 2) - 1]} speak /></div>}
      {errs.length > 0 && (
        <div className="fq-ll-feedback retry" role="alert" data-testid={`status-errors-${check.id}`}>
          <CircleHelp size={20} />
          <div>
            <strong>{locked ? 'Not yet! Fix these, then check again.' : 'Changed something? Check again.'}</strong>
             <ul>{errs.map((e, i) => <li key={i}><LearningText text={e} speak /></li>)}</ul>
          </div>
        </div>
      )}
       {done && <div className="fq-ll-feedback ok" role="status" data-testid={`status-pass-${check.id}`}><Check size={20} /><div><strong>Both models show the same amount.</strong><details className="fq-ll-full-explanation"><summary>Read the full explanation</summary><LearningText text={check.explanation} speak /></details></div></div>}
      {done && <ModelPair n={t.n} d={t.d} />}
      <div className="fq-ll-actions">
        <button type="button" className="fq-hint-button" onClick={hint} disabled={done} data-testid={`button-hint-${check.id}`}><Lightbulb size={17} /> {hints ? 'Another hint' : 'Hint'}</button>
         {stage === 'reason' && <button type="button" className="fq-button" onClick={submit} disabled={locked || done || reason === null} data-testid={`button-check-${check.id}`}>Check <Check size={17} /></button>}
      </div>
      {done && review && (
        <button type="button" className="fq-button secondary fq-ll-finish" data-testid="button-review-finish" onClick={() => onPass({ supported, attempts: -1 })}>Finish review</button>
      )}
    </div>
  );
}

export function Row({ p, rec, onEdit, onCheck, onHint, onNewQuestion, numberLabel, onWrong, onSuccess }: {
  p: WorksheetProblem; rec: LearningRecord; onEdit: (v: string) => void; onCheck: () => void; onHint: () => void;
  onNewQuestion?: () => void; numberLabel?: string; onWrong?: () => void; onSuccess?: () => void;
}) {
  const e = rec.worksheet[p.id]; const draft = e?.draft ?? '';
  const ok = !!e && e.checkedValue === e.draft && answerMatches(p, draft);
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const ph = p.form === 'word' ? 'yes or no' : p.form === 'symbol' ? '< = >' : p.form === 'mixed' ? '1 2/3' : p.form === 'decimal' ? '0.4' : p.form === 'ordered' ? '1/4, 2/4, 3/4' : 'Your answer';
  const fractionInput = usesFractionEntry(p);
  const promptId = `ws-prompt-${p.id}`;
  const targetBar = p.modelRequired && p.model?.kind === 'bar' ? p.model : null;
  const gated = !!targetBar || !!(p.area && p.areaTask) || !!p.rulerTask || !!p.linePlotTask || !!p.scaleTask;
  const [modelReady, setModelReady] = useState(!gated);
  const answerEnabled = canEnterWorksheetAnswer(gated, modelReady);
  const modelStatusId = `ws-model-status-${p.id}`;
  const inputDescription = [promptId, `ws-fb-${p.id}`, ...(gated ? [modelStatusId] : [])].join(' ');
  const modelKey = JSON.stringify([p.rulerTask, p.linePlotTask, p.scaleTask, p.areaTask]);
  useEffect(() => {
    setModelReady(!gated);
    setWrong(null);
    setOpen(false);
  }, [gated, modelKey, p.answer, p.prompt]);
  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!draft.trim() || !answerEnabled) return;
    const correct = answerMatches(p, draft);
    setWrong(correct ? null : draft);
    if (correct) onSuccess?.();
    else onWrong?.();
    onCheck();
  };
  return (
    <li className={'fq-ll-row ' + (ok ? 'ok' : '')} data-testid={'row-worksheet-' + p.id}>
      <form onSubmit={submit}>
        <div className="fq-ll-row-question">
          <span className="fq-ll-num" aria-hidden="true">{numberLabel ?? p.id.slice(1)}</span>
          <span id={promptId}><LearningText text={p.prompt} speak /></span>
        </div>
        {/* For counting and shading, the tappable bar is the picture, so it is not drawn twice. */}
        {p.model && (!p.task || p.task.kind === 'copy') && <Preview m={p.model} />}
        {p.area && (p.areaTask
          ? <AreaShade figure={p.area} task={p.areaTask} disabled={ok} statusId={modelStatusId} onMatchChange={setModelReady} />
          : <div className="fq-ll-preview fq-area-preview"><AreaSvg figure={p.area} /></div>)}
        {p.rulerTask && <RulerInteraction key={modelKey} task={p.rulerTask} disabled={ok} onReady={setModelReady} />}
        {p.linePlotTask && <LinePlotInteraction key={modelKey} task={p.linePlotTask} disabled={ok} onReady={setModelReady} />}
        {p.scaleTask && <ScaleInteraction key={modelKey} id={p.id} task={p.scaleTask} disabled={ok} onReady={setModelReady} />}
        {targetBar && <WorksheetBarCopy target={targetBar} task={p.task} disabled={ok} statusId={modelStatusId} onMatchChange={setModelReady} />}
        <div className="fq-ll-answer" aria-busy={!answerEnabled}>
          {fractionInput ? (
            <FractionEntry
              id={`ws-${p.id}`}
              value={draft}
              onChange={value => { setWrong(null); onEdit(value); }}
              describedBy={inputDescription}
              disabled={!answerEnabled}
            />
          ) : (
            <input id={'ws-' + p.id} type="text" value={draft} placeholder={ph} autoComplete="off" maxLength={200} disabled={!answerEnabled} onChange={ev => { setWrong(null); onEdit(ev.target.value); }} data-testid={'input-worksheet-' + p.id} aria-labelledby={promptId} aria-describedby={inputDescription} />
          )}
          <button type="submit" className="fq-button" disabled={!draft.trim() || ok || !answerEnabled} data-testid={'button-check-worksheet-' + p.id}>{ok ? 'Correct' : 'Check'}</button>
          <button type="button" className="fq-ll-hintbtn" aria-expanded={open} onClick={() => { if (!open) onHint(); setOpen(o => !o); }} data-testid={'button-hint-worksheet-' + p.id}><Lightbulb size={16} /> Hint</button>
        </div>
        <div id={'ws-fb-' + p.id} aria-live="polite">
          {ok && <p className="fq-ll-ws ok" data-testid={'status-worksheet-' + p.id}><Check size={15} /> Correct!
            {onNewQuestion && <button type="button" className="fq-ll-hintbtn fq-ll-newq" onClick={onNewQuestion} data-testid={'button-new-question-' + p.id}><RotateCcw size={15} /> New question</button>}</p>}
          {!ok && wrong === draft && <p className="fq-ll-ws bad" data-testid={'status-worksheet-' + p.id}>Not yet. <LearningText text={p.hint} speak /></p>}
          {!ok && e && e.attempts > 0 && e.checkedValue === undefined && wrong !== draft && draft.trim() && <p className="fq-ll-ws" data-testid={'status-worksheet-' + p.id}>Changed. Press Check.</p>}
          {open && <p className="fq-ll-ws hint" data-testid={'text-hint-worksheet-' + p.id}><LearningText text={p.hint} speak /></p>}
        </div>
      </form>
    </li>
  );
}

export default function LearningLab({ missionId, progress, onChange, onFinish, onBack, onPaper, onRedo, review = false, onWrong, onSuccess }: {
  missionId: string; progress: Progress; onChange: (progress: Progress) => void; onFinish: (nextProgress?: Progress) => void; onBack: () => void; onPaper?: () => void;
  /** Offered once the lesson is finished: practice a part again with new numbers. */
  onRedo?: (part: RedoPart) => void; review?: boolean; onWrong?: () => void; onSuccess?: () => void;
}) {
  const ref = useRef(progress); ref.current = progress;
  const checks = getBuildChecks(missionId);
  const sheet = getWorksheet(missionId);
  const [notice, setNotice] = useState('');
  const [reviewPassed, setReviewPassed] = useState(false);
  const [reviewSupported, setReviewSupported] = useState(() => (getLearningRecord(progress, missionId).reviewSupportedUntil ?? 0) > Date.now());
  const rec = getLearningRecord(progress, missionId);
  const activeCheckIndex = checks.findIndex(c => !rec.checks[c.id]?.passed);
  const activeCheckId = !review && activeCheckIndex !== -1 ? checks[activeCheckIndex].id : null;
  const activeCheckHeading = useRef<HTMLHeadingElement | null>(null);
  const previousActiveCheckId = useRef<string | null>(null);
  const save = (r: LearningRecord) => { const p = updateLearning(ref.current, missionId, r); ref.current = p; onChange(p); };
  const cur = () => getLearningRecord(ref.current, missionId);
  const bump = (r: LearningRecord, keys: string[]): LearningRecord => ({
    ...r, helpUses: r.helpUses + (keys.length === 0 ? 1 : 1),
    misconceptions: keys.reduce((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), r.misconceptions),
  });

  useEffect(() => {
    const previousId = previousActiveCheckId.current;
    previousActiveCheckId.current = activeCheckId;
    if (!previousId || !activeCheckId || previousId === activeCheckId) return;

    requestAnimationFrame(() => {
      const heading = activeCheckHeading.current;
      if (!heading) return;
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
  }, [activeCheckId]);

  if (review) {
    const check = getReviewCheck(missionId, progress.reviewQueue.find(item => item.missionId === missionId)?.reviewCount ?? 0);
    return (
      <div className="fq-ll" data-testid="learning-lab-review">
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
  const count = worksheetCount(rec, missionId);
  const sum = learningSummary(rec);
  const reteachPlans = targetedPracticePlans(missionId, rec);
  const reteachProgress = targetedPracticeCount(missionId, rec);
  const gate = hasLearningGate(progress, missionId);
  const reqs = [
    { label: 'Practice', done: !!rec.practiceDone },
    { label: 'Build it', done: !!rec.checks.build?.passed },
    { label: 'On your own', done: !!rec.checks.transfer?.passed },
    { label: `Worksheet ${count}/12`, done: count === 12 },
    ...(reteachProgress.total ? [{ label: `Extra practice ${reteachProgress.done}/${reteachProgress.total}`, done: reteachProgress.done === reteachProgress.total }] : []),
  ];
  const next = reqs.find(r => !r.done);

  return (
    <div className="fq-ll" data-testid="learning-lab">
      <button className="fq-back" onClick={onBack} data-testid="button-lab-back"><ArrowLeft size={17} /> Back</button>
      <header className="fq-ll-head">
        <span className="fq-ll-badge">Learning lab</span>
         <h2>Build it, then see it another way</h2>
         <p>Make one model first. When it matches, show the same amount another way.</p>
        <div className="fq-ll-print" role="group" aria-label="Print">
          <PrintMenu missionId={missionId} record={rec} />
          {onPaper && <button type="button" className="fq-button ghost" onClick={onPaper} data-testid="button-check-paper"><ClipboardCheck size={17} /> Check my paper</button>}
        </div>
      </header>

      <LessonTeachingSupport missionId={missionId} />

      <ol className="fq-ll-steps" aria-label="Lab progress" data-testid="list-lab-steps">
        {checks.map((c, i) => {
          const e = rec.checks[c.id];
          return <li key={c.id} className={e?.passed ? 'done' : i === idx ? 'now' : ''} data-testid={`step-${c.id}`}>
            {e?.passed ? <Check size={15} /> : i + 1}<span>{i === 0 ? 'Build it' : 'On your own'}{e?.passed ? (e.supported ? ' · with help' : ' · solo') : ''}</span></li>;
        })}
        <li className={idx === -1 ? (count === 12 ? 'done' : 'now') : ''}>3<span>Worksheet {count}/12</span></li>
        {reteachProgress.total > 0 && <li className={reteachProgress.done === reteachProgress.total ? 'done' : ''}>4<span>Extra practice {reteachProgress.done}/{reteachProgress.total}</span></li>}
      </ol>

      {gate && onRedo && (
        <section className="fq-ll-redo" aria-labelledby="redo-title" data-testid="section-redo">
          <h3 id="redo-title"><RotateCcw size={18} /> Do it again</h3>
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

      {notice && idx !== -1 && <div className="fq-ll-feedback ok" role="status" data-testid="status-check-saved"><Check size={20} /><div>{notice}</div></div>}

      {idx !== -1 && (
        <CheckRunner key={checks[idx].id} review={false} check={checks[idx]}
          headingRef={activeCheckHeading}
          onWrong={onWrong}
          onSuccess={onSuccess}
          onHelp={(kind, keys) => {
            const r = bump(cur(), keys); const id = checks[idx].id; const old = r.checks[id];
            save({ ...r, checks: { ...r.checks, [id]: { passed: false, supported: true, attempts: (old?.attempts ?? 0) + (kind === 'error' ? 1 : 0) } } });
          }}
          onPass={o => {
            const r = cur(); const id = checks[idx].id; const old = r.checks[id];
            save({ ...r, checks: { ...r.checks, [id]: { passed: true, supported: !!old?.supported || o.supported, attempts: (old?.attempts ?? 0) + 1 } } });
            setNotice(id === 'build' ? 'Great! Next, try a new one on your own.' : 'Great! Your worksheet is ready.');
          }} />
      )}

      {idx === -1 && (
        <section className="fq-ll-sheet" aria-labelledby="ws-title" data-testid="section-worksheet">
          <div className="fq-ll-sheet-head">
            <h3 id="ws-title">Worksheet</h3>
            <div className="fq-ll-meter" role="progressbar" aria-valuemin={0} aria-valuemax={12} aria-valuenow={count} aria-label="Worksheet problems correct" data-testid="progress-worksheet">
              <b style={{ width: `${(count / 12) * 100}%` }} /><span>{count} of 12 checked</span>
            </div>
          </div>
          <ol className="fq-ll-rows">
            {sheet.map(p => (
              <Row key={p.id} p={p} rec={rec}
                onEdit={v => save(editWorksheet(cur(), p.id, v))}
                onCheck={() => save(checkWorksheet(cur(), p))}
                onWrong={onWrong}
                onSuccess={onSuccess}
                onHint={() => { const r = cur(); const e = r.worksheet[p.id] ?? { draft: '', attempts: 0, supported: false };
                  save({ ...r, helpUses: r.helpUses + 1, worksheet: { ...r.worksheet, [p.id]: { ...e, supported: true } } }); }} />
            ))}
          </ol>
        </section>
      )}

      {reteachPlans.length > 0 && (
        <section className="fq-ll-reteach" aria-labelledby="reteach-title" data-testid="section-targeted-reteach">
          <h3 id="reteach-title">Make this idea clearer</h3>
          <p>One idea has been tricky more than once: use each new model, then enter the answer. These extra checks help make the idea stick.</p>
          {reteachPlans.map((plan, planIndex) => (
            <div className="fq-ll-reteach-plan" key={plan.signal} data-testid={`targeted-reteach-${planIndex + 1}`}>
              <h4>{plan.signal.length > 110 ? `${plan.signal.slice(0, 107).trimEnd()}…` : plan.signal}</h4>
              <ol className="fq-ll-rows">
                {plan.problems.map((problem, problemIndex) => (
                  <Row key={problem.id} p={problem} rec={rec} numberLabel={`R${problemIndex + 1}`}
                    onEdit={value => save(editWorksheet(cur(), problem.id, value))}
                    onCheck={() => save(checkWorksheet(cur(), problem, false))}
                    onWrong={onWrong}
                    onSuccess={onSuccess}
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

      <section className="fq-ll-summary" aria-labelledby="sum-title" data-testid="section-learning-summary">
        <h3 id="sum-title">How you're doing</h3>
        <ul className="fq-ll-reqs" data-testid="list-requirements">
          {reqs.map(r => <li key={r.label} className={r.done ? 'done' : ''}>{r.done ? <Check size={14} /> : <span className="dot" />}{r.label}</li>)}
        </ul>
        <p data-testid="text-next-level">{gate ? 'All done! The next lesson is open.' : `Next up: ${next ? next.label : 'finish the last steps'}.`}</p>
        <dl>
          <div><dt>Done on my own</dt><dd data-testid="text-independent-checks">{sum.independentChecks}</dd></div>
          <div><dt>On your own</dt><dd data-testid="text-transfer">{sum.transfer}</dd></div>
          <div><dt>Hints used</dt><dd data-testid="text-help-uses">{sum.helpUses}</dd></div>
          <div><dt>Remembered later</dt><dd data-testid="text-retention">{sum.retention}</dd></div>
        </dl>
        <h4>Things to practice</h4>
        {sum.misconceptions.length ? (
          <ul className="fq-ll-patterns" data-testid="list-misconceptions">{sum.misconceptions.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}</ul>
        ) : <p className="fq-ll-note" data-testid="text-no-misconceptions">Nothing yet. Nice!</p>}
        <button className="fq-button secondary" disabled={!gate} onClick={() => gate && onFinish()} data-testid="button-lab-finish">Finish lesson</button>
      </section>
    </div>
  );
}

/** A second try at a finished lesson's builds or worksheet, with new numbers. Practice only: it is saved apart
    from the lesson's own answers, so completion, unlocks and first-try results never change. */
export function RedoLab({ missionId, progress, onChange, onBack, onWrong, onSuccess }: {
  missionId: string; progress: Progress; onChange: (progress: Progress) => void; onBack: () => void; onWrong?: () => void; onSuccess?: () => void;
}) {
  const ref = useRef(progress); ref.current = progress;
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
  const idx = checks.findIndex(c => !redo.checks[c.id]?.passed);
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
              onPass={o => change(r => { const id = checks[idx].id; const old = r.checks[id];
                return { ...r, checks: { ...r.checks, [id]: { passed: true, supported: !!old?.supported || o.supported, attempts: (old?.attempts ?? 0) + 1 } } }; })} />
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
            {rows.map(p => (
              <Row key={`${p.id}-${redo.round}-${redo.rowRounds[p.id] ?? 0}`} p={p} rec={asRecord(redo.worksheet)}
                onEdit={v => change(r => ({ ...r, worksheet: editWorksheet(asRecord(r.worksheet), p.id, v).worksheet }))}
                onCheck={() => { const r = cur(); const next = checkRedoRow(r, p); if (next.redo) save(redoDone(missionId, next.redo) ? finishRedo(next) : next); }}
                onWrong={onWrong}
                onSuccess={onSuccess}
                onHint={() => change(r => { const e = r.worksheet[p.id] ?? { draft: '', attempts: 0, supported: false };
                  return { ...r, worksheet: { ...r.worksheet, [p.id]: { ...e, supported: true } } }; })}
                onNewQuestion={() => change(r => { const { [p.id]: _old, ...worksheet } = r.worksheet;
                  return { ...r, worksheet, rowRounds: { ...r.rowRounds, [p.id]: (r.rowRounds[p.id] ?? 0) + 1 } }; })} />
            ))}
          </ol>
        </section>
      )}

      {done && (
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
