import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Check, RotateCcw } from 'lucide-react';
import { MathText } from './MathText';
import { FractionEntry, usesFractionEntry } from './FractionEntry';
import { AreaShade } from './AreaModel';
import './assessment.css';
import { RulerInteraction, LinePlotInteraction, ScaleInteraction } from './LearningLab';
import { WorksheetBarCopy } from './WorksheetBarCopy';
import {
  assessmentResponse, buildAssessmentItems, getAssessmentDefinitions, ASSESSMENT_ITEM_COUNT,
  type AssessmentDefinition, type AssessmentItem,
} from './assessments';
import type { AssessmentAttempt } from './game';

export function AssessmentHub({ attempts, onStart, onBack }: {
  attempts: AssessmentAttempt[];
  onStart: (definition: AssessmentDefinition) => void;
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
          {latest && <p className="fq-assessment-last">Most recent: {correct}/{checked} correct · {new Date(latest.completedAt).toLocaleDateString()}</p>}
          <small>{definition.standards.length} standards · {ASSESSMENT_ITEM_COUNT} model-and-answer questions</small>
        </div>
        <button className="fq-button" onClick={() => onStart(definition)} data-testid={`button-start-${definition.id}`}>
          {latest ? 'Try again' : 'Start'} {latest ? <RotateCcw size={16} /> : <ArrowRight size={16} />}
        </button>
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
          <p>Build a model, then type an answer for each question. These checks help you see what to practice; they never skip or unlock a lesson.</p>
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

function SequentialLineBuilder({ model, onReady }: {
  model: NonNullable<AssessmentItem['problem']['model']>;
  onReady: (ready: boolean) => void;
}) {
  const [path, setPath] = useState<number[]>([]);
  const goal = Math.max(0, model.n);
  const complete = path.length === goal + 1 && path[0] === 0 && path[path.length - 1] === goal;
  useEffect(() => { onReady(complete); }, [complete, onReady]);
  const tap = (point: number) => {
    setPath(current => {
      if (point === 0) return [0];
      if (point === current.length) return [...current, point];
      if (point === current.length - 1 && point > 0) return current.slice(0, -1);
      return current;
    });
  };
  const max = model.d * model.wholes;
  return (
    <section className="fq-assessment-model">
      <p>Build the number line from zero. Tap zero, then add one jump at a time.</p>
      <div className="fq-assessment-line" role="group" aria-label={`Number line with ${model.d} equal spaces in each whole`}>
        {Array.from({ length: max + 1 }, (_, point) => (
          <button type="button" key={point} aria-label={point === 0 ? 'Zero' : `Point after ${point} equal jumps`}
            aria-pressed={path.includes(point)} onClick={() => tap(point)}>
            <i />
            <span>{point === 0 ? '0' : point === max ? String(model.wholes) : ''}</span>
          </button>
        ))}
      </div>
      <p className="fq-assessment-model-status" role="status">{complete ? 'Model built. Now enter your answer.' : `Jumps built: ${Math.max(0, path.length - 1)}.`}</p>
    </section>
  );
}

function SetModelBuilder({ model, onReady }: {
  model: NonNullable<AssessmentItem['problem']['model']>;
  onReady: (ready: boolean) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const complete = model.n === 0 ? selected.length === 0 && selected.includes(-1) : selected.length === model.n;
  useEffect(() => { onReady(complete); }, [complete, onReady]);
  const toggle = (group: number) => setSelected(current => current.includes(group) ? current.filter(value => value !== group) : [...current, group]);
  return (
    <section className="fq-assessment-model">
      <p>Choose the equal groups that show the amount in the question.</p>
      <div className="fq-assessment-groups" role="group" aria-label={`${model.d} equal groups`}>
        {Array.from({ length: model.d }, (_, group) => (
          <button type="button" key={group} aria-pressed={selected.includes(group)} onClick={() => toggle(group)}>
            <span aria-hidden="true">{Array.from({ length: Math.max(1, Math.ceil((model.total ?? model.d) / model.d)) }, (_, i) => <i key={i} />)}</span>
            <small>Group {group + 1} · {selected.includes(group) ? 'chosen' : 'not chosen'}</small>
          </button>
        ))}
      </div>
      {model.n === 0 && <button type="button" className="fq-hint-button" aria-pressed={selected.includes(-1)} onClick={() => setSelected(selected.includes(-1) ? [] : [-1])}>No groups are selected</button>}
      <p className="fq-assessment-model-status" role="status">{complete ? 'Model built. Now enter your answer.' : 'Keep choosing groups to build the model.'}</p>
    </section>
  );
}

function FractionStripsBuilder({ fractions, onReady }: {
  fractions: NonNullable<AssessmentItem['visualFractions']>;
  onReady: (ready: boolean) => void;
}) {
  const [shaded, setShaded] = useState<boolean[][]>(() => fractions.map(() => []));
  const [visited, setVisited] = useState<boolean[]>(() => fractions.map(() => false));
  const ready = fractions.every((fraction, index) => visited[index] && shaded[index]?.filter(Boolean).length === fraction.n);
  useEffect(() => { onReady(ready); }, [onReady, ready]);
  const toggle = (fractionIndex: number, partIndex: number) => setShaded(current => {
    const next = current.map(parts => [...parts]);
    const parts = next[fractionIndex] ?? [];
    parts[partIndex] = !parts[partIndex];
    next[fractionIndex] = parts;
    return next;
  });
  const visit = (fractionIndex: number) => setVisited(current => current.map((value, index) => index === fractionIndex ? true : value));
  return (
    <section className="fq-assessment-model">
      <p>Build each fraction from equal parts. Tap parts to color them, then type the answer.</p>
      <div className="fq-assessment-strips">
        {fractions.map((fraction, fractionIndex) => (
          <div className="fq-assessment-strip-row" key={`${fraction.n}/${fraction.d}-${fractionIndex}`}>
            <span><MathText text={`${fraction.n}/${fraction.d}`} /></span>
            <div role="group" aria-label={`Build ${fraction.n} over ${fraction.d}`}>
              {Array.from({ length: fraction.d * fraction.wholes }, (_, partIndex) => {
                const selected = !!shaded[fractionIndex]?.[partIndex];
                return (
                  <button type="button" key={partIndex} className={selected ? 'selected' : ''}
                    aria-label={`Fraction ${fractionIndex + 1}, part ${partIndex + 1} of ${fraction.d * fraction.wholes}, ${selected ? 'colored' : 'not colored'}`}
                    aria-pressed={selected} onClick={() => { visit(fractionIndex); toggle(fractionIndex, partIndex); }} />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="fq-assessment-model-status" role="status">{ready ? 'All the fraction strips are built. Now enter your answer.' : 'Color the number of parts named by each numerator.'}</p>
    </section>
  );
}

function AssessmentModelBuilder({ item, onReady }: { item: AssessmentItem; onReady: (ready: boolean) => void }) {
  const problem = item.problem;
  const handleReady = useCallback((ready: boolean) => onReady(ready), [onReady]);
  const statusId = `assessment-model-status-${item.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  if (problem.area && problem.areaTask) {
    return <AreaShade figure={problem.area} task={problem.areaTask} disabled={false} statusId={statusId} onMatchChange={handleReady} />;
  }
  if (problem.rulerTask) return <RulerInteraction key={item.id} task={problem.rulerTask} disabled={false} onReady={handleReady} />;
  if (problem.linePlotTask) return <LinePlotInteraction key={item.id} task={problem.linePlotTask} disabled={false} onReady={handleReady} />;
  if (problem.scaleTask) return <ScaleInteraction key={item.id} id={statusId} task={problem.scaleTask} disabled={false} onReady={handleReady} />;
  if (!problem.model) return item.visualFractions ? <FractionStripsBuilder key={item.id} fractions={item.visualFractions} onReady={handleReady} /> : null;
  if (problem.model.kind === 'bar') {
    const target = problem.model;
    const task = target.n > 0
      ? { kind: 'shade' as const, n: target.n }
      : { kind: 'count' as const, n: target.d * target.wholes };
    return <WorksheetBarCopy key={item.id} target={target} task={task} disabled={false} statusId={statusId} onMatchChange={handleReady} />;
  }
  if (problem.model.kind === 'line') return <SequentialLineBuilder key={item.id} model={problem.model} onReady={handleReady} />;
  return <SetModelBuilder key={item.id} model={problem.model} onReady={handleReady} />;
}

export function AssessmentRunner({ definition, seed, onComplete, onExit }: {
  definition: AssessmentDefinition; seed: number; onComplete: (attempt: AssessmentAttempt) => void; onExit: () => void;
}) {
  const items = useMemo(() => buildAssessmentItems(definition, seed), [definition, seed]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [modelBuilt, setModelBuilt] = useState(false);
  const [responses, setResponses] = useState<AssessmentAttempt['responses']>([]);
  const [result, setResult] = useState<AssessmentAttempt | null>(null);
  const [startedAt] = useState(() => Date.now());
  const item = items[index];
  const modelReady = useCallback((ready: boolean) => setModelBuilt(ready), []);
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
    const response = assessmentResponse(item, modelBuilt, answer);
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
    setIndex(current => current + 1);
    setAnswer('');
    setModelBuilt(false);
  };

  const fractionInput = usesFractionEntry(item.problem);
  const promptId = `assessment-prompt-${index + 1}`;
  const inputId = `assessment-answer-${index + 1}`;
  return (
    <div className="fq-app">
      <main className="fq-shell fq-assessment-runner fq-appear" data-testid="assessment-runner">
        <button className="fq-back" type="button" onClick={onExit} data-testid="button-assessment-exit"><ArrowLeft size={17} /> Leave check-in</button>
        <header className="fq-assessment-header">
          <span className="fq-eyebrow">{definition.title}</span>
          <h1>Build it, then answer.</h1>
          <p>Question {index + 1} of {items.length}. There are no hints during a check-in.</p>
          <div className="fq-assessment-progress" role="progressbar" aria-label="Check-in progress" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={items.length}>
            <i style={{ width: `${((index + 1) / items.length) * 100}%` }} />
          </div>
        </header>
        <form className="fq-assessment-question" onSubmit={submit}>
          <h2 id={promptId}><MathText text={item.prompt} /></h2>
          <AssessmentModelBuilder key={item.id} item={item} onReady={modelReady} />
          <p className="fq-assessment-model-gate" role="status" aria-live="polite">
            {modelBuilt ? 'Model built. Now enter your answer.' : 'Finish building the model to open the answer box.'}
          </p>
          <div className="fq-assessment-answer">
            {fractionInput ? (
              <FractionEntry id={inputId} value={answer} onChange={setAnswer} describedBy={`${promptId} ${statusIdFor(index)}`} disabled={!modelBuilt} />
            ) : (
              <input id={inputId} type="text" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Your answer"
                autoComplete="off" maxLength={100} disabled={!modelBuilt} aria-labelledby={promptId} aria-describedby={`${promptId} ${statusIdFor(index)}`} />
            )}
            <button type="submit" className="fq-button" disabled={!modelBuilt || !answer.trim()} data-testid="button-submit-assessment-answer">
              {index === items.length - 1 ? 'Finish check-in' : 'Next question'} <ArrowRight size={16} />
            </button>
          </div>
          <span id={statusIdFor(index)} className="fq-sr-only">Answer privately. Results are shown after all questions.</span>
        </form>
      </main>
    </div>
  );
}

function statusIdFor(index: number) {
  return `assessment-status-${index + 1}`;
}
