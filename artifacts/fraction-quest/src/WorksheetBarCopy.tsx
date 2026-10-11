import React, { useEffect, useState } from 'react';
import type { BarTask, LearningModel } from './learning-content';
import { WholeBracket } from './models';

export function worksheetBarMatches(target: LearningModel, shaded: boolean[]): boolean {
  if (target.kind !== 'bar' || shaded.length !== target.d * target.wholes) return false;
  return shaded.every((isShaded, index) => isShaded === (index < target.n));
}

/** Is the bar activity done? Copy: same shading as the picture. Count: every part tapped. Shade: exactly n parts (any of them). */
export function barTaskDone(task: BarTask, target: LearningModel, shaded: boolean[]): boolean {
  if (task.kind === 'copy') return worksheetBarMatches(target, shaded);
  return shaded.length === target.d * target.wholes && shaded.filter(Boolean).length === task.n;
}

const INSTRUCTION: Record<BarTask['kind'], (n: number) => string> = {
  copy: () => 'Copy the bar above. Tap a part to color it. Tap again to clear it.',
  count: () => 'Tap each part as you count it: 1, 2, 3…',
  shade: (n) => `Shade ${n} ${n === 1 ? 'part' : 'parts'} of the bar. Tap again to clear.`,
};
const STATUS: Record<BarTask['kind'], [string, string]> = {
  copy: ['Copy the bar to open the answer box.', 'Your bar matches! Now type the answer.'],
  count: ['Count every part to open the answer box.', 'You counted every part! Now type the answer.'],
  shade: ['Shade the parts to open the answer box.', 'Nice shading! Now type the answer.'],
};

export function canEnterWorksheetAnswer(modelRequired: boolean, modelMatches: boolean): boolean {
  return !modelRequired || modelMatches;
}

function gridColumns(d: number): number {
  if (d <= 12) return d;
  for (let columns = 10; columns >= 2; columns--) if (d % columns === 0) return columns;
  return d;
}

export function WorksheetBarCopy({ target, task = { kind: 'copy', n: target.n }, disabled, statusId, onMatchChange }: {
  target: LearningModel; task?: BarTask; disabled: boolean; statusId: string; onMatchChange: (matches: boolean) => void;
}) {
  const [shaded, setShaded] = useState(() => Array.from({ length: target.d * target.wholes }, () => false));
  const [order, setOrder] = useState<number[]>([]); // counting order, for the numbers shown on counted parts
  const [touched, setTouched] = useState(false);
  const matches = touched && barTaskDone(task, target, shaded);
  useEffect(() => onMatchChange(matches), [matches, onMatchChange]);

  return (
    <section className="fq-ll-copy-model" aria-label="Interactive bar model">
      <p className="fq-ll-copy-instruction">{INSTRUCTION[task.kind](task.n)}</p>
      <div className="fq-ll-copy-wholes">
        {Array.from({ length: target.wholes }, (_, whole) => (
          <div className="fq-ll-copy-whole" key={whole}>
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
                    className={`fq-ll-copy-part ${shaded[index] ? 'on' : ''} ${task.kind === 'count' ? 'count' : ''}`}
                    key={index}
                    aria-label={`Part ${part + 1} of ${target.d} in whole ${whole + 1}`}
                    aria-pressed={shaded[index]}
                    disabled={disabled}
                    onClick={() => {
                      setTouched(true);
                      setShaded(current => current.map((value, at) => at === index ? !value : value));
                      setOrder(current => current.includes(index) ? current.filter(at => at !== index) : [...current, index]);
                    }}
                    data-testid={`button-copy-part-${index + 1}`}
                  >{task.kind === 'count' && shaded[index] ? order.indexOf(index) + 1 : null}</button>
                );
              })}
            </div>
            <WholeBracket />
          </div>
        ))}
      </div>
      <p id={statusId} className={`fq-ll-copy-status ${matches ? 'matched' : ''}`} role="status" aria-live="polite" data-testid="status-copy-model">
        {task.kind === 'count' && !matches && order.length ? `Counted ${order.length}. ` : ''}{STATUS[task.kind][matches ? 1 : 0]}
      </p>
    </section>
  );
}
