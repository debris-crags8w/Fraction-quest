import { useState, type CSSProperties } from 'react';
import { useScrollTopOn } from './lib/reveal';
import { MathText } from './MathText';
import { LearningListenButton } from './LearningText';
import { ArrowRight, Check, Footprints, Map as MapIcon, RotateCcw, Trophy, X } from 'lucide-react';
import { CHALLENGES, challengeMaxPoints, challengeTrophy, type ChallengeQuestion } from './challenges';
import { Confetti, Mascot, StoryPrompt, unitColor, useFun, type MascotMood } from './fun-ui';
import { playCue, playHaptic } from './lib/fun';
import { ChallengeFigureView } from './models';
import { retryOpener, wrongChoiceReason } from './wrong-answer';

const letter = (index: number) => String.fromCharCode(65 + index);
const TROPHY_TEXT = { gold: 'Gold trophy!', silver: 'Silver trophy!', bronze: 'Bronze trophy!' };

/** "Walk me through it": the long problem as small steps, each a quick 3-choice question. */
function WalkThrough({ question, onClose }: { question: ChallengeQuestion; onClose: () => void }) {
  const steps = question.steps ?? [];
  const [at, setAt] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [ruledOut, setRuledOut] = useState<number[]>([]);
  const done = at >= steps.length;
  const current = steps[at];
  const right = pick !== null && current && pick === current.correct;
  const retryText = pick !== null && current
    ? wrongChoiceReason(current.prompt, current.choices, current.correct, pick) ?? 'Read the step again and count carefully.'
    : '';
  return (
    <section className="fq-walk" aria-label="Walk me through it" data-testid="section-walkthrough">
      <p className="fq-walk-title"><Footprints size={16} /> Step by step {done ? '· all done!' : `· step ${at + 1} of ${steps.length}`}</p>
      <ol className="fq-walk-done">
        {steps.slice(0, at).map((s, i) => <li key={i}><Check size={14} strokeWidth={3} /> <span><MathText text={s.prompt} /> <b><MathText text={s.choices[s.correct]} /></b></span></li>)}
      </ol>
      {!done && current && (
        <div className="fq-walk-step">
          <div className="fq-listen-row"><p><MathText text={current.prompt} /></p><LearningListenButton text={current.prompt} label="Listen to this step" compact /></div>
          <div className="fq-walk-choices" role="group" aria-label={`Step ${at + 1} answer`}>
            {current.choices.map((c, i) => (
              <button type="button" key={i} className={`${pick === i ? (i === current.correct ? 'ok' : 'bad') : ''} ${ruledOut.includes(i) ? 'ruled-out' : ''}`}
                disabled={ruledOut.includes(i)}
                onClick={() => {
                if (pick === i || ruledOut.includes(i)) return;
                playHaptic(i === current.correct ? 'correct' : 'retry');
                setPick(i);
                if (i !== current.correct) setRuledOut((currentRuledOut) => [...currentRuledOut, i]);
              }} data-testid={`button-step-${at + 1}-${i}`}><MathText text={c} /></button>
            ))}
          </div>
          {pick !== null && (right
            ? <button type="button" className="fq-button" onClick={() => { setAt(at + 1); setPick(null); setRuledOut([]); }} data-testid="button-step-next">{at === steps.length - 1 ? 'Finish steps' : 'Next step'} <ArrowRight size={16} /></button>
            : <p className="fq-walk-retry fq-listen-row" role="status" aria-live="polite"><span><strong>{retryOpener(`${question.id}-step-${at}-${pick}`)}</strong> {retryText}</span><LearningListenButton text={`${retryOpener(`${question.id}-step-${at}-${pick}`)} ${retryText}`} label="Listen to the hint" compact /></p>)}
        </div>
      )}
      {done && (
        <div className="fq-walk-step">
          <p>Great! Now pick the answer to the big question below.</p>
          <button type="button" className="fq-button ghost" onClick={onClose} data-testid="button-step-close">Hide the steps</button>
        </div>
      )}
    </section>
  );
}

