import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import type { DailyPracticeAttempt, DailyPracticeSession, ModelSpec } from './game';
import { dailyBuildCorrect, dailyChoiceQuestion } from './daily-practice';
import { MathText } from './MathText';
import { WholeBracket } from './models';
import './daily-practice.css';
import { LearningText, spokenLearningText, useReadAloud } from './LearningText';
import { DailyPracticeQuestionHeading } from './DailyPracticeQuestionHeading';
import { Hoot, useOptionalFun } from './fun-ui';
import { retryOpener, wrongChoiceReason } from './wrong-answer';
import { TaskBar } from './TaskBar';
import { LiveFraction } from './fraction-ui';
import { useRevealWhen, useScrollTopOn } from './lib/reveal';
import { playHaptic } from './lib/fun';

/** Arrow keys move through a radio group and choose (the usual radio-button pattern). */
function radioArrows(event: KeyboardEvent<HTMLDivElement>) {
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
  if (!step) return;
  const options = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)')];
  if (!options.length) return;
  event.preventDefault();
  const at = options.indexOf(document.activeElement as HTMLButtonElement);
  const next = options[(at + step + options.length) % options.length];
  next.focus(); next.click();
}
/** Only the chosen option (or the first) is a Tab stop. */
const tabStop = (selected: boolean, index: number, anySelected: boolean) => (selected || (!anySelected && index === 0) ? 0 : -1);

const emptyAttempt = (): DailyPracticeAttempt => ({
  shaded: [],
  draft: '',
  modelChecked: false,
  modelCorrect: false,
  answerChecked: false,
  answerCorrect: false,
});

