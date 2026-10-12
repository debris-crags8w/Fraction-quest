import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

/** The one-row header on task screens: back, a short title, "2 of 5" and a thin progress bar, plus optional
    actions (print…). Keeps the question near the top so a screen fits a phone or tablet without scrolling. */
export function TaskBar({ onBack, backLabel = 'Back', title, step, total, actions, testId = 'button-task-back' }: {
  onBack: () => void; backLabel?: string; title: ReactNode; step?: number; total?: number; actions?: ReactNode; testId?: string;
}) {
  const counted = step !== undefined && total !== undefined && total > 0;
  return (
    <header className="fq-taskbar">
      <div className="fq-taskbar-row">
        <button type="button" className="fq-taskbar-back" onClick={onBack} data-testid={testId}><ArrowLeft size={18} aria-hidden="true" /><span>{backLabel}</span></button>
        <div className="fq-taskbar-title">{title}{counted && <span className="fq-taskbar-count">{step} of {total}</span>}</div>
        {actions && <div className="fq-taskbar-actions">{actions}</div>}
      </div>
      {counted && (
        <div className="fq-taskbar-track" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}>
          <span style={{ width: `${(step / total) * 100}%` }} />
        </div>
      )}
    </header>
  );
}
