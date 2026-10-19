import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { correctGap, TOWER_ROUNDS, TOWER_WOBBLES, towerHint, towerRound, towerStars, type TowerBlock } from './stack-tower';
import { playHaptic } from './lib/fun';
import { MathText } from './MathText';
import { LearningListenButton } from './LearningText';

const newSeed = () => 1 + Math.floor(Math.random() * 100000);
const name = (block: TowerBlock) => `${block.n}/${block.d}`;

function Fraction({ n, d }: TowerBlock) {
  return <span className="cg-fraction" aria-label={`${n} over ${d}`}><span>{n}</span><i /> <span>{d}</span></span>;
}

/** One block: the fraction and an equal-parts bar the width of one whole, with a mark at 1/2.
    The shading stays hidden until the block is placed (or after two wobbles, as help). */
function Block({ block, shaded, className = '', testId }: { block: TowerBlock; shaded: boolean; className?: string; testId?: string }) {
  return (
    <span className={`st-block ${className}`} data-testid={testId} data-fraction={name(block)}>
      <Fraction {...block} />
      <span className="st-bar" style={{ '--parts': block.d } as CSSProperties} aria-hidden="true">
        {Array.from({ length: block.d }, (_, i) => <span key={i} className={`st-cell ${shaded && i < block.n ? 'is-shaded' : ''}`} />)}
        <span className="st-half" />
      </span>
    </span>
  );
}

/** Stack the Tower: each block goes into the tower with the biggest fraction at the bottom.
    Tap (or drag the block to) a gap, then press Place. Every move is an explicit button press. */
