/* Every reason a child hears is true for the pick it is said about (education rescore 4, section 4 a-f).
   a. "That is how many fit in one whole" only when the scoop is a unit fraction and there is at least one whole.
   b. A Practice-more right answer gives a reason: never the hint again, never a question.
   c. Named reasons for yes/no picks and the other low Practice-more lessons; "add all of them" only for a partial sum.
   d. Reasons, not checks; estimates by benchmarks; no misleading reasons; hints that do not say the answer.
   e. Every idea pick named; most plausible worksheet slips named.
   f. No dead built-in review question; no idea repeats one hint three times. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { wrongChoiceReason } from './wrong-answer';
import { WHY } from './slip-reasons';
import { generateQuestions } from './practice-bank';

const why = (prompt: string, right: string, pick: string) => wrongChoiceReason(prompt, [right, pick], 0, 1);
const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('a. dividing: "how many fit in one whole" only where it is true', () => {
  it('a unit scoop and at least one whole keeps the reason', () => {
    assert.equal(why('How many 1/3-cup scoops fill 2 cups? 2 ÷ 1/3 = ?', '6', '3'), WHY.oneWhole);
  });
  for (const [prompt, right, pick] of [
    ['How many 1/12 cup scoops fill 5/6 cup?', '10', '12'],
    ['How many 3/8 cup scoops fill 3/4 cup?', '2', '8'],
    ['How many 1/8 cup scoops fill 1/2 cup?', '4', '8'],
    ['How many 2/6 cup scoops fill 2/3 cup?', '2', '6'],
    ['3/5 ÷ 1/10 = ?', '6', '10'],
    ['6/10 ÷ 2/10 = ?', '3', '10'],
    ['6/8 ÷ 2/8 = ?', '3', '8'],
  ]) {
    it(`${prompt} pick ${pick} is not told to count every whole`, () => {
      const reason = why(prompt, right, pick);
      assert.ok(reason, 'the pick is still named');
      assert.notEqual(reason, WHY.oneWhole);
    });
  }
  it('less than one whole with a unit scoop says so', () => {
    assert.equal(why('How many 1/8 cup scoops fill 1/2 cup?', '4', '8'), WHY.oneWholeLess);
  });
});

describe('b. a Practice-more right answer gives its own reason', () => {
  it('no right-answer text equals or contains its hint, or asks a question', () => {
    const bad: string[] = [];
    for (const m of MISSIONS) {
      const ids = m.questions.map((q) => q.id);
      for (const seed of [977, 1954, 9001, 9137, 9271]) for (const q of generateQuestions(m.id, ids, seed, 12)) {
        const [right, hint] = [q.retryFeedback.trim(), q.hint.trim()];
        if (right === hint || right.includes(hint) || /\?/.test(right)) bad.push(`${m.id}: ${q.prompt} | ${right}`);
      }
    }
    assert.deepEqual([...new Set(bad)].slice(0, 12), []);
  });
});
