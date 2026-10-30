/* The grown-up check: a multiplication a grade 4 or 5 child has not memorised (two-digit factor times 6 to 9),
   but an adult does in their head. It is not security; it keeps young children out of the time limit,
   reminders, paywall and store links. The answer is typed, so it works with a screen reader. A child who keeps guessing is asked to wait (see gateWaitSeconds). */
export type GateQuestion = { a: number; b: number };

const FIRST = 13; const SECOND = 6; const SECOND_COUNT = 4; const QUESTIONS = 7 * SECOND_COUNT;

/** One of the 28 questions, 13 to 19 times 6 to 9. Never `previous` again. */
export function askGate(random: () => number = Math.random, previous?: GateQuestion): GateQuestion {
  let index = Math.min(QUESTIONS - 1, Math.floor(random() * QUESTIONS));
  const at = (i: number): GateQuestion => ({ a: FIRST + Math.floor(i / SECOND_COUNT), b: SECOND + (i % SECOND_COUNT) });
  if (previous && at(index).a === previous.a && at(index).b === previous.b) index = (index + 1) % QUESTIONS;
  return at(index);
}

export const gateAnswer = ({ a, b }: GateQuestion): number => a * b;
export const gateAnswerIsRight = (question: GateQuestion, typed: string): boolean => typed.trim() !== '' && Number(typed) === gateAnswer(question);

/** After every third wrong answer in a row the check waits this long before it takes another answer. */
export const GATE_WAIT_SECONDS = 30;
export const gateWaitSeconds = (wrongInARow: number): number => (wrongInARow > 0 && wrongInARow % 3 === 0 ? GATE_WAIT_SECONDS : 0);

/** Where the check keeps its misses and wait between screens. */
export type GateStore = { read: () => string | null; write: (value: string | null) => void };
const GATE_KEY = 'fraction-quest-gate-wait';
let kept: string | null = null;
/** This page's memory, also kept on the device so a reload does not clear the wait. */
const deviceStore: GateStore = {
  read: () => { try { return window.localStorage.getItem(GATE_KEY) ?? kept; } catch { return kept; } },
  write: (value) => {
    kept = value;
    try { if (value === null) window.localStorage.removeItem(GATE_KEY); else window.localStorage.setItem(GATE_KEY, value); } catch { /* storage off: this page still remembers */ }
  },
};

/** Wrong answers in a row and when the wait ends, kept outside the check's screen: tapping Back and opening the check
    again does not clear them. A right answer does. */
export function createGateMemory(store: GateStore = deviceStore) {
  const read = (): { misses: number; waitUntil: number } => {
    try {
      const saved = JSON.parse(store.read() ?? 'null') as { misses?: unknown; waitUntil?: unknown } | null;
      const misses = typeof saved?.misses === 'number' && Number.isSafeInteger(saved.misses) && saved.misses > 0 ? saved.misses : 0;
      const waitUntil = typeof saved?.waitUntil === 'number' && Number.isFinite(saved.waitUntil) ? saved.waitUntil : 0;
      return { misses, waitUntil };
    } catch { return { misses: 0, waitUntil: 0 }; }
  };
  /** Whole seconds left to wait (never more than one wait, even if the clock was moved back). */
  const waitLeft = (now = Date.now()): number => Math.min(GATE_WAIT_SECONDS, Math.max(0, Math.ceil((read().waitUntil - now) / 1000)));
  return {
    waitLeft,
    /** Records a wrong answer and returns the seconds to wait before the next one. */
    miss(now = Date.now()): number {
      const misses = read().misses + 1;
      const wait = gateWaitSeconds(misses);
      store.write(JSON.stringify({ misses, waitUntil: wait ? now + wait * 1000 : 0 }));
      return wait;
    },
    pass(): void { store.write(null); },
  };
}

export const gateMemory = createGateMemory();
