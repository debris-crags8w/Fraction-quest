import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, Bot, Car, Code2, Flag, Lock, RotateCcw, Star, Timer, Trophy, Users, Zap } from 'lucide-react';
import CodeSprint from './CodeSprint';
import type { Mission, ModelSpec, PracticeQuestion } from './game';
import { freshSeed, generateQuestions } from './practice-bank';
import { MathText } from './MathText';
import { Confetti, Mascot, useFun } from './fun-ui';
import { playCue } from './lib/fun';
import { LearningText, primeReadAloud, useReadAloud } from './LearningText';

/* Fraction Race: a short competition built from the lesson's own question generator.
   - Race the robot: get 10 right before the robot crosses the line (3 speeds).
   - 2 players: two racers share one screen, each with their own questions.
   A wrong answer stalls your car AND rolls it back one space (and shows the right answer, so the stall
   teaches). 3 right in a row = turbo shield: the next mistake won't roll you back. (A free space would let
   lucky guessers win; tested.) Guessing (about 1 in 3 right) still loses
   more ground than it gains, so only real thinking can win. */

export const RACE_GOAL = 10;
export const STALL_MS = 2000;
/** Right answers in a row for a turbo shield (the next mistake doesn't roll you back). */
export const TURBO_STREAK = 3;
/** Seconds the robot needs to finish, by level. */
export const ROBOT_LEVELS = [
  { level: 1, name: 'Slow robot', seconds: 120 },
  { level: 2, name: 'Fast robot', seconds: 75 },
  { level: 3, name: 'Turbo robot', seconds: 45 },
] as const;

type Mode = { kind: 'robot'; level: 1 | 2 | 3 } | { kind: 'duo' } | { kind: 'sprint' };
export type Racer = { score: number; index: number; stallUntil: number; right: number; wrong: number; pick: number | null; streak: number; boostAt: number; shield: boolean; savedAt: number; missed: number[] };
export const newRacer = (): Racer => ({ score: 0, index: 0, stallUntil: 0, right: 0, wrong: 0, pick: null, streak: 0, boostAt: 0, shield: false, savedAt: 0, missed: [] });

/** The race rule for one answer at time `t` (ms). Right: +1 space; 3 in a row earns a turbo shield.
    Wrong: stall and back 1 space (the shield, if you have one, stops the roll-back once). */
export function applyAnswer(racer: Racer, correct: boolean, t: number, choice = 0): Racer {
  if (t < racer.stallUntil) return racer;
  if (correct) {
    const turbo = !racer.shield && racer.streak + 1 >= TURBO_STREAK;
    return { ...racer, score: racer.score + 1, right: racer.right + 1, index: racer.index + 1, pick: null,
      streak: turbo ? 0 : racer.streak + 1, boostAt: turbo ? t : racer.boostAt, shield: racer.shield || turbo };
  }
  return { ...racer, score: racer.shield ? racer.score : Math.max(0, racer.score - 1), stallUntil: t + STALL_MS, wrong: racer.wrong + 1, index: racer.index + 1, pick: choice,
    streak: 0, shield: false, savedAt: racer.shield ? t : racer.savedAt, missed: [...racer.missed, racer.index] };
}

/** Stars for a win against the robot: by how many answers were right. */
export const raceStars = (right: number, wrong: number) => { const share = right / Math.max(1, right + wrong); return share >= 0.9 ? 3 : share >= 0.7 ? 2 : 1; };
const letter = (i: number) => String.fromCharCode(65 + i);

