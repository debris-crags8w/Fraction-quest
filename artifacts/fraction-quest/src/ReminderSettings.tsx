import { AlarmClock } from 'lucide-react';
import { REMINDER_TIMES, setReminder, timeLabel, useReminder } from './lib/reminder';
import './brain-break.css';

const DAYS = [
  { day: 1, short: 'M', name: 'Monday' }, { day: 2, short: 'T', name: 'Tuesday' }, { day: 3, short: 'W', name: 'Wednesday' },
  { day: 4, short: 'T', name: 'Thursday' }, { day: 5, short: 'F', name: 'Friday' }, { day: 6, short: 'S', name: 'Saturday' },
  { day: 0, short: 'S', name: 'Sunday' },
];

/** The grown-ups' practice reminder, set on this phone only. Shown only in the app (iPhone and Android). */
export function ReminderSettings() {
  const reminder = useReminder();
  if (!reminder) return null;
  const toggle = (day: number) => setReminder(reminder.time, reminder.days.includes(day) ? reminder.days.filter((item) => item !== day) : [...reminder.days, day]);
  return <section className="fq-break-settings" aria-labelledby="reminder-title" data-testid="section-reminder">
    <div className="fq-break-settings-head"><span className="fq-break-settings-icon"><AlarmClock size={20} aria-hidden="true" /></span><div><h2 id="reminder-title">Practice reminder</h2><p>This phone reminds your child to practise. Set up here, on this phone only. Nothing is sent to us.</p></div></div>
    <div className="fq-break-settings-row">
      <label htmlFor="reminder-time"><strong>Remind at</strong></label>
      <select id="reminder-time" value={reminder.time ?? ''} onChange={(event) => setReminder(event.target.value || null, reminder.days)} data-testid="select-reminder-time">
        <option value="">Off</option>
        {REMINDER_TIMES.map((time) => <option key={time} value={time}>{timeLabel(time)}</option>)}
      </select>
    </div>
    <fieldset className="fq-reminder-days" disabled={!reminder.time}>
      <legend>On these days</legend>
      <div>
        {DAYS.map(({ day, short, name }) => (
          <button key={day} type="button" aria-pressed={reminder.days.includes(day)} aria-label={name} onClick={() => toggle(day)} data-testid={`reminder-day-${day}`}>{short}</button>
        ))}
      </div>
    </fieldset>
    {reminder.time && reminder.permission === 'denied'
      ? <p className="fq-reminder-note warn" role="alert" data-testid="reminder-permission">Notifications are off for Fraction Quest. Turn them on in your phone’s Settings.</p>
      : <p className="fq-reminder-note">No reminder on a day your child has already practised.</p>}
  </section>;
}
