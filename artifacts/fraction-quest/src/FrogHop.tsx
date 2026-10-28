import { useState, type CSSProperties } from 'react';
import { RotateCcw } from 'lucide-react';
import { crocodileLimit, fliesFor, FROG_ROUNDS, frogRound, hop, parHops, positionName, type FrogCard } from './frog-hop';
import { playHaptic } from './lib/fun';
import { useSeason } from './fun-ui';
import { LearningListenButton } from './LearningText';

const newSeed = () => 1 + Math.floor(Math.random() * 100000);

function Fraction({ n, d }: FrogCard) {
  return <span className="cg-fraction" aria-label={`${n} over ${d}`}><span>{n}</span><i /> <span>{d}</span></span>;
}

/** A small frog. It squashes and leaps when `hopKey` changes. */
function Frog({ hopKey, splash, hat }: { hopKey: number; splash: boolean; hat?: 'witch' | 'santa' }) {
  return (
    <svg key={hopKey} className={`fh-frog ${hopKey ? 'is-hopping' : ''} ${splash ? 'is-splash' : ''}`} viewBox={hat ? '0 -14 60 64' : '0 0 60 50'} aria-hidden="true">
      <ellipse cx="30" cy="34" rx="22" ry="14" fill="#3FAE2A" />
      <circle cx="19" cy="18" r="9" fill="#3FAE2A" /><circle cx="41" cy="18" r="9" fill="#3FAE2A" />
      <circle cx="19" cy="17" r="5.5" fill="#fff" /><circle cx="41" cy="17" r="5.5" fill="#fff" />
      <circle cx="20" cy="17" r="3" fill="#2B2D42" /><circle cx="42" cy="17" r="3" fill="#2B2D42" />
      <path d="M21 36 Q30 43 39 36" stroke="#1E6B12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="12" cy="45" rx="7" ry="3" fill="#2E8B1E" /><ellipse cx="48" cy="45" rx="7" ry="3" fill="#2E8B1E" />
      {hat === 'witch' && <g><path d="M21 9 L31 -13 L39 9 Z" fill="#2B1B4D" /><rect x="15" y="7" width="30" height="5" rx="2.5" fill="#2B1B4D" /><rect x="23" y="4" width="15" height="3.5" fill="#FF8A1F" /></g>}
      {hat === 'santa' && <g><path d="M19 9 Q26 -12 44 -6 L41 9 Z" fill="#D23B3B" /><rect x="15" y="6" width="30" height="5.5" rx="2.75" fill="#fff" /><circle cx="44" cy="-6" r="3.5" fill="#fff" /></g>}
    </svg>
  );
}

