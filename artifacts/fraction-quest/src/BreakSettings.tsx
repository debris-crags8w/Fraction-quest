import { useId } from 'react';
import { Bell, Hourglass, VolumeX } from 'lucide-react';
import { TIME_LIMIT_CHOICES, type TimeLimitMinutes } from './lib/fun';
import './brain-break.css';

export type BreakSettingsValue = { intervalMinutes: 0 | 10 | 15 | 20; quietMode: boolean };
export function BreakSettings({ intervalMinutes, quietMode, onChange }: {
  intervalMinutes: 0 | 10 | 15 | 20;
  quietMode: boolean;
  onChange: (next: BreakSettingsValue) => void;
}) {
  const intervalId = useId();
  const quietId = useId();
  return <section className="fq-break-settings" aria-labelledby="break-settings-title" data-testid="section-break-settings">
    <div className="fq-break-settings-head"><span className="fq-break-settings-icon"><Bell size={20} aria-hidden="true" /></span><div><h2 id="break-settings-title">Break preferences</h2><p>Choose gentle reminders that fit your learner.</p></div></div>
    <div className="fq-break-settings-row">
      <label htmlFor={intervalId}><strong>Offer a break reminder</strong><small>Breaks are always optional and can be skipped.</small></label>
      <select id={intervalId} value={intervalMinutes} onChange={event => onChange({ intervalMinutes: Number(event.target.value) as BreakSettingsValue['intervalMinutes'], quietMode })} data-testid="select-break-interval">
        <option value={0}>Off</option><option value={10}>Every 10 minutes</option><option value={15}>Every 15 minutes</option><option value={20}>Every 20 minutes</option>
      </select>
    </div>
    <div className="fq-break-settings-row quiet">
      <label htmlFor={quietId}><strong><VolumeX size={17} aria-hidden="true" /> Quiet mode</strong><small>Offer breathing, eye rest, stretches, and calm pauses only.</small></label>
      <button id={quietId} className={`fq-break-switch ${quietMode ? 'on' : ''}`} type="button" role="switch" aria-checked={quietMode} aria-label="Quiet mode" onClick={() => onChange({ intervalMinutes, quietMode: !quietMode })} data-testid="switch-break-quiet-mode"><span /></button>
    </div>
  </section>;
}

/** The grown-up's daily time limit: when it is used up, the child finishes the question they are on, then Hoot says
    "See you tomorrow". Shows today's minutes against the limit. */
export function TimeLimitSettings({ minutes, used, allowed, onChange }: {
  minutes: TimeLimitMinutes; used: number; allowed: number | null; onChange: (minutes: TimeLimitMinutes) => void;
}) {
  return <section className="fq-break-settings" aria-labelledby="time-limit-title" data-testid="section-time-limit">
    <div className="fq-break-settings-head"><span className="fq-break-settings-icon"><Hourglass size={20} aria-hidden="true" /></span><div><h2 id="time-limit-title">Daily time limit</h2><p>When time is up, your child finishes the question they’re on, then sees “See you tomorrow”.</p></div></div>
    <div className="fq-time-limit-choices" role="group" aria-label="Daily time limit">
      {TIME_LIMIT_CHOICES.map((choice) => (
        <button key={choice} type="button" aria-pressed={minutes === choice} onClick={() => onChange(choice)} data-testid={`time-limit-${choice}`}>
          {choice ? `${choice} min` : 'Off'}
        </button>
      ))}
    </div>
    <p className="fq-time-limit-today" data-testid="time-limit-today">{allowed ? `Today: ${Math.min(used, allowed)} of ${allowed} minutes used` : `Today: ${used} ${used === 1 ? 'minute' : 'minutes'} so far`}</p>
  </section>;
}
