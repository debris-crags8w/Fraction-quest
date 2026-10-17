import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowLeft, Printer, RotateCcw, Scale, Shuffle, Waypoints } from 'lucide-react';
import './concept-games.css';
import { areEquivalent, compareFractions, targetTick, WAR_PARTS, WAR_ROUNDS, warHint } from './concept-games';
import { printPage } from './lib/print';
import { TaskBar } from './TaskBar';
import { LiveFraction } from './fraction-ui';
import { playCue, playHaptic } from './lib/fun';
import { useFun } from './fun-ui';
import { retryOpener } from './wrong-answer';

type Fraction = { n: number; d: number };
type Model = { d: number; n: number };
const rounds: [Fraction, Fraction][] = WAR_ROUNDS;
/** d = 0: the child hasn't chosen how many equal parts yet (never pre-set to the answer). */
const unbuilt = (): [Model, Model] => [{ d: 0, n: 0 }, { d: 0, n: 0 }];
const matches: Fraction[] = [{ n: 1, d: 2 }, { n: 2, d: 3 }, { n: 3, d: 4 }, { n: 2, d: 4 }, { n: 4, d: 6 }, { n: 6, d: 8 }];
const shuffleCards = () => {
  const indices = matches.map((_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[other]] = [indices[other], indices[index]];
  }
  return indices;
};

function FractionLabel({ n, d }: Fraction) {
  return <span className="cg-fraction" aria-label={`${n} over ${d}`}><span>{n}</span><i /> <span>{d}</span></span>;
}

function Bar({ model, onToggle, label, disabled = false }: { model: Model; onToggle?: (index: number) => void; label: string; disabled?: boolean }) {
  if (!model.d) return <div className="cg-bar-wrap" aria-label={label}><div className="cg-bar cg-bar-unsplit" role="img" aria-label={`${label}: one whole, not split yet`}><span className="cg-cell" /></div></div>;
  return <div className="cg-bar-wrap" aria-label={label}>
    <div className="cg-bar" style={{ '--parts': model.d } as CSSProperties} role="group" aria-label={`${label}: ${model.n} of ${model.d} parts shaded`}>
      {Array.from({ length: model.d }, (_, i) => onToggle
        ? <button key={i} type="button" className={`cg-cell ${i < model.n ? 'is-shaded' : ''}`} aria-label={`${label}, part ${i + 1}${i < model.n ? ', shaded' : ', unshaded'}`} aria-pressed={i < model.n} onClick={() => onToggle(i)} disabled={disabled} data-testid={`${label}-part-${i + 1}`} />
        : <span key={i} className={`cg-cell ${i < model.n ? 'is-shaded' : ''}`} />)}
    </div>
  </div>;
}

