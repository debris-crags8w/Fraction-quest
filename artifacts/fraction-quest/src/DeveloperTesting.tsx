/* Developer testing: open any lesson in an isolated test, without finishing earlier units. It lives with the
   grown-ups' settings (never on the child's map) and only in development builds. A grown-up can turn on
   developer mode for this device, which adds a small Dev button to the map for quick testing. */

import { useEffect, useState } from 'react';
import { Code2, X } from 'lucide-react';
import { MISSIONS } from './game';

const STORAGE_KEY = 'fraction-quest-developer-mode';
const CHANGED = 'fraction-quest-developer-mode-changed';

/** Developer testing exists only in development builds. */
export const developerTestingAvailable = () => import.meta.env.DEV;

function readDeveloperMode() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

/** Developer mode for this device: [on, set]. Every screen using it updates together. */
export function useDeveloperMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(readDeveloperMode);
  useEffect(() => {
    const sync = () => setOn(readDeveloperMode());
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(CHANGED, sync); window.removeEventListener('storage', sync); };
  }, []);
  const set = (next: boolean) => {
    try { if (next) localStorage.setItem(STORAGE_KEY, '1'); else localStorage.removeItem(STORAGE_KEY); } catch { /* private mode: this screen only */ }
    setOn(next);
    window.dispatchEvent(new Event(CHANGED));
  };
  return [on, set];
}

/** Pick a lesson and open it as an isolated test. */
export function DeveloperLessonPicker({ unitTitles, onOpen }: { unitTitles: string[]; onOpen: (missionId: string) => void }) {
  const [missionId, setMissionId] = useState(MISSIONS[0]?.id ?? '');
  return (
    <div className="fq-developer-test-body" data-testid="developer-module-test">
      <p>Choose a lesson to test it without finishing earlier units. Test answers and progress are temporary and discarded when you exit.</p>
      <label htmlFor="developer-lesson-select">Lesson to test</label>
      <select id="developer-lesson-select" value={missionId} onChange={(event) => setMissionId(event.target.value)} data-testid="select-developer-lesson">
        {unitTitles.map((title, index) => (
          <optgroup key={title} label={`Unit ${index + 1}: ${title}`}>
            {MISSIONS.filter((mission) => mission.unit === index + 1).map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}
          </optgroup>
        ))}
      </select>
      <button type="button" className="fq-button secondary" disabled={!missionId} onClick={() => onOpen(missionId)} data-testid="button-open-developer-lesson">
        Open lesson test
      </button>
    </div>
  );
}

/** The grown-ups' section: the developer mode switch and the lesson picker. */
export function DeveloperSettings({ unitTitles, onOpen }: { unitTitles: string[]; onOpen: (missionId: string) => void }) {
  const [on, setOn] = useDeveloperMode();
  if (!developerTestingAvailable()) return null;
  return (
    <section className="fq-parent-section fq-developer-test" aria-labelledby="developer-testing-title" data-testid="section-developer-testing">
      <h2 id="developer-testing-title">Developer testing</h2>
      <label className="fq-display-setting">
        <span><strong>Developer mode</strong><small>Adds a Dev button to the map for quick lesson tests. Only on this device.</small></span>
        <input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} data-testid="checkbox-developer-mode" />
      </label>
      <DeveloperLessonPicker unitTitles={unitTitles} onOpen={onOpen} />
    </section>
  );
}

/** The map's Dev button (developer mode only): opens the lesson picker in a small dialog. */
export function DeveloperChip({ unitTitles, onOpen }: { unitTitles: string[]; onOpen: (missionId: string) => void }) {
  const [on] = useDeveloperMode();
  const [open, setOpen] = useState(false);
  if (!developerTestingAvailable() || !on) return null;
  return (
    <>
      <button type="button" className="fq-dev-chip" onClick={() => setOpen(true)} aria-label="Developer testing" data-testid="button-dev-chip">
        <Code2 size={16} aria-hidden="true" /> Dev
      </button>
      {open && (
        <div className="fq-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="fq-modal fq-developer-test" role="dialog" aria-modal="true" aria-labelledby="dev-dialog-title">
            <button className="fq-icon-button fq-modal-close" onClick={() => setOpen(false)} aria-label="Close developer testing" data-testid="button-close-dev"><X size={18} /></button>
            <h2 id="dev-dialog-title">Developer testing</h2>
            <DeveloperLessonPicker unitTitles={unitTitles} onOpen={(missionId) => { setOpen(false); onOpen(missionId); }} />
          </div>
        </div>
      )}
    </>
  );
}
