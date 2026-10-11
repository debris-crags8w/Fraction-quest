import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleHelp, Lightbulb, Minus, Plus, Printer, RotateCcw } from 'lucide-react';
import { numberLineWholeCount, type Progress } from './game';
import { answerMatches, getBuildChecks, getReviewCheck, getWorksheet, type BuildCheck, type LearningModel, type WorksheetProblem } from './learning-content';
import {
  checkWorksheet, editWorksheet, getLearningRecord, hasLearningGate, learningSummary, updateLearning, worksheetCount,
  type LearningRecord,
} from './learning';
import { denomColor } from './fun-ui';
import { MODEL_CONCEPTS, ModelPair, ModelTag } from './models';
import PrintWorksheet, { type PrintMode } from './PrintWorksheet';
import './learning-lab.css';

type Kind = LearningModel['kind'];
type St = { d: number; wholes: number; count: number };
const blank = (): St => ({ d: 0, wholes: 1, count: 0 });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)));

const M = {
  parts: 'Chose a different number of equal parts than the target',
  count: 'Selected the wrong number of pieces, groups or jumps',
  wholes: 'Used the wrong number of wholes',
  trans: 'Second representation did not keep the same fraction',
  reason: 'Reasoning did not match the model',
};

function validate(kind: Kind, t: LearningModel, s: St, label: string): { msgs: string[]; keys: string[] } {
  const msgs: string[] = []; const keys: string[] = [];
  const unit = kind === 'line' ? 'spaces' : kind === 'set' ? 'groups' : 'pieces';
  if (s.d === 0) return { msgs: [`${label}: choose how many equal ${unit} to make first.`], keys: [M.parts] };
  if (kind === 'set') {
    const total = t.total ?? 0;
    if (total % s.d !== 0) { msgs.push(`${label}: ${total} objects cannot be shared into ${s.d} equal groups. Try a group count that leaves none over.`); keys.push(M.parts); }
  }
  if (s.d !== t.d && !msgs.length) { msgs.push(`${label}: ${s.d > t.d ? 'too many' : 'too few'} equal ${unit}. Reread the prompt, then change the partition.`); keys.push(M.parts); }
  if (kind !== 'set' && s.wholes !== t.wholes) { msgs.push(`${label}: ${s.wholes > t.wholes ? 'fewer wholes are needed' : 'more whole bars or line lengths are needed'} to hold this amount.`); keys.push(M.wholes); }
  if (s.count !== t.n && s.d === t.d) { msgs.push(`${label}: you have ${s.count > t.n ? 'more' : 'fewer'} than the target. Count ${kind === 'line' ? 'jumps from zero' : kind === 'set' ? 'selected groups' : 'shaded pieces'} again.`); keys.push(M.count); }
  return { msgs, keys };
}

function Frac({ n, d }: { n: number; d: number }) { return <span className="fq-ll-frac" aria-label={`${n} over ${d}`}>{n}/{d}</span>; }

