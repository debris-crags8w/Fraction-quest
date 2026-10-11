import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Lock, Printer } from 'lucide-react';
import { getMission, MISSIONS, type Progress } from './game';
import type { FunState } from './lib/fun';
import { buildParentReport, type LessonRow } from './parent-report';
import { AnswerKey } from './Printables';
import { LearningVoicePicker } from './LearningText';
import { FamilyGuide } from './FamilyGuide';
import { BreakSettings } from './BreakSettings';
import type { BreakPreferences } from './lib/fun';
import type { DisplayPreferences } from './lib/fun';
import FamilyControls from './FamilyControls';

const STATUS: Record<LessonRow['status'], string> = { done: 'Done', started: 'In progress', skipped: 'Skipped by quiz', open: 'Open', locked: 'Locked' };

/** A light check that a grown-up is here (not security; just keeps young kids on their own screens). */
function GrownUpGate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
  const ask = () => ({ a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) });
  const [q, setQ] = useState(ask);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Number(value) === q.a * q.b) { onPass(); return; }
    setWrong(true); setValue(''); setQ(ask());
  };
  return (
    <main className="fq-shell fq-parent-gate fq-appear" data-testid="parent-gate">
      <button className="fq-back" onClick={onBack} data-testid="button-parent-back"><ArrowLeft size={17} /> Back to the map</button>
      <section className="fq-parent-card">
        <span className="fq-parent-lock" aria-hidden="true"><Lock size={26} /></span>
        <h1>For grown-ups</h1>
        <p>This page shows your child's progress. Please answer to continue.</p>
        <form onSubmit={submit} className="fq-parent-gate-form">
          <label htmlFor="parent-gate-answer">{q.a} × {q.b} =</label>
          <input id="parent-gate-answer" inputMode="numeric" autoComplete="off" value={value} onChange={(e) => { setValue(e.target.value.replace(/\D/g, '').slice(0, 3)); setWrong(false); }} data-testid="input-parent-gate" />
          <button type="submit" className="fq-button" disabled={!value} data-testid="button-parent-gate">Continue</button>
        </form>
        {wrong && <p className="fq-parent-wrong" role="alert" data-testid="text-parent-gate-wrong">Not quite. Here is a new one.</p>}
      </section>
    </main>
  );
}

const percent = (value: number | null) => (value === null ? '—' : `${value}%`);
const MASTERY_LABEL = { mastered: 'Mastered', developing: 'Developing', 'not-yet': 'Not yet assessed' } as const;

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
    </section>
  );
}

