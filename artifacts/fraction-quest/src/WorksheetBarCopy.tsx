import React, { useEffect, useState } from 'react';
import type { LearningModel } from './learning-content';

export function worksheetBarMatches(target: LearningModel, shaded: boolean[]): boolean {
  if (target.kind !== 'bar' || shaded.length !== target.d * target.wholes) return false;
  return shaded.every((isShaded, index) => isShaded === (index < target.n));
}

export function canEnterWorksheetAnswer(modelRequired: boolean, modelMatches: boolean): boolean {
  return !modelRequired || modelMatches;
}

function gridColumns(d: number): number {
  if (d <= 12) return d;
  for (let columns = 10; columns >= 2; columns--) if (d % columns === 0) return columns;
  return d;
}

export function WorksheetBarCopy({ target, disabled, statusId, onMatchChange }: {
  target: LearningModel; disabled: boolean; statusId: string; onMatchChange: (matches: boolean) => void;
}) {
  const [shaded, setShaded] = useState(() => Array.from({ length: target.d * target.wholes }, () => false));
  const [touched, setTouched] = useState(false);
  const matches = touched && worksheetBarMatches(target, shaded);
  useEffect(() => onMatchChange(matches), [matches, onMatchChange]);

  return (
    <section className="fq-ll-copy-model" aria-label="Interactive bar model">
      <p className="fq-ll-copy-instruction">Copy the bar above. Tap a part to color it. Tap again to clear it.</p>
      <div className="fq-ll-copy-wholes">
        {Array.from({ length: target.wholes }, (_, whole) => (
          <div className="fq-ll-copy-whole" key={whole}>
            <strong>WHOLE {whole + 1}</strong>
            <div
              className="fq-ll-copy-parts"
              role="group"
              aria-label={`Whole ${whole + 1}, ${target.d} equal parts`}
              style={{ gridTemplateColumns: `repeat(${gridColumns(target.d)}, minmax(0,1fr))` }}
            >
              {Array.from({ length: target.d }, (_, part) => {
                const index = whole * target.d + part;
                return (
                  <button
                    type="button"
                    className={`fq-ll-copy-part ${shaded[index] ? 'on' : ''}`}
                    key={index}
                    aria-label={`Part ${part + 1} of ${target.d} in whole ${whole + 1}`}
                    aria-pressed={shaded[index]}
                    disabled={disabled}
                    onClick={() => {
                      setTouched(true);
                      setShaded(current => current.map((value, at) => at === index ? !value : value));
                    }}
                    data-testid={`button-copy-part-${index + 1}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="fq-ll-copy-part-label"><span aria-hidden="true" /> PART · one equal piece</p>
      <p id={statusId} className={`fq-ll-copy-status ${matches ? 'matched' : ''}`} role="status" aria-live="polite" data-testid="status-copy-model">
        {matches ? 'Your bar matches! Now type the answer.' : 'Copy the bar to open the answer box.'}
      </p>
    </section>
  );
}
