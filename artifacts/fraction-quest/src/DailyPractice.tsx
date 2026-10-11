import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { FractionEntry } from './FractionEntry';
import { parseAnswer } from './learning-content';
import type { DailyPracticeAttempt, DailyPracticeSession } from './game';
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
}: {
  session: DailyPracticeSession;
  onChange: (next: DailyPracticeSession) => void;
  onBack: () => void;
  onWrong?: () => void;
  onSuccess?: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const question = session.questions[session.index];
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
            <p>You built five fraction models and entered each answer. Your lesson progress stays just as it was.</p>
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
  const checkModel = () => {
    const correct = attempt.shaded.length === question.numerator;
    if (correct) onSuccess?.();
    else onWrong?.();
    setAttempt({
      ...attempt,
      modelChecked: true,
      modelCorrect: correct,
      answerChecked: false,
      answerCorrect: false,
    });
  };
  const checkAnswer = () => {
    const parsed = parseAnswer(attempt.draft);
    const isCorrect = !!parsed
      && Number.isSafeInteger(parsed.n * question.denominator)
      && parsed.n * question.denominator === question.numerator * parsed.d;
    if (isCorrect) onSuccess?.();
    else onWrong?.();
    setAttempt({ ...attempt, answerChecked: true, answerCorrect: isCorrect });
  };
  const continueSession = () => {
    if (session.index >= session.questions.length - 1) {
      onChange({ ...session, completedAt: Date.now() });
    } else {
      onChange({ ...session, index: session.index + 1 });
      setShowHelp(false);
    }
  };

  return (
    <div className="fq-app">
      <main className="fq-shell fq-daily-shell">
        <button className="fq-button ghost fq-daily-back" onClick={onBack} data-testid="button-daily-back">
          <ArrowLeft size={17} /> Learning map
        </button>
        <header className="fq-daily-heading">
          <div className="fq-eyebrow"><Sparkles size={15} aria-hidden="true" /> A short daily routine</div>
          <h1>Build it. Name it. Remember it.</h1>
          <p>Build a fraction on a bar or number line, then enter the fraction you made. You can change your work before checking again.</p>
        </header>

        <div className="fq-daily-progress" aria-label={`Question ${session.index + 1} of ${session.questions.length}`}>
          <div className="fq-daily-progress-copy"><strong>Today’s practice</strong><span>{session.index + 1} of {session.questions.length}</span></div>
          <div className="fq-daily-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={session.questions.length} aria-valuenow={session.index}>
            <span style={{ width: `${(session.index / session.questions.length) * 100}%` }} />
          </div>
        </div>

        <section className="fq-daily-card" aria-labelledby="daily-question-title">
          <div className="fq-daily-topic">A little review · {question.topicTitle}</div>
          <h2 id="daily-question-title" ref={questionHeading} tabIndex={-1}>
            {question.modelKind === 'bar' ? 'Build the bar model.' : 'Build the number-line model.'}
          </h2>
          <p className="fq-daily-instruction">
            {question.modelKind === 'bar'
              ? <>The whole is one bar. Tap {question.numerator === 1 ? 'one' : question.numerator} of its {question.denominator} equal parts to shade them.</>
              : <>The line goes from 0 to 1 whole. Tap {question.numerator === 1 ? 'one' : question.numerator} of its {question.denominator} equal spaces to show the jumps.</>}
          </p>

          {question.modelKind === 'bar' ? (
            <>
              <div className="fq-daily-whole-label"><span>WHOLE</span><span>All {question.denominator} equal parts</span></div>
              <div className="fq-daily-model" style={{ gridTemplateColumns: `repeat(${question.denominator}, minmax(0, 1fr))` }} role="group" aria-label={`One whole split into ${question.denominator} equal parts. Shade ${question.numerator} parts.`}>
                {Array.from({ length: question.denominator }, (_, index) => {
                  const shaded = attempt.shaded.includes(index);
                  return (
                    <button
                      type="button"
                      className={`fq-daily-part ${shaded ? 'shaded' : ''}`}
                      key={index}
                      aria-pressed={shaded}
                      aria-label={`Part ${index + 1} of ${question.denominator}, ${shaded ? 'shaded' : 'not shaded'}`}
                      disabled={attempt.modelChecked && attempt.modelCorrect}
                      onClick={() => setAttempt({
                        ...attempt,
                        shaded: shaded ? attempt.shaded.filter((part) => part !== index) : [...attempt.shaded, index].sort((a, b) => a - b),
                        modelChecked: false,
                        modelCorrect: false,
                        answerChecked: false,
                        answerCorrect: false,
                      })}
                      data-testid={`button-daily-part-${index + 1}`}
                    >
                      {shaded && <span aria-hidden="true">●</span>}
                    </button>
                  );
                })}
              </div>
              <div className="fq-daily-part-label"><span aria-hidden="true">↳</span> PART · one equal piece of the whole</div>
            </>
          ) : (
            <>
              <div className="fq-daily-whole-label"><span>ONE WHOLE</span><span>From 0 to 1</span></div>
              <div className="fq-daily-line-endpoints" aria-hidden="true"><span>0</span><span>1</span></div>
              <div className="fq-daily-line-track" style={{ gridTemplateColumns: `repeat(${question.denominator}, minmax(0, 1fr))` }} role="group" aria-label={`Number line from 0 to 1, split into ${question.denominator} equal spaces. Select ${question.numerator} jumps from 0.`}>
                {Array.from({ length: question.denominator }, (_, index) => {
                  const shaded = attempt.shaded.includes(index);
                  return (
                    <button
                      type="button"
                      className={`fq-daily-jump ${shaded ? 'selected' : ''}`}
                      key={index}
                      aria-pressed={shaded}
                      aria-label={`Point ${index + 1} of ${question.denominator}, ${shaded ? 'selected' : 'not selected'}; choose this to show ${index + 1} jump${index === 0 ? '' : 's'} from 0`}
                      disabled={attempt.modelChecked && attempt.modelCorrect}
                      onClick={() => setAttempt({
                        ...attempt,
                        shaded: Array.from({ length: index + 1 }, (_, part) => part),
                        modelChecked: false,
                        modelCorrect: false,
                        answerChecked: false,
                        answerCorrect: false,
                      })}
                      data-testid={`button-daily-jump-${index + 1}`}
                    >
                      <span className="fq-daily-jump-fill" aria-hidden="true" />
                      <i aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <div className="fq-daily-part-label"><span aria-hidden="true">↳</span> JUMP · one equal space from 0</div>
            </>
          )}
          <p className="fq-daily-count" aria-live="polite">
            {attempt.shaded.length} of {question.denominator} {question.modelKind === 'bar' ? 'parts shaded' : 'jumps selected'}
          </p>

          {!attempt.modelChecked || !attempt.modelCorrect ? (
            <>
              {attempt.modelChecked && !attempt.modelCorrect && (
                <p className="fq-daily-feedback retry" role="status">
                  {question.modelKind === 'bar' ? 'Count the shaded parts.' : 'Count the jumps from 0.'} Tap to change your model, then check it again.
                </p>
              )}
              <div className="fq-daily-actions">
                <button className="fq-button" onClick={checkModel} disabled={attempt.shaded.length === 0} data-testid="button-daily-check-model">
                  Check my model <Check size={17} />
                </button>
                <button className="fq-button ghost" onClick={() => setShowHelp((shown) => !shown)} aria-expanded={showHelp} data-testid="button-daily-hint">
                  {showHelp ? 'Hide hint' : 'Hint'}
                </button>
              </div>
              {showHelp && <p className="fq-daily-hint" role="note">The bottom number tells how many equal parts make the whole. The top number tells how many parts to shade.</p>}
            </>
          ) : (
            <div className="fq-daily-answer-step">
              <p className="fq-daily-feedback success" role="status">Your model shows {question.numerator} of {question.denominator} equal parts. Now name it as a fraction.</p>
              <label className="fq-daily-answer-label" htmlFor="daily-answer-numerator">What fraction did you build?</label>
              <FractionEntry
                id="daily-answer"
                value={attempt.draft}
                onChange={(draft) => setAttempt({ ...attempt, draft, answerChecked: false, answerCorrect: false })}
                describedBy="daily-answer-help"
                disabled={attempt.answerChecked && attempt.answerCorrect}
              />
              <p id="daily-answer-help" className="fq-daily-answer-help">Top number = shaded parts. Bottom number = all equal parts.</p>
              {attempt.answerChecked && !attempt.answerCorrect && (
                <p className="fq-daily-feedback retry" role="status">Not quite. You can edit either number and check again.</p>
              )}
              {attempt.answerChecked && attempt.answerCorrect && (
                <div className="fq-daily-feedback success" role="status">
                  <strong>That’s it!</strong> {question.explanation}
                </div>
              )}
              <div className="fq-daily-actions">
                {attempt.answerChecked && attempt.answerCorrect ? (
                  <button className="fq-button" onClick={continueSession} data-testid="button-daily-next">
                    {session.index === session.questions.length - 1 ? 'Finish today’s practice' : 'Next model'} <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="fq-button" onClick={checkAnswer} disabled={!attempt.draft.trim()} data-testid="button-daily-check-answer">
                    Check my fraction <Check size={17} />
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
        <p className="fq-daily-note">This short practice is separate from lesson mastery. Your lesson checklist and skill reviews do not change here.</p>
      </main>
    </div>
  );
}
