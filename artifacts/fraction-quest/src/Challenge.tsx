import { useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Map as MapIcon, RotateCcw, Trophy, X } from 'lucide-react';
import { CHALLENGES, challengeMaxPoints, challengeTrophy } from './challenges';
import { Confetti, Mascot, unitColor, useFun, type MascotMood } from './fun-ui';
import { playCue } from './lib/fun';

const letter = (index: number) => String.fromCharCode(65 + index);
const TROPHY_TEXT = { gold: 'Gold trophy!', silver: 'Silver trophy!', bronze: 'Bronze trophy!' };

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
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'asking' | 'right' | 'wrong' | 'reveal' | 'finished'>('asking');
  const [burst, setBurst] = useState(0);
  const [round, setRound] = useState(0);
  const question = questions[index];
  // Best score from before this run, so finishing doesn't compare against itself.
  const [bestBefore, setBestBefore] = useState(best);

  const check = () => {
    if (selection === null) return;
    if (selection === question.correct) {
      if (tries === 0) setScore((s) => s + question.points);
      setState('right'); setBurst((n) => n + 1); playCue('correct', fun.sound);
    } else {
      playCue('retry', fun.sound);
      setTries((t) => t + 1);
      setState(tries === 0 ? 'wrong' : 'reveal');
    }
  };

  const next = () => {
    if (index === questions.length - 1) {
      setState('finished'); onDone(score); playCue('complete', fun.sound); setBurst((n) => n + 1);
      return;
    }
    setIndex((i) => i + 1); setSelection(null); setTries(0); setState('asking');
  };

  const restart = () => { setBestBefore(Math.max(bestBefore, score)); setIndex(0); setScore(0); setSelection(null); setTries(0); setState('asking'); setRound((r) => r + 1); };

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
          <h1 id="challenge-title">{question.prompt}</h1>
          <div className="fq-answer-choices fq-challenge-choices" role="group" aria-label="Choose an answer">
            {question.choices.map((choice, i) => (
              <button key={`${question.id}-${i}`}
                className={`fq-answer-choice ${selection === i ? `selected ${state === 'right' ? 'correct' : state === 'wrong' || state === 'reveal' ? 'retry' : ''}` : ''} ${state === 'reveal' && i === question.correct ? 'selected correct' : ''}`}
                onClick={() => { if (answered) return; setSelection(i); if (state === 'wrong') setState('asking'); }}
                aria-pressed={selection === i} data-testid={`button-challenge-${question.id}-${letter(i)}`}>
                <span className="fq-choice-marker" aria-hidden="true">{letter(i)}</span><span>{choice}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className={`fq-lesson-footer ${state === 'asking' ? '' : `show ${state === 'right' ? 'correct' : 'retry'}`}`}>
        <div className="fq-shell fq-lesson-footer-inner">
          {state === 'asking' ? (
            <div className="fq-footer-actions">
              <span className="fq-challenge-note">{tries ? 'Last try! Points are gone, but you can still solve it.' : 'Puzzle time. Take your time!'}</span>
              <button className="fq-button" onClick={check} disabled={selection === null} data-testid="button-challenge-check">Check <Check size={17} strokeWidth={3} /></button>
            </div>
          ) : (
            <div className="fq-sheet" role="status" data-testid="status-challenge-feedback">
              <Mascot mood={mood} size={64} />
              <div className="fq-sheet-copy">
                {state === 'right' && <><strong>{tries === 0 ? `+${question.points} points!` : 'You got it!'}</strong><span>{question.explanation}</span></>}
                {state === 'wrong' && <><strong>Not quite!</strong><span>Think again. You get one more try.</span></>}
                {state === 'reveal' && <><strong>The answer is {letter(question.correct)}.</strong><span>{question.explanation}</span></>}
              </div>
              {state === 'wrong'
                ? <button className="fq-button fq-sheet-button" onClick={() => { setSelection(null); setState('asking'); }} data-testid="button-challenge-retry">Try again</button>
                : <button className="fq-button fq-sheet-button" onClick={next} data-testid="button-challenge-next">{index === questions.length - 1 ? 'See my score' : 'Next'} <ArrowRight size={17} /></button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
