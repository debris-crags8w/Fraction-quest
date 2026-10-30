import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { getMission, MISSIONS, type GrownUpPick, type Progress } from './game';
import type { FunState } from './lib/fun';
import { buildParentReport, type LessonRow } from './parent-report';
import { ParentGlance, ShareCard } from './ParentGlance';
import { MonthCard, PracticeCard, SkillsCard } from './ParentSkills';
import { GrownUpGate } from './GrownUpGate';
import './parent-glance.css';
import { AnswerKey } from './Printables';
import { LearningVoicePicker } from './LearningText';
import { FamilyGuide } from './FamilyGuide';
import { BreakSettings, TimeLimitSettings } from './BreakSettings';
import { ReminderSettings } from './ReminderSettings';
import type { BreakPreferences } from './lib/fun';
import type { DisplayPreferences } from './lib/fun';
import { timeToday, today, type TimeLimitMinutes } from './lib/fun';
import FamilyControls from './FamilyControls';
import { openFoldedSections, printPage } from './lib/print';
import { DeveloperSettings } from './DeveloperTesting';
import { SubscriptionSettings } from './Subscribe';
import { timeLabel, useReminder } from './lib/reminder';
import { useSubscription } from './lib/subscription';

const STATUS: Record<LessonRow['status'], string> = { done: 'Done', started: 'In progress', skipped: 'Skipped by quiz', open: 'Open', locked: 'Locked' };

const percent = (value: number | null) => (value === null ? '—' : `${value}%`);