/* Read-only preview for worksheet visuals */
function Preview({ m }: { m: LearningModel }) {
  return (
    <div className="fq-ll-preview-wrap"><ModelTag kind={m.kind} />
    <div className="fq-ll-preview" style={{ '--piece': denomColor(m.d) } as CSSProperties} role="img" aria-label={m.kind === 'set' ? `${m.n} of ${m.d} groups selected from ${m.total} objects` : `${m.d} equal parts per whole, marked after ${m.n} parts`}>
      {m.kind === 'line' ? (
        <div className="fq-ll-pline">{Array.from({ length: m.d * m.wholes + 1 }, (_, i) => <i key={i} className={i === m.n ? 'on' : ''} style={{ left: `${(i / (m.d * m.wholes)) * 100}%` }}>{i % m.d === 0 && <span>{i / m.d}</span>}</i>)}</div>
      ) : (
        m.kind === 'set' ? <div className="fq-ll-groups">{Array.from({ length: m.d }, (_, g) => <div className={`fq-ll-group ${g < m.n ? 'on' : ''}`} key={g}>
          {Array.from({ length: (m.total ?? 0) / m.d }, (_, i) => <i key={i} />)}
        </div>)}</div> :
        Array.from({ length: m.wholes }, (_, w) => <div className="fq-ll-pcells" style={{ gridTemplateColumns: `repeat(${gridColumns(m.d)}, minmax(0,1fr))` }} key={w} aria-label={`Whole ${w + 1}`}>
          {Array.from({ length: m.d }, (_, i) => <i key={i} className={w * m.d + i < m.n ? 'on' : ''} />)}
        </div>)
      )}
    </div></div>
  );
}
function gridColumns(d: number): number {
  if (d <= 12) return d;
  for (let columns = 10; columns >= 2; columns--) if (d % columns === 0) return columns;
  return d;
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

function Builder({ kind, total, st, set, id, title, lineWholes = 1 }: { kind: Kind; total?: number; st: St; set: (s: St) => void; id: string; title: string; lineWholes?: number }) {
  const maxD = kind === 'line' ? 12 : kind === 'set' ? Math.min(total ?? 24, 24) : 100;
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
          onSet={v => set({ ...st, d: v, count: Math.min(st.count, kind === 'set' ? v : v * wholes) })} hint={kind === 'set' ? total + ' objects in all' : 'You choose the partition'} />
        {kind === 'bar' && <Stepper id={id + '-wholes'} label="Whole bars" value={st.wholes} min={1} max={3}
          onSet={v => set({ ...st, wholes: v, count: Math.min(st.count, st.d * v) })} />}
        <Stepper id={id + '-count'} label={kind === 'line' ? 'Jumps from 0' : kind === 'set' ? 'Groups selected' : 'Pieces shaded'} value={st.count} min={0} max={Math.max(pieces, 0)} onSet={setCount} />
      </div>
      <div className="fq-ll-stage" style={{ '--piece': denomColor(st.d) } as CSSProperties}>
        {kind === 'line' && <p className="fq-ll-line-guide" data-testid={'text-line-guide-' + id}>{wholes === 1 ? 'The whole interval runs from 0 to 1. Each equal space is one jump.' : 'Each whole is one interval: ' + Array.from({ length: wholes + 1 }, (_, i) => i).join(' to ') + '.'}</p>}
        {st.d === 0 ? <p className="fq-ll-empty">Nothing here yet. Choose how many equal parts, and the model appears.</p> :
          kind === 'bar' ? Array.from({ length: st.wholes }, (_, w) => (
            <div key={w} className={'fq-ll-bar ' + (wrap ? 'wrap' : '')} style={{ gridTemplateColumns: 'repeat(' + gridColumns(st.d) + ', minmax(0,1fr))' }} role="group" aria-label={'Whole ' + (w + 1)}>
              {Array.from({ length: st.d }, (_, p) => {
                const i = w * st.d + p;
                return <button key={p} type="button" className={'fq-ll-piece ' + (i < st.count ? 'on' : '')} aria-pressed={i < st.count} aria-label={'Piece ' + (i + 1) + ' of ' + pieces} onClick={() => toggle(i)} data-testid={'piece-' + id + '-' + i} />;
              })}
            </div>
          )) : kind === 'set' ? (
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
        {st.d ? <>Your model: <Frac n={st.count} d={st.d} /> · {st.count} {kind === 'line' ? 'jumps from zero' : kind === 'set' ? 'groups selected' : 'pieces shaded'}</> : 'Your model: not built'}
      </p>
    </section>
  );
}

type Outcome = { supported: boolean; attempts: number };
function CheckRunner({ check, onHelp, onPass, review }: {
  check: BuildCheck; review: boolean;
  onHelp: (kind: 'hint' | 'error', keys: string[]) => void; onPass: (o: Outcome) => void;
}) {
  const t = check.target; const k = t.kind; const lineWholes = numberLineWholeCount(t.n, t.d);
  const tk: Kind = k === 'line' ? 'bar' : 'line';
  const [a, setA] = useState<St>(blank()); const [b, setB] = useState<St>(blank());
  const [reason, setReason] = useState<number | null>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const [failedSig, setFailedSig] = useState<string | null>(null);
  const [hints, setHints] = useState(0); const [supported, setSupported] = useState(false); const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const sig = JSON.stringify([a, b, reason]);
  const locked = failedSig === sig;
  const transLabel = k === 'bar' ? 'Now show the same fraction on a number line' : k === 'line' ? 'Now show the same fraction as a bar' : 'Now show the same fraction on a number line';
  const hintTexts = ['Decide the unit first: how many equal parts make one whole? Then count the selected parts.', check.explanation];

  const submit = () => {
    if (locked || done) return;
    const r1 = validate(k, t, a, 'Model');
    const r2 = validate(tk, { ...t, kind: tk, total: undefined, wholes: Math.max(1, Math.ceil(t.n / t.d)) }, b, 'Second representation');
    const keys = [...r1.keys, ...r2.keys.map(() => M.trans)];
    const msgs = [...r1.msgs, ...r2.msgs];
    if (reason === null) { msgs.push('Choose the reason that explains your model.'); keys.push(M.reason); }
    else if (reason !== check.correctReason) { msgs.push('That reason does not match your build. Change your reason or model, then check again.'); keys.push(M.reason); }
    if (msgs.length) {
      setErrs(msgs); setFailedSig(sig); setSupported(true); setAttempts(n => n + 1); onHelp('error', Array.from(new Set(keys)));
    } else { setErrs([]); setDone(true); onPass({ supported, attempts: attempts + 1 }); }
  };
  const hint = () => { setHints(h => h + 1); setSupported(true); onHelp('hint', []); };

  return (
    <div className="fq-ll-check" data-testid={`check-${check.id}`}>
      <p className="fq-ll-kicker">{check.transfer ? (review ? 'Fresh review round' : 'Check 2 · independent transfer') : 'Check 1 · guided build'}</p>
      <h3>{check.prompt}</h3>
      <Builder kind={k} total={t.total} st={a} set={setA} id={`${check.id}-a`} title={`Build it ${k === 'set' ? 'as a set of equal groups' : k === 'line' ? 'on a number line' : 'with a bar model'}`} lineWholes={lineWholes} />
      <div className="fq-ll-translate">
        <strong>{transLabel}</strong>
        <span>{tk === 'line'
          ? `Same fraction, second model: the ${k === 'set' ? 'groups you picked' : 'shaded part of the bar'} should match the distance from 0 on the number line.`
          : 'Same fraction, second model: the distance from 0 on the number line should match the shaded part of the bar.'}</span>
      </div>
      <Builder kind={tk} st={b} set={setB} id={`${check.id}-b`} title={`Show the same fraction ${tk === 'line' ? 'on a number line' : 'with a bar model'}`} lineWholes={lineWholes} />
      <fieldset className="fq-ll-reasons" data-testid={`reasons-${check.id}`}>
        <legend>Which reason explains your model?</legend>
        {check.reasons.map((r, i) => (
          <label key={i} className={reason === i ? 'on' : ''}>
            <input type="radio" name={`reason-${check.id}`} checked={reason === i} onChange={() => setReason(i)} data-testid={`radio-reason-${check.id}-${i}`} />
            <span>{r}</span>
          </label>
        ))}
      </fieldset>
      {hints > 0 && <div className="fq-ll-hint" data-testid={`text-hint-${check.id}`}><strong>Hint:</strong> {hintTexts[Math.min(hints, 2) - 1]}</div>}
      {errs.length > 0 && (
        <div className="fq-ll-feedback retry" role="alert" data-testid={`status-errors-${check.id}`}>
          <CircleHelp size={20} />
          <div><strong>Not yet. Edit your answer and check again.</strong><ul>{errs.map((e, i) => <li key={i}>{e}</li>)}</ul>
            {locked && <p>Edit your model or reason to check again.</p>}</div>
        </div>
      )}
      {done && <div className="fq-ll-feedback ok" role="status" data-testid={`status-pass-${check.id}`}><Check size={20} /><div><strong>Model, translation and reason all agree.</strong> {check.explanation}</div></div>}
      {done && <ModelPair n={t.n} d={t.d} />}
      <div className="fq-ll-actions">
        <button type="button" className="fq-hint-button" onClick={hint} disabled={done} data-testid={`button-hint-${check.id}`}><Lightbulb size={17} /> {hints ? 'Another hint' : 'Need a hint?'}</button>
        <button type="button" className="fq-button" onClick={submit} disabled={locked || done} data-testid={`button-check-${check.id}`}>Check my model <Check size={17} /></button>
      </div>
      {done && review && (
        <button type="button" className="fq-button secondary fq-ll-finish" data-testid="button-review-finish" onClick={() => onPass({ supported, attempts: -1 })}>Finish review</button>
      )}
    </div>
  );
}

function Row({ p, rec, onEdit, onCheck, onHint }: { p: WorksheetProblem; rec: LearningRecord; onEdit: (v: string) => void; onCheck: () => void; onHint: () => void }) {
  const e = rec.worksheet[p.id]; const draft = e?.draft ?? '';
  const ok = !!e && e.checkedValue === e.draft && answerMatches(p, draft);
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const ph = p.form === 'symbol' ? '< = >' : p.form === 'mixed' ? '1 2/3' : p.form === 'decimal' ? '0.4' : p.form === 'ordered' ? '1/4, 2/4, 3/4' : 'Your answer';
  const submit = (event: { preventDefault: () => void }) => { event.preventDefault(); if (!draft.trim()) return; setWrong(answerMatches(p, draft) ? null : draft); onCheck(); };
  return (
    <li className={'fq-ll-row ' + (ok ? 'ok' : '')} data-testid={'row-worksheet-' + p.id}>
      <form onSubmit={submit}>
        <label htmlFor={'ws-' + p.id}><span className="fq-ll-num">{p.id.slice(1)}</span>{p.prompt}</label>
        {p.model && <Preview m={p.model} />}
        <div className="fq-ll-answer">
          <input id={'ws-' + p.id} type="text" value={draft} placeholder={ph} autoComplete="off" maxLength={200} onChange={ev => { setWrong(null); onEdit(ev.target.value); }} data-testid={'input-worksheet-' + p.id} aria-describedby={'ws-fb-' + p.id} />
          <button type="submit" className="fq-button" disabled={!draft.trim() || ok} data-testid={'button-check-worksheet-' + p.id}>{ok ? 'Correct' : 'Check'}</button>
          <button type="button" className="fq-ll-hintbtn" aria-expanded={open} onClick={() => { if (!open) onHint(); setOpen(o => !o); }} data-testid={'button-hint-worksheet-' + p.id}><Lightbulb size={16} /> Hint</button>
        </div>
        <div id={'ws-fb-' + p.id} aria-live="polite">
          {ok && <p className="fq-ll-ws ok" data-testid={'status-worksheet-' + p.id}><Check size={15} /> Checked. You can still edit it; a change needs a new check.</p>}
          {!ok && wrong === draft && <p className="fq-ll-ws bad" data-testid={'status-worksheet-' + p.id}>Not yet. Edit your answer and check again. {p.hint}</p>}
          {!ok && e && e.attempts > 0 && e.checkedValue === undefined && wrong !== draft && draft.trim() && <p className="fq-ll-ws" data-testid={'status-worksheet-' + p.id}>Edited. Press Check to confirm.</p>}
          {open && <p className="fq-ll-ws hint" data-testid={'text-hint-worksheet-' + p.id}>{p.hint}</p>}
        </div>
      </form>
    </li>
  );
}

export default function LearningLab({ missionId, progress, onChange, onFinish, onBack, review = false }: {
  missionId: string; progress: Progress; onChange: (progress: Progress) => void; onFinish: (nextProgress?: Progress) => void; onBack: () => void; review?: boolean;
}) {
  const ref = useRef(progress); ref.current = progress;
  const checks = getBuildChecks(missionId);
  const sheet = getWorksheet(missionId);
  const [notice, setNotice] = useState('');
  const [reviewPassed, setReviewPassed] = useState(false);
  const [reviewSupported, setReviewSupported] = useState(() => (getLearningRecord(progress, missionId).reviewSupportedUntil ?? 0) > Date.now());
  const [printMode, setPrintMode] = useState<PrintMode>('blank');
  const [printRequest, setPrintRequest] = useState(0);
  useEffect(() => {
    if (!printRequest) return;
    // Wait one frame so the chosen print layout is in the page before the print dialog opens.
    const frame = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(frame);
  }, [printRequest]);
  const print = (mode: PrintMode) => { setPrintMode(mode); setPrintRequest((n) => n + 1); };
  const rec = getLearningRecord(progress, missionId);
  const save = (r: LearningRecord) => { const p = updateLearning(ref.current, missionId, r); ref.current = p; onChange(p); };
  const cur = () => getLearningRecord(ref.current, missionId);
  const bump = (r: LearningRecord, keys: string[]): LearningRecord => ({
    ...r, helpUses: r.helpUses + (keys.length === 0 ? 1 : 1),
    misconceptions: keys.reduce((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), r.misconceptions),
  });

  if (review) {
    const check = getReviewCheck(missionId, progress.reviewQueue.find(item => item.missionId === missionId)?.reviewCount ?? 0);
    return (
      <div className="fq-ll" data-testid="learning-lab-review">
        <button className="fq-back" onClick={onBack} data-testid="button-lab-back"><ArrowLeft size={17} /> Back</button>
        <header className="fq-ll-head"><span className="fq-ll-badge"><RotateCcw size={16} /> Later review</span><h2>Show it again, from a blank start</h2>
          <p>Build the new target with fresh pieces. Earlier passes do not carry over.</p></header>
        <CheckRunner key={`review-${missionId}`} review check={check}
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
        {reviewPassed && <p className="fq-ll-note" data-testid="status-review-passed">{reviewSupported ? 'Passed with support. Retention is confirmed only after an independent pass.' : 'Passed independently.'}</p>}
      </div>
    );
  }

  const idx = checks.findIndex(c => !rec.checks[c.id]?.passed);
  const count = worksheetCount(rec, missionId);
  const sum = learningSummary(rec);
  const gate = hasLearningGate(progress, missionId);
  const reqs = [
    { label: 'Lesson practice', done: !!rec.practiceDone },
    { label: 'Guided build', done: !!rec.checks.build?.passed },
    { label: 'Independent transfer', done: !!rec.checks.transfer?.passed },
    { label: `Worksheet ${count}/12`, done: count === 12 },
  ];
  const next = reqs.find(r => !r.done);

  return (
    <div className="fq-ll" data-testid="learning-lab">
      <button className="fq-back" onClick={onBack} data-testid="button-lab-back"><ArrowLeft size={17} /> Back</button>
      <header className="fq-ll-head">
        <span className="fq-ll-badge">Learning lab</span>
        <h2>Build it with your hands, then prove it</h2>
        <p>You choose the equal parts. Nothing is preset, and every model has to agree with your reason.</p>
        <div className="fq-ll-models-intro" aria-label="The two models in this lab">
          <p><ModelTag kind="bar" /> {MODEL_CONCEPTS.bar}</p>
          <p><ModelTag kind="line" /> {MODEL_CONCEPTS.line}</p>
        </div>
        <div className="fq-ll-print" role="group" aria-label="Print">
          <button type="button" className="fq-button ghost" onClick={() => print('blank')} data-testid="button-print-worksheet"><Printer size={17} /> Print worksheet</button>
          <button type="button" className="fq-button ghost" onClick={() => print('answers')} data-testid="button-print-answers"><Printer size={17} /> Print my answers</button>
        </div>
      </header>

      <ol className="fq-ll-steps" aria-label="Lab progress" data-testid="list-lab-steps">
        {checks.map((c, i) => {
          const e = rec.checks[c.id];
          return <li key={c.id} className={e?.passed ? 'done' : i === idx ? 'now' : ''} data-testid={`step-${c.id}`}>
            {e?.passed ? <Check size={15} /> : i + 1}<span>{i === 0 ? 'Guided build' : 'Independent transfer'}{e?.passed ? (e.supported ? ' · with support' : ' · independent') : ''}</span></li>;
        })}
        <li className={idx === -1 ? (count === 12 ? 'done' : 'now') : ''}>3<span>Worksheet {count}/12</span></li>
      </ol>

      {notice && idx !== -1 && <div className="fq-ll-feedback ok" role="status" data-testid="status-check-saved"><Check size={20} /><div>{notice}</div></div>}

      {idx !== -1 && (
        <CheckRunner key={checks[idx].id} review={false} check={checks[idx]}
          onHelp={(kind, keys) => {
            const r = bump(cur(), keys); const id = checks[idx].id; const old = r.checks[id];
            save({ ...r, checks: { ...r.checks, [id]: { passed: false, supported: true, attempts: (old?.attempts ?? 0) + (kind === 'error' ? 1 : 0) } } });
          }}
          onPass={o => {
            const r = cur(); const id = checks[idx].id; const old = r.checks[id];
            save({ ...r, checks: { ...r.checks, [id]: { passed: true, supported: !!old?.supported || o.supported, attempts: (old?.attempts ?? 0) + 1 } } });
            setNotice(id === 'build' ? 'Guided build saved. Next is a new target you build on your own.' : 'Transfer check saved. Your worksheet is ready.');
          }} />
      )}

      {idx === -1 && (
        <section className="fq-ll-sheet" aria-labelledby="ws-title" data-testid="section-worksheet">
          <div className="fq-ll-sheet-head">
            <h3 id="ws-title">Worksheet: type your answers</h3>
            <div className="fq-ll-meter" role="progressbar" aria-valuemin={0} aria-valuemax={12} aria-valuenow={count} aria-label="Worksheet problems correct" data-testid="progress-worksheet">
              <b style={{ width: `${(count / 12) * 100}%` }} /><span>{count} of 12 checked</span>
            </div>
          </div>
          <ol className="fq-ll-rows">
            {sheet.map(p => (
              <Row key={p.id} p={p} rec={rec}
                onEdit={v => save(editWorksheet(cur(), p.id, v))}
                onCheck={() => save(checkWorksheet(cur(), p))}
                onHint={() => { const r = cur(); const e = r.worksheet[p.id] ?? { draft: '', attempts: 0, supported: false };
                  save({ ...r, helpUses: r.helpUses + 1, worksheet: { ...r.worksheet, [p.id]: { ...e, supported: true } } }); }} />
            ))}
          </ol>
        </section>
      )}

      <section className="fq-ll-summary" aria-labelledby="sum-title" data-testid="section-learning-summary">
        <h3 id="sum-title">Your learning evidence</h3>
        <ul className="fq-ll-reqs" data-testid="list-requirements">
          {reqs.map(r => <li key={r.label} className={r.done ? 'done' : ''}>{r.done ? <Check size={14} /> : <span className="dot" />}{r.label}</li>)}
        </ul>
        <p data-testid="text-next-level">{gate ? 'Everything needed to unlock the next level is done.' : `To unlock the next level: ${next ? next.label : 'finish remaining items'}.`}</p>
        <dl>
          <div><dt>Independent checks</dt><dd data-testid="text-independent-checks">{sum.independentChecks}</dd></div>
          <div><dt>Transfer</dt><dd data-testid="text-transfer">{sum.transfer}</dd></div>
          <div><dt>Hints and help</dt><dd data-testid="text-help-uses">{sum.helpUses}</dd></div>
          <div><dt>Retention</dt><dd data-testid="text-retention">{sum.retention}</dd></div>
        </dl>
        <h4>Patterns we are working on</h4>
        {sum.misconceptions.length ? (
          <ul className="fq-ll-patterns" data-testid="list-misconceptions">{sum.misconceptions.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}</ul>
        ) : <p className="fq-ll-note" data-testid="text-no-misconceptions">No stumbles recorded yet.</p>}
        <button className="fq-button secondary" disabled={!gate} onClick={() => gate && onFinish()} data-testid="button-lab-finish">Finish lesson</button>
      </section>
      <PrintWorksheet missionId={missionId} record={rec} mode={printMode} />
    </div>
  );
}
