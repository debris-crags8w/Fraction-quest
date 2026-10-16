import './yes-no-cards.css';
import { playHaptic } from './lib/fun';

export function YesNoCards({ value, onChange, disabled = false, testIdPrefix }: {
  value: string;
  onChange: (value: 'yes' | 'no') => void;
  disabled?: boolean;
  testIdPrefix: string;
}) {
  return (
    <div className="fq-yes-no-cards" role="group" aria-label="Choose yes or no" aria-disabled={disabled}>
      {(['yes', 'no'] as const).map((choice) => {
        const selected = value.trim().toLowerCase() === choice;
        return (
          <button
            key={choice}
            type="button"
            className={`fq-answer-choice fq-yes-no-choice${selected ? ' selected' : ''}`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => {
              if (disabled || selected) return;
              playHaptic('selection');
              onChange(choice);
            }}
            data-testid={`button-${testIdPrefix}-${choice}`}
          >
            {choice === 'yes' ? 'Yes' : 'No'}
          </button>
        );
      })}
    </div>
  );
}