/** One jump card: the fraction and a bar showing how long the jump is, as part of one whole. */
function JumpCard({ card, selected, onSelect, disabled, index }: { card: FrogCard; selected: boolean; onSelect: () => void; disabled: boolean; index: number }) {
  return (
    <button type="button" className={`fh-card ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onSelect} disabled={disabled}
      data-testid={`button-frog-card-${index}`} data-card={`${card.n}/${card.d}`}>
      {/* No aria-label: the name is built from the card, so it holds the fraction a child sees. */}
      <span className="fq-sr">Jump </span><Fraction {...card} />
      <span className="cg-bar fh-card-bar" style={{ '--parts': card.d } as CSSProperties} aria-hidden="true">
        {Array.from({ length: card.d }, (_, i) => <span key={i} className={`cg-cell ${i < card.n ? 'is-shaded' : ''}`} />)}
      </span>
    </button>
  );
}

/** Frog Hop: choose a jump card, press Hop, and land exactly on the goal lily pad. Fewest hops earns 3 flies;
    the crocodile creeps closer with every extra hop. Every move is a tap and an explicit button press. */
export default function FrogHop() {
  const [seed, setSeed] = useState(newSeed);
  const [roundIndex, setRoundIndex] = useState(0);
  const [position, setPosition] = useState(0);
  const [hops, setHops] = useState(0);
  const [trail, setTrail] = useState<{ from: number; to: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [splash, setSplash] = useState(false);
  const [landed, setLanded] = useState(false);
  const [caught, setCaught] = useState(false);
  const [flies, setFlies] = useState(0);
  // At Halloween the pond is a moonlit swamp with fireflies; at Christmas it is a frozen pond with snowflakes.
  const seasonId = useSeason().season?.id;
  const halloween = seasonId === 'halloween';
  const christmas = seasonId === 'christmas';
  const bugs = halloween ? 'fireflies' : christmas ? 'snowflakes' : 'flies';
  const Bugs = bugs.charAt(0).toUpperCase() + bugs.slice(1);
  const done = roundIndex >= FROG_ROUNDS;
  const round = frogRound(seed, Math.min(roundIndex, FROG_ROUNDS - 1));
  const par = parHops(round);
  const limit = crocodileLimit(par);
  const end = round.wholes * round.denominator;
  const at = (steps: number) => `${(steps / end) * 100}%`;
  const goalName = positionName(round.goal, round.denominator);

  const resetRound = () => {
    setPosition(0); setHops(0); setTrail(null); setSelected(null); setMessage(''); setSplash(false); setLanded(false); setCaught(false);
    window.scrollTo?.({ top: 0 });
  };
  const doHop = () => {
    if (selected === null || landed || caught) return;
    const card = round.cards[selected];
    const result = hop(round, position, card);
    const count = hops + 1;
    setHops(count); setPosition(result.to); setTrail({ from: result.from, to: result.to }); setSplash(result.splash);
    if (result.landed) {
      const earned = fliesFor(count, par);
      setFlies((total) => total + earned); setLanded(true);
      playHaptic('correct');
      setMessage(`You landed on ${goalName} in ${count} ${count === 1 ? 'hop' : 'hops'}! ${count <= par ? 'Fewest hops possible!' : `It can be done in ${par}.`}`);
    } else if (count >= limit) {
      setCaught(true);
      playHaptic('retry');
      setMessage('Snap! The crocodile got too close. Plan your hops and try this pond again.');
    } else if (result.splash) {
      playHaptic('retry');
      setMessage(`Splash! That jump went past ${goalName}. Now the frog hops back toward it.`);
    } else {
      playHaptic('selection');
      setMessage(`The frog is at ${positionName(result.to, round.denominator)}. Keep going to ${goalName}.`);
    }
  };
  const next = () => { setRoundIndex((index) => index + 1); resetRound(); };
  const replay = () => { setSeed(newSeed()); setRoundIndex(0); setFlies(0); resetRound(); };

  if (done) {
    return <section className="cg-game" aria-labelledby="frog-title">
      <div className="cg-game-heading"><span className="cg-index">Game 5 · Hop to the goal</span><span className="cg-score" data-testid="status-frog-flies">{Bugs} · {flies}/{FROG_ROUNDS * 3}</span></div>
      <h2 id="frog-title">Pond complete!</h2>
      <p className="cg-feedback success" role="status" data-testid="status-frog-done">You caught {flies} of {FROG_ROUNDS * 3} {bugs}.</p>
      <div className="cg-actions"><button type="button" className="cg-primary" onClick={replay} data-testid="button-frog-again">Play again</button></div>
    </section>;
  }

  const crocAway = Math.max(0, limit - hops);
  return <section className="cg-game" aria-labelledby="frog-title">
    <div className="cg-game-heading">
      <span className="cg-index">Round {roundIndex + 1} of {FROG_ROUNDS} · Hops {hops}</span>
      <span className="cg-score" data-testid="status-frog-flies">{Bugs} · {flies}</span>
    </div>
    <h2 id="frog-title">Land on <span className="fh-goal-name"><Fraction n={round.goal / gcd(round.goal, round.denominator)} d={round.denominator / gcd(round.goal, round.denominator)} /></span>{round.goal > round.denominator ? <small className="fh-goal-mixed"> ({goalName})</small> : null}</h2>
    <div className="fq-listen-row"><p className="cg-instruction">Pick a jump card, then press Hop. Land exactly on the lily pad in as few hops as you can.</p><LearningListenButton text={`Land on ${round.goal / gcd(round.goal, round.denominator)}/${round.denominator / gcd(round.goal, round.denominator)}. Pick a jump card, then press Hop. Land exactly on the lily pad in as few hops as you can.`} label="Listen to how to play" compact /></div>

    <div className={`fh-pond ${seasonId ? `is-${seasonId}` : ''}`} data-testid="frog-pond" data-goal={round.goal} data-denominator={round.denominator} data-wholes={round.wholes} aria-label={`Number line from 0 to ${round.wholes}. Goal at ${goalName}. Frog at ${positionName(position, round.denominator)}.`} role="img">
      <div className="fh-water" aria-hidden="true">
        {/* The crocodile closes in on the frog with every hop that doesn't land. */}
        <span className={`fh-croc ${caught ? 'is-snap' : ''}`} style={{ left: `min(calc(${Math.min(100, (position / end) * 100 + (crocAway / limit) * 70)}% + 14px), calc(100% - 44px))` }}>🐊</span>
      </div>
      <div className="fh-line" aria-hidden="true">
        {Array.from({ length: end + 1 }, (_, i) => (
          <span key={i} className={`fh-tick ${i % round.denominator === 0 ? 'is-whole' : ''}`} style={{ left: at(i) }}>
            {i % round.denominator === 0 && <b>{i / round.denominator}</b>}
          </span>
        ))}
        {trail && <span className={`fh-trail ${splash ? 'is-splash' : ''}`} style={{ left: at(Math.min(trail.from, trail.to)), width: at(Math.abs(trail.to - trail.from)) }} />}
        <span className={`fh-pad ${landed ? 'is-landed' : ''}`} style={{ left: at(round.goal) }} data-testid="frog-goal" />
        <span className="fh-frog-spot" style={{ left: at(position) }} data-testid="frog-position" data-steps={position}>
          <Frog hopKey={hops} splash={splash} hat={halloween ? 'witch' : christmas ? 'santa' : undefined} />
        </span>
      </div>
    </div>
    <p className="fh-status" aria-live="polite" data-testid="status-frog-position">Frog at <strong>{positionName(position, round.denominator)}</strong> · Crocodile {crocAway} {crocAway === 1 ? 'hop' : 'hops'} away</p>

    <div className="fh-cards" role="group" aria-label="Jump cards">
      {round.cards.map((card, index) => (
        <JumpCard key={`${card.n}-${card.d}`} card={card} index={index} selected={selected === index} disabled={landed || caught}
          onSelect={() => { if (selected !== index) playHaptic('selection'); setSelected(index); }} />
      ))}
    </div>

    {message && <p className={`cg-feedback ${landed ? 'success' : caught || splash ? 'retry' : ''}`} role="status" aria-live="polite" data-testid="status-frog-feedback">{message}</p>}
    {landed && <p className="fh-flies" aria-label={`${fliesFor(hops, par)} ${bugs}`} data-testid="status-frog-round-flies">{(halloween ? '✨' : christmas ? '❄️' : '🪰').repeat(fliesFor(hops, par))}</p>}

    <div className="cg-actions">
      {landed
        ? <button type="button" className="cg-primary" onClick={next} data-testid="button-frog-next">{roundIndex + 1 === FROG_ROUNDS ? 'Finish' : 'Next pond'}</button>
        : caught
          ? <button type="button" className="cg-primary" onClick={resetRound} data-testid="button-frog-retry">Try this pond again</button>
          : <button type="button" className="cg-primary" onClick={doHop} disabled={selected === null} data-testid="button-frog-hop">Hop!</button>}
      <button type="button" className="cg-text-button" onClick={replay} data-testid="button-frog-replay"><RotateCcw size={16} /> New game</button>
    </div>
  </section>;
}

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