function FractionWar() {
  const { fun } = useFun();
  const [round, setRound] = useState(0);
  const [models, setModels] = useState<[Model, Model]>(unbuilt);
  const [choice, setChoice] = useState<'left' | 'right' | 'same' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'info' | 'retry' | 'success'>('info');
  const [score, setScore] = useState(0);
  const [roundSolved, setRoundSolved] = useState(false);
  const target = rounds[round % rounds.length];
  const modelsBuilt = models.every((model, i) => model.d === target[i].d && model.n === target[i].n);
  const changeModel = (side: 0 | 1, patch: Partial<Model>) => {
    const next = { ...models[side], ...patch };
    if (next.d === models[side].d && next.n === models[side].n) return;
    playHaptic('selection');
    setModels(current => current.map((model, i) => i === side ? { ...model, ...patch } : model) as [Model, Model]);
    setChoice(null); setFeedback(''); setFeedbackTone('info');
  };
  const choose = () => {
    if (!modelsBuilt || roundSolved) {
      setFeedback('Build both bars first. Choose how many equal parts, then shade the parts selected.');
      setFeedbackTone('info');
      return;
    }
    if (!choice) { setFeedback('Look at both shaded amounts, then choose the larger one or same amount.'); setFeedbackTone('info'); return; }
    const comparison = compareFractions(target[0], target[1]);
    const expected = comparison > 0 ? 'left' : comparison < 0 ? 'right' : 'same';
    playHaptic(choice === expected ? 'correct' : 'retry');
    playCue(choice === expected ? 'correct' : 'retry', fun.sound);
    if (choice === expected) { setScore(s => s + 1); setRoundSolved(true); setFeedback('That is it. Equal-size wholes make the shaded amounts easy to compare.'); setFeedbackTone('success'); }
    else { setFeedback(`${retryOpener(`war-${round}`)} ${warHint(target[0], target[1])}`); setFeedbackTone('retry'); }
  };
  const next = () => { setRound(r => r + 1); setModels(unbuilt()); setChoice(null); setRoundSolved(false); setFeedback(''); setFeedbackTone('info'); };
  const replay = () => { setRound(0); setScore(0); setModels(unbuilt()); setChoice(null); setRoundSolved(false); setFeedback(''); setFeedbackTone('info'); };
  return <section className="cg-game" aria-labelledby="war-title">
    <div className="cg-game-heading"><span className="cg-index">Game 1 · Build and compare</span><span className="cg-score" data-testid="status-war-score">Local round score · {score}</span></div>
    <h2 id="war-title">Fraction War</h2><p className="cg-instruction">Build each fraction before deciding which amount is greater. Each bar is one same-size whole.</p>
    <div className="cg-war-models">{target.map((fraction, side) => {
      const model = models[side as 0 | 1];
      return <article className="cg-model-card" key={side}>
        <div className="cg-model-label"><span>Whole {side ? 'B' : 'A'}</span><strong>Build <FractionLabel {...fraction} /></strong></div>
        <label className="cg-control-label" htmlFor={`war-denom-${side}`}>Equal parts<span className="cg-hide-narrow"> in this whole</span></label>
        <select id={`war-denom-${side}`} value={model.d} disabled={roundSolved} onChange={e => changeModel(side as 0 | 1, { d: Number(e.target.value), n: 0 })} data-testid={`select-war-denominator-${side}`}>
          <option value={0} disabled>Choose…</option>
          {WAR_PARTS.map(n => <option value={n} key={n}>{n} equal parts</option>)}
        </select>
        <Bar model={model} label={`whole-${side ? 'b' : 'a'}`} disabled={roundSolved} onToggle={i => changeModel(side as 0 | 1, { n: i < model.n ? i : i + 1 })} />
        <LiveFraction n={model.n} d={model.d} compact color="var(--fq-sky)" testId={`war-live-fraction-${side}`} />
      </article>;
    })}</div>
    <fieldset className="cg-compare"><legend>Which amount is larger?</legend>{(['left', 'right', 'same'] as const).map((v, i) => <button type="button" key={v} className={`cg-choice ${choice === v ? 'selected' : ''}`} aria-pressed={choice === v} disabled={!modelsBuilt || roundSolved} onClick={() => {
      if (choice === v) return;
      playHaptic('selection');
      setChoice(v); setFeedback(''); setFeedbackTone('info');
    }} data-testid={`button-war-choice-${v}`}>{i === 0 ? 'Whole A' : i === 1 ? 'Whole B' : 'Same amount'}</button>)}</fieldset>
    <div className="cg-actions"><button type="button" className="cg-primary" onClick={choose} disabled={!modelsBuilt || !choice || roundSolved} data-testid="button-war-check">{roundSolved ? 'Round complete' : 'Check my comparison'}</button><button type="button" className="cg-secondary" onClick={next} data-testid="button-war-next">Next pair</button><button type="button" className="cg-text-button" onClick={replay} data-testid="button-war-replay"><RotateCcw size={16} /> Replay</button></div>
    {feedback && <p className={`cg-feedback ${feedbackTone}`} role="status" aria-live="polite" data-testid="status-war-feedback">{feedback}</p>}
  </section>;
}