export default function DailyPractice({
  session,
  onChange,
  onBack,
  onWrong,
  onSuccess,
  renderModel,
}: {
  session: DailyPracticeSession;
  onChange: (next: DailyPracticeSession) => void;
  onBack: () => void;
  onWrong?: () => void;
  onSuccess?: () => void;
  /** Draws a practice picture (the app's ModelView), for topic questions. */
  renderModel?: (model: ModelSpec, reveal?: boolean) => ReactNode;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const question = session.questions[session.index];
  useScrollTopOn(session.index);
  const topicQuestion = useMemo(() => (question ? dailyChoiceQuestion(question) : null), [question]);
  useEffect(() => {
    questionHeading.current?.focus({ preventScroll: true });
  }, [session.index]);
  // Keep the button the child needs next above the browser's bottom toolbar.
  const nextRef = useRef<HTMLButtonElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const current = question ? session.attempts[question.id] : undefined;
  useRevealWhen(nextRef, !!current?.answerCorrect);
  useRevealWhen(checkRef, !current?.answerCorrect && (current?.choice !== undefined || (!!current?.parts && (current?.shaded.length ?? 0) > 0)));
  // A missed topic question: Hoot names the slip when it can (else the hint), and it is read aloud with sound on.
  const sound = useOptionalFun()?.fun.sound ?? true;
  const missed = !!topicQuestion && !!current?.answerChecked && !current.answerCorrect && current.choice !== undefined;
  const missText = missed ? wrongChoiceReason(topicQuestion!.prompt, topicQuestion!.choices, topicQuestion!.correctChoice, current!.choice!) ?? topicQuestion!.hint : '';
  const missOpener = question ? retryOpener(`${question.id}:${current?.choice ?? ''}`) : '';
  useReadAloud(missed && sound ? `${missOpener} ${missText}` : null, missed ? `${question?.id}:${current?.choice}` : null);
  if (!question || session.completedAt) {
    return (
      <div className="fq-app">
        <main className="fq-shell fq-daily-shell">
          <section className="fq-daily-card fq-daily-done" aria-labelledby="daily-done-title">
            <div className="fq-daily-spark"><Check size={30} aria-hidden="true" /></div>
            <p className="fq-eyebrow">Today’s fraction practice</p>
            <h1 id="daily-done-title">You made it through today’s practice!</h1>
            <p>You finished today’s practice. Great work!</p>
            <button className="fq-button" onClick={onBack} data-testid="button-daily-done-map">Back to the learning map</button>
          </section>
        </main>
      </div>
    );
  }

  const attempt = session.attempts[question.id] ?? emptyAttempt();
  const setAttempt = (next: DailyPracticeAttempt) => onChange({
    ...session,
    attempts: { ...session.attempts, [question.id]: next },
  });
  const done = attempt.answerCorrect;
  const continueSession = () => {
    if (session.index >= session.questions.length - 1) {
      onChange({ ...session, completedAt: Date.now() });
    } else {
      onChange({ ...session, index: session.index + 1 });
      setShowHelp(false);
    }
  };
  const nextButton = (
    <div className="fq-daily-actions">
      <button ref={nextRef} className="fq-button" onClick={continueSession} data-testid="button-daily-next">
        {session.index === session.questions.length - 1 ? 'Finish today’s practice' : 'Next question'} <ArrowRight size={17} />
      </button>
    </div>
  );
  const hintButton = (
    <button className="fq-button ghost" onClick={() => setShowHelp((shown) => !shown)} aria-expanded={showHelp} data-testid="button-daily-hint">
      {showHelp ? 'Hide hint' : 'Hint'}
    </button>
  );
  const bar = question.modelKind === 'bar';
  const buildDirectionsSpeech = bar
    ? 'The denominator is the bottom number. It tells how many equal parts make one whole. Choose that number below. The numerator is the top number. It tells how many parts to shade.'
    : 'The denominator is the bottom number. It tells how many equal spaces go from 0 to 1. Choose that number below. The numerator is the top number. It tells how many jumps to make from 0.';
  const questionTitle = topicQuestion
    ? <LearningText text={topicQuestion.prompt} emphasize />
    : <>Build <MathText text={`${question.numerator}/${question.denominator}`} /> {bar ? 'with a bar.' : 'on a number line.'}</>;
  const questionSpeech = spokenLearningText(topicQuestion
    ? topicQuestion.prompt
    : `Build ${question.numerator}/${question.denominator} ${bar ? 'with a bar.' : 'on a number line.'} ${buildDirectionsSpeech}`);
  const questionHeader = (
    <DailyPracticeQuestionHeading
      title={questionTitle}
      speechText={questionSpeech}
      label={topicQuestion ? 'Listen to the question' : 'Listen to the question and directions'}
      headingRef={questionHeading}
    />
  );

  /* ---- Topic question: the lesson's own kind of question (compare, add, decimals…). ---- */
  if (topicQuestion) {
    const check = () => {
      const correct = attempt.choice === topicQuestion.correctChoice;
      playHaptic(correct ? 'correct' : 'retry');
      if (correct) onSuccess?.(); else onWrong?.();
      setAttempt({ ...attempt, answerChecked: true, answerCorrect: correct });
    };
    return shell(<>
      {questionHeader}
      {renderModel && <div className="fq-daily-picture">{renderModel(topicQuestion.model, done)}</div>}
      <div className="fq-daily-choices" role="radiogroup" aria-label="Answer choices" onKeyDown={radioArrows}>
        {topicQuestion.choices.map((choice, index) => (
          <button key={index} type="button" role="radio" aria-checked={attempt.choice === index} disabled={done} tabIndex={tabStop(attempt.choice === index, index, attempt.choice !== undefined)}
            className={`fq-daily-choice ${attempt.choice === index ? 'selected' : ''} ${done && index === topicQuestion.correctChoice ? 'right' : ''}`}
            onClick={() => {
              if (attempt.choice !== index) playHaptic('selection');
              setAttempt({ ...attempt, choice: index, answerChecked: false, answerCorrect: false });
            }} data-testid={`button-daily-choice-${index}`}>
            <MathText text={choice} />
          </button>
        ))}
      </div>
      {attempt.answerChecked && !done && <div className="fq-daily-feedback retry fq-daily-miss" role="status"><Hoot size={48} /><p><strong>{missOpener}</strong> <MathText text={missText || topicQuestion.hint} /></p></div>}
      {done && <div className="fq-daily-feedback success" role="status"><strong>That’s it!</strong> <MathText text={topicQuestion.retryFeedback} /></div>}
      {done ? nextButton : (
        <div className="fq-daily-actions">
          <button ref={checkRef} className="fq-button" onClick={check} disabled={attempt.choice === undefined} data-testid="button-daily-check-answer">Check my answer <Check size={17} /></button>
          {hintButton}
        </div>
      )}
      {showHelp && !done && <p className="fq-daily-hint" role="note"><MathText text={topicQuestion.hint} /></p>}
    </>);
  }

  /* ---- Build question: the child chooses the equal parts, then shades or jumps. ---- */
  const parts = attempt.parts;
  const checkModel = () => {
    const correct = dailyBuildCorrect(question, parts, attempt.shaded.length);
    playHaptic(correct ? 'correct' : 'retry');
    if (correct) onSuccess?.(); else onWrong?.();
    setAttempt({ ...attempt, modelChecked: true, modelCorrect: correct, answerChecked: correct, answerCorrect: correct });
  };
  const change = (patch: Partial<DailyPracticeAttempt>) => {
    const changed = Object.entries(patch).some(([key, value]) =>
      JSON.stringify(attempt[key as keyof DailyPracticeAttempt]) !== JSON.stringify(value));
    if (changed) playHaptic('selection');
    setAttempt({ ...attempt, ...patch, modelChecked: false, modelCorrect: false, answerChecked: false, answerCorrect: false });
  };
  const wrongFeedback = !parts ? '' : question.denominator % parts !== 0 && parts % question.denominator !== 0
    ? `Look at the denominator: how many equal ${bar ? 'parts' : 'spaces'} make one whole?`
    : `Look at the numerator: how many ${bar ? 'parts should be shaded' : 'jumps from 0'}?`;
  return shell(<>
    {questionHeader}
    <p className="fq-daily-instruction" id="daily-parts-instruction" data-testid="text-daily-parts-instruction">
      {bar ? (
        <>The <strong>denominator</strong> (bottom number) tells how many equal parts make one whole: choose that below. The <strong>numerator</strong> (top number) tells how many of those parts to shade.</>
      ) : (
        <>The <strong>denominator</strong> (bottom number) tells how many equal spaces go from 0 to 1: choose that below. The <strong>numerator</strong> (top number) tells how many jumps to make from 0.</>
      )}
    </p>
    <p className="fq-daily-choice-label" id="daily-parts-label">
      {bar ? 'Total equal parts in one whole' : 'Equal spaces from 0 to 1'}
    </p>
    <div className="fq-daily-parts" role="radiogroup" aria-labelledby="daily-parts-label" aria-describedby="daily-parts-instruction" onKeyDown={radioArrows}>
      {Array.from({ length: 11 }, (_, k) => k + 2).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={parts === n} disabled={done} tabIndex={tabStop(parts === n, n - 2, !!parts)}
          className={`fq-daily-parts-choice ${parts === n ? 'selected' : ''}`}
          aria-label={bar ? `${n} equal parts in one whole` : `${n} equal spaces from 0 to 1`}
          onClick={() => change({ parts: n, shaded: [] })} data-testid={`button-daily-parts-${n}`}>{n}</button>
      ))}
    </div>
    {!parts ? <p className="fq-daily-count">{bar ? 'Choose the total equal parts in one whole to build your bar.' : 'Choose the total equal spaces from 0 to 1.'}</p> : bar ? (
      <>
        <div className="fq-daily-model" style={{ gridTemplateColumns: `repeat(${parts}, minmax(0, 1fr))` }} role="group" aria-label={`One whole split into ${parts} equal parts.`}>
          {Array.from({ length: parts }, (_, index) => {
            const shaded = attempt.shaded.includes(index);
            return (
              <button type="button" className={`fq-daily-part ${shaded ? 'shaded' : ''}`} key={index} aria-pressed={shaded}
                aria-label={`Part ${index + 1} of ${parts}, ${shaded ? 'shaded' : 'not shaded'}`} disabled={done}
                onClick={() => change({ shaded: shaded ? attempt.shaded.filter((part) => part !== index) : [...attempt.shaded, index].sort((a, b) => a - b) })}
                data-testid={`button-daily-part-${index + 1}`}>
                {shaded && <span aria-hidden="true">●</span>}
              </button>
            );
          })}
        </div>
        <WholeBracket label={`1 whole: ${parts} equal parts`} />
      </>
    ) : (
      <>
        <div className="fq-daily-line-endpoints" aria-hidden="true"><span>0</span><span>1</span></div>
        <div className="fq-daily-line-track" role="radiogroup" aria-label={`Choose a landing point on the number line from 0 to 1, split into ${parts} equal spaces.`} onKeyDown={radioArrows}>
          <span
            className="fq-daily-line-progress"
            style={{ width: `${attempt.shaded.length / parts * 100}%` }}
            aria-hidden="true"
          />
          {Array.from({ length: parts }, (_, index) => {
            const jumps = index + 1;
            const selected = attempt.shaded.length === jumps;
            return (
              <button type="button" role="radio" aria-checked={selected} tabIndex={tabStop(selected, index, attempt.shaded.length > 0)}
                className={`fq-daily-jump ${jumps <= attempt.shaded.length ? 'passed' : ''} ${selected ? 'landing' : ''}`}
                style={{ left: `${jumps / parts * 100}%`, width: `min(44px, ${100 / parts}%)` }}
                key={index}
                aria-label={`${jumps}/${parts}, ${jumps} jump${jumps === 1 ? '' : 's'} from 0`}
                disabled={done} onClick={() => change({ shaded: Array.from({ length: jumps }, (_, part) => part) })}
                data-testid={`button-daily-jump-${index + 1}`}>
                <i aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <WholeBracket label="1 whole: from 0 to 1" />
      </>
    )}
    <LiveFraction n={attempt.shaded.length} d={parts ?? 0} unit={bar ? 'bar' : 'line'} color={bar ? '#38bdb0' : undefined} testId="daily-live-fraction" />
    {attempt.modelChecked && !done && <p className="fq-daily-feedback retry" role="status">Not quite. {wrongFeedback} Change your model, then check again.</p>}
    {done && <div className="fq-daily-feedback success" role="status"><strong>That’s it!</strong> {parts === question.denominator ? question.explanation : `${attempt.shaded.length}/${parts} is the same amount as ${question.numerator}/${question.denominator}.`}</div>}
    {done ? nextButton : (
      <div className="fq-daily-actions">
        <button ref={checkRef} className="fq-button" onClick={checkModel} disabled={!parts || attempt.shaded.length === 0} data-testid="button-daily-check-model">Check my model <Check size={17} /></button>
        {hintButton}
      </div>
    )}
    {showHelp && !done && <p className="fq-daily-hint" role="note">The denominator tells how many equal parts make the whole. The numerator tells how many of them to {bar ? 'shade' : 'jump'}.</p>}
  </>);

  function shell(card: ReactNode) {
    return (
      <div className="fq-app">
        <main className="fq-shell fq-daily-shell">
          <TaskBar onBack={onBack} backLabel="Map" testId="button-daily-back" title={<><Sparkles size={16} aria-hidden="true" /> Daily practice</>} step={session.index + 1} total={session.questions.length} done={session.index + (session.attempts[question!.id]?.answerCorrect ? 1 : 0)} />
          <section className="fq-daily-card" aria-labelledby="daily-question-title">
            <div className="fq-daily-topic">A little review · {question!.topicTitle}</div>
            {/* The grown-up reason is kept for the progress report; the child sees a short, kind label. */}
            {question!.reteachLoop
              ? <p className="fq-daily-step-note" data-testid="daily-adaptation-reason">A small step to help</p>
              : question!.difficultyBand === 'transfer'
                ? <p className="fq-daily-step-note" data-testid="daily-adaptation-reason">A stretch question</p>
                : null}
            {card}
          </section>
        </main>
      </div>
    );
  }
}
