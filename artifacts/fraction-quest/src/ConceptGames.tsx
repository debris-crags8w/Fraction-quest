import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Layers, ListOrdered, Printer, Rabbit, RotateCcw, Scale, Shuffle, Waypoints } from 'lucide-react';
import FrogHop from './FrogHop';
import StackTower from './StackTower';
import './concept-games.css';
import { areEquivalent, compareFractions, LINE_UP_ROUNDS, lineUpHint, lineUpInOrder, lineUpRound, targetTick, WAR_PARTS, WAR_ROUNDS, warHint, type LineUpMode } from './concept-games';
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


const LINE_UP_MODES: { id: LineUpMode; label: string; example: string }[] = [
  { id: 'same-denominator', label: 'Same denominator', example: '3/8 · 6/8 · 1/8' },
  { id: 'same-numerator', label: 'Same numerator', example: '2/3 · 2/8 · 2/5' },
  { id: 'mixed', label: 'Mix it up', example: 'Both kinds' },
];
const newSeed = () => 1 + Math.floor(Math.random() * 100000);

/** Fraction Line-Up: drag four fraction cards into order. Each card shows its fraction and a bar cut into its
    equal parts; the bars fill in after Check (or as help after two misses), so the picture never gives the order away. */
function FractionLineUp() {
  const [mode, setMode] = useState<LineUpMode | null>(null);
  const [seed, setSeed] = useState(newSeed);
  const [roundIndex, setRoundIndex] = useState(0);
  const round = mode ? lineUpRound(mode, seed, roundIndex) : null;
  const [cards, setCards] = useState(round?.cards ?? []);
  const [misses, setMisses] = useState(0);
  const [solved, setSolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [dragging, setDragging] = useState<number | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const done = roundIndex >= LINE_UP_ROUNDS;

  const startRound = (nextMode: LineUpMode, nextSeed: number, index: number) => {
    setCards(index < LINE_UP_ROUNDS ? lineUpRound(nextMode, nextSeed, index).cards : []);
    setMisses(0); setSolved(false); setFeedback(''); setDragging(null);
    window.scrollTo?.({ top: 0 });
  };
  const choose = (nextMode: LineUpMode) => {
    const nextSeed = newSeed();
    playHaptic('selection');
    setMode(nextMode); setSeed(nextSeed); setRoundIndex(0); setFirstTry(0); startRound(nextMode, nextSeed, 0);
  };
  const move = (from: number, to: number) => {
    if (solved || to < 0 || to >= cards.length || from === to) return;
    setCards((current) => { const next = [...current]; const [card] = next.splice(from, 1); next.splice(to, 0, card); return next; });
    setFeedback('');
  };
  // Drag with a finger or mouse: the card follows the pointer, the other cards slide aside to make room,
  // and the order only changes when the card is let go.
  const drag = useRef<{ index: number; startY: number; centers: number[]; step: number; moved: boolean } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const onPointerDown = (event: ReactPointerEvent<HTMLLIElement>, index: number) => {
    if (solved || !listRef.current || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const boxes = [...listRef.current.querySelectorAll<HTMLElement>('[data-lineup-index]')].map((item) => item.getBoundingClientRect());
    const step = boxes.length > 1 ? boxes[1].top - boxes[0].top : boxes[0].height;
    drag.current = { index, startY: event.clientY, centers: boxes.map((box) => box.top + box.height / 2), step, moved: false };
    setDragging(index); setDragY(0); setDropAt(index);
    playHaptic('selection');
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLLIElement>) => {
    const current = drag.current;
    if (!current) return;
    const dy = event.clientY - current.startY;
    if (!current.moved && Math.abs(dy) < 4) return;
    current.moved = true;
    setDragY(dy);
    // The slot whose centre is nearest the dragged card's centre.
    const centre = current.centers[current.index] + dy;
    const target = current.centers.reduce((best, c, i) => (Math.abs(c - centre) < Math.abs(current.centers[best] - centre) ? i : best), 0);
    setDropAt((previous) => { if (previous !== target) playHaptic('selection'); return target; });
  };
  const onPointerUp = () => {
    const current = drag.current;
    drag.current = null;
    if (current && dropAt !== null && dropAt !== current.index) move(current.index, dropAt);
    setDragging(null); setDragY(0); setDropAt(null);
  };
  // While dragging, the cards between the start and the drop slot shift one place to make room.
  const shiftFor = (index: number) => {
    const current = drag.current;
    if (dragging === null || dropAt === null || !current || index === dragging) return 0;
    if (dragging < dropAt && index > dragging && index <= dropAt) return -current.step;
    if (dragging > dropAt && index < dragging && index >= dropAt) return current.step;
    return 0;
  };

  const check = () => {
    if (!round || solved) return;
    if (lineUpInOrder(cards, round.direction)) {
      playHaptic('correct');
      setSolved(true);
      if (misses === 0) setFirstTry((count) => count + 1);
      setFeedback(round.rule === 'same-denominator'
        ? 'Yes! Same-size pieces, so the one with more pieces is bigger.'
        : 'Yes! Same number of pieces, so the one with bigger pieces is bigger.');
    } else {
      playHaptic('retry');
      setMisses((count) => count + 1);
      setFeedback(`Not yet. ${lineUpHint(round)}${misses >= 1 ? ' The bars are filled in to help.' : ''}`);
    }
  };
  const next = () => {
    if (!mode) return;
    const index = roundIndex + 1;
    setRoundIndex(index);
    startRound(mode, seed, index);
  };

  if (!mode || !round) {
    return <section className="cg-game" aria-labelledby="lineup-title">
      <div className="cg-game-heading"><span className="cg-index">Game 4 · Put in order</span></div>
      <h2 id="lineup-title">Fraction Line-Up</h2>
      <p className="cg-instruction">Drag four fractions into order. Pick a kind of line-up.</p>
      <div className="cg-lineup-modes">{LINE_UP_MODES.map((item) => (
        <button type="button" key={item.id} className="cg-menu-card" onClick={() => choose(item.id)} data-testid={`button-lineup-mode-${item.id}`}>
          <b>{item.label}</b><span>{item.example}</span>
        </button>
      ))}</div>
    </section>;
  }

  if (done) {
    return <section className="cg-game" aria-labelledby="lineup-title">
      <div className="cg-game-heading"><span className="cg-index">Game 4 · Put in order</span><span className="cg-score" data-testid="status-lineup-score">First try · {firstTry}/{LINE_UP_ROUNDS}</span></div>
      <h2 id="lineup-title">Line-up complete!</h2>
      <p className="cg-feedback success" role="status" data-testid="status-lineup-done">You ordered {LINE_UP_ROUNDS} line-ups. {firstTry} were right on the first try.</p>
      <div className="cg-actions">
        <button type="button" className="cg-primary" onClick={() => choose(mode)} data-testid="button-lineup-again">Play again</button>
        <button type="button" className="cg-secondary" onClick={() => setMode(null)} data-testid="button-lineup-modes">Pick another kind</button>
      </div>
    </section>;
  }

  const showAmounts = solved || misses >= 2;
  return <section className="cg-game" aria-labelledby="lineup-title">
    <div className="cg-game-heading">
      <span className="cg-index">{LINE_UP_MODES.find((item) => item.id === mode)!.label} · Round {roundIndex + 1} of {LINE_UP_ROUNDS}</span>
      <span className="cg-score" data-testid="status-lineup-score">First try · {firstTry}</span>
    </div>
    <h2 id="lineup-title">Put them in order: <u>{round.direction} first</u></h2>
    <p className="cg-instruction">{round.rule === 'same-denominator' ? 'All the denominators match.' : 'All the numerators match.'} Drag a card, or use the arrows.</p>
    <p className="cg-lineup-end" aria-hidden="true">{round.direction === 'smallest' ? 'Smallest' : 'Biggest'}</p>
    <ol className="cg-lineup-list" ref={listRef} aria-label={`Fraction cards, ${round.direction} first`} data-testid="lineup-list">
      {cards.map((card, index) => (
        <li key={`${card.n}-${card.d}`} data-lineup-index={index}
          className={`cg-lineup-card ${dragging === index ? 'is-dragging' : ''} ${solved ? 'is-solved' : ''}`}
          style={dragging === index ? { transform: `translateY(${dragY}px) scale(1.02)`, transition: 'none', zIndex: 3 } : { transform: `translateY(${shiftFor(index)}px)` }}
          onPointerDown={(event) => onPointerDown(event, index)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          data-testid={`lineup-card-${index}`} data-fraction={`${card.n}/${card.d}`}>
          <span className="cg-lineup-place" aria-hidden="true">{index + 1}</span>
          <FractionLabel n={card.n} d={card.d} />
          <Bar model={{ d: card.d, n: showAmounts ? card.n : 0 }} label={`lineup-bar-${index}`} />
          <span className="cg-lineup-arrows">
            <button type="button" className="cg-lineup-arrow" aria-label={`Move ${card.n} over ${card.d} up`} disabled={solved || index === 0} onClick={() => { playHaptic('selection'); move(index, index - 1); }} data-testid={`button-lineup-up-${index}`}><ArrowUp size={18} /></button>
            <button type="button" className="cg-lineup-arrow" aria-label={`Move ${card.n} over ${card.d} down`} disabled={solved || index === cards.length - 1} onClick={() => { playHaptic('selection'); move(index, index + 1); }} data-testid={`button-lineup-down-${index}`}><ArrowDown size={18} /></button>
          </span>
        </li>
      ))}
    </ol>
    <p className="cg-lineup-end" aria-hidden="true">{round.direction === 'smallest' ? 'Biggest' : 'Smallest'}</p>
    {feedback && <p className={`cg-feedback ${solved ? 'success' : 'cg-feedback-retry'}`} role="status" aria-live="polite" data-testid="status-lineup-feedback">{feedback}</p>}
    <div className="cg-actions">
      {solved
        ? <button type="button" className="cg-primary" onClick={next} data-testid="button-lineup-next">{roundIndex + 1 === LINE_UP_ROUNDS ? 'Finish' : 'Next line-up'}</button>
        : <button type="button" className="cg-primary" onClick={check} data-testid="button-lineup-check">Check my order</button>}
      <button type="button" className="cg-text-button" onClick={() => setMode(null)} data-testid="button-lineup-change"><RotateCcw size={16} /> Change kind</button>
    </div>
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

type Section = 'war' | 'match' | 'line' | 'lineup' | 'frog' | 'tower' | 'pack';
type Card = { id: string; title: string; blurb: string; icon: typeof Scale; testId: string; kicker: string; onOpen: () => void; tone?: string };
/** Lesson games (Fraction Race, coding) open with the child's current lesson; they also stay on each lesson. */
export type LessonGame = { id: 'race' | 'code'; title: string; blurb: string; icon: typeof Scale; lessonTitle: string; onOpen: () => void };
const WORKSHOP: { id: Section; title: string; blurb: string; icon: typeof Scale; testId: string }[] = [
  { id: 'war', title: 'Fraction War', blurb: 'Build two fractions and see which is bigger.', icon: Scale, testId: 'link-game-war' },
  { id: 'match', title: 'Equivalence Match', blurb: 'Find pairs that show the same amount.', icon: Shuffle, testId: 'link-game-match' },
  { id: 'line', title: 'Number Line Target', blurb: 'Split the line and land on the fraction.', icon: Waypoints, testId: 'link-game-number-line' },
  { id: 'lineup', title: 'Fraction Line-Up', blurb: 'Drag fractions into order, smallest or biggest first.', icon: ListOrdered, testId: 'link-game-lineup' },
  { id: 'frog', title: 'Frog Hop', blurb: 'Hop by fractions to land on the lily pad. Watch for the crocodile!', icon: Rabbit, testId: 'link-game-frog' },
  { id: 'tower', title: 'Stack the Tower', blurb: 'Stack fractions with the biggest at the bottom. Three wobbles and it falls!', icon: Layers, testId: 'link-game-tower' },
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
        {open.id === 'lineup' && <FractionLineUp />}
        {open.id === 'frog' && <FrogHop />}
        {open.id === 'tower' && <StackTower />}
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
