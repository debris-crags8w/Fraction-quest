import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LinkedFraction } from './fraction-ui';

/** The one-row header on task screens: back, a short title and progress, plus optional actions (print…).
    Progress is itself a fraction: a bar cut into one equal part per question, with "3/8 done" beside it.
    Keeps the question near the top so a screen fits a phone or tablet without scrolling. */
export function TaskBar({ onBack, backLabel = 'Back', title, step, total, done, actions, testId = 'button-task-back' }: {
  onBack: () => void; backLabel?: string; title: ReactNode; step?: number; total?: number;
  /** Questions finished (defaults to the ones before `step`). */ done?: number;
  actions?: ReactNode; testId?: string;
}) {
  const counted = step !== undefined && total !== undefined && total > 0;
  const finished = counted ? Math.min(total, Math.max(0, done ?? step - 1)) : 0;
  const segmented = counted && total <= 24;
  return (
    <header className="fq-taskbar">
      <div className="fq-taskbar-row">
        <button type="button" className="fq-taskbar-back" onClick={onBack} data-testid={testId}><ArrowLeft size={18} aria-hidden="true" /><span>{backLabel}</span></button>
        <div className="fq-taskbar-title">{title}</div>
        {counted && (
          <span className="fq-taskbar-fraction" data-testid="taskbar-progress" title={`Question ${step} of ${total}`}>
            <LinkedFraction n={finished} d={total} label={`${finished} of ${total} done. Question ${step} of ${total}.`} />
            <small aria-hidden="true">done</small>
          </span>
        )}
        {actions && <div className="fq-taskbar-actions">{actions}</div>}
      </div>
      {counted && (segmented ? (
        <div className="fq-taskbar-segments" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden="true">
          {Array.from({ length: total }, (_, i) => <span key={i} className={i < finished ? 'on' : i === step - 1 ? 'now' : ''} />)}
        </div>
      ) : (
        <div className="fq-taskbar-track" aria-hidden="true"><span style={{ width: `${(finished / total) * 100}%` }} /></div>
      ))}
    </header>
  );
}
