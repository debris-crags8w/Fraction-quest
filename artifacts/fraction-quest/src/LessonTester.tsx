/* Lesson tester (development server only): every lesson by unit, each one opened as an isolated test from its start,
   straight into its builds and worksheet, or its unit's challenge. App.tsx loads this file only inside an
   import.meta.env.DEV branch, so production builds (web, preview, the app) never include it; see
   scripts/lesson-tester-build.test.ts. Tests are temporary and never saved; only the "Tested" ticks stay, on this device. */

import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Hammer, Trophy } from 'lucide-react';
import { MISSIONS } from './game';
import { MathText } from './MathText';
import './lesson-tester.css';

const TESTED_KEY = 'fraction-quest-dev-tested';

function readTested(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(TESTED_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []);
  } catch { return new Set(); }
}
function writeTested(tested: Set<string>) {
  try {
    if (tested.size) localStorage.setItem(TESTED_KEY, JSON.stringify([...tested]));
    else localStorage.removeItem(TESTED_KEY);
  } catch { /* storage blocked: the ticks last until the page closes */ }
}

export default function LessonTester({ unitTitles, focusUnit, onBack, onStart, onLab, onChallenge }: {
  unitTitles: string[];
  /** The unit to bring into view (the one a test just came back from). */
  focusUnit?: number;
  onBack: () => void;
  onStart: (missionId: string) => void;
  onLab: (missionId: string) => void;
  onChallenge: (unit: number) => void;
}) {
  const [tested, setTested] = useState(readTested);
  useEffect(() => {
    if (focusUnit) document.getElementById(`tester-unit-${focusUnit}`)?.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [focusUnit]);
  const toggle = (missionId: string, on: boolean) => setTested((current) => {
    const next = new Set(current);
    if (on) next.add(missionId); else next.delete(missionId);
    writeTested(next);
    return next;
  });
  const clear = () => { writeTested(new Set()); setTested(new Set()); };

  return (
    <div className="fq-app">
      <main className="fq-shell fq-parent fq-lesson-tester-page fq-appear" data-testid="lesson-tester">
        <div className="fq-parent-actions">
          <button className="fq-back" onClick={onBack} data-testid="button-tester-back"><ArrowLeft size={17} /> Back to map</button>
          <button className="fq-button ghost" onClick={clear} disabled={!tested.size} data-testid="button-tester-clear">Clear ticks</button>
        </div>
        <header className="fq-parent-head">
          <p className="fq-print-kicker">Development only</p>
          <h1>Lesson tester</h1>
          <p className="fq-parent-note">Each test is temporary and never saved. Your real progress comes back when you leave it.</p>
        </header>
        {unitTitles.map((title, index) => {
          const unit = index + 1;
          const lessons = MISSIONS.filter((mission) => mission.unit === unit);
          const done = lessons.filter((mission) => tested.has(mission.id)).length;
          return (
            <section key={unit} id={`tester-unit-${unit}`} className="fq-parent-section fq-tester-unit" aria-labelledby={`tester-unit-${unit}-title`} data-testid={`tester-unit-${unit}`}>
              <div className="fq-tester-unit-head">
                <h2 id={`tester-unit-${unit}-title`}>Unit {unit} · {title}</h2>
                <span className="fq-tester-count" data-testid={`tester-unit-${unit}-count`}>{done} of {lessons.length} tested</span>
              </div>
              <ol className="fq-tester-lessons">
                {lessons.map((mission) => (
                  <li key={mission.id} className={tested.has(mission.id) ? 'is-tested' : ''} data-testid={`tester-lesson-${mission.id}`}>
                    <div className="fq-tester-lesson-info">
                      <b>Lesson {MISSIONS.indexOf(mission) + 1}</b>
                      <strong><MathText text={mission.title} /></strong>
                      <small>{mission.gradeBand ? `Grade ${mission.gradeBand}` : 'Bonus'}{mission.standards?.length ? ` · ${mission.standards.join(', ')}` : ''}</small>
                    </div>
                    <div className="fq-tester-actions">
                      <button type="button" className="fq-button secondary" onClick={() => onStart(mission.id)} data-testid={`button-tester-start-${mission.id}`}><BookOpen size={16} aria-hidden="true" /> Start</button>
                      <button type="button" className="fq-button ghost" onClick={() => onLab(mission.id)} data-testid={`button-tester-lab-${mission.id}`}><Hammer size={16} aria-hidden="true" /> Builds &amp; worksheet</button>
                      <label className="fq-tester-tick">
                        <input type="checkbox" checked={tested.has(mission.id)} onChange={(event) => toggle(mission.id, event.target.checked)} data-testid={`checkbox-tester-tested-${mission.id}`} />
                        Tested
                      </label>
                    </div>
                  </li>
                ))}
              </ol>
              <button type="button" className="fq-button ghost fq-tester-challenge" onClick={() => onChallenge(unit)} data-testid={`button-tester-challenge-${unit}`}><Trophy size={16} aria-hidden="true" /> Unit challenge</button>
            </section>
          );
        })}
      </main>
    </div>
  );
}
