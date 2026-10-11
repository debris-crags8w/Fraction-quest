import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowLeft, Printer, RotateCcw, Scale, Shuffle, Waypoints } from 'lucide-react';
import './concept-games.css';
import { areEquivalent, compareFractions, targetTick, validLinePartitions } from './concept-games';

type Fraction = { n: number; d: number };
type Model = { d: number; n: number };
const rounds: [Fraction, Fraction][] = [[{ n: 3, d: 5 }, { n: 2, d: 5 }], [{ n: 1, d: 2 }, { n: 3, d: 8 }], [{ n: 2, d: 3 }, { n: 3, d: 4 }]];
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
  return <div className="cg-bar-wrap" aria-label={label}>
    <div className="cg-bar" style={{ '--parts': model.d } as CSSProperties} role="group" aria-label={`${label}: ${model.n} of ${model.d} parts shaded`}>
      {Array.from({ length: model.d }, (_, i) => onToggle
        ? <button key={i} type="button" className={`cg-cell ${i < model.n ? 'is-shaded' : ''}`} aria-label={`${label}, part ${i + 1}${i < model.n ? ', shaded' : ', unshaded'}`} aria-pressed={i < model.n} onClick={() => onToggle(i)} disabled={disabled} data-testid={`${label}-part-${i + 1}`} />
        : <span key={i} className={`cg-cell ${i < model.n ? 'is-shaded' : ''}`} />)}
    </div>
  </div>;
}

function FractionWar() {
  const [round, setRound] = useState(0);
  const [models, setModels] = useState<[Model, Model]>([{ d: 5, n: 0 }, { d: 5, n: 0 }]);
  const [choice, setChoice] = useState<'left' | 'right' | 'same' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [roundSolved, setRoundSolved] = useState(false);
  const target = rounds[round % rounds.length];
  const modelsBuilt = models.every((model, i) => model.d === target[i].d && model.n === target[i].n);
  const changeModel = (side: 0 | 1, patch: Partial<Model>) => {
    setModels(current => current.map((model, i) => i === side ? { ...model, ...patch } : model) as [Model, Model]);
    setChoice(null); setFeedback('');
  };
  const choose = () => {
    if (!modelsBuilt || roundSolved) {
      setFeedback('Build both bars first. Set the number of parts, then shade the amount shown above each bar.');
      return;
    }
    if (!choice) { setFeedback('Look at both shaded amounts, then choose the larger one or same amount.'); return; }
    const comparison = compareFractions(target[0], target[1]);
    const expected = comparison > 0 ? 'left' : comparison < 0 ? 'right' : 'same';
    if (choice === expected) { setScore(s => s + 1); setRoundSolved(true); setFeedback('That is it. Equal-size wholes make the shaded amounts easy to compare.'); }
    else setFeedback('Not yet. Compare how far each bar is shaded. You can change your choice or rebuild either bar.');
  };
  const next = () => { setRound(r => r + 1); setModels([{ d: rounds[(round + 1) % rounds.length][0].d, n: 0 }, { d: rounds[(round + 1) % rounds.length][1].d, n: 0 }]); setChoice(null); setRoundSolved(false); setFeedback(''); };
  const replay = () => { setRound(0); setScore(0); setModels([{ d: rounds[0][0].d, n: 0 }, { d: rounds[0][1].d, n: 0 }]); setChoice(null); setRoundSolved(false); setFeedback(''); };
  return <section className="cg-game" aria-labelledby="war-title">
    <div className="cg-game-heading"><span className="cg-index">01 / BUILD & COMPARE</span><span className="cg-score" data-testid="status-war-score">Local round score · {score}</span></div>
    <h2 id="war-title">Fraction War</h2><p className="cg-instruction">Build each fraction before deciding which amount is greater. Each bar is one same-size whole.</p>
    <div className="cg-war-models">{target.map((fraction, side) => {
      const model = models[side as 0 | 1];
      return <article className="cg-model-card" key={side}>
        <div className="cg-model-label"><span>Whole {side ? 'B' : 'A'}</span><strong>Build <FractionLabel {...fraction} /></strong></div>
        <label className="cg-control-label" htmlFor={`war-denom-${side}`}>Equal parts in this whole</label>
        <select id={`war-denom-${side}`} value={model.d} disabled={roundSolved} onChange={e => changeModel(side as 0 | 1, { d: Number(e.target.value), n: 0 })} data-testid={`select-war-denominator-${side}`}>
          {[2, 3, 4, 5, 6, 8].map(n => <option value={n} key={n}>{n} equal parts</option>)}
        </select>
        <Bar model={model} label={`whole-${side ? 'b' : 'a'}`} disabled={roundSolved} onToggle={i => changeModel(side as 0 | 1, { n: i < model.n ? i : i + 1 })} />
        <div className="cg-model-readout"><span>Whole = {model.d} equal parts</span><span>Shaded = {model.n} parts</span></div>
      </article>;
    })}</div>
    <fieldset className="cg-compare"><legend>Which amount is larger?</legend>{(['left', 'right', 'same'] as const).map((v, i) => <button type="button" key={v} className={`cg-choice ${choice === v ? 'selected' : ''}`} aria-pressed={choice === v} disabled={!modelsBuilt || roundSolved} onClick={() => { setChoice(v); setFeedback(''); }} data-testid={`button-war-choice-${v}`}>{i === 0 ? 'Whole A' : i === 1 ? 'Whole B' : 'Same amount'}</button>)}</fieldset>
    <div className="cg-actions"><button type="button" className="cg-primary" onClick={choose} disabled={!modelsBuilt || !choice || roundSolved} data-testid="button-war-check">{roundSolved ? 'Round complete' : 'Check my comparison'}</button><button type="button" className="cg-secondary" onClick={next} data-testid="button-war-next">Next pair</button><button type="button" className="cg-text-button" onClick={replay} data-testid="button-war-replay"><RotateCcw size={16} /> Replay</button></div>
    {feedback && <p className={`cg-feedback ${feedback.startsWith('That is it') ? 'success' : ''}`} role="status" aria-live="polite" data-testid="status-war-feedback">{feedback}</p>}
  </section>;
}