function EquivalenceMatch() {
  const { fun } = useFun();
  const [selected, setSelected] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [message, setMessage] = useState('Turn over two cards. Match equal amounts, even when the fraction names look different.');
  const [messageTone, setMessageTone] = useState<'info' | 'retry' | 'success'>('info');
  const [score, setScore] = useState(0);
  const [cardOrder, setCardOrder] = useState(shuffleCards);
  useEffect(() => {
    if (selected.length !== 2 || areEquivalent(matches[selected[0]], matches[selected[1]])) return;
    const timeout = window.setTimeout(() => { setSelected([]); setMessage('Try another pair. Look at how far the shaded bars reach.'); setMessageTone('info'); }, 850);
    return () => window.clearTimeout(timeout);
  }, [selected]);
  const reset = () => { setSelected([]); setFound([]); setScore(0); setCardOrder(shuffleCards()); setMessage('Turn over two cards. Match equal amounts, even when the fraction names look different.'); setMessageTone('info'); };
  const flip = (index: number) => {
    if (found.includes(index) || selected.includes(index) || selected.length === 2) return;
    const next = [...selected, index]; setSelected(next);
    if (next.length === 2) {
      const [a, b] = next.map(i => matches[i]);
      if (areEquivalent(a, b)) { playHaptic('correct'); playCue('correct', fun.sound); setFound(current => [...current, ...next]); setScore(s => s + 1); setMessage('A match. The bars cover the same amount, so the fractions are equivalent.'); setMessageTone('success'); setSelected([]); }
      else { playHaptic('retry'); playCue('retry', fun.sound); setMessage(`${retryOpener(`match-${next[0]}-${next[1]}`)} These amounts differ. Compare the shaded lengths, then try another pair.`); setMessageTone('retry'); }
    } else { playHaptic('selection'); setMessage('One card turned. Find the card with the same shaded amount.'); setMessageTone('info'); }
  };
  const cards = cardOrder.map(index => ({ fraction: matches[index], index }));
  return <section className="cg-game" aria-labelledby="match-title">
    <div className="cg-game-heading"><span className="cg-index">Game 2 · Find same amounts</span><span className="cg-score" data-testid="status-match-score">Pairs found · {score}/3</span></div>
    <h2 id="match-title">Equivalence Match</h2><p className="cg-instruction">Every symbol card has a bar card partner. Match by the amount shaded, not by the printed numbers.</p>
    <div className="cg-memory-grid" role="group" aria-label="Fraction matching cards">{cards.map(({ fraction, index }) => {
      const visible = selected.includes(index) || found.includes(index);
      return <button type="button" className={`cg-memory-card ${visible ? 'revealed' : ''} ${found.includes(index) ? 'matched' : ''}`} key={index} onClick={() => flip(index)} disabled={found.includes(index) || (selected.length === 2 && !areEquivalent(matches[selected[0]], matches[selected[1]]))} aria-label={visible ? `${index < 3 ? 'Fraction' : 'Bar model'} card, ${fraction.n} over ${fraction.d}${found.includes(index) ? ', matched' : ''}` : `Hidden card ${index + 1}`} aria-pressed={visible} data-testid={`button-match-card-${index}`}>
        {visible ? index < 3 ? <FractionLabel {...fraction} /> : <Bar model={{ d: fraction.d, n: fraction.n }} label={`match-model-${index}`} /> : <span className="cg-card-back"><Shuffle size={21} /><small>Turn card</small></span>}
        <small className="cg-card-type">{visible ? index < 3 ? 'Fraction name' : 'Bar model' : `Card ${index + 1}`}</small>
      </button>;
    })}</div>
    <div className="cg-actions"><button className="cg-secondary" type="button" onClick={reset} data-testid="button-match-replay"><RotateCcw size={16} /> Replay match</button></div>
    <p className={`cg-feedback ${found.length === 6 ? 'success' : messageTone}`} role="status" aria-live="polite" data-testid="status-match-feedback">{found.length === 6 ? 'All three matches found. Different names can describe one equal amount.' : message}</p>
  </section>;
}

