import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { askGate, gateAnswer, gateAnswerIsRight } from './lib/grown-up-gate';

/* The grown-up check guards the time limit, reminders, the paywall and the store links, so a grade 4 or 5 child
   who knows 6 to 9 times tables must not be able to pass it by recall. An adult can still do it in their head. */
describe('the grown-up check', () => {
  const all = Array.from({ length: 4000 }, (_, i) => askGate(() => ((i * 7919) % 4000) / 4000));

  it('always has a two-digit factor from 13 to 19 times a one-digit factor from 6 to 9', () => {
    for (const { a, b } of all) {
      assert.ok(a >= 13 && a <= 19, `a=${a}`);
      assert.ok(b >= 6 && b <= 9, `b=${b}`);
      assert.ok(gateAnswer({ a, b }) >= 78 && gateAnswer({ a, b }) <= 171, 'the answer fits in the three-digit box');
    }
  });

  it('is never a times-table fact a child has memorised (both factors within 1 to 12)', () => {
    assert.ok(all.every(({ a }) => a > 12));
  });

  it('can ask every one of the 28 questions', () => {
    assert.equal(new Set(all.map(({ a, b }) => `${a}x${b}`)).size, 28);
  });

  it('accepts only the exact product', () => {
    assert.equal(gateAnswerIsRight({ a: 14, b: 7 }, '98'), true);
    assert.equal(gateAnswerIsRight({ a: 14, b: 7 }, '098'), true);
    assert.equal(gateAnswerIsRight({ a: 14, b: 7 }, '97'), false);
    assert.equal(gateAnswerIsRight({ a: 14, b: 7 }, ''), false);
    assert.equal(gateAnswerIsRight({ a: 14, b: 7 }, '9'), false);
  });

  it('asks a different question after a wrong answer', () => {
    for (let i = 0; i < 200; i++) {
      const first = askGate(() => (i % 28) / 28);
      const next = askGate(Math.random, first);
      assert.notDeepEqual(next, first);
    }
  });
});
