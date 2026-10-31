import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Compass, Map as MapIcon } from 'lucide-react';
import { answerMatches, isYesNoProblem, paperPrompt, yesNoPrompt } from './learning-content';
import { MathText } from './MathText';
import { LearningListenButton } from './LearningText';
import { Mascot } from './fun-ui';
import { BarSvg, LineSvg, SetSvg } from './models';
import { AreaSvg } from './AreaModel';
import { PER_UNIT, PLACEMENT_UNITS, placementItems, placementPicture, startUnit } from './placement';
import { PrintModel } from './Printables';
import { YesNoCards } from './YesNoCards';
import { AnswerTiles } from './AnswerTiles';
import { answerShape } from './answer-shape';
import { useRevealWhen, useScrollTopOn } from './lib/reveal';

/* "Find my level": a short quiz answered with tiles, unit by unit, that stops at the first unit not yet known. */

/** In development only, `?placementSeed=12` fixes which questions the quiz asks, so a browser test can walk a known quiz. */
const devSeed = (): number | null => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const value = Number(new URLSearchParams(window.location.search).get('placementSeed'));
  return Number.isInteger(value) && value > 0 ? value : null;
};

export default function PlacementQuiz({ unitTitles, onDone, onExit }: {
  unitTitles: string[]; onDone: (unitsPassed: number) => void; onExit: () => void;
}) {
  const [seed] = useState(() => devSeed() ?? 1 + Math.floor(Math.random() * 100000));
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
          <h1 data-testid="text-placement-result">{start === 1 ? 'Start at the beginning' : start > PLACEMENT_UNITS ? `Wow! Start at unit ${start}` : `Start at unit ${start}`}</h1>
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

  const drawn = placementPicture(item.problem);
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
        {drawn?.kind === 'model' && <div className="fq-place-model">{drawn.model.kind === 'line' ? <LineSvg n={drawn.model.n} d={drawn.model.d} wholes={drawn.model.wholes} jumps={false} /> : drawn.model.kind === 'set' ? <SetSvg n={drawn.model.n} d={drawn.model.d} total={drawn.model.total ?? drawn.model.d} /> : <BarSvg n={drawn.model.n} d={drawn.model.d} wholes={drawn.model.wholes} sizes={drawn.model.sizes} />}</div>}
        {drawn?.kind === 'area' && <div className="fq-place-model"><AreaSvg figure={drawn.area} /></div>}
        {drawn?.kind === 'picture' && <div className="fq-place-model fq-place-picture" data-testid="placement-picture"><PrintModel model={drawn.picture} labels={false} /></div>}
        <form onSubmit={submit} className="fq-place-form">
          {isYesNoProblem(item.problem) ? (
            <YesNoCards value={draft} onChange={setDraft} testIdPrefix="placement" />
          ) : (
            <AnswerTiles key={`${unit}-${index}`} shape={answerShape(item.problem)} value={draft} onChange={setDraft} testIdPrefix="placement" />
          )}
          <div className="fq-place-actions">
            <button ref={nextRef} type="submit" className="fq-button" disabled={!draft.trim()} data-testid="button-placement-next">Next <ArrowRight size={17} /></button>
            <button type="button" className="fq-button ghost fq-place-skip" onClick={() => record(false)} data-testid="button-placement-unknown">I haven't learned this yet</button>
          </div>
        </form>
      </section>
    </main></div>
  );
}
