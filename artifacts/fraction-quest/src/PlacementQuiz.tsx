import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Compass, Map as MapIcon } from 'lucide-react';
import { answerMatches, isYesNoProblem, paperPrompt, yesNoPrompt } from './learning-content';
import { MathText } from './MathText';
import { LearningListenButton } from './LearningText';
import { Mascot } from './fun-ui';
import { BarSvg, LineSvg, SetSvg } from './models';
import { AreaSvg } from './AreaModel';
import { PER_UNIT, PLACEMENT_UNITS, placementItems, startUnit } from './placement';
import { YesNoCards } from './YesNoCards';
import { AnswerTiles } from './AnswerTiles';
import { answerShape } from './answer-shape';
import { useRevealWhen, useScrollTopOn } from './lib/reveal';

/* "Find my level": a short quiz answered with tiles, unit by unit, that stops at the first unit not yet known. */

export default function PlacementQuiz({ unitTitles, onDone, onExit }: {
  unitTitles: string[]; onDone: (unitsPassed: number) => void; onExit: () => void;
}) {
  const [seed] = useState(() => 1 + Math.floor(Math.random() * 100000));
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [unit, setUnit] = useState(1);
  const [index, setIndex] = useState(0);
  useScrollTopOn(`${unit}-${index}`);
  const [rightInUnit, setRightInUnit] = useState(0);
  const [passed, setPassed] = useState(0);
  const [draft, setDraft] = useState('');
  const nextRef = useRef<HTMLButtonElement>(null);
  useRevealWhen(nextRef, !!draft.trim());
  const items = useMemo(() => placementItems(unit, seed), [unit, seed]);
  const item = items[index];

  const record = (right: boolean) => {
    const score = rightInUnit + (right ? 1 : 0);
    setDraft('');
    if (index < PER_UNIT - 1) { setRightInUnit(score); setIndex(index + 1); return; }
    // End of the unit: all right → next unit; otherwise stop here.
    if (score === PER_UNIT && unit < PLACEMENT_UNITS) { setPassed(unit); setUnit(unit + 1); setIndex(0); setRightInUnit(0); return; }
    setPassed(score === PER_UNIT ? unit : unit - 1); setPhase('result');
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (draft.trim()) record(answerMatches(item.problem, draft)); };

  if (phase === 'intro') {
    return (
      <div className="fq-app"><main className="fq-shell fq-place fq-appear" data-testid="placement-intro">
        <button className="fq-back" onClick={onExit}><ArrowLeft size={17} /> Back to the map</button>
        <section className="fq-place-card">
          <Mascot mood="happy" size={90} />
          <h1>Find your level</h1>
          <p>A few questions show where to start. Drag tiles to make each answer, or tap Yes or No. There's no timer.</p>
          <p>It's fine to tap <b>"I haven't learned this yet"</b>. That just means we start there!</p>
          <p className="fq-place-small">Skipped lessons stay open, so you can go back to them any time.</p>
          <button className="fq-button" onClick={() => setPhase('quiz')} data-testid="button-placement-start">Start <ArrowRight size={17} /></button>
        </section>
      </main></div>
    );
  }

  if (phase === 'result') {
    const start = startUnit(passed);
    return (
      <div className="fq-app"><main className="fq-shell fq-place fq-appear" data-testid="placement-result">
        <section className="fq-place-card">
          <Mascot mood="cheer" size={90} />
          <h1 data-testid="text-placement-result">{start === 1 ? 'Start at the beginning' : start > PLACEMENT_UNITS ? 'Wow! Start at unit 9' : `Start at unit ${start}`}</h1>
          <p>{passed === 0 ? 'Unit 1 is the perfect place to start. Have fun!' : `You already know units 1${passed > 1 ? `–${passed}` : ''}. ${start <= unitTitles.length ? `Next up: ${unitTitles[start - 1]}.` : ''}`}</p>
          {passed > 0 && <p className="fq-place-small">Those lessons stay open if you want to visit them. They won't count as done until you finish them.</p>}
          <div className="fq-reward-actions">
            <button className="fq-button" onClick={() => onDone(passed)} data-testid="button-placement-apply"><MapIcon size={17} /> {passed ? `Start at unit ${start}` : 'Go to the map'}</button>
            {passed > 0 && <button className="fq-button ghost" onClick={() => onDone(0)} data-testid="button-placement-beginning">Start at the beginning instead</button>}
          </div>
        </section>
      </main></div>
    );
  }

  const m = item.problem.model;
  const question = isYesNoProblem(item.problem) ? yesNoPrompt(item.problem) : paperPrompt(item.problem, true);
  return (
    <div className="fq-app"><main className="fq-shell fq-place fq-appear" data-testid="placement-quiz">
      <div className="fq-place-top">
        <button className="fq-icon-button" onClick={onExit} aria-label="Stop the quiz"><ArrowLeft size={20} /></button>
        <h1 className="fq-sr-only">Level quiz</h1>
        <span className="fq-place-progress"><Compass size={16} /> Unit {unit} · question {index + 1} of {PER_UNIT}</span>
      </div>
      <section className="fq-place-card question" key={`${unit}-${index}`}>
        <p className="fq-place-small">{unitTitles[unit - 1]}</p>
        <div className="fq-listen-row">
          <h2 data-testid="text-placement-question"><MathText text={question} /></h2>
          <LearningListenButton text={question} label="Listen to the question" compact />
        </div>
        {m && <div className="fq-place-model">{m.kind === 'line' ? <LineSvg n={m.n} d={m.d} wholes={m.wholes} jumps={false} /> : m.kind === 'set' ? <SetSvg n={m.n} d={m.d} total={m.total ?? m.d} /> : <BarSvg n={m.n} d={m.d} wholes={m.wholes} sizes={m.sizes} />}</div>}
        {item.problem.area && <div className="fq-place-model"><AreaSvg figure={item.problem.area} /></div>}
        <form onSubmit={submit} className="fq-place-form">
          {isYesNoProblem(item.problem) ? (
            <YesNoCards value={draft} onChange={setDraft} testIdPrefix="placement" />
          ) : (
            <AnswerTiles key={`${unit}-${index}`} shape={answerShape(item.problem)} value={draft} onChange={setDraft} testIdPrefix="placement" />
          )}
          <button ref={nextRef} type="submit" className="fq-button" disabled={!draft.trim()} data-testid="button-placement-next">Next <ArrowRight size={17} /></button>
        </form>
        <button type="button" className="fq-button ghost fq-place-skip" onClick={() => record(false)} data-testid="button-placement-unknown">I haven't learned this yet</button>
      </section>
    </main></div>
  );
}