/** A Unit challenge: five puzzle questions, A–E, worth 3–5 points each. Points count on the first try only. */
export default function Challenge({ unit, unitTitle, best, onDone, onExit }: {
  unit: number; unitTitle: string; best: number;
  onDone: (score: number) => void; onExit: () => void;
}) {
  const questions = CHALLENGES[unit];
  const max = challengeMaxPoints(unit);
  const { fun } = useFun();
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selection, setSelection] = useState<number | null>(null);
  const [ruledOut, setRuledOut] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'asking' | 'right' | 'wrong' | 'reveal' | 'finished'>('asking');
  const [burst, setBurst] = useState(0);
  const [round, setRound] = useState(0);
  useScrollTopOn(`${round}-${index}-${state === 'finished'}`);
  const question = questions[index];
  const retryText = selection === null ? '' : wrongChoiceReason(question.prompt, question.choices, question.correct, selection)
    ?? (question.steps ? 'Look at the model and take this one step at a time.' : 'Compare the amounts in the choices, then try again.');
  const retryHeading = retryOpener(`challenge-${round}-${question.id}-${tries}`);
  // Best score from before this run, so finishing doesn't compare against itself.
  const [bestBefore, setBestBefore] = useState(best);
  // Walk-through help: open/closed, and whether it was used on this question (then no points).
  const [walking, setWalking] = useState(false);
  const [helped, setHelped] = useState(false);
  const openWalk = () => { setWalking(true); setHelped(true); if (state === 'wrong') { setSelection(null); setState('asking'); } };

  const check = () => {
    if (selection === null) return;
    if (selection === question.correct) {
      if (tries === 0 && !helped) setScore((s) => s + question.points);
      setState('right'); setBurst((n) => n + 1); playCue('correct', fun.sound); playHaptic('correct');
    } else {
      playCue('retry', fun.sound); playHaptic('retry');
      setRuledOut((current) => current.includes(selection) ? current : [...current, selection]);
      setTries((t) => t + 1);
      setState(tries === 0 ? 'wrong' : 'reveal');
    }
  };

  const next = () => {
    if (index === questions.length - 1) {
      setState('finished'); onDone(score); playCue('complete', fun.sound); setBurst((n) => n + 1);
      return;
    }
    setIndex((i) => i + 1); setSelection(null); setRuledOut([]); setTries(0); setState('asking'); setWalking(false); setHelped(false);
  };

  const restart = () => { setBestBefore(Math.max(bestBefore, score)); setIndex(0); setScore(0); setSelection(null); setRuledOut([]); setTries(0); setState('asking'); setWalking(false); setHelped(false); setRound((r) => r + 1); };

  if (state === 'finished') {
    const trophy = challengeTrophy(score, unit);
    return (
      <div className="fq-app" style={{ '--unit': unitColor(unit) } as CSSProperties}>
        <Confetti burst={burst} />
        <main className="fq-shell">
          <section className="fq-reward fq-appear" data-testid="status-challenge-complete">
            <div className="fq-reward-mascot" aria-hidden="true"><Mascot mood="cheer" size={110} /><span className={`fq-reward-trophy trophy-${trophy}`}><Trophy size={30} strokeWidth={2.5} /></span></div>
            <div className="fq-eyebrow" style={{ justifyContent: 'center' }}>Unit {unit} challenge</div>
            <h1>{TROPHY_TEXT[trophy]}</h1>
            <p data-testid="text-challenge-score">You scored <strong>{score}</strong> of {max} points.{score > bestBefore ? ' That is your best yet!' : ` Your best is ${bestBefore}.`}</p>
            <div className="fq-reward-actions">
              <button className="fq-button secondary" onClick={restart} data-testid="button-challenge-again"><RotateCcw size={17} /> Try again</button>
              <button className="fq-button ghost" onClick={onExit} data-testid="button-challenge-map"><MapIcon size={17} /> Learning map</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const mood: MascotMood = state === 'right' ? 'cheer' : state === 'asking' ? 'thinking' : 'oops';
  const answered = state === 'right' || state === 'reveal';
  return (
    <div className="fq-app fq-lesson-app" style={{ '--unit': unitColor(unit) } as CSSProperties} key={round}>
      <Confetti burst={burst} />
      <main className="fq-shell fq-play-shell fq-appear">
        <div className="fq-lesson-top">
          <button className="fq-icon-button fq-lesson-close" onClick={onExit} aria-label="Back to learning map" data-testid="button-challenge-exit"><X size={22} strokeWidth={3} /></button>
          <div className="fq-segments" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index} aria-label={`Challenge question ${index + 1} of ${questions.length}`}>
            {questions.map((item, i) => <i key={item.id} className={i < index || (i === index && answered) ? 'on' : i === index ? 'now' : ''} />)}
          </div>
          <span className="fq-challenge-score" data-testid="status-challenge-points">{score} pts</span>
        </div>
        <section className="fq-play-card" aria-labelledby="challenge-title">
          <p className="fq-play-kicker">Unit {unit} challenge · {unitTitle} · <span className={`fq-points p${question.points}`}>{question.points} points</span></p>
          <p className="fq-response-sequence">Question {index + 1} of {questions.length}</p>
          <StoryPrompt prompt={question.prompt} id="challenge-title" />
          {question.figure && <div className="fq-model-area"><div className="fq-visual-model fq-challenge-figure"><ChallengeFigureView figure={question.figure} /></div></div>}
          {question.steps && !walking && state === 'asking' && (
            <button type="button" className="fq-hint-button fq-walk-open" onClick={openWalk} data-testid="button-walkthrough">
              <Footprints size={17} /> Walk me through it {tries === 0 && !helped && <small>(no points)</small>}
            </button>
          )}
          {walking && <WalkThrough question={question} onClose={() => setWalking(false)} />}
          <div className="fq-answer-choices fq-challenge-choices" role="group" aria-label="Choose an answer">
            {question.choices.map((choice, i) => (
              <button key={`${question.id}-${i}`}
                className={`fq-answer-choice ${selection === i ? `selected ${state === 'right' ? 'correct' : state === 'wrong' || state === 'reveal' ? 'retry' : ''}` : ''} ${state === 'reveal' && i === question.correct ? 'selected correct' : ''} ${ruledOut.includes(i) ? 'ruled-out' : ''}`}
                disabled={answered || ruledOut.includes(i)}
                onClick={() => {
                  if (answered) return;
                  if (ruledOut.includes(i)) return;
                  if (selection !== i) playHaptic('selection');
                  setSelection(i);
                  if (state === 'wrong') setState('asking');
                }}
                aria-pressed={selection === i} data-testid={`button-challenge-${question.id}-${letter(i)}`}>
                <span className="fq-choice-marker" aria-hidden="true">{letter(i)}</span><span><MathText text={choice} /><span className="fq-sr">{ruledOut.includes(i) ? ' (already tried)' : ''}</span></span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className={`fq-lesson-footer ${state === 'asking' ? '' : `show ${state === 'right' ? 'correct' : 'retry'}`}`}>
        <div className="fq-shell fq-lesson-footer-inner">
          {state === 'asking' ? (
            <div className="fq-footer-actions">
              <span className="fq-challenge-note">{tries ? 'Last try! Points are gone, but you can still solve it.' : helped ? 'Using the steps: no points, but great practice!' : 'Puzzle time. Take your time!'}</span>
              <button className="fq-button" onClick={check} disabled={selection === null} data-testid="button-challenge-check">Check <Check size={17} strokeWidth={3} /></button>
            </div>
          ) : (
            <div className="fq-sheet" role="status" data-testid="status-challenge-feedback">
              <Mascot mood={mood} size={64} />
              <div className="fq-sheet-copy">
                {state === 'right' && <><strong>{tries === 0 && !helped ? `+${question.points} points!` : 'You got it!'}</strong><span><MathText text={question.explanation} /></span></>}
                 {state === 'wrong' && <><strong>{retryHeading}</strong><span>{retryText} {question.steps ? 'You can also walk through it step by step.' : 'Choose a different answer to try again.'}</span></>}
                {state === 'reveal' && <><strong>The answer is {letter(question.correct)}.</strong><span><MathText text={question.explanation} /></span></>}
              </div>
              {state === 'wrong'
                ? <div className="fq-sheet-buttons">
                    {question.steps && <button className="fq-button ghost fq-sheet-button" onClick={openWalk} data-testid="button-challenge-walk"><Footprints size={17} /> Walk me through it</button>}
                    <button className="fq-button fq-sheet-button" onClick={() => { setSelection(null); setState('asking'); }} data-testid="button-challenge-retry">Try again</button>
                  </div>
                : <button className="fq-button fq-sheet-button" onClick={next} data-testid="button-challenge-next">{index === questions.length - 1 ? 'See my score' : 'Next'} <ArrowRight size={17} /></button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
