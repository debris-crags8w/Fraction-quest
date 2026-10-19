import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Bot, Code2, Flag, Play, RotateCcw, Timer, Trophy } from 'lucide-react';
import { primeReadAloud, useReadAloud } from './LearningText';
import type { Mission } from './game';
import { MathText } from './MathText';
import { Confetti, Mascot, useFun } from './fun-ui';
import { playCue, playHaptic } from './lib/fun';
import { describe, goal, makeBug, matchesTarget, readChoices, runProgram, solution, sprintTargets, toText, type Block, type RunResult, type Target } from './code-quest';
import { Program, World } from './CodeQuest';

/* Code Sprint: a coding race. Program the robot 5 times (fill in numbers, fix a bug, read Python)
   before the robot coder finishes. Mistakes add seconds, so careful code wins. */

export const SPRINT_ROUNDS = ['fill', 'fill', 'debug', 'read', 'fill'] as const;
export const ROBOT_CODER_SECONDS = 150;
export const MISS_PENALTY = 5;
type RoundKind = (typeof SPRINT_ROUNDS)[number];
type Round = { kind: RoundKind; target: Target; start: Block[]; choices?: Block[][]; order?: number[] };

/** Five rounds from the lesson's own fractions (pure, so it can be tested). */
export function makeSprint(missionId: string, random: () => number = Math.random): Round[] {
  const pool = sprintTargets(missionId);
  const pick = () => pool[Math.floor(random() * pool.length)];
  return SPRINT_ROUNDS.map((kind) => {
    const target = pick();
    if (kind === 'debug') return { kind, target, start: makeBug(target) };
    if (kind === 'read') {
      const choices = readChoices(target);
      const order = choices.map((_, i) => i).sort(() => random() - 0.5);
      return { kind, target, start: [], choices, order };
    }
    return { kind, target, start: solution(target, true) };
  });
}

const TITLE: Record<RoundKind, string> = { fill: 'Fill in the numbers', debug: 'Fix the bug', read: 'Which program works?' };

