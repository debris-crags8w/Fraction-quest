import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { fractionOrderMatches, type FractionOrderRound, type FractionValue } from './game';
import { useFun } from './fun-ui';
import { playCue, playHaptic } from './lib/fun';
import { retryOpener } from './wrong-answer';

function cardId({ numerator, denominator }: FractionValue) {
  return `${numerator}-${denominator}`;
}

function FractionCard({ fraction }: { fraction: FractionValue }) {
  return (
    <span className="fq-order-fraction" aria-label={`${fraction.numerator} over ${fraction.denominator}`}>
      <b>{fraction.numerator}</b><i aria-hidden="true" /><b>{fraction.denominator}</b>
    </span>
  );
}

export default function FractionSortActivity({
  rounds,
  lessonLabel,
  intro,
  onExit,
  onDone,
}: {
  rounds: FractionOrderRound[];
  lessonLabel: string;
  intro: ReactNode;
  onExit: () => void;
  onDone: () => void;
}) {
  const { fun } = useFun();
  const [roundIndex, setRoundIndex] = useState(0);
  const [cards, setCards] = useState<FractionValue[]>(() => [...rounds[0].cards]);
  const [result, setResult] = useState<'retry' | 'correct' | null>(null);
  const round = rounds[roundIndex];
  const solved = result === 'correct';

  const moveCard = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= cards.length || solved) return;
    setCards((current) => {
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  };

  const checkOrder = () => {
    const correct = fractionOrderMatches(cards, round.direction);
    setResult(correct ? 'correct' : 'retry');
    playCue(correct ? 'correct' : 'retry', fun.sound);
    playHaptic(correct ? 'correct' : 'retry');
  };

  const advance = () => {
    if (roundIndex === rounds.length - 1) {
      onDone();
      return;
    }
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    setCards([...rounds[nextIndex].cards]);
    setResult(null);
  };

  return (
    <main className="fq-app fq-order-sort" data-testid="fraction-order-activity">
      <div className="fq-order-sort-shell">
        <header className="fq-order-sort-header">
          <button type="button" className="fq-back" onClick={onExit} data-testid="button-exit-sort">
            <ArrowLeft size={20} /> Exit lesson
          </button>
          <div><span>{lessonLabel} · Try it</span><h1>Arrange the fractions</h1></div>
        </header>

        <section className="fq-order-sort-example" data-testid="fraction-order-example">{intro}</section>

        <section className="fq-order-sort-card" aria-labelledby="fraction-sort-title">
          <div className="fq-order-sort-progress" aria-label={`Sorting round ${roundIndex + 1} of ${rounds.length}`}>
            {rounds.map((item, index) => <span key={item.id} className={index <= roundIndex ? 'active' : ''} />)}
            <span className="fq-order-sort-round-label">Round {roundIndex + 1} of {rounds.length}</span>
          </div>
          <h2 id="fraction-sort-title">{round.title}</h2>
          <p className="fq-order-sort-instructions">
            Move the cards up or down. The first card should be {round.direction === 'ascending' ? 'the smallest' : 'the biggest'}.
          </p>

          <ol className="fq-order-sort-list" aria-label={`${round.title} fraction cards`}>
            {cards.map((fraction, index) => {
              const label = `${fraction.numerator}/${fraction.denominator}`;
              const id = cardId(fraction);
              return (
                <li className="fq-order-sort-item" key={`${id}-${index}`} data-testid={`sort-card-${id}`} data-fraction={label}>
                  <span className="fq-order-position">{index + 1}</span>
                  <FractionCard fraction={fraction} />
                  <div className="fq-order-move-controls">
                    <button type="button" className="fq-order-move" aria-label={`Move ${label} up`}
                      onClick={() => moveCard(index, -1)} disabled={index === 0 || solved} data-testid={`button-sort-${id}-up`}>
                      <ArrowUp size={20} />
                    </button>
                    <button type="button" className="fq-order-move" aria-label={`Move ${label} down`}
                      onClick={() => moveCard(index, 1)} disabled={index === cards.length - 1 || solved} data-testid={`button-sort-${id}-down`}>
                      <ArrowDown size={20} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          {result && (
            <div className={`fq-order-sort-feedback ${solved ? 'correct' : 'retry'}`} role="status"
              aria-live="polite" data-testid="fraction-sort-feedback">
              <strong>{solved ? 'That order is right!' : retryOpener(`${round.id}:${roundIndex}`)}</strong>
              <span>{solved ? round.explanation : round.strategyHint}</span>
            </div>
          )}

          <div className="fq-order-sort-actions">
            {solved ? (
              <button type="button" className="fq-button" onClick={advance} data-testid="button-sort-next">
                {roundIndex === rounds.length - 1 ? 'Start lesson questions' : 'Next: biggest to smallest'}
              </button>
            ) : (
              <button type="button" className="fq-button" onClick={checkOrder} data-testid="button-sort-check">Check order</button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