function EquivalenceMatch() {
  const [selected, setSelected] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [message, setMessage] = useState('Turn over two cards. Match equal amounts, even when the fraction names look different.');
  const [score, setScore] = useState(0);
  const [cardOrder, setCardOrder] = useState(shuffleCards);
  useEffect(() => {
    if (selected.length !== 2 || areEquivalent(matches[selected[0]], matches[selected[1]])) return;
    const timeout = window.setTimeout(() => { setSelected([]); setMessage('Try another pair. Look at how far the shaded bars reach.'); }, 850);
    return () => window.clearTimeout(timeout);
  }, [selected]);
  const reset = () => { setSelected([]); setFound([]); setScore(0); setCardOrder(shuffleCards()); setMessage('Turn over two cards. Match equal amounts, even when the fraction names look different.'); };
  const flip = (index: number) => {
    if (found.includes(index) || selected.includes(index) || selected.length === 2) return;
    const next = [...selected, index]; setSelected(next);
    if (next.length === 2) {
      const [a, b] = next.map(i => matches[i]);
      if (areEquivalent(a, b)) { setFound(current => [...current, ...next]); setScore(s => s + 1); setMessage('A match. The bars cover the same amount, so the fractions are equivalent.'); setSelected([]); }
      else setMessage('These amounts differ. Compare the shaded lengths, then try another pair.');
    } else setMessage('One card turned. Find the card with the same shaded amount.');
  };
  const cards = cardOrder.map(index => ({ fraction: matches[index], index }));
  return <section className="cg-game" aria-labelledby="match-title">
    <div className="cg-game-heading"><span className="cg-index">02 / FIND SAME AMOUNTS</span><span className="cg-score" data-testid="status-match-score">Pairs found · {score}/3</span></div>
    <h2 id="match-title">Equivalence Match</h2><p className="cg-instruction">Every symbol card has a bar card partner. Match by the amount shaded, not by the printed numbers.</p>
    <div className="cg-memory-grid" role="group" aria-label="Fraction matching cards">{cards.map(({ fraction, index }) => {
      const visible = selected.includes(index) || found.includes(index);
      return <button type="button" className={`cg-memory-card ${visible ? 'revealed' : ''} ${found.includes(index) ? 'matched' : ''}`} key={index} onClick={() => flip(index)} disabled={found.includes(index) || (selected.length === 2 && !areEquivalent(matches[selected[0]], matches[selected[1]]))} aria-label={visible ? `${index < 3 ? 'Fraction' : 'Bar model'} card, ${fraction.n} over ${fraction.d}${found.includes(index) ? ', matched' : ''}` : `Hidden card ${index + 1}`} aria-pressed={visible} data-testid={`button-match-card-${index}`}>
        {visible ? index < 3 ? <FractionLabel {...fraction} /> : <Bar model={{ d: fraction.d, n: fraction.n }} label={`match-model-${index}`} /> : <span className="cg-card-back"><Shuffle size={21} /><small>Turn card</small></span>}
        <small className="cg-card-type">{visible ? index < 3 ? 'Fraction name' : 'Bar model' : `Card ${index + 1}`}</small>
      </button>;
    })}</div>
    <div className="cg-actions"><button className="cg-secondary" type="button" onClick={reset} data-testid="button-match-replay"><RotateCcw size={16} /> Replay match</button></div>
    <p className={`cg-feedback ${found.length === 6 ? 'success' : ''}`} role="status" aria-live="polite" data-testid="status-match-feedback">{found.length === 6 ? 'All three matches found. Different names can describe one equal amount.' : message}</p>
  </section>;
}

