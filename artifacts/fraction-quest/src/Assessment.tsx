import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Check, RotateCcw } from 'lucide-react';
import { MathText } from './MathText';
import { AnswerTiles } from './AnswerTiles';
import { answerShape } from './answer-shape';
import { useRevealWhen, useScrollTopOn } from './lib/reveal';
import { playHaptic } from './lib/fun';
import { YesNoCards } from './YesNoCards';
import { isYesNoProblem } from './learning-content';
import { AreaShade, AreaSvg } from './AreaModel';
import { BarSvg, LineSvg, SetSvg } from './models';
import './assessment.css';
import { RulerInteraction, LinePlotInteraction, ScaleInteraction } from './LearningLab';
import { WorksheetBarCopy } from './WorksheetBarCopy';
import {
  assessmentResponse, buildAssessmentItems, getAssessmentDefinitions, ASSESSMENT_ITEM_COUNT,
  type AssessmentDefinition, type AssessmentItem,
} from './assessments';
import type { AssessmentAttempt, AssessmentDraft } from './game';
import { LearningListenButton, LearningText } from './LearningText';
import { TaskBar } from './TaskBar';

export function AssessmentHub({ attempts, draft, onStart, onBack }: {
  attempts: AssessmentAttempt[];
  /** A Check-in left partway: its card offers to pick up where the child stopped. */
  draft?: AssessmentDraft;
  /** `fresh`: start again with new questions instead of resuming. */
  onStart: (definition: AssessmentDefinition, fresh?: boolean) => void;
  onBack: () => void;
}) {
  const definitions = useMemo(getAssessmentDefinitions, []);
  const latestById = useMemo(() => new Map(
    [...attempts].sort((a, b) => a.completedAt - b.completedAt).map(attempt => [attempt.assessmentId, attempt]),
  ), [attempts]);
  const units = definitions.filter(item => item.unit !== undefined);
  const grades = definitions.filter(item => item.grade !== undefined);

  const cards = (items: AssessmentDefinition[]) => items.map(definition => {
    const latest = latestById.get(definition.id);
    const correct = latest?.responses.filter(response => response.correct && response.modelBuilt).length ?? 0;
    const checked = latest?.responses.filter(response => response.modelBuilt).length ?? 0;
    return (
      <article className="fq-assessment-card" key={definition.id} data-testid={`assessment-card-${definition.id}`}>
        <div className="fq-assessment-card-copy">
          <span className={`fq-assessment-kind kind-${definition.kind}`}>{definition.unit ? `Unit ${definition.unit}` : `Grade ${definition.grade}`}</span>
          <h3>{definition.title}</h3>
          <p>{definition.description}</p>
          {latest && <p className="fq-assessment-last">Most recent: {correct} of {checked} correct · {new Date(latest.completedAt).toLocaleDateString()}</p>}
          <small>{definition.standards.length} standards · {ASSESSMENT_ITEM_COUNT} model-and-answer questions</small>
        </div>
        {draft?.assessmentId === definition.id ? (
          <div className="fq-assessment-resume">
            <button className="fq-button" onClick={() => onStart(definition)} data-testid={`button-resume-${definition.id}`}>
              Resume · question {draft.responses.length + 1} of {ASSESSMENT_ITEM_COUNT} <ArrowRight size={16} />
            </button>
            <button type="button" className="fq-link-button" onClick={() => onStart(definition, true)} data-testid={`button-restart-${definition.id}`}>Start over</button>
          </div>
        ) : (
          <button className="fq-button" onClick={() => onStart(definition)} data-testid={`button-start-${definition.id}`}>
            {latest ? 'Try again' : 'Start'} {latest ? <RotateCcw size={16} /> : <ArrowRight size={16} />}
          </button>
        )}
      </article>
    );
  });

  return (
    <div className="fq-app">
      <main className="fq-shell fq-assessment-hub fq-appear">
        <button className="fq-back" onClick={onBack} data-testid="button-assessment-back"><ArrowLeft size={17} /> Back to the map</button>
        <header className="fq-assessment-header">
          <span className="fq-eyebrow"><BarChart3 size={15} /> Show what you know</span>
          <h1>Fraction check-ins</h1>
          <p>Build a model, then drag tiles to make each answer. These checks help you see what to practice; they never skip or unlock a lesson.</p>
        </header>
        <section aria-labelledby="unit-checks-title">
          <h2 id="unit-checks-title">Unit check-ins</h2>
          <div className="fq-assessment-list">{cards(units)}</div>
        </section>
        <section aria-labelledby="grade-benchmarks-title">
          <h2 id="grade-benchmarks-title">Grade benchmarks</h2>
          <div className="fq-assessment-list">{cards(grades)}</div>
        </section>
      </main>
    </div>
  );
}

