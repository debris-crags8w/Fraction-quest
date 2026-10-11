import React, { useRef } from 'react';
import type { WorksheetProblem } from './learning-content';

export type FractionParts = { numerator: string; denominator: string };

export function usesFractionEntry(problem: WorksheetProblem): boolean {
  return !problem.form && /^\d+\s*\/\s*\d+$/.test(problem.answer.trim());
}

export function fractionParts(value: string): FractionParts {
  const raw = value.trim();
  const match = /^(\d*)\s*\/\s*(\d*)$/.exec(raw);
  if (match) return { numerator: match[1], denominator: match[2] };
  if (/^\d*$/.test(raw)) return { numerator: raw, denominator: '' };
  return { numerator: '', denominator: '' };
}

export function fractionDraftFromParts(numerator: string, denominator: string): string {
  return numerator || denominator ? `${numerator}/${denominator}` : '';
}

export function updateFractionPart(value: string, part: keyof FractionParts, raw: string): string {
  const shorthand = raw.trim().replace(/\s/g, '');
  if (shorthand.includes('/') && /^(\d*)\/(\d*)$/.test(shorthand)) return shorthand;

  const digits = raw.replace(/\D/g, '').slice(0, 6);
  const current = fractionParts(value);
  return part === 'numerator'
    ? fractionDraftFromParts(digits, current.denominator)
    : fractionDraftFromParts(current.numerator, digits);
}

export function FractionEntry({
  id,
  value,
  onChange,
  describedBy,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  describedBy: string;
  disabled?: boolean;
}) {
  const typedInput = useRef<HTMLInputElement>(null);
  const denominatorInput = useRef<HTMLInputElement>(null);
  const { numerator, denominator } = fractionParts(value);

  const updatePart = (part: keyof FractionParts, raw: string) => {
    onChange(updateFractionPart(value, part, raw));
    if (raw.includes('/')) denominatorInput.current?.focus();
  };

  const insertSlash = () => {
    const input = typedInput.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    const next = `${value.slice(0, start)}/${value.slice(end)}`;
    onChange(next);
    if (input) {
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + 1, start + 1);
      });
    }
  };

  return (
    <div className="fq-ll-fraction-entry" data-testid={`fraction-entry-${id}`}>
      <fieldset className="fq-ll-fraction-fieldset" aria-describedby={`${id}-instructions ${describedBy}`} disabled={disabled}>
        <legend className="fq-ll-sr-only">Enter a fraction</legend>
        <p id={`${id}-instructions`} className="fq-ll-sr-only">
          Put the numerator (parts selected) in the top box and the denominator (total equal parts) in the bottom box.
        </p>
        <label className="fq-ll-fraction-part" htmlFor={`${id}-numerator`}>
          <span className="fq-ll-fraction-name"><b>Numerator</b><small>parts selected</small></span>
          <input
            id={`${id}-numerator`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={6}
            value={numerator}
            disabled={disabled}
            onChange={event => updatePart('numerator', event.target.value)}
            aria-label="Numerator: parts selected"
            aria-describedby={`${id}-instructions ${describedBy}`}
            data-testid={`input-${id}-numerator`}
          />
        </label>
        <span className="fq-ll-fraction-bar" aria-hidden="true" />
        <label className="fq-ll-fraction-part" htmlFor={`${id}-denominator`}>
          <span className="fq-ll-fraction-name"><b>Denominator</b><small>total equal parts</small></span>
          <input
            ref={denominatorInput}
            id={`${id}-denominator`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={6}
            value={denominator}
            disabled={disabled}
            onChange={event => updatePart('denominator', event.target.value)}
            aria-label="Denominator: total equal parts in 1 whole"
            aria-describedby={`${id}-instructions ${describedBy}`}
            data-testid={`input-${id}-denominator`}
          />
        </label>
      </fieldset>
      <details className="fq-ll-fraction-typed">
        <summary>Type a fraction with /</summary>
        <div className="fq-ll-fraction-typed-controls">
          <label className="fq-ll-sr-only" htmlFor={`${id}-typed`}>
            Fraction answer, for example 1/3
          </label>
          <input
            ref={typedInput}
            id={`${id}-typed`}
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={200}
            value={value}
            disabled={disabled}
            onChange={event => onChange(event.target.value)}
            aria-describedby={`${id}-instructions ${describedBy}`}
            data-testid={`input-${id}-typed`}
          />
          <button type="button" className="fq-ll-fraction-slash" onClick={insertSlash} aria-label="Insert fraction slash" disabled={disabled}>
            /
          </button>
        </div>
      </details>
    </div>
  );
}