export default function StackTower() {
  const [seed, setSeed] = useState(newSeed);
  const [roundIndex, setRoundIndex] = useState(0);
  const [placedCount, setPlacedCount] = useState(0);
  const [tower, setTower] = useState<TowerBlock[]>(() => [towerRound(seed, 0).first]);
  const [gap, setGap] = useState<number | null>(null);
  const [wobbles, setWobbles] = useState(0);
  const [wobbleKey, setWobbleKey] = useState(0);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'' | 'success' | 'retry'>('');
  const [stars, setStars] = useState(0);
  const [lastPlaced, setLastPlaced] = useState<TowerBlock | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const done = roundIndex >= TOWER_ROUNDS;
  const round = towerRound(seed, Math.min(roundIndex, TOWER_ROUNDS - 1));
  const incoming = round.arriving[placedCount] as TowerBlock | undefined;
  const built = !incoming;
  const toppled = wobbles >= TOWER_WOBBLES;

  const startTower = (nextSeed: number, index: number) => {
    setPlacedCount(0); setTower(index < TOWER_ROUNDS ? [towerRound(nextSeed, index).first] : []);
    setGap(null); setWobbles(0); setMessage(''); setTone(''); setLastPlaced(null);
    window.scrollTo?.({ top: 0 });
  };
  const place = () => {
    if (!incoming || gap === null || toppled) return;
    if (gap === correctGap(tower, incoming)) {
      const next = [...tower]; next.splice(gap, 0, incoming);
      setTower(next); setPlacedCount((count) => count + 1); setGap(null); setLastPlaced(incoming);
      if (placedCount + 1 === round.arriving.length) {
        const earned = towerStars(wobbles);
        setStars((total) => total + earned);
        playHaptic('correct');
        setMessage('Tower built! Every block is smaller than the one under it.'); setTone('success');
      } else {
        playHaptic('selection');
        setMessage(`Yes! ${name(incoming)} fits there.`); setTone('success');
      }
      return;
    }
    const count = wobbles + 1;
    setWobbles(count); setWobbleKey((key) => key + 1); setGap(null); setLastPlaced(null);
    playHaptic('retry');
    setMessage(count >= TOWER_WOBBLES ? 'Crash! The tower toppled. Build it again and compare each block with 1/2.' : `Wobble! ${towerHint(tower, incoming, gap)}`);
    setTone('retry');
  };
  const next = () => { const index = roundIndex + 1; setRoundIndex(index); startTower(seed, index); };
  const retry = () => startTower(seed, roundIndex);
  const replay = () => { const fresh = newSeed(); setSeed(fresh); setRoundIndex(0); setStars(0); startTower(fresh, 0); };

  // Dragging the block onto a gap chooses that gap; Place still has to be pressed.
  const gapAt = (x: number, y: number) => {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-gap]');
    return target ? Number(target.dataset.gap) : null;
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (toppled) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setDrag({ x: event.clientX - dragStart.current.x, y: event.clientY - dragStart.current.y });
    const over = gapAt(event.clientX, event.clientY);
    if (over !== null && over !== gap) { setGap(over); playHaptic('selection'); }
  };
  const onPointerUp = () => { dragStart.current = null; setDrag(null); };

  if (done) {
    return <section className="cg-game" aria-labelledby="tower-title">
      <div className="cg-game-heading"><span className="cg-index">Ordering game</span><span className="cg-score" data-testid="status-tower-stars">Stars · {stars}/{TOWER_ROUNDS * 3}</span></div>
      <h2 id="tower-title">All towers built!</h2>
      <p className="cg-feedback success" role="status" data-testid="status-tower-done">You earned {stars} of {TOWER_ROUNDS * 3} stars.</p>
      <div className="cg-actions"><button type="button" className="cg-primary" onClick={replay} data-testid="button-tower-again">Play again</button></div>
    </section>;
  }

  const help = wobbles >= 2;
  // The tower is listed bottom first; it is drawn top first, with a gap above, between and below the blocks.
  const rows = [];
  for (let g = tower.length; g >= 0; g--) {
    if (!built && !toppled) {
      const label = g === tower.length ? `On top of ${name(tower[g - 1])}` : g === 0 ? `At the bottom under ${name(tower[0])}` : `Between ${name(tower[g])} and ${name(tower[g - 1])}`;
      rows.push(
        <button key={`gap-${g}`} type="button" className={`st-gap ${gap === g ? 'is-selected' : ''}`} data-gap={g} aria-pressed={gap === g}
          aria-label={label} onClick={() => { if (gap !== g) playHaptic('selection'); setGap(g); }} data-testid={`button-tower-gap-${g}`}>
          {gap === g && incoming ? <span className="st-gap-here">{name(incoming)} goes here</span> : <span className="st-gap-line" />}
        </button>,
      );
    }
    if (g > 0) {
      const index = g - 1;
      rows.push(<Block key={name(tower[index])} block={tower[index]} shaded className={`is-placed ${tower[index] === lastPlaced ? 'is-new' : ''}`}
        testId={`tower-block-${index}`} />);
    }
  }

  return <section className="cg-game" aria-labelledby="tower-title">
    <div className="cg-game-heading">
      <span className="cg-index">Tower {roundIndex + 1} of {TOWER_ROUNDS} · Wobbles {wobbles} of {TOWER_WOBBLES}</span>
      <span className="cg-score" data-testid="status-tower-stars">Stars · {stars}</span>
    </div>
    <h2 id="tower-title">Stack the tower</h2>
    <div className="fq-listen-row"><p className="cg-instruction">Put the <u>biggest fraction at the bottom</u>. Tap a gap, then press Place.</p><LearningListenButton text={'Stack the tower. Put the biggest fraction at the bottom. Tap a gap, then press Place.'} label="Listen to how to play" compact /></div>

    {incoming && !toppled && (
      <div className="st-incoming">
        <span className="st-incoming-label">Next block</span>
        <div className={`st-drag ${drag ? 'is-dragging' : ''}`} style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <Block block={incoming} shaded={help} testId="tower-incoming" />
        </div>
      </div>
    )}

    <div key={wobbleKey} className={`st-tower ${wobbleKey && !toppled ? 'is-wobbling' : ''} ${toppled ? 'is-toppled' : ''}`} role="group"
      aria-label={`Tower from top to bottom: ${[...tower].reverse().map(name).join(' then ')}`} data-testid="tower">
      {rows}
      <span className="st-ground" aria-hidden="true" />
    </div>

    {message && <p className={`cg-feedback ${tone}`} role="status" aria-live="polite" data-testid="status-tower-feedback"><MathText text={message} /></p>}
    {built && <p className="st-stars" aria-label={`${towerStars(wobbles)} stars`} data-testid="status-tower-round-stars">{'⭐'.repeat(towerStars(wobbles))}</p>}

    <div className="cg-actions">
      {built
        ? <button type="button" className="cg-primary" onClick={next} data-testid="button-tower-next">{roundIndex + 1 === TOWER_ROUNDS ? 'Finish' : 'Next tower'}</button>
        : toppled
          ? <button type="button" className="cg-primary" onClick={retry} data-testid="button-tower-retry">Build this tower again</button>
          : <button type="button" className="cg-primary" onClick={place} disabled={gap === null} data-testid="button-tower-place">Place</button>}
      <button type="button" className="cg-text-button" onClick={replay} data-testid="button-tower-replay"><RotateCcw size={16} /> New game</button>
    </div>
  </section>;
}
