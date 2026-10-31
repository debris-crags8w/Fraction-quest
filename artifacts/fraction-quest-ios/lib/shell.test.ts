import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { mock } from 'node:test';
import { LOAD_TIMEOUT_MS, playHaptic, startLoadTimer, type HapticsModule } from './shell';

/* The shell around the web app: a first load that stalls gives up and shows the retry screen, a haptic that fails never
   breaks the app, and one place (the shell) keeps clear of the notch and the home bar. */
const root = new URL('..', import.meta.url);

test('a load that has not finished after the time limit shows the retry screen; a finished or cancelled one does not', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    assert.ok(LOAD_TIMEOUT_MS >= 15_000 && LOAD_TIMEOUT_MS <= 30_000, 'long enough for a slow phone line, short enough not to leave a child waiting');
    let timedOut = 0;
    startLoadTimer(() => { timedOut++; });
    mock.timers.tick(LOAD_TIMEOUT_MS - 1);
    assert.equal(timedOut, 0);
    mock.timers.tick(1);
    assert.equal(timedOut, 1);
    const cancel = startLoadTimer(() => { timedOut++; });
    cancel();
    mock.timers.tick(LOAD_TIMEOUT_MS * 2);
    assert.equal(timedOut, 1, 'a load that finished in time cancels its timer');
  } finally {
    mock.timers.reset();
  }
});

test('a haptic that throws, or whose promise fails, is ignored', async () => {
  const calls: string[] = [];
  const working: HapticsModule = {
    selectionAsync: async () => { calls.push('selection'); },
    notificationAsync: async (type) => { calls.push(`notification ${type}`); },
    impactAsync: async (style) => { calls.push(`impact ${style}`); },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  } as unknown as HapticsModule;
  for (const cue of ['selection', 'retry', 'complete', 'impact', 'correct', 'star'] as const) await playHaptic(cue, working);
  assert.deepEqual(calls, ['selection', 'notification warning', 'notification success', 'impact heavy', 'impact light', 'impact light']);

  const throwing = { ...working, selectionAsync: () => { throw new Error('no haptic engine'); } } as HapticsModule;
  await assert.doesNotReject(async () => playHaptic('selection', throwing));
  const rejecting = { ...working, impactAsync: () => Promise.reject(new Error('busy')) } as HapticsModule;
  await assert.doesNotReject(async () => playHaptic('correct', rejecting));
});

test('the shell owns the safe area: it keeps clear of the top and bottom, and the page adds no inset of its own in the app', () => {
  const shell = readFileSync(new URL('app/index.tsx', root), 'utf8');
  assert.match(shell, /<SafeAreaView[^>]*edges=\{\['top', 'bottom'\]\}/);
  const css = readFileSync(new URL('../fraction-quest/src/theme-pop.css', root), 'utf8');
  // The page reads the phone's insets in one place, --fq-bottom-clear, which the app sets to 0 (main.tsx adds fq-in-app).
  const uses = css.split('\n').filter((line) => /env\(safe-area-inset/.test(line));
  assert.ok(uses.length > 0);
  for (const line of uses) assert.match(line, /--fq-bottom-clear:/, `the page pads a safe-area inset outside --fq-bottom-clear: ${line.trim()}`);
  assert.match(css, /:root\.fq-in-app \{ --fq-bottom-clear: 0px; \}/);
  assert.match(readFileSync(new URL('../fraction-quest/src/main.tsx', root), 'utf8'), /if \(inExpoShell\(\)\) document\.documentElement\.classList\.add\('fq-in-app'\)/);
});
