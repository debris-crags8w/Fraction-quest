/* Developer testing: open any lesson in an isolated test, without finishing earlier units. It lives with the
   grown-ups' settings (never on the child's map). Development builds have it open; other builds (the preview, the
   published app, the iPhone and Android app) show it only when built with VITE_DEVELOPER_CODE, and only after that
   code is entered on the device. Developer mode then adds a small Dev button to the map for quick testing. */

import { useEffect, useState } from 'react';
import { Code2, ListChecks, X } from 'lucide-react';
import { MISSIONS } from './game';

const STORAGE_KEY = 'fraction-quest-developer-mode';
const UNLOCK_KEY = 'fraction-quest-developer-unlocked';
const CHANGED = 'fraction-quest-developer-mode-changed';
const DEVELOPER_CODE = String(import.meta.env?.VITE_DEVELOPER_CODE ?? '').trim();

/** Developer testing is in development builds, and in any build made with a developer code. */
export const developerTestingAvailable = () => import.meta.env.DEV || DEVELOPER_CODE.length > 0;

/** Whether a typed code opens developer testing (case and spaces don't matter). */
export const developerCodeMatches = (typed: string, code = DEVELOPER_CODE) =>
  code.length > 0 && typed.trim().toLowerCase() === code.toLowerCase();

function readFlag(key: string) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeFlag(key: string, on: boolean) {
  try { if (on) localStorage.setItem(key, '1'); else localStorage.removeItem(key); } catch { /* private mode: this screen only */ }
}
/** Unlocked on this device: always in development builds, else once the developer code was entered. */
const readUnlocked = () => import.meta.env.DEV || (developerTestingAvailable() && readFlag(UNLOCK_KEY));
const readDeveloperMode = () => readUnlocked() && readFlag(STORAGE_KEY);

/** Whether this device has entered the developer code: [unlocked, set]. */
export function useDeveloperUnlock(): [boolean, (on: boolean) => void] {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  useEffect(() => {
    const sync = () => setUnlocked(readUnlocked());
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(CHANGED, sync); window.removeEventListener('storage', sync); };
  }, []);
  const set = (next: boolean) => {
    writeFlag(UNLOCK_KEY, next);
    if (!next) writeFlag(STORAGE_KEY, false); // locking also turns developer mode off
    setUnlocked(readUnlocked());
    window.dispatchEvent(new Event(CHANGED));
  };
  return [unlocked, set];
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
    writeFlag(STORAGE_KEY, next);
    setOn(readDeveloperMode());
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

/** Development server only (production builds drop it): every lesson by unit, on one page. */
function LessonTesterButton({ onOpen, testId }: { onOpen: () => void; testId: string }) {
  if (!import.meta.env.DEV) return null;
  return (
    <button type="button" className="fq-button secondary" onClick={onOpen} data-testid={testId}>
      <ListChecks size={17} aria-hidden="true" /> Open the lesson tester
    </button>
  );
}

/** Enter the developer code to open developer testing on this device. */
function DeveloperUnlock({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  return (
    <form className="fq-developer-unlock" onSubmit={(event) => {
      event.preventDefault();
      if (developerCodeMatches(code)) onUnlock(); else { setWrong(true); setCode(''); }
    }}>
      <label htmlFor="developer-code">Developer code</label>
      <input id="developer-code" type="password" autoComplete="off" value={code} onChange={(event) => { setCode(event.target.value); setWrong(false); }} data-testid="input-developer-code" />
      <button type="submit" className="fq-button secondary" disabled={!code.trim()} data-testid="button-developer-unlock">Unlock</button>
      {wrong && <p role="alert" data-testid="text-developer-code-wrong">That code didn't work.</p>}
    </form>
  );
}

/** The grown-ups' section: the developer code (outside development builds), the developer mode switch and the
    lesson picker. */
export function DeveloperSettings({ unitTitles, onOpen, onOpenTester }: { unitTitles: string[]; onOpen: (missionId: string) => void; onOpenTester?: () => void }) {
  const [on, setOn] = useDeveloperMode();
  const [unlocked, setUnlocked] = useDeveloperUnlock();
  if (!developerTestingAvailable()) return null;
  if (!unlocked) {
    return (
      <section className="fq-parent-section fq-developer-test" aria-labelledby="developer-testing-title" data-testid="section-developer-testing">
        <h2 id="developer-testing-title">Developer testing</h2>
        <DeveloperUnlock onUnlock={() => setUnlocked(true)} />
      </section>
    );
  }
  return (
    <section className="fq-parent-section fq-developer-test" aria-labelledby="developer-testing-title" data-testid="section-developer-testing">
      <h2 id="developer-testing-title">Developer testing</h2>
      <label className="fq-display-setting">
        <span><strong>Developer mode</strong><small>Adds a Dev button to the map for quick lesson tests. Only on this device.</small></span>
        <input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} data-testid="checkbox-developer-mode" />
      </label>
      <DeveloperLessonPicker unitTitles={unitTitles} onOpen={onOpen} />
      {import.meta.env.DEV && onOpenTester && <LessonTesterButton onOpen={onOpenTester} testId="button-open-lesson-tester" />}
      {!import.meta.env.DEV && (
        <button type="button" className="fq-button ghost" onClick={() => setUnlocked(false)} data-testid="button-developer-lock">Lock developer testing on this device</button>
      )}
    </section>
  );
}

/** The map's Dev button (developer mode only): opens the lesson picker in a small dialog. */
export function DeveloperChip({ unitTitles, onOpen, onOpenTester }: { unitTitles: string[]; onOpen: (missionId: string) => void; onOpenTester?: () => void }) {
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
            {import.meta.env.DEV && onOpenTester && <LessonTesterButton onOpen={() => { setOpen(false); onOpenTester(); }} testId="button-dev-open-lesson-tester" />}
          </div>
        </div>
      )}
    </>
  );
}
