import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { askGate, createGateMemory, gateAnswer, gateAnswerIsRight, gateWaitSeconds, GATE_WAIT_SECONDS } from './lib/grown-up-gate';

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

describe('the grown-up check pauses a child who is guessing', () => {
  it('lets the first two wrong answers go straight to a new question', () => {
    assert.equal(gateWaitSeconds(0), 0);
    assert.equal(gateWaitSeconds(1), 0);
    assert.equal(gateWaitSeconds(2), 0);
  });
  it('waits after every third wrong answer in a row, and the wait is short enough for an adult', () => {
    for (const wrong of [3, 6, 9]) assert.equal(gateWaitSeconds(wrong), GATE_WAIT_SECONDS);
    for (const wrong of [4, 5, 7, 8]) assert.equal(gateWaitSeconds(wrong), 0);
    assert.ok(GATE_WAIT_SECONDS >= 20 && GATE_WAIT_SECONDS <= 60);
  });
});

describe('the wait outlasts leaving the check and coming back', () => {
  const box = () => { let saved: string | null = null; return { read: () => saved, write: (value: string | null) => { saved = value; } }; };

  it('a check opened again after three misses still waits, and counts on from three', () => {
    const store = box();
    const first = createGateMemory(store);
    assert.equal(first.miss(1_000), 0);
    assert.equal(first.miss(2_000), 0);
    assert.equal(first.miss(3_000), GATE_WAIT_SECONDS);
    // Back, then the check opens again (a new screen reading the same memory).
    const reopened = createGateMemory(store);
    assert.equal(reopened.waitLeft(4_000), GATE_WAIT_SECONDS - 1);
    assert.equal(reopened.waitLeft(3_000 + GATE_WAIT_SECONDS * 1000), 0);
    assert.equal(reopened.miss(40_000), 0, 'the fourth miss in a row does not wait');
    assert.equal(reopened.miss(41_000), 0);
    assert.equal(reopened.miss(42_000), GATE_WAIT_SECONDS, 'the sixth does');
  });

  it('a right answer clears the misses', () => {
    const store = box();
    const memory = createGateMemory(store);
    memory.miss(1_000); memory.miss(2_000);
    memory.pass();
    assert.equal(createGateMemory(store).miss(3_000), 0);
    assert.equal(store.read(), JSON.stringify({ misses: 1, waitUntil: 0 }));
  });

  it('a wait set far in the future (a changed clock) is never longer than one wait', () => {
    const store = box();
    store.write(JSON.stringify({ misses: 3, waitUntil: 10_000_000 }));
    assert.equal(createGateMemory(store).waitLeft(0), GATE_WAIT_SECONDS);
    store.write('not json');
    assert.equal(createGateMemory(store).waitLeft(0), 0);
  });
});
