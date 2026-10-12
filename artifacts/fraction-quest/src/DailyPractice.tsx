import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import type { DailyPracticeAttempt, DailyPracticeSession, ModelSpec } from './game';
import { dailyBuildCorrect, dailyChoiceQuestion } from './daily-practice';
import { MathText } from './MathText';
import { WholeBracket } from './models';
import './daily-practice.css';

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
  const topicQuestion = useMemo(() => (question ? dailyChoiceQuestion(question) : null), [question]);
  useEffect(() => {
    questionHeading.current?.focus({ preventScroll: true });
  }, [session.index]);
  if (!question || session.completedAt) {
    return (
      <div className="fq-app">
        <main className="fq-shell fq-daily-shell">
          <section className="fq-daily-card fq-daily-done" aria-labelledby="daily-done-title">
            <div className="fq-daily-spark"><Check size={30} aria-hidden="true" /></div>
            <p className="fq-eyebrow">Today’s fraction practice</p>
            <h1 id="daily-done-title">You made it through today’s practice!</h1>
            <p>You finished today’s five practice questions. Your lesson progress stays just as it was.</p>
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
      <button className="fq-button" onClick={continueSession} data-testid="button-daily-next">
        {session.index === session.questions.length - 1 ? 'Finish today’s practice' : 'Next question'} <ArrowRight size={17} />
      </button>
    </div>
  );
  const hintButton = (
    <button className="fq-button ghost" onClick={() => setShowHelp((shown) => !shown)} aria-expanded={showHelp} data-testid="button-daily-hint">
      {showHelp ? 'Hide hint' : 'Hint'}
    </button>
  );

  /* ---- Topic question: the lesson's own kind of question (compare, add, decimals…). ---- */
  if (topicQuestion) {
    const check = () => {
      const correct = attempt.choice === topicQuestion.correctChoice;
      if (correct) onSuccess?.(); else onWrong?.();
      setAttempt({ ...attempt, answerChecked: true, answerCorrect: correct });
    };
    return shell(<>
      <h2 id="daily-question-title" ref={questionHeading} tabIndex={-1}><MathText text={topicQuestion.prompt} /></h2>
      {renderModel && <div className="fq-daily-picture">{renderModel(topicQuestion.model, done)}</div>}
      <div className="fq-daily-choices" role="radiogroup" aria-label="Answer choices">
        {topicQuestion.choices.map((choice, index) => (
          <button key={index} type="button" role="radio" aria-checked={attempt.choice === index} disabled={done}
            className={`fq-daily-choice ${attempt.choice === index ? 'selected' : ''} ${done && index === topicQuestion.correctChoice ? 'right' : ''}`}
            onClick={() => setAttempt({ ...attempt, choice: index, answerChecked: false, answerCorrect: false })} data-testid={`button-daily-choice-${index}`}>
            <MathText text={choice} />
          </button>
        ))}
      </div>
      {attempt.answerChecked && !done && <p className="fq-daily-feedback retry" role="status">Not quite. {topicQuestion.hint}</p>}
      {done && <div className="fq-daily-feedback success" role="status"><strong>That’s it!</strong> <MathText text={topicQuestion.retryFeedback} /></div>}
      {done ? nextButton : (
        <div className="fq-daily-actions">
          <button className="fq-button" onClick={check} disabled={attempt.choice === undefined} data-testid="button-daily-check-answer">Check my answer <Check size={17} /></button>
          {hintButton}
        </div>
      )}
      {showHelp && !done && <p className="fq-daily-hint" role="note"><MathText text={topicQuestion.hint} /></p>}
    </>);
  }

  /* ---- Build question: the child chooses the equal parts, then shades or jumps. ---- */
  const parts = attempt.parts;
  const bar = question.modelKind === 'bar';
  const checkModel = () => {
    const correct = dailyBuildCorrect(question, parts, attempt.shaded.length);
    if (correct) onSuccess?.(); else onWrong?.();
    setAttempt({ ...attempt, modelChecked: true, modelCorrect: correct, answerChecked: correct, answerCorrect: correct });
  };
  const change = (patch: Partial<DailyPracticeAttempt>) => setAttempt({ ...attempt, ...patch, modelChecked: false, modelCorrect: false, answerChecked: false, answerCorrect: false });
  const wrongFeedback = !parts ? '' : question.denominator % parts !== 0 && parts % question.denominator !== 0
    ? `Look at the denominator: how many equal ${bar ? 'parts' : 'spaces'} make one whole?`
    : `Look at the numerator: how many ${bar ? 'parts should be shaded' : 'jumps from 0'}?`;
  return shell(<>
    <h2 id="daily-question-title" ref={questionHeading} tabIndex={-1}>
      Build <MathText text={`${question.numerator}/${question.denominator}`} /> {bar ? 'with a bar.' : 'on a number line.'}
    </h2>
    <p className="fq-daily-instruction" id="daily-parts-instruction" data-testid="text-daily-parts-instruction">
      {bar ? (
        <>The bottom number, <strong>{question.denominator}</strong>, tells how many equal parts make the whole. Choose <strong>{question.denominator}</strong> below. The top number, <strong>{question.numerator}</strong>, tells how many parts to shade.</>
      ) : (
        <>The bottom number, <strong>{question.denominator}</strong>, tells how many equal spaces go from 0 to 1. Choose <strong>{question.denominator}</strong> below. The top number, <strong>{question.numerator}</strong>, tells how many jumps to make from 0.</>
      )}
    </p>
    <p className="fq-daily-choice-label" id="daily-parts-label">
      {bar ? 'Total equal parts in one whole' : 'Equal spaces from 0 to 1'}
    </p>
    <div className="fq-daily-parts" role="radiogroup" aria-labelledby="daily-parts-label" aria-describedby="daily-parts-instruction">
      {Array.from({ length: 11 }, (_, k) => k + 2).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={parts === n} disabled={done}
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
        <div className="fq-daily-line-track" role="radiogroup" aria-label={`Choose a landing point on the number line from 0 to 1, split into ${parts} equal spaces.`}>
          <span
            className="fq-daily-line-progress"
            style={{ width: `${attempt.shaded.length / parts * 100}%` }}
            aria-hidden="true"
          />
          {Array.from({ length: parts }, (_, index) => {
            const jumps = index + 1;
            const selected = attempt.shaded.length === jumps;
            return (
              <button type="button" role="radio" aria-checked={selected}
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
    {attempt.modelChecked && !done && <p className="fq-daily-feedback retry" role="status">Not quite. {wrongFeedback} Change your model, then check again.</p>}
    {done && <div className="fq-daily-feedback success" role="status"><strong>That’s it!</strong> {parts === question.denominator ? question.explanation : `${attempt.shaded.length}/${parts} is the same amount as ${question.numerator}/${question.denominator}.`}</div>}
    {done ? nextButton : (
      <div className="fq-daily-actions">
        <button className="fq-button" onClick={checkModel} disabled={!parts || attempt.shaded.length === 0} data-testid="button-daily-check-model">Check my model <Check size={17} /></button>
        {hintButton}
      </div>
    )}
    {showHelp && !done && <p className="fq-daily-hint" role="note">The denominator tells how many equal parts make the whole. The numerator tells how many of them to {bar ? 'shade' : 'jump'}.</p>}
  </>);

  function shell(card: ReactNode) {
    return (
      <div className="fq-app">
        <main className="fq-shell fq-daily-shell">
          <button className="fq-button ghost fq-daily-back" onClick={onBack} data-testid="button-daily-back">
            <ArrowLeft size={17} /> Learning map
          </button>
          <header className="fq-daily-heading">
            <div className="fq-eyebrow"><Sparkles size={15} aria-hidden="true" /> A short daily routine</div>
            <h1>Build it. Name it. Remember it.</h1>
            <p>A mix of five: build a fraction yourself, and answer questions from lessons you have worked on.</p>
          </header>
          <div className="fq-daily-progress" aria-label={`Question ${session.index + 1} of ${session.questions.length}`}>
            <div className="fq-daily-progress-copy"><strong>Today’s practice</strong><span>{session.index + 1} of {session.questions.length}</span></div>
            <div className="fq-daily-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={session.questions.length} aria-valuenow={session.index}>
              <span style={{ width: `${(session.index / session.questions.length) * 100}%` }} />
            </div>
          </div>
          <section className="fq-daily-card" aria-labelledby="daily-question-title">
            <div className="fq-daily-topic">A little review · {question!.topicTitle}</div>
            {card}
          </section>
          <p className="fq-daily-note">This short practice is separate from lesson mastery. Your lesson checklist and skill reviews do not change here.</p>
        </main>
      </div>
    );
  }
}