/** One racer's question panel. */
function Lane({ name, questions, racer, now, onAnswer, renderModel, color, flipped }: {
  name: string; questions: PracticeQuestion[]; racer: Racer; now: number; onAnswer: (choice: number) => void;
  renderModel: (model: ModelSpec) => ReactNode; color: string; flipped?: boolean;
}) {
  const stalled = now < racer.stallUntil;
  // While stalled, keep the missed question on screen with the right answer: the stall becomes a mini lesson.
  const questionIndex = stalled ? Math.max(0, racer.index - 1) : racer.index;
  const q = questions[questionIndex % questions.length];
  const turbo = now - racer.boostAt < 1200 && racer.boostAt > 0;
  return (
    <section className={`fq-race-lane ${flipped ? 'flipped' : ''} ${stalled ? 'stalled' : ''}`} style={{ '--lane': color } as CSSProperties} aria-label={`${name}'s questions`}>
      <p className="fq-race-lane-name"><b>{name}</b> · {racer.score}/{RACE_GOAL}{racer.shield ? <span className="fq-race-streak"> · 🛡️ shield on</span> : racer.streak > 0 && !stalled ? <span className="fq-race-streak"> · {'🔥'.repeat(Math.min(racer.streak, TURBO_STREAK))} {TURBO_STREAK - racer.streak} more for a shield</span> : null}</p>
      {turbo && <p className="fq-race-turbo" role="status">TURBO SHIELD! Your next mistake won't roll you back.</p>}
      <p className="fq-response-sequence">Question {Math.min(questionIndex + 1, RACE_GOAL)} of {RACE_GOAL}</p>
      <h2 className="fq-race-q fq-question-text"><LearningText text={q.prompt} emphasize interactiveTerms={false} /></h2>
      {(q.model.kind !== 'equation') && <div className="fq-race-model">{renderModel(q.model)}</div>}
      <div className="fq-race-choices" role="group" aria-label="Choose an answer">
        {q.choices.map((choice, i) => (
          <button key={`${racer.index}-${i}`} type="button" disabled={stalled} onClick={() => onAnswer(i)}
            className={stalled ? (i === q.correctChoice ? 'right' : racer.pick === i ? 'wrong' : '') : ''} data-testid={`race-${name.replace(/\s/g, '').toLowerCase()}-choice-${i}`}>
            <span aria-hidden="true">{letter(i)}</span><MathText text={choice} />
          </button>
        ))}
      </div>
      {stalled && <p className="fq-race-stall" role="status">The answer is {letter(q.correctChoice)}. <MathText text={q.retryFeedback} /> {racer.savedAt === racer.stallUntil - STALL_MS ? 'Your shield saved you: no roll-back!' : 'Back one space…'}</p>}
    </section>
  );
}

function Track({ lanes }: { lanes: { name: string; progress: number; icon: ReactNode; color: string }[] }) {
  return (
    <div className="fq-race-track" aria-label="Race track">
      {lanes.map((lane) => (
        <div className="fq-race-row" key={lane.name} style={{ '--lane': lane.color } as CSSProperties}>
          <span className="fq-race-row-name">{lane.name}</span>
          <div className="fq-race-road" role="progressbar" aria-label={`${lane.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lane.progress * 100)}>
            <span className="fq-race-car" style={{ left: `calc(${Math.min(1, lane.progress) * 100}% - ${Math.min(1, lane.progress) * 34}px)` }}>{lane.icon}</span>
            <Flag className="fq-race-flag" size={18} aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FractionRace({ mission, best, robotBeaten, sprintBest, onExit, onFinish, onSprintFinish, renderModel }: {
  mission: Mission; best: number | null; robotBeaten: number; sprintBest: number | null;
  onExit: () => void; onFinish: (seconds: number, robotLevel: number) => void; onSprintFinish: (seconds: number) => void; renderModel: (model: ModelSpec) => ReactNode;
}) {
  const { fun } = useFun();
  const baseIds = useMemo(() => mission.questions.map((q) => q.id), [mission]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<'pick' | 'countdown' | 'race' | 'done'>('pick');
  const [count, setCount] = useState(3);
  const [seeds, setSeeds] = useState<[number, number]>(() => [freshSeed(), freshSeed()]);
  const questions = useMemo(() => seeds.map((seed) => generateQuestions(mission.id, baseIds, seed, 40)), [mission.id, baseIds, seeds]);
  const [racers, setRacersState] = useState<[Racer, Racer]>([newRacer(), newRacer()]);
  // Two players can tap in the same moment: always build on the latest scores, not the last render's.
  const racersRef = useRef(racers);
  const setRacers = (next: [Racer, Racer]) => { racersRef.current = next; setRacersState(next); };
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [winner, setWinner] = useState<string | null>(null);
  const [finishTime, setFinishTime] = useState(0);
  const [flip, setFlip] = useState(false);
  const finished = useRef(false);

  const robot = mode?.kind === 'robot' ? ROBOT_LEVELS[mode.level - 1] : null;
  const elapsed = phase === 'race' ? (now - startedAt) / 1000 : finishTime;
  const robotProgress = robot ? Math.min(1, elapsed / robot.seconds) : 0;

  // Racing the robot, each new question is read aloud as it appears (sound on; not in 2-player, where two voices would clash).
  const lead = racers[0];
  const leadStalled = now < lead.stallUntil;
  const readQuestion = phase === 'race' && mode?.kind === 'robot' && fun.sound && !leadStalled && !finished.current
    ? questions[0][lead.index % questions[0].length].prompt : null;
  useReadAloud(readQuestion, readQuestion === null ? null : lead.index);

  const start = (next: Mode) => {
    primeReadAloud();
    if (next.kind === 'sprint') { setMode(next); setPhase('race'); return; }
    setMode(next); setSeeds([freshSeed(), freshSeed()]); setRacers([newRacer(), newRacer()]);
    setWinner(null); finished.current = false; setCount(3); setPhase('countdown');
  };

  // 3-2-1-Go!
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) { setStartedAt(Date.now()); setNow(Date.now()); setPhase('race'); return; }
    const t = window.setTimeout(() => setCount((c) => c - 1), 700);
    return () => window.clearTimeout(t);
  }, [phase, count]);

  // Clock tick (also moves the robot).
  useEffect(() => {
    if (phase !== 'race') return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [phase]);

  const end = (who: string, seconds: number, playerWon: boolean) => {
    if (finished.current) return;
    finished.current = true;
    setWinner(who); setFinishTime(seconds); setPhase('done');
    playCue(playerWon ? 'complete' : 'retry', fun.sound);
    if (mode?.kind === 'robot' && playerWon) onFinish(seconds, mode.level);
  };

  // The robot wins if it reaches the line first.
  useEffect(() => {
    if (phase === 'race' && robot && robotProgress >= 1) end('Robot', robot.seconds, false);
  });

  const answer = (who: 0 | 1, choice: number) => {
    if (phase !== 'race') return;
    const t = Date.now();
    const racer = racersRef.current[who];
    if (t < racer.stallUntil || finished.current) return;
    const q = questions[who][racer.index % questions[who].length];
    const next = [...racersRef.current] as [Racer, Racer];
    next[who] = applyAnswer(racer, choice === q.correctChoice, t, choice);
    if (choice === q.correctChoice) {
      playCue('correct', fun.sound);
      if (next[who].score >= RACE_GOAL) {
        const seconds = (t - startedAt) / 1000;
        end(mode?.kind === 'duo' ? (who === 0 ? 'Player 1' : 'Player 2') : 'You', seconds, true);
      }
    } else {
      // Stalled and moved on to a new question (no hunting for the answer by tapping every choice).
      playCue('retry', fun.sound);
    }
    setRacers(next);
  };

  if (phase === 'pick') {
    return (
      <div className="fq-app">
        <main className="fq-shell fq-race fq-appear" data-testid="race-pick">
          <button className="fq-back" onClick={onExit} data-testid="button-race-exit"><ArrowLeft size={17} /> Back to the map</button>
          <header className="fq-race-head">
            <span className="fq-race-badge"><Zap size={16} /> Fraction Race</span>
            <h1>{mission.title}</h1>
            <p>Get {RACE_GOAL} answers right to cross the line. A wrong answer stalls your car and rolls it back one space, so be quick <i>and</i> careful!</p>
            {best !== null && <p className="fq-race-best" data-testid="text-race-best"><Timer size={16} /> Your best: {best.toFixed(1)} s{robotBeaten ? ` · beat the ${ROBOT_LEVELS[robotBeaten - 1].name.toLowerCase()}` : ''}</p>}
          </header>
          <ul className="fq-race-howto" aria-label="How to play">
            <li><span>✅</span> Right answer: your car moves 1 space.</li>
            <li><span>🔥</span> 3 right in a row: a turbo shield. Your next mistake won't roll you back.</li>
            <li><span>🛑</span> Wrong answer: stall, back 1 space, and see the right answer.</li>
          </ul>
          <section className="fq-race-modes">
            <h2><Bot size={20} /> Race the robot</h2>
            <div className="fq-race-mode-buttons">
              {ROBOT_LEVELS.map((r) => {
                // Faster robots unlock one at a time.
                const locked = r.level > 1 && robotBeaten < r.level - 1;
                return (
                  <button key={r.level} type="button" className={`fq-race-mode level-${r.level} ${locked ? 'locked' : ''}`} disabled={locked} onClick={() => start({ kind: 'robot', level: r.level })} data-testid={`button-race-robot-${r.level}`}>
                    <b>{r.name}</b><small>{locked ? `Beat the ${ROBOT_LEVELS[r.level - 2].name.toLowerCase()} first` : `finishes in ${r.seconds} s`}</small>
                    {locked ? <Lock size={16} aria-label="locked" /> : robotBeaten >= r.level && <Trophy size={16} aria-label="beaten" />}
                  </button>
                );
              })}
            </div>
            <h2><Code2 size={20} /> Code sprint</h2>
            <p className="fq-race-note">A coding race: program the robot 5 times before the robot coder finishes.{sprintBest !== null ? ` Your best: ${sprintBest.toFixed(1)} s.` : ''}</p>
            <button type="button" className="fq-button secondary" onClick={() => start({ kind: 'sprint' })} data-testid="button-race-sprint"><Code2 size={17} /> Start a code sprint</button>
            <h2><Users size={20} /> 2 players</h2>
            <p className="fq-race-note">Race a friend on this device. Each player gets their own questions.</p>
            <label className="fq-race-flip"><input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} /> Sitting across from each other? Turn Player 1's side around.</label>
            <button type="button" className="fq-button" onClick={() => start({ kind: 'duo' })} data-testid="button-race-duo"><Users size={17} /> Start a 2-player race</button>
          </section>
        </main>
      </div>
    );
  }

  if (mode?.kind === 'sprint') return <CodeSprint mission={mission} best={sprintBest} onExit={() => setPhase('pick')} onFinish={onSprintFinish} />;

  const duo = mode?.kind === 'duo';
  const lanes = duo
    ? [{ name: 'Player 1', progress: racers[0].score / RACE_GOAL, icon: <Car size={22} />, color: 'var(--fq-grape)' }, { name: 'Player 2', progress: racers[1].score / RACE_GOAL, icon: <Car size={22} />, color: '#E07000' }]
    : [{ name: 'You', progress: racers[0].score / RACE_GOAL, icon: <Car size={22} />, color: 'var(--fq-grape)' }, { name: 'Robot', progress: robotProgress, icon: <Bot size={22} />, color: '#6B7280' }];

  if (phase === 'done') {
    const playerWon = winner !== 'Robot';
    const newBest = !duo && playerWon && (best === null || finishTime < best);
    const tries = racers[0].right + racers[0].wrong;
    return (
      <div className="fq-app">
        <Confetti burst={playerWon ? 1 : 0} />
        <main className="fq-shell fq-race fq-appear">
          <section className="fq-reward" data-testid="race-done">
            <div className="fq-reward-mascot" aria-hidden="true"><Mascot mood={playerWon ? 'cheer' : 'oops'} size={100} /></div>
            <h1 data-testid="text-race-winner">{duo ? `${winner} wins!` : playerWon ? 'You win!' : 'The robot won this time!'}</h1>
            <Track lanes={lanes} />
            {!duo && <p data-testid="text-race-result">{playerWon ? `You crossed the line in ${finishTime.toFixed(1)} seconds.` : (racers[0].score >= RACE_GOAL - 3 ? `You got ${racers[0].score} of ${RACE_GOAL}. So close!` : `You got ${racers[0].score} of ${RACE_GOAL}. Slow down and think about each one: wrong answers roll you back.`)} {tries ? `${racers[0].right} of ${tries} answers were right.` : ''}{newBest ? ' New best time!' : ''}</p>}
            {duo && <p>Player 1: {racers[0].right} right, {racers[0].wrong} wrong · Player 2: {racers[1].right} right, {racers[1].wrong} wrong</p>}
            {!duo && playerWon && (
              <div className="fq-race-stars" aria-label={`${raceStars(racers[0].right, racers[0].wrong)} of 3 stars`} data-testid="race-stars">
                {[1, 2, 3].map((n) => <Star key={n} size={34} className={n <= raceStars(racers[0].right, racers[0].wrong) ? 'filled' : ''} />)}
                <small>3 stars: 9 out of 10 answers right</small>
              </div>
            )}
            {!duo && racers[0].missed.length > 0 && (
              <section className="fq-race-missed" data-testid="race-missed">
                <h2>Look at these again</h2>
                <ul>
                  {racers[0].missed.slice(-4).map((i) => { const q = questions[0][i % questions[0].length]; return <li key={i}><MathText text={q.prompt} /> <b>→ <MathText text={q.choices[q.correctChoice]} /></b></li>; })}
                </ul>
              </section>
            )}
            <div className="fq-reward-actions">
              <button className="fq-button" onClick={() => mode && start(mode)} data-testid="button-race-again"><RotateCcw size={17} /> Race again</button>
              <button className="fq-button secondary" onClick={() => setPhase('pick')} data-testid="button-race-modes">Change race</button>
              <button className="fq-button ghost" onClick={onExit}>Back to the map</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="fq-app fq-race-app">
      <main className={`fq-shell fq-race ${duo ? 'duo' : ''}`} data-testid="race-live">
        <div className="fq-race-top">
          <button className="fq-icon-button" onClick={() => setPhase('pick')} aria-label="Stop the race" data-testid="button-race-stop"><ArrowLeft size={20} /></button>
          <span className="fq-race-clock" data-testid="text-race-clock"><Timer size={16} /> {elapsed.toFixed(1)} s</span>
        </div>
        <Track lanes={lanes} />
        {phase === 'countdown' ? (
          <div className="fq-race-countdown" aria-live="assertive" data-testid="race-countdown">{count || 'Go!'}</div>
        ) : duo ? (
          <div className="fq-race-duo">
            <Lane name="Player 1" questions={questions[0]} racer={racers[0]} now={now} onAnswer={(c) => answer(0, c)} renderModel={renderModel} color="var(--fq-grape)" flipped={flip} />
            <Lane name="Player 2" questions={questions[1]} racer={racers[1]} now={now} onAnswer={(c) => answer(1, c)} renderModel={renderModel} color="#E07000" />
          </div>
        ) : (
          <Lane name="You" questions={questions[0]} racer={racers[0]} now={now} onAnswer={(c) => answer(0, c)} renderModel={renderModel} color="var(--fq-grape)" />
        )}
      </main>
    </div>
  );
}