function NumberLineTarget() {
  const { fun } = useFun();
  const targets: Fraction[] = [{ n: 3, d: 4 }, { n: 2, d: 3 }, { n: 3, d: 5 }, { n: 1, d: 2 }];
  // 0 = not chosen yet. Every split is offered, not just the ones that work, so the child decides.
  const [denominator, setDenominator] = useState(0);
  const [mark, setMark] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'info' | 'retry' | 'success'>('info');
  const [round, setRound] = useState(0);
  const target = targets[round % targets.length];
  const partitions = [2, 3, 4, 5, 6, 8, 10, 12];
  const answerTick = targetTick(target, denominator);
  const next = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    setDenominator(0);
    setMark(null);
    setFeedback('');
    setFeedbackTone('info');
  };
  const replay = () => { setRound(0); setDenominator(0); setMark(null); setFeedback(''); setFeedbackTone('info'); };
  return <section className="cg-game" aria-labelledby="line-title">
    <div className="cg-game-heading"><span className="cg-index">Game 3 · Place a fraction</span><span className="cg-score" data-testid="status-line-round">Target {round + 1}</span></div>
    <h2 id="line-title">Number Line Target</h2><p className="cg-instruction">Choose equal spaces from 0 to 1, then tap the tick that lands on the target fraction.</p>
    <div className="cg-target"><span>Target point</span><strong><FractionLabel {...target} /></strong></div>
    <label className="cg-control-label" htmlFor="line-spaces">Split the whole into equal spaces</label>
    <select id="line-spaces" value={denominator} onChange={e => {
      const next = Number(e.target.value);
      if (next === denominator) return;
      playHaptic('selection');
      setDenominator(next); setMark(null); setFeedback(''); setFeedbackTone('info');
    }} data-testid="select-line-spaces"><option value={0} disabled>Choose…</option>{partitions.map(n => <option key={n} value={n}>{n} equal spaces</option>)}</select>
    {!denominator ? <p className="cg-feedback" data-testid="status-line-choose">Choose how many equal spaces to split 0 to 1 into.</p> : <>
    <div className="cg-line-area" role="group" aria-label={`Number line from zero to one divided into ${denominator} equal spaces`}>
      <div className="cg-line-track" aria-hidden="true" />
      {Array.from({ length: denominator + 1 }, (_, i) => <button type="button" className={`cg-line-tick ${mark === i ? 'marked' : ''} ${i === 0 || i === denominator ? 'endpoint' : ''}`} style={{ left: `${i / denominator * 100}%` }} key={i} onClick={() => {
        if (mark === i) return;
        const right = answerTick !== null && i === answerTick;
        playHaptic(right ? 'correct' : 'retry');
        playCue(right ? 'correct' : 'retry', fun.sound);
        const hint = answerTick === null ? `With ${denominator} equal spaces, no tick lands exactly on ${target.n}/${target.d}. Try a different number of spaces.`
          : 'That tick is not the target yet. Count equal jumps from 0, then try again.';
        setMark(i);
        setFeedback(right ? 'You found it. Count equal jumps from 0: the numerator tells how many jumps.' : `${retryOpener(`line-${round}-${denominator}-${i}`)} ${hint}`);
        setFeedbackTone(right ? 'success' : 'retry');
      }} aria-label={i === 0 ? 'Zero, start of the whole' : i === denominator ? 'One whole, end of the line' : `Tick ${i} of ${denominator}`} aria-pressed={mark === i} data-testid={`button-line-tick-${i}`}><span>{i === 0 ? '0' : i === denominator ? '1' : ''}</span></button>)}
    </div>
    <p className="cg-endpoint-hint"><span>0</span><span>One whole</span><span>1</span></p>
    </>}
    <div className="cg-actions"><button type="button" className="cg-secondary" onClick={next} data-testid="button-line-next">New target</button><button type="button" className="cg-text-button" onClick={replay} data-testid="button-line-replay"><RotateCcw size={16} /> Replay</button></div>
    {feedback && <p className={`cg-feedback ${feedbackTone}`} role="status" aria-live="polite" data-testid="status-line-feedback">{feedback}</p>}
  </section>;
}

function CenterPack() {
  return <section className="cg-print-pack" id="fraction-center-pack" aria-labelledby="cg-pack-title">
    <p className="cg-index">Take it off screen</p><h2 id="cg-pack-title">Fraction center pack</h2>
    <p>Print these hands-on prompts for a family table or classroom center. Draw, fold, and explain; no solutions are included.</p>
    <div className="cg-pack-activities">
      <article><b>Build and compare</b><p>Draw two same-size wholes. Split each into equal parts, shade an amount, and explain which is larger.</p><div className="cg-blank-bar" /><div className="cg-blank-bar" /></article>
      <article><b>Same amount, new name</b><p>Make two bars that show the same amount in different equal parts. What changed? What stayed the same?</p><div className="cg-blank-bar" /><div className="cg-blank-bar" /></article>
      <article><b>Walk the number line</b><p>Choose a fraction. Split 0 to 1 into equal jumps and mark where your fraction lands.</p><div className="cg-print-line"><i>0</i><i>1</i></div><p>My fraction: __________ &nbsp; How I know: ____________________________</p></article>
      <article><b>Fraction cards to cut</b><p>Write a fraction name on each card. Draw its bar model on another card. Mix the cards and match equal amounts.</p><div className="cg-cut-cards"><span>Fraction name</span><span>Draw a bar</span><span>Fraction name</span><span>Draw a bar</span></div></article>
    </div>
    <button className="cg-secondary cg-print-button" type="button" onClick={() => { void printPage('Fraction Quest center pack'); }} data-testid="button-print-center-pack"><Printer size={17} /> Print center pack</button>
  </section>;
}

