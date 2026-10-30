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