/** One settings group: a row with its current value that opens the existing controls. */
function SettingsRow({ title, value, children }: { title: string; value: string; children: ReactNode }) {
  return (
    <details className="fq-settings-row" data-testid={`settings-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
      <summary><strong>{title}</strong><small>{value}</small></summary>
      <div className="fq-settings-body">{children}</div>
    </details>
  );
}

function DisplaySettings({ preferences, onChange }: { preferences: DisplayPreferences; onChange: (next: DisplayPreferences) => void }) {
  return (
    <section className="fq-parent-section fq-display-settings" aria-labelledby="display-settings-title" data-testid="section-display-settings">
      <h2 id="display-settings-title">Reading and display</h2>
      <p className="fq-parent-note">These choices apply to the active learner profile and sync with its saved preferences.</p>
      <label className="fq-display-setting">
        <span><strong>Text size</strong><small>Increase the whole app’s text for easier reading.</small></span>
        <select aria-label="Text size" value={preferences.textSize} onChange={(event) => onChange({ ...preferences, textSize: event.target.value === 'large' ? 'large' : 'standard' })}>
          <option value="standard">Standard</option><option value="large">Larger text</option>
        </select>
      </label>
      <label className="fq-display-setting">
        <span><strong>High contrast</strong><small>Strengthen text, borders, and focus indicators.</small></span>
        <input type="checkbox" checked={preferences.highContrast} onChange={(event) => onChange({ ...preferences, highContrast: event.target.checked })} />
      </label>
      <label className="fq-display-setting">
        <span><strong>Reduce motion</strong><small>Use fewer animations and transitions.</small></span>
        <input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => onChange({ ...preferences, reducedMotion: event.target.checked })} />
      </label>
      <label className="fq-display-setting">
        <span><strong>Seasonal themes</strong><small>Dress the app up with a theme for each month, like Halloween in October and Christmas in December. Lessons and answers stay the same.</small></span>
        <input type="checkbox" checked={preferences.seasonalThemes !== false} onChange={(event) => onChange({ ...preferences, seasonalThemes: event.target.checked })} data-testid="checkbox-seasonal-themes" />
      </label>
      <label className="fq-display-setting">
        <span><strong>Story mode</strong><small>Short comics with Numi’s friends before and after lessons. Lessons and answers stay the same.</small></span>
        <input type="checkbox" checked={preferences.storyMode !== false} onChange={(event) => onChange({ ...preferences, storyMode: event.target.checked })} data-testid="checkbox-story-mode" />
      </label>
      <label className="fq-display-setting">
        <span><strong>Story music</strong><small>Quiet music under the story films: calm, worried when something goes wrong, happy when a piece is found. It gets softer while a character speaks. Only in films, and off when the app’s sound is off.</small></span>
        <input type="checkbox" checked={preferences.storyMusic !== false} onChange={(event) => onChange({ ...preferences, storyMusic: event.target.checked })} data-testid="checkbox-story-music" />
      </label>
    </section>
  );
}

export default function ParentView({ progress, fun, unitTitles, childName, onBack, onPick, onDeveloperTest, onOpenLessonTester, onBreakPreferencesChange, onTimeLimitChange, onDisplayPreferencesChange }: {
  progress: Progress; fun: FunState; unitTitles: string[]; childName: string | null; onBack: () => void;
  /** "Practice now" and "Add a Check-in": a card on the child's map. */
  onPick: (kind: GrownUpPick['kind'], id: string) => void;
  /** Open a lesson as an isolated developer test (development builds only). */
  onDeveloperTest?: (missionId: string) => void;
  /** Development server only: opens the Lesson tester. */
  onOpenLessonTester?: () => void;
  onBreakPreferencesChange: (preferences: BreakPreferences) => void;
  onTimeLimitChange: (minutes: TimeLimitMinutes) => void;
  onDisplayPreferencesChange: (preferences: DisplayPreferences) => void;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<'report' | 'settings'>('report');
  // Reminders and the subscription exist only in the app (iPhone and Android).
  const reminder = useReminder();
  const subscription = useSubscription();
  const [answerKeyLessonId, setAnswerKeyLessonId] = useState(MISSIONS[0].id);
  const [printKeyLessonId, setPrintKeyLessonId] = useState<string | null>(null);
  const report = useMemo(() => buildParentReport(progress, fun, unitTitles), [progress, fun, unitTitles]);
  useEffect(() => {
    if (!printKeyLessonId) return;
    const returnToReport = () => setPrintKeyLessonId(null);
    window.addEventListener('afterprint', returnToReport, { once: true });
    const frame = window.requestAnimationFrame(() => { void printPage('Fraction Quest answer key'); });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', returnToReport);
    };
  }, [printKeyLessonId]);
  // Folded units and grades print open.
  useEffect(() => {
    const openAll = () => openFoldedSections(document);
    window.addEventListener('beforeprint', openAll);
    return () => window.removeEventListener('beforeprint', openAll);
  }, []);
  if (!unlocked) return <div className="fq-app"><GrownUpGate onPass={() => setUnlocked(true)} onBack={onBack} /></div>;
  if (printKeyLessonId) {
    return (
      <div className="fq-app">
        <main className="fq-shell fq-parent fq-parent-key-print">
          <button className="fq-back fq-parent-key-back" onClick={() => setPrintKeyLessonId(null)} data-testid="button-parent-key-return">
            <ArrowLeft size={17} /> Back to the report
          </button>
          <AnswerKey mission={getMission(printKeyLessonId)} />
        </main>
      </div>
    );
  }

  const maxMinutes = Math.max(10, ...report.week.map((day) => day.minutes));
  const printedOn = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const activeUnits = report.units.filter((unit) => unit.lessons.some((row) => row.status === 'done' || row.status === 'started' || row.status === 'skipped'));
  const laterUnits = report.units.filter((unit) => !activeUnits.includes(unit));
  const picks = progress.grownUpPicks ?? [];
  const showLesson = (missionId: string) => {
    const row = document.querySelector<HTMLElement>(`[data-testid="parent-row-${missionId}"]`);
    const unit = row?.closest('details');
    if (unit) unit.open = true;
    row?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    row?.focus({ preventScroll: true });
  };
  const display = fun.displayPreferences ?? { textSize: 'standard', highContrast: false, reducedMotion: false };
  const limit = fun.timeLimit?.minutes ?? 0;

  return (
    <div className="fq-app">
      <main className="fq-shell fq-parent fq-appear">
        <div className="fq-parent-actions">
          <button className="fq-back" onClick={onBack} data-testid="button-parent-back"><ArrowLeft size={17} /> Back to the map</button>
          {tab === 'report' && <button className="fq-button secondary" onClick={() => { void printPage('Fraction Quest progress report'); }} data-testid="button-parent-print"><Printer size={17} /> Print report</button>}
        </div>
        <div className="fq-parent-tabs" role="tablist" aria-label="Grown-ups">
          {(['report', 'settings'] as const).map((id) => (
            <button key={id} type="button" role="tab" id={`tab-parent-${id}`} aria-selected={tab === id} aria-controls={`panel-parent-${id}`}
              className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)} data-testid={`tab-parent-${id}`}>{id === 'report' ? 'Report' : 'Settings'}</button>
          ))}
        </div>

        {tab === 'settings' ? (
          <section className="fq-parent-settings" role="tabpanel" id="panel-parent-settings" aria-labelledby="tab-parent-settings" data-testid="parent-settings">
            {reminder && <SettingsRow title="Reminders" value={reminder.time ? timeLabel(reminder.time) : 'Off'}><ReminderSettings /></SettingsRow>}
            <SettingsRow title="Breaks" value={fun.breakPreferences?.quietMode ? 'Quiet' : `Every ${fun.breakPreferences?.intervalMinutes ?? 15} min`}>
              <BreakSettings intervalMinutes={fun.breakPreferences?.intervalMinutes ?? 15} quietMode={fun.breakPreferences?.quietMode ?? false} onChange={onBreakPreferencesChange} />
            </SettingsRow>
            <SettingsRow title="Daily time limit" value={limit ? `${limit} min` : 'Off'}>
              <TimeLimitSettings minutes={limit} used={fun.activity?.[today()]?.minutes ?? 0} allowed={timeToday(fun)?.allowed ?? null} onChange={onTimeLimitChange} />
            </SettingsRow>
            <SettingsRow title="Reading and display" value={`Story mode ${display.storyMode === false ? 'off' : 'on'}`}>
              <DisplaySettings preferences={display} onChange={onDisplayPreferencesChange} />
            </SettingsRow>
            <SettingsRow title="Voice" value="Who reads aloud"><LearningVoicePicker /></SettingsRow>
            <SettingsRow title="Family and profiles" value="Learners, backup, sign-in"><FamilyControls unitTitles={unitTitles} /></SettingsRow>
            <SettingsRow title="Answer keys" value="Print any lesson">
              <section className="fq-parent-section fq-parent-answer-keys" data-testid="parent-answer-keys">
                <h2>Answer keys for grown-ups</h2>
                <p>Choose a lesson to print its solutions. Answer keys are not included in student printouts.</p>
                <div className="fq-parent-answer-key-controls">
                  <label htmlFor="parent-answer-key-lesson">Lesson</label>
                  <select id="parent-answer-key-lesson" value={answerKeyLessonId} onChange={(event) => setAnswerKeyLessonId(event.target.value)} data-testid="select-parent-answer-key-lesson">
                    {MISSIONS.map((mission, index) => <option key={mission.id} value={mission.id}>Lesson {index + 1}: {mission.title}</option>)}
                  </select>
                  <button type="button" className="fq-button" onClick={() => setPrintKeyLessonId(answerKeyLessonId)} data-testid="button-parent-print-answer-key">
                    <Printer size={17} /> Print answer key
                  </button>
                </div>
              </section>
            </SettingsRow>
            {subscription && <SettingsRow title="Subscription" value={subscription.state === 'active' ? 'On' : 'Plan and restore'}><SubscriptionSettings /></SettingsRow>}
            <SettingsRow title="Teaching guide" value="By unit"><FamilyGuide unitTitles={unitTitles} /></SettingsRow>
            {onDeveloperTest && <SettingsRow title="Developer" value="Test builds only"><DeveloperSettings unitTitles={unitTitles} onOpen={onDeveloperTest} onOpenTester={onOpenLessonTester} /></SettingsRow>}
          </section>
        ) : (
        <article className="fq-parent-report fq-print fq-print-live" role="tabpanel" id="panel-parent-report" aria-labelledby="tab-parent-report" data-testid="parent-report">
          <header className="fq-parent-head">
            <p className="fq-print-kicker">Fraction Quest · Progress report · {printedOn}</p>
            <h1>{childName ? `${childName}'s progress` : 'Progress on this device'}</h1>
          </header>

          <ParentGlance glance={report.glance} childName={childName} />
          <div className="fq-glance">
            <SkillsCard skills={report.skills} grade={report.grade} childName={childName} picks={picks} onPick={onPick} />
            <PracticeCard tips={report.toPractice} homeIdea={report.homeIdea} strengths={report.strengths} childName={childName} picks={picks} onPick={onPick} onShowLesson={showLesson} />
            <MonthCard month={report.month} />
            <ShareCard glance={report.glance} childName={childName} skills={report.skills} />
          </div>

          <h2 className="fq-glance-full">Full report</h2>
          <section className="fq-parent-stats" aria-label="Summary">
            <div data-testid="stat-lessons"><strong>{report.lessonsDone}<small>/{report.lessonsTotal}</small></strong><span>Lessons done</span></div>
            <div data-testid="stat-minutes"><strong>{report.minutesWeek}<small> min</small></strong><span>This week</span></div>
            <div data-testid="stat-first-try"><strong>{percent(report.firstTryRate)}</strong><span>Worksheet answers right the first time without the Hint, all lessons</span></div>
            <div data-testid="stat-on-own"><strong>{percent(report.onOwnRate)}</strong><span>Builds done without help</span></div>
            <div data-testid="stat-streak"><strong>{report.streak}</strong><span>Day streak{report.savedDays > 0 ? ` (${report.savedDays} ${report.savedDays === 1 ? 'day' : 'days'} saved by spare oil)` : ''}</span></div>
          </section>

          <section className="fq-parent-section">
            <h2>This week</h2>
            <div className="fq-parent-week" role="img" aria-label={`Minutes per day this week: ${report.week.map((day) => `${day.label} ${day.minutes}`).join(', ')}`}>
              {report.week.map((day) => (
                <div key={day.day} className="fq-parent-day">
                  <span className="fq-parent-bar"><i style={{ height: `${(day.minutes / maxMinutes) * 100}%` }} /></span>
                  <b>{day.minutes}</b>
                  <small>{day.label}</small>
                  {day.saved && <small className="fq-parent-saved">Saved</small>}
                </div>
              ))}
            </div>
            <p className="fq-parent-note">Minutes using the app each day. {report.answeredWeek} questions answered correctly this week.
              {report.week.some((day) => day.saved) && <> “Saved” marks a day with no practice: a drop of spare oil kept the streak going. A drop is earned for every 7 days in a row, and up to 2 are kept.</>}</p>
          </section>

          <section className="fq-parent-section" data-testid="parent-next">
            <h2>Next up</h2>
            <p>{report.nextLesson ?? 'Every lesson is done. Replay any one, or try a Unit challenge.'}</p>
            {report.dueReviews.length > 0 && <p className="fq-parent-note">Ready for a quick review: {report.dueReviews.join(', ')}.</p>}
            {report.placement && <p className="fq-parent-note" data-testid="parent-placement">Level quiz on {report.placement.date}: started at unit {report.placement.unit}. Earlier lessons are open but not counted as done.</p>}
          </section>

          <section className="fq-parent-section" data-testid="parent-lessons">
            <h2>Lessons</h2>
            {activeUnits.length === 0 && <p>No lessons started yet.</p>}
            {activeUnits.map((unit) => {
              const changes = report.adaptationReasons.filter((item) => item.unit === unit.number);
              return (
                <details key={unit.number} className="fq-parent-unit" open={changes.length > 0 || unit.lessons.some((row) => row.status === 'started')}>
                  <summary><h3>Unit {unit.number}: {unit.title} <span>{unit.done}/{unit.total} done{unit.challengeBest !== null ? ` · challenge ${unit.challengeBest}/${unit.challengeMax}` : ''}</span></h3></summary>
                  <div className="fq-parent-table-wrap" tabIndex={0} role="region" aria-label={`Unit ${unit.number} lessons`}>
                    <table className="fq-parent-table">
                      <thead><tr><th>Lesson</th><th>Status</th><th>Worksheet</th><th>First try</th><th>Builds</th><th>Remembered</th></tr></thead>
                      <tbody>
                        {unit.lessons.map((row) => (
                          <tr key={row.id} className={`status-${row.status}`} data-testid={`parent-row-${row.id}`} tabIndex={-1}>
                            <td>{row.number}. {row.title}</td><td>{STATUS[row.status]}</td><td>{row.worksheet}/12</td>
                            <td>{percent(row.firstTry)}</td><td>{row.builds}</td><td>{row.remembered}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {changes.length > 0 && <ul className="fq-parent-list" data-testid="parent-adaptation-reasons">
                    {changes.map((item, index) => <li key={`${item.day}:${item.lesson}:${index}`}><b>Why {item.lesson} changed: {item.reason}</b><span>{item.day}</span></li>)}
                  </ul>}
                </details>
              );
            })}
            {laterUnits.length > 0 && <p className="fq-parent-note">Not started yet: {laterUnits.map((unit) => `Unit ${unit.number} (${unit.title})`).join(', ')}.</p>}
            <p className="fq-parent-note" data-testid="parent-code-progress">Coding, separate from the fraction lessons: {report.codeLevelsPassed} of {report.codeLevelsTotal} robot levels passed
              {report.codeMissionsStarted ? ` across ${report.codeMissionsStarted} ${report.codeMissionsStarted === 1 ? 'lesson' : 'lessons'}` : ''}.</p>
          </section>

          <footer className="fq-parent-foot">
            <p><b>How to read this.</b> "First try" counts worksheet answers that were right the first time they were checked. "Builds" are the bar and number-line tasks: "On their own" means no hints and no wrong tries. "Remembered" means your child rebuilt it correctly on a later day without help.</p>
            <p><b>Helping at home.</b> Ask your child to show you a fraction with paper strips or on a drawn line, and to explain why. Answer keys are in Settings.</p>
          </footer>
        </article>
        )}
      </main>
    </div>
  );
}