type Section = 'war' | 'match' | 'line' | 'pack';
type Card = { id: string; title: string; blurb: string; icon: typeof Scale; testId: string; kicker: string; onOpen: () => void; tone?: string };
/** Lesson games (Fraction Race, coding) open with the child's current lesson; they also stay on each lesson. */
export type LessonGame = { id: 'race' | 'code'; title: string; blurb: string; icon: typeof Scale; lessonTitle: string; onOpen: () => void };
const WORKSHOP: { id: Section; title: string; blurb: string; icon: typeof Scale; testId: string }[] = [
  { id: 'war', title: 'Fraction War', blurb: 'Build two fractions and see which is bigger.', icon: Scale, testId: 'link-game-war' },
  { id: 'match', title: 'Equivalence Match', blurb: 'Find pairs that show the same amount.', icon: Shuffle, testId: 'link-game-match' },
  { id: 'line', title: 'Number Line Target', blurb: 'Split the line and land on the fraction.', icon: Waypoints, testId: 'link-game-number-line' },
  { id: 'pack', title: 'Print center pack', blurb: 'Hands-on activities to do on paper.', icon: Printer, testId: 'link-game-print-pack' },
];

function CardGrid({ label, cards }: { label: string; cards: Card[] }) {
  return <nav className="cg-menu" aria-label={label}>
    {cards.map((item) => (
      <button key={item.id} type="button" className={`cg-menu-card ${item.tone ?? ''}`} onClick={item.onOpen} data-testid={item.testId}>
        <span className="cg-menu-icon" aria-hidden="true"><item.icon size={26} /></span>
        <span className="cg-index">{item.kicker}</span>
        <b>{item.title}</b>
        <span>{item.blurb}</span>
      </button>
    ))}
  </nav>;
}

/** The games menu: lesson games first, then the fraction workshop. Every game opens on its own screen. */
export default function ConceptGames({ onExit, lessonGames = [] }: { onExit: () => void; lessonGames?: LessonGame[] }) {
  const [section, setSection] = useState<Section | null>(null);
  useEffect(() => { window.scrollTo?.({ top: 0 }); }, [section]);
  const open = WORKSHOP.find((item) => item.id === section);
  if (open) {
    return <main className="cg-page fq-app fq-shell fq-appear" data-testid={`concept-game-${open.id}`}>
      <TaskBar onBack={() => setSection(null)} backLabel="All games" testId="button-concept-games-menu" title={<><open.icon size={16} aria-hidden="true" /> {open.title}</>} />
      <div className="cg-games">
        {open.id === 'war' && <FractionWar />}
        {open.id === 'match' && <EquivalenceMatch />}
        {open.id === 'line' && <NumberLineTarget />}
        {open.id === 'pack' && <CenterPack />}
      </div>
      {open.id === 'pack' && <style>{`@media print { body * { visibility: hidden !important; } #fraction-center-pack, #fraction-center-pack * { visibility: visible !important; } #fraction-center-pack { position: absolute; inset: 0 auto auto 0; width: 100%; } }`}</style>}
    </main>;
  }
  return <main className="cg-page fq-app fq-shell fq-appear" data-testid="games-menu">
    <header className="cg-top"><button type="button" className="cg-back" onClick={onExit} data-testid="button-concept-games-exit"><ArrowLeft size={18} /> Back to Fraction Quest</button><span className="cg-brand-mark" aria-hidden="true"><Scale size={22} /></span></header>
    <section className="cg-hero"><span className="cg-index">Games</span><h1>Make it. See it.<br /><em>Then name it.</em></h1><p>Pick a game. Games are for fun and practice: they never change lesson progress.</p></section>
    {lessonGames.length > 0 && <section className="cg-menu-group" aria-labelledby="cg-lesson-games">
      <h2 id="cg-lesson-games">With your lesson</h2>
      <p>These use <b>{lessonGames[0].lessonTitle}</b>. Each lesson also has its own.</p>
      <CardGrid label="Lesson games" cards={lessonGames.map((game) => ({ id: game.id, title: game.title, blurb: game.blurb, icon: game.icon, testId: `link-game-${game.id}`, kicker: game.lessonTitle === lessonGames[0].lessonTitle ? 'Lesson game' : game.lessonTitle, onOpen: game.onOpen, tone: 'is-lesson' }))} />
    </section>}
    <section className="cg-menu-group" aria-labelledby="cg-workshop">
      <h2 id="cg-workshop">Fraction workshop</h2>
      <p>Build, compare, and try again with your hands and eyes.</p>
      <CardGrid label="Workshop games" cards={WORKSHOP.map((item, index) => ({ ...item, kicker: item.id === 'pack' ? 'Off screen' : `Workshop ${index + 1}`, onOpen: () => setSection(item.id), tone: item.id === 'pack' ? 'is-print' : '' }))} />
    </section>
  </main>;
}