export default function CodeSprint({ mission, best, onExit, onFinish }: { mission: Mission; best: number | null; onExit: () => void; onFinish: (seconds: number) => void }) {
  const { fun } = useFun();
  const [rounds, setRounds] = useState(() => makeSprint(mission.id));
  const [at, setAt] = useState(0);
  const [program, setProgram] = useState<Block[]>(rounds[0].start);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [penalty, setPenalty] = useState(0);
  const [misses, setMisses] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [frame, setFrame] = useState(-1);
  const [message, setMessage] = useState<string | null>(null);
  const [pickedWrong, setPickedWrong] = useState<number | null>(null);
  /** The round is solved: wait for the child to press Next (no automatic jump). */
  const [solved, setSolved] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const [won, setWon] = useState(false);
  const timer = useRef<number | null>(null);
  const round = rounds[at];
  // Each program's goal is read aloud when it appears (sound on).
  useReadAloud(phase === 'play' && fun.sound ? `Make the robot ${goal(round.target)}.` : null, phase === 'play' ? at : null);
  const elapsed = phase === 'play' ? (now - startedAt) / 1000 + penalty : finalTime;

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  useEffect(() => {
    if (phase !== 'play') return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [phase]);
  // The robot coder wins if it finishes first.
  useEffect(() => { if (phase === 'play' && elapsed >= ROBOT_CODER_SECONDS) finish(false); });

  const begin = () => {
    primeReadAloud();
    const fresh = makeSprint(mission.id);
    setRounds(fresh); setAt(0); setProgram(fresh[0].start); setPenalty(0); setMisses(0); setResult(null); setFrame(-1); setMessage(null); setPickedWrong(null); setSolved(false);
    setStartedAt(Date.now()); setNow(Date.now()); setPhase('play');
  };
  const finish = (playerWon: boolean) => {
    if (phase !== 'play') return;
    const seconds = Math.round(((Date.now() - startedAt) / 1000 + penalty) * 10) / 10;
    setFinalTime(seconds); setWon(playerWon); setPhase('done');
    playCue(playerWon ? 'complete' : 'retry', fun.sound);
    playHaptic(playerWon ? 'correct' : 'retry');
    if (playerWon) onFinish(seconds);
  };
  const next = () => {
    if (at === rounds.length - 1) { finish(true); return; }
    setAt(at + 1); setProgram(rounds[at + 1].start); setResult(null); setFrame(-1); setMessage(null); setPickedWrong(null); setSolved(false);
    window.scrollTo(0, 0);
  };
  const miss = (text: string) => {
    setPenalty((p) => p + MISS_PENALTY);
    setMisses((m) => m + 1);
    setMessage(text);
    playCue('retry', fun.sound);
    playHaptic('retry');
  };

  const run = () => {
    if (timer.current || solved) return;
    const r = runProgram(program, round.target);
    setResult(r); setMessage(null); setFrame(0);
    const total = r.steps.length; const ms = Math.max(40, Math.min(200, 2400 / Math.max(1, total)));
    let k = 0;
    const done = () => {
      timer.current = null;
      if (matchesTarget(r, round.target)) { playCue('correct', fun.sound); playHaptic('correct'); setMessage('It works!'); setSolved(true); }
      else miss(`${r.error ?? describe(r)} +${MISS_PENALTY} s. Fix it and run again.`);
    };
    if (!total) { done(); return; }
    timer.current = window.setInterval(() => {
      k += 1;
      if (k >= total) { if (timer.current) window.clearInterval(timer.current); setFrame(total - 1); done(); return; }
      setFrame(k);
    }, ms);
  };
  const choose = (i: number) => {
    if (solved) return;
    if (i === 0) { playCue('correct', fun.sound); playHaptic('correct'); setMessage('Yes! That program works.'); setSolved(true); return; }
    setPickedWrong(i); miss(`That one makes ${describe(runProgram(round.choices![i], round.target)).replace(/^It /, 'the robot ').replace(/\.$/, '')}. +${MISS_PENALTY} s.`);
  };

  const lanes = useMemo(() => [
    { name: 'You', progress: phase === 'done' && won ? 1 : at / rounds.length, color: '#1C7ED6', icon: <Code2 size={20} /> },
    { name: 'Robot coder', progress: Math.min(1, elapsed / ROBOT_CODER_SECONDS), color: '#6B7280', icon: <Bot size={20} /> },
  ], [at, rounds.length, elapsed, phase, won]);
  const track = (
    <div className="fq-race-track">
      {lanes.map((lane) => (
        <div className="fq-race-row" key={lane.name} style={{ '--lane': lane.color } as CSSProperties}>
          <span className="fq-race-row-name">{lane.name}</span>
          <div className="fq-race-road" role="progressbar" aria-label={`${lane.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lane.progress * 100)}>
            <span className="fq-race-car" style={{ left: `calc(${lane.progress * 100}% - ${lane.progress * 34}px)` }}>{lane.icon}</span>
            <Flag className="fq-race-flag" size={18} aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );

  if (phase === 'intro') {
    return (
      <div className="fq-app"><main className="fq-shell fq-race fq-appear" data-testid="sprint-intro">
        <button className="fq-back" onClick={onExit}><ArrowLeft size={17} /> Back</button>
        <header className="fq-race-head">
          <span className="fq-code-badge"><Code2 size={16} /> Code sprint</span>
          <h1>{mission.title}</h1>
          <p>Program the robot 5 times before the robot coder finishes ({ROBOT_CODER_SECONDS} s). Each mistake adds {MISS_PENALTY} seconds, so check your code!</p>
          {best !== null && <p className="fq-race-best"><Timer size={16} /> Your best: {best.toFixed(1)} s</p>}
        </header>
        <ol className="fq-sprint-steps">
          <li><b>Fill in the numbers</b> so the robot builds the fraction.</li>
          <li><b>Fix the bug</b> in a program that almost works.</li>
          <li><b>Read the code:</b> pick the Python program that works.</li>
        </ol>
        <button className="fq-button" onClick={begin} data-testid="button-sprint-start"><Play size={17} /> Start the sprint</button>
      </main></div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="fq-app"><Confetti burst={won ? 1 : 0} />
        <main className="fq-shell fq-race fq-appear"><section className="fq-reward" data-testid="sprint-done">
          <div className="fq-reward-mascot" aria-hidden="true"><Mascot mood={won ? 'cheer' : 'oops'} size={100} /></div>
          <h1 data-testid="text-sprint-result">{won ? 'You out-coded the robot!' : 'The robot coder won this time'}</h1>
          {track}
          <p>{won ? `All 5 programs in ${finalTime.toFixed(1)} s` : `You finished ${at} of 5 programs`}{misses ? ` (${misses} ${misses === 1 ? 'mistake' : 'mistakes'}, +${misses * MISS_PENALTY} s)` : ' with no mistakes'}.{won && (best === null || finalTime < best) ? ' New best time!' : ''}</p>
          <div className="fq-reward-actions">
            <button className="fq-button" onClick={begin} data-testid="button-sprint-again"><RotateCcw size={17} /> Sprint again</button>
            <button className="fq-button ghost" onClick={onExit}>Back</button>
          </div>
        </section></main>
      </div>
    );
  }

  const shown = result && frame >= 0 ? result.steps[Math.min(frame, result.steps.length - 1)] : null;
  return (
    <div className="fq-app"><main className="fq-shell fq-race fq-sprint" data-testid="sprint-live">
      <div className="fq-race-top">
        <button className="fq-icon-button" onClick={onExit} aria-label="Stop the sprint"><ArrowLeft size={20} /></button>
        <span className="fq-race-clock" data-testid="text-sprint-clock"><Timer size={16} /> {elapsed.toFixed(1)} s{penalty ? ` (+${penalty})` : ''}</span>
      </div>
      {track}
      <section className="fq-code-goal">
        <p className="fq-code-level-title">Program {at + 1} of 5 · {TITLE[round.kind]}</p>
        <h2 data-testid="text-sprint-goal"><MathText text={`Make the robot ${goal(round.target)}.`} /></h2>
      </section>
      {round.kind === 'read' ? (
        <div className="fq-sprint-read" role="group" aria-label="Pick the program that works">
          {round.order!.map((i, k) => (
            <button key={i} type="button" className={`fq-sprint-code ${pickedWrong === i ? 'wrong' : ''} ${pickedWrong !== null && i === 0 ? 'right' : ''}`} onClick={() => choose(i)} disabled={pickedWrong !== null && i !== 0} data-testid={`button-sprint-read-${i === 0 ? 'right' : `wrong-${k}`}`}>
              <span className="fq-sprint-code-letter">{String.fromCharCode(65 + k)}</span>
              <pre>{toText(round.choices![i], round.target.kind)}</pre>
            </button>
          ))}
        </div>
      ) : (
        <>
          <section className="fq-code-stage"><World state={shown?.state ?? null} target={round.target} /></section>
          <section className="fq-code-editor">
            <Program blocks={program} kind={round.target.kind} editable reorder={false} active={shown?.path ?? null} onChange={(b) => { setProgram(b); setResult(null); setFrame(-1); }} />
            <div className="fq-code-run">
              <button type="button" className="fq-button" onClick={run} data-testid="button-sprint-run"><Play size={17} /> Run</button>
              {round.kind === 'debug' && <span className="fq-code-note">Run it, watch what goes wrong, then change one number.</span>}
            </div>
          </section>
        </>
      )}
      {message && <p className={`fq-sprint-msg ${message.startsWith('It works') || message.startsWith('Yes') ? 'ok' : 'bad'}`} role="status" data-testid="text-sprint-message"><MathText text={message} /></p>}
      {solved && <button type="button" className="fq-button" onClick={next} data-testid="button-sprint-next">{at === rounds.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={17} /></button>}
      <p className="fq-race-note"><Trophy size={14} /> Robot coder finishes at {ROBOT_CODER_SECONDS} s.</p>
    </main></div>
  );
}