function NumberLineTarget() {
  const targets: Fraction[] = [{ n: 3, d: 4 }, { n: 2, d: 3 }, { n: 3, d: 5 }, { n: 1, d: 2 }];
  const [denominator, setDenominator] = useState(4);
  const [mark, setMark] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [round, setRound] = useState(0);
  const target = targets[round % targets.length];
  const partitions = validLinePartitions(target, [2, 3, 4, 5, 6, 8, 10, 12]);
  const answerTick = targetTick(target, denominator);
  const next = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    setDenominator(targets[nextRound % targets.length].d);
    setMark(null);
    setFeedback('');
  };
  const replay = () => { setRound(0); setDenominator(targets[0].d); setMark(null); setFeedback(''); };
  return <section className="cg-game" aria-labelledby="line-title">
    <div className="cg-game-heading"><span className="cg-index">03 / PLACE A FRACTION</span><span className="cg-score" data-testid="status-line-round">Target {round + 1}</span></div>
    <h2 id="line-title">Number Line Target</h2><p className="cg-instruction">Choose equal spaces from 0 to 1, then tap the tick that lands on the target fraction.</p>
    <div className="cg-target"><span>Target point</span><strong><FractionLabel {...target} /></strong></div>
    <label className="cg-control-label" htmlFor="line-spaces">Split the whole into equal spaces</label>
    <select id="line-spaces" value={denominator} onChange={e => { setDenominator(Number(e.target.value)); setMark(null); setFeedback(''); }} data-testid="select-line-spaces">{partitions.map(n => <option key={n} value={n}>{n} equal spaces</option>)}</select>
    <div className="cg-line-area" role="group" aria-label={`Number line from zero to one divided into ${denominator} equal spaces`}>
      <div className="cg-line-track" aria-hidden="true" />
      {Array.from({ length: denominator + 1 }, (_, i) => <button type="button" className={`cg-line-tick ${mark === i ? 'marked' : ''} ${i === 0 || i === denominator ? 'endpoint' : ''}`} style={{ left: `${i / denominator * 100}%` }} key={i} onClick={() => { setMark(i); setFeedback(i === answerTick ? 'You found it. Count equal jumps from 0: the top number tells how many jumps.' : 'That tick is not the target yet. Count equal jumps from 0, then try again.'); }} aria-label={i === 0 ? 'Zero, start of the whole' : i === denominator ? 'One whole, end of the line' : `Tick ${i} of ${denominator}`} aria-pressed={mark === i} data-testid={`button-line-tick-${i}`}><span>{i === 0 ? '0' : i === denominator ? '1' : ''}</span></button>)}
    </div>
    <p className="cg-endpoint-hint"><span>0</span><span>One whole</span><span>1</span></p>
    <div className="cg-actions"><button type="button" className="cg-secondary" onClick={next} data-testid="button-line-next">New target</button><button type="button" className="cg-text-button" onClick={replay} data-testid="button-line-replay"><RotateCcw size={16} /> Replay</button></div>
    {feedback && <p className={`cg-feedback ${mark === answerTick ? 'success' : ''}`} role="status" aria-live="polite" data-testid="status-line-feedback">{feedback}</p>}
  </section>;
}

