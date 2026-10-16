import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { fractionOrderRoundMatches, type FractionOrderRound, type FractionValue } from './game';

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
  const [roundIndex, setRoundIndex] = useState(0);
  const [cards, setCards] = useState<FractionValue[]>(() => [...rounds[0].cards]);
  const [renamedNumerators, setRenamedNumerators] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof fractionOrderRoundMatches> | null>(null);
  const round = rounds[roundIndex];
  const solved = result?.correct === true;

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
    setResult(fractionOrderRoundMatches(round, cards, renamedNumerators.map((value) => Number(value))));
  };

  const advance = () => {
    if (roundIndex === rounds.length - 1) {
      onDone();
      return;
    }
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    setCards([...rounds[nextIndex].cards]);
    setRenamedNumerators([]);
    setResult(null);
  };

  const renameFeedback = result?.orderCorrect && !result.renamingCorrect
    ? 'The order is right. Check the equal-size names: 3/8 is 9/24, and 5/12 is 10/24.'
    : !result?.orderCorrect && result?.renamingCorrect
      ? 'The renamed fractions are right. Use 1/2 as a landmark, then compare the two fractions below half.'
      : 'Check both parts: use 1/2 to place the fractions, then compare the same-size twenty-fourths.';

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
            <span className="fq-order-sort-round-label">Question {roundIndex + 1} of {rounds.length}</span>
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

          {round.renamingCheck && (
            <section className="fq-order-rename-check" aria-labelledby="fraction-rename-prompt">
              <p id="fraction-rename-prompt" className="fq-order-rename-prompt">{round.renamingCheck.prompt}</p>
              <div className="fq-order-rename-fields">
                {[round.renamingCheck.first, round.renamingCheck.second].map((fraction, index) => {
                  const label = `${fraction.numerator}/${fraction.denominator}`;
                  return (
                    <label className="fq-order-rename-field" key={label}>
                      <span><FractionCard fraction={fraction} /> as <b>{round.renamingCheck!.denominator}ths</b></span>
                      <span className="fq-order-rename-equation">=</span>
                      <input
                        type="number"
                        min="0"
                        max={round.renamingCheck!.denominator}
                        step="1"
                        inputMode="numeric"
                        value={renamedNumerators[index] ?? ''}
                        onChange={(event) => setRenamedNumerators((current) => {
                          const next = [...current];
                          next[index] = event.target.value;
                          return next;
                        })}
                        disabled={solved}
                        aria-label={`Numerator when ${label} is renamed as ${round.renamingCheck!.denominator}ths`}
                        data-testid={`input-sort-rename-${fraction.numerator}-${fraction.denominator}`}
                      />
                      <span aria-hidden="true">/{round.renamingCheck!.denominator}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {result && (
            <div className={`fq-order-sort-feedback ${solved ? 'correct' : 'retry'}`} role="status"
              aria-live="polite" data-testid="fraction-sort-feedback">
              <strong>{solved ? 'That order is right!' : 'Not quite yet.'}</strong>
              <span>{solved ? round.explanation : round.renamingCheck ? renameFeedback : round.strategyHint}</span>
            </div>
          )}

          <div className="fq-order-sort-actions">
            {solved ? (
              <button type="button" className="fq-button" onClick={advance} data-testid="button-sort-next">
                {roundIndex === rounds.length - 1 ? 'Start lesson questions' : `Next: ${rounds[roundIndex + 1].title.toLowerCase()}`}
              </button>
            ) : (
              <button type="button" className="fq-button" onClick={checkOrder} data-testid="button-sort-check">
                {round.renamingCheck ? 'Check my order and names' : 'Check order'}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