/** Ready = the child has built something (opens the answer box). Correct = it matches the question (recorded, never shown). */
type ReadyFn = (ready: boolean, correct?: boolean) => void;

/** The question's own picture, read-only: the child reads it, so nothing to build. */
function ReadOnlyPicture({ model, onReady }: { model: NonNullable<AssessmentItem['problem']['model']>; onReady: ReadyFn }) {
  useEffect(() => { onReady(true, true); }, [onReady]);
  return (
    <section className="fq-assessment-model fq-assessment-picture" data-testid="assessment-picture">
      {model.kind === 'bar' && <BarSvg n={model.n} d={model.d} wholes={model.wholes} sizes={model.sizes} label={model.sizes ? `A bar cut into ${model.sizes.length} pieces` : 'A bar model'} />}
      {model.kind === 'line' && <LineSvg n={model.n} d={model.d} wholes={model.wholes} jumps={false} label="A number line with a point" />}
      {model.kind === 'set' && <SetSvg n={model.n} d={model.d} total={model.total ?? model.d} />}
    </section>
  );
}

const STRIP_PARTS = Array.from({ length: 11 }, (_, k) => k + 2);

/** Compare and order items: one strip per fraction in the question. Each strip starts as one uncut whole;
    the child chooses its equal parts, then colors. Nothing is pre-cut, so the strips never show the answer. */