function CenterPack() {
  return <section className="cg-print-pack" id="fraction-center-pack" aria-labelledby="cg-pack-title">
    <p className="cg-index">TAKE IT OFF SCREEN</p><h2 id="cg-pack-title">Fraction center pack</h2>
    <p>Print these hands-on prompts for a family table or classroom center. Draw, fold, and explain; no solutions are included.</p>
    <div className="cg-pack-activities">
      <article><b>Build and compare</b><p>Draw two same-size wholes. Split each into equal parts, shade an amount, and explain which is larger.</p><div className="cg-blank-bar" /><div className="cg-blank-bar" /></article>
      <article><b>Same amount, new name</b><p>Make two bars that show the same amount in different equal parts. What changed? What stayed the same?</p><div className="cg-blank-bar" /><div className="cg-blank-bar" /></article>
      <article><b>Walk the number line</b><p>Choose a fraction. Split 0 to 1 into equal jumps and mark where your fraction lands.</p><div className="cg-print-line"><i>0</i><i>1</i></div><p>My fraction: __________ &nbsp; How I know: ____________________________</p></article>
      <article><b>Fraction cards to cut</b><p>Write a fraction name on each card. Draw its bar model on another card. Mix the cards and match equal amounts.</p><div className="cg-cut-cards"><span>Fraction name</span><span>Draw a bar</span><span>Fraction name</span><span>Draw a bar</span></div></article>
    </div>
    <button className="cg-secondary cg-print-button" type="button" onClick={() => window.print()} data-testid="button-print-center-pack"><Printer size={17} /> Print center pack</button>
  </section>;
}

export default function ConceptGames({ onExit }: { onExit: () => void }) {
  return <main className="cg-page fq-app fq-shell fq-appear">
    <header className="cg-top"><button type="button" className="cg-back" onClick={onExit} data-testid="button-concept-games-exit"><ArrowLeft size={18} /> Back to Fraction Quest</button><span className="cg-brand-mark" aria-hidden="true"><Scale size={22} /></span></header>
    <section className="cg-hero"><span className="cg-index">THE FRACTION WORKSHOP</span><h1>Make it. See it.<br /><em>Then name it.</em></h1><p>Fractions make more sense when your hands and eyes get there first. Build, compare, and try again.</p></section>
    <nav className="cg-nav" aria-label="Games"><a href="#fraction-war" data-testid="link-game-war"><Scale size={17} /> Fraction War</a><a href="#equivalence-match" data-testid="link-game-match"><Shuffle size={17} /> Equivalence Match</a><a href="#number-line-target" data-testid="link-game-number-line"><Waypoints size={17} /> Number Line Target</a><a href="#fraction-center-pack" data-testid="link-game-print-pack"><Printer size={17} /> Print center pack</a></nav>
    <div className="cg-games">
      <div id="fraction-war"><FractionWar /></div><div id="equivalence-match"><EquivalenceMatch /></div><div id="number-line-target"><NumberLineTarget /></div>
    </div>
    <CenterPack />
    <style>{`@media print { body * { visibility: hidden !important; } #fraction-center-pack, #fraction-center-pack * { visibility: visible !important; } #fraction-center-pack { position: absolute; inset: 0 auto auto 0; width: 100%; } }`}</style>
  </main>;
}