export default function ParentView({ progress, fun, unitTitles, childName, onBack, onBreakPreferencesChange, onDisplayPreferencesChange }: {
  progress: Progress; fun: FunState; unitTitles: string[]; childName: string | null; onBack: () => void;
  onBreakPreferencesChange: (preferences: BreakPreferences) => void;
  onDisplayPreferencesChange: (preferences: DisplayPreferences) => void;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [answerKeyLessonId, setAnswerKeyLessonId] = useState(MISSIONS[0].id);
  const [printKeyLessonId, setPrintKeyLessonId] = useState<string | null>(null);
  const report = useMemo(() => buildParentReport(progress, fun, unitTitles), [progress, fun, unitTitles]);
  useEffect(() => {
    if (!printKeyLessonId) return;
    const returnToReport = () => setPrintKeyLessonId(null);
    window.addEventListener('afterprint', returnToReport, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', returnToReport);
    };
  }, [printKeyLessonId]);
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

  return (
    <div className="fq-app">
      <main className="fq-shell fq-parent fq-appear">
        <div className="fq-parent-actions">
          <button className="fq-back" onClick={onBack} data-testid="button-parent-back"><ArrowLeft size={17} /> Back to the map</button>
          <button className="fq-button secondary" onClick={() => window.print()} data-testid="button-parent-print"><Printer size={17} /> Print report</button>
        </div>

        <article className="fq-parent-report fq-print fq-print-live" data-testid="parent-report">
          <header className="fq-parent-head">
            <p className="fq-print-kicker">Fraction Quest · Progress report · {printedOn}</p>
            <h1>{childName ? `${childName}'s progress` : 'Progress on this device'}</h1>
          </header>

          <section className="fq-parent-stats" aria-label="Summary">
            <div data-testid="stat-lessons"><strong>{report.lessonsDone}<small>/{report.lessonsTotal}</small></strong><span>Lessons done</span></div>
            <div data-testid="stat-minutes"><strong>{report.minutesWeek}<small> min</small></strong><span>This week</span></div>
            <div data-testid="stat-first-try"><strong>{percent(report.firstTryRate)}</strong><span>Worksheet answers right the first time</span></div>
            <div data-testid="stat-on-own"><strong>{percent(report.onOwnRate)}</strong><span>Builds done without help</span></div>
            <div><strong>{report.streak}</strong><span>Day streak</span></div>
            <div><strong>{report.stars}</strong><span>Stars</span></div>
          </section>

          <LearningVoicePicker />

          <BreakSettings
            intervalMinutes={fun.breakPreferences?.intervalMinutes ?? 15}
            quietMode={fun.breakPreferences?.quietMode ?? false}
            onChange={onBreakPreferencesChange}
          />
          <DisplaySettings
            preferences={fun.displayPreferences ?? { textSize: 'standard', highContrast: false, reducedMotion: false }}
            onChange={onDisplayPreferencesChange}
          />
          <FamilyControls unitTitles={unitTitles} />

          <section className="fq-parent-section fq-parent-code-progress" data-testid="parent-code-progress">
            <h2>Coding levels passed</h2>
            <p className="fq-parent-note">Coding progress is separate from fraction lesson mastery. A level counts when its robot program reaches the mission target.</p>
            <div className="fq-parent-code-summary">
              <strong>{report.codeLevelsPassed}<small> / {report.codeLevelsTotal}</small></strong>
              <span>levels passed across {report.codeMissionsStarted} missions · {report.codeMissionsComplete} missions with all 3 levels passed</span>
            </div>
            {report.codeMissionRows.length > 0 ? (
              <ul className="fq-parent-code-list">
                {report.codeMissionRows.map((row) => <li key={row.id} data-testid={`parent-code-${row.id}`}><span>{row.title}</span><strong>{row.levelsPassed} / 3 levels passed</strong></li>)}
              </ul>
            ) : <p className="fq-parent-code-empty">No coding levels passed yet. Each mission has three: fill in numbers, build blocks, and fix a bug.</p>}
          </section>

          <section className="fq-parent-section fq-parent-standard-mastery" data-testid="parent-standard-mastery">
            <h2>Fraction standards</h2>
            <p className="fq-parent-note">
              {report.assessmentChecksCompleted} non-diagnostic check-ins completed. Mastery requires at least 80% accuracy,
              three correct model-and-answer items, and evidence from two different checks at least a day apart. Before-you-start checks are diagnostic only.
            </p>
            {([3, 4, 5] as const).map(grade => {
              const rows = report.standardMastery.filter(row => row.grade === grade);
              if (!rows.length) return null;
              return (
                <div key={grade} className="fq-parent-mastery-grade">
                  <h3>Grade {grade}</h3>
                  <div className="fq-parent-table-wrap">
                    <table className="fq-parent-table">
                      <thead><tr><th>Standard</th><th>Evidence</th><th>Status</th></tr></thead>
                      <tbody>
                        {rows.map(row => (
                          <tr key={row.standard} data-testid={`parent-standard-${row.standard}`}>
                            <td><b>{row.standard}</b> · {row.title}</td>
                            <td>{row.attempted ? `${row.correct}/${row.attempted} correct · ${row.assessmentCount} checks` : 'No eligible check-in yet'}</td>
                            <td><span className={`fq-mastery-status status-${row.status}`}>{MASTERY_LABEL[row.status]}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <p className="fq-parent-note">Only the latest result for each check-in counts. Lesson completion, placement results, and game scores do not establish standard mastery.</p>
          </section>

          <section className="fq-parent-section">
            <h2>This week</h2>
            <div className="fq-parent-week" role="img" aria-label={`Minutes per day this week: ${report.week.map((day) => `${day.label} ${day.minutes}`).join(', ')}`}>
              {report.week.map((day) => (
                <div key={day.day} className="fq-parent-day">
                  <span className="fq-parent-bar"><i style={{ height: `${(day.minutes / maxMinutes) * 100}%` }} /></span>
                  <b>{day.minutes}</b>
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
            <p className="fq-parent-note">Minutes using the app each day. {report.answeredWeek} questions answered correctly this week.</p>
          </section>

          <div className="fq-parent-grid">
            <section className="fq-parent-section" data-testid="parent-next">
              <h2>Next up</h2>
              <p>{report.nextLesson ?? 'Every lesson is done. Replay any one, or try a Unit challenge.'}</p>
              {report.dueReviews.length > 0 && <p className="fq-parent-note">Ready for a quick review: {report.dueReviews.join(', ')}.</p>}
              {report.placement && <p className="fq-parent-note" data-testid="parent-placement">Level quiz on {report.placement.date}: started at unit {report.placement.unit}. Earlier lessons are open but not counted as done.</p>}
            </section>
            <section className="fq-parent-section" data-testid="parent-practice">
              <h2>Worth practicing</h2>
              {report.toPractice.length ? (
                <ul className="fq-parent-list">
                  {report.toPractice.map((tip) => <li key={tip.idea}><b>{tip.idea}</b><span>{tip.count}×{tip.inRedos ? ` (${tip.inRedos} in redos)` : ''} · {tip.lessons.join(', ')}</span></li>)}
                </ul>
              ) : <p>Nothing stands out yet.</p>}
            </section>
            <section className="fq-parent-section" data-testid="parent-strengths">
              <h2>Going well</h2>
              {report.strengths.length ? <ul className="fq-parent-list">{report.strengths.map((title) => <li key={title}><b>{title}</b></li>)}</ul>
                : <p>Finish a lesson without hints to see strengths here.</p>}
            </section>
          </div>

          <section className="fq-parent-section">
            <h2>Lessons</h2>
            {activeUnits.length === 0 && <p>No lessons started yet.</p>}
            {activeUnits.map((unit) => (
              <div key={unit.number} className="fq-parent-unit">
                <h3>Unit {unit.number}: {unit.title} <span>{unit.done}/{unit.total} done{unit.challengeBest !== null ? ` · challenge ${unit.challengeBest}/${unit.challengeMax}` : ''}</span></h3>
                <div className="fq-parent-table-wrap">
                  <table className="fq-parent-table">
                    <thead><tr><th>Lesson</th><th>Status</th><th>Worksheet</th><th>First try</th><th>Builds</th><th>Remembered</th></tr></thead>
                    <tbody>
                      {unit.lessons.map((row) => (
                        <tr key={row.id} className={`status-${row.status}`} data-testid={`parent-row-${row.id}`}>
                          <td>{row.number}. {row.title}</td><td>{STATUS[row.status]}</td><td>{row.worksheet}/12</td>
                          <td>{percent(row.firstTry)}</td><td>{row.builds}</td><td>{row.remembered}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {laterUnits.length > 0 && <p className="fq-parent-note">Not started yet: {laterUnits.map((unit) => `Unit ${unit.number} (${unit.title})`).join(', ')}.</p>}
          </section>

          <section className="fq-parent-section fq-parent-answer-keys" data-testid="parent-answer-keys">
            <h2>Answer keys for grown-ups</h2>
            <p>Choose a lesson to print its solutions. Answer keys are not included in student printouts.</p>
            <div className="fq-parent-answer-key-controls">
              <label htmlFor="parent-answer-key-lesson">Lesson</label>
              <select
                id="parent-answer-key-lesson"
                value={answerKeyLessonId}
                onChange={(event) => setAnswerKeyLessonId(event.target.value)}
                data-testid="select-parent-answer-key-lesson"
              >
                {MISSIONS.map((mission, index) => (
                  <option key={mission.id} value={mission.id}>Lesson {index + 1}: {mission.title}</option>
                ))}
              </select>
              <button type="button" className="fq-button" onClick={() => setPrintKeyLessonId(answerKeyLessonId)} data-testid="button-parent-print-answer-key">
                <Printer size={17} /> Print answer key
              </button>
            </div>
          </section>

          <FamilyGuide unitTitles={unitTitles} />

          <footer className="fq-parent-foot">
            <p><b>How to read this.</b> "First try" counts worksheet answers that were right the first time they were checked. "Builds" are the bar and number-line tasks: "On their own" means no hints and no wrong tries. "Remembered" means your child rebuilt it correctly on a later day without help.</p>
            <p><b>Helping at home.</b> Ask your child to show you a fraction with paper strips or on a drawn line, and to explain why. Use the answer-key section above when you need lesson solutions.</p>
          </footer>
        </article>
      </main>
    </div>
  );
}