function FractionStripsBuilder({ fractions, onReady }: {
  fractions: NonNullable<AssessmentItem['visualFractions']>;
  onReady: ReadyFn;
}) {
  const [parts, setParts] = useState<number[]>(() => fractions.map(() => 0));
  const [shaded, setShaded] = useState<number[][]>(() => fractions.map(() => []));
  const ready = fractions.every((_, index) => parts[index] > 0 && shaded[index].length > 0);
  const correct = fractions.every((fraction, index) => parts[index] === fraction.d && shaded[index].length === fraction.n);
  useEffect(() => { onReady(ready, correct); }, [onReady, ready, correct]);
  const toggle = (fractionIndex: number, partIndex: number) => {
    playHaptic('selection');
    setShaded(current => current.map((list, index) =>
      index !== fractionIndex ? list : list.includes(partIndex) ? list.filter(value => value !== partIndex) : [...list, partIndex]));
  };
  return (
    <section className="fq-assessment-model">
      <p>Build each fraction: choose how many equal parts, then color the parts selected.</p>
      <div className="fq-assessment-strips">
        {fractions.map((fraction, fractionIndex) => (
          <div className="fq-assessment-strip-row" key={`${fraction.n}/${fraction.d}-${fractionIndex}`}>
            <span><MathText text={`${fraction.n}/${fraction.d}`} /></span>
            <select value={parts[fractionIndex]} aria-label={`Equal parts for fraction ${fractionIndex + 1}`} data-testid={`select-assessment-parts-${fractionIndex}`}
              onChange={event => {
                const value = Number(event.target.value);
                if (parts[fractionIndex] === value) return;
                playHaptic('selection');
                setParts(current => current.map((p, i) => i === fractionIndex ? value : p));
                setShaded(current => current.map((list, i) => i === fractionIndex ? [] : list));
              }}>
              <option value={0} disabled>Parts…</option>
              {STRIP_PARTS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <div role="group" aria-label={`Strip for fraction ${fractionIndex + 1}`}>
              {Array.from({ length: Math.max(1, parts[fractionIndex] * fraction.wholes) }, (_, partIndex) => {
                const selected = shaded[fractionIndex].includes(partIndex);
                return (
                  <button type="button" key={partIndex} className={selected ? 'selected' : ''} disabled={!parts[fractionIndex]}
                    aria-label={parts[fractionIndex] ? `Fraction ${fractionIndex + 1}, part ${partIndex + 1} of ${parts[fractionIndex] * fraction.wholes}, ${selected ? 'colored' : 'not colored'}` : 'One whole, choose the parts first'}
                    aria-pressed={selected} onClick={() => toggle(fractionIndex, partIndex)} />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AssessmentModelBuilder({ item, onReady }: { item: AssessmentItem; onReady: ReadyFn }) {
  const problem = item.problem;
  const handleReady = useCallback((ready: boolean, correct?: boolean) => onReady(ready, correct), [onReady]);
  const statusId = `assessment-model-status-${item.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  if (problem.area && problem.areaTask) {
    return <AreaShade figure={problem.area} task={problem.areaTask} disabled={false} statusId={statusId} onMatchChange={handleReady} checkIn />;
  }
  if (problem.rulerTask) return <RulerInteraction key={item.id} task={problem.rulerTask} disabled={false} onReady={handleReady} checkIn />;
  if (problem.linePlotTask) return <LinePlotInteraction key={item.id} task={problem.linePlotTask} disabled={false} onReady={handleReady} checkIn />;
  if (problem.scaleTask) return <ScaleInteraction key={item.id} id={statusId} task={problem.scaleTask} disabled={false} onReady={handleReady} />;
  if (problem.area) return <ReadOnlyArea key={item.id} figure={problem.area} onReady={handleReady} />;
  if (!problem.model) return item.visualFractions ? <FractionStripsBuilder key={item.id} fractions={item.visualFractions} onReady={handleReady} /> : null;
  // The worksheet's own task ("Shade 1 part", "Tap each part to count it"), exactly as in the lesson.
  if (problem.model.kind === 'bar' && problem.task) {
    return <WorksheetBarCopy key={item.id} target={problem.model} task={problem.task} disabled={false} statusId={statusId} onMatchChange={handleReady} />;
  }
  return <ReadOnlyPicture key={item.id} model={problem.model} onReady={handleReady} />;
}

function ReadOnlyArea({ figure, onReady }: { figure: NonNullable<AssessmentItem['problem']['area']>; onReady: ReadyFn }) {
  useEffect(() => { onReady(true, true); }, [onReady]);
  return <section className="fq-assessment-model fq-assessment-picture"><AreaSvg figure={figure} /></section>;
}

export function AssessmentRunner({ definition, seed, resume, onProgress, onComplete, onExit }: {
  definition: AssessmentDefinition; seed: number;
  /** Picking up a Check-in left partway: the answers so far (same seed, so the same questions). */
  resume?: AssessmentDraft;
  /** After each answer but the last: saved, so leaving picks up at the next question. */
  onProgress?: (draft: AssessmentDraft) => void;
  onComplete: (attempt: AssessmentAttempt) => void; onExit: () => void;
}) {
  const items = useMemo(() => buildAssessmentItems(definition, seed), [definition, seed]);
  const resumed = resume && resume.assessmentId === definition.id && resume.seed === seed && resume.responses.length < items.length ? resume : null;
  const [index, setIndex] = useState(resumed?.responses.length ?? 0);
  useScrollTopOn(index);
  const [answer, setAnswer] = useState('');
  const submitRef = useRef<HTMLButtonElement>(null);
  useRevealWhen(submitRef, !!answer.trim());
  const [modelBuilt, setModelBuilt] = useState(false);
  const [modelCorrect, setModelCorrect] = useState(false);
  const [responses, setResponses] = useState<AssessmentAttempt['responses']>(resumed?.responses ?? []);
  const [result, setResult] = useState<AssessmentAttempt | null>(null);
  const [startedAt] = useState(() => resumed?.startedAt ?? Date.now());
  const item = items[index];
  const modelReady = useCallback((ready: boolean, correct = ready) => { setModelBuilt(ready); setModelCorrect(correct); }, []);
  if (result) {
    const correct = result.responses.filter(response => response.correct).length;
    return (
      <div className="fq-app">
        <main className="fq-shell fq-assessment-runner fq-appear" data-testid="assessment-complete">
          <section className="fq-assessment-result">
            <div className="fq-reward-badge" aria-hidden="true"><Check size={42} /></div>
            <span className="fq-eyebrow">Check-in complete</span>
            <h1>You built and answered {items.length} models.</h1>
            <p>{correct} of {items.length} answers were correct. Your progress report will show which standards are ready for more practice.</p>
            <button className="fq-button" onClick={onExit} data-testid="button-assessment-finish">Back to check-ins <ArrowRight size={16} /></button>
          </section>
        </main>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!item || !answer.trim() || !modelBuilt) return;
    const response = assessmentResponse(item, modelCorrect, answer);
    playHaptic(response.correct ? 'correct' : 'retry');
    const nextResponses = [...responses, response];
    if (index === items.length - 1) {
      const attempt: AssessmentAttempt = {
        assessmentId: definition.id, seed, startedAt, completedAt: Date.now(), responses: nextResponses,
      };
      setResponses(nextResponses);
      setResult(attempt);
      onComplete(attempt);
      return;
    }
    setResponses(nextResponses);
    onProgress?.({ assessmentId: definition.id, seed, startedAt, responses: nextResponses });
    setIndex(current => current + 1);
    setAnswer('');
    setModelBuilt(false);
    setModelCorrect(false);
  };

  const promptId = `assessment-prompt-${index + 1}`;
  return (
    <div className="fq-app">
      <main className="fq-shell fq-assessment-runner fq-appear" data-testid="assessment-runner">
        <TaskBar onBack={onExit} backLabel="Leave" backAriaLabel="Leave the check-in" testId="button-assessment-exit" title={definition.title} step={index + 1} total={items.length} />
        <form className="fq-assessment-question" onSubmit={submit}>
          <div className="fq-listen-row">
            <h2 id={promptId} className="fq-question-text"><LearningText text={item.prompt} emphasize /></h2>
            <LearningListenButton text={item.prompt} label="Listen to the question" compact />
          </div>
          <AssessmentModelBuilder key={item.id} item={item} onReady={modelReady} />
          <p className="fq-assessment-model-gate" role="status" aria-live="polite">
            {modelBuilt ? 'Now build your answer with the tiles.' : 'Finish building the model to open the answer tiles.'}
          </p>
          {isYesNoProblem(item.problem)
            ? <YesNoCards value={answer} onChange={setAnswer} disabled={!modelBuilt} testIdPrefix={`assessment-${index + 1}`} />
            : <AnswerTiles key={item.id} shape={answerShape(item.problem)} value={answer} onChange={setAnswer} disabled={!modelBuilt} testIdPrefix={`assessment-${index + 1}`} label="Your answer" />}
          <div className="fq-assessment-answer">
            <button ref={submitRef} type="submit" className="fq-button" disabled={!modelBuilt || !answer.trim()} data-testid="button-submit-assessment-answer">
              {index === items.length - 1 ? 'Finish check-in' : 'Next question'} <ArrowRight size={16} />
            </button>
          </div>
          <span id={statusIdFor(index)} className="fq-sr-only">Answer privately. Results are shown after all questions.</span>
          <p className="fq-assessment-note">No hints during a check-in. Results come at the end.</p>
        </form>
      </main>
    </div>
  );
}

function statusIdFor(index: number) {
  return `assessment-status-${index + 1}`;
}
