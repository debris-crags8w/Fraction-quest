import assert from 'node:assert/strict';
import test from 'node:test';
import { areEquivalent, compareFractions, targetTick, validLinePartitions, WAR_PARTS, WAR_ROUNDS, warHint } from './concept-games';

test('fraction comparison uses equal-sized whole amounts exactly', () => {
  assert.equal(compareFractions({ n: 3, d: 5 }, { n: 2, d: 5 }), 1);
  assert.equal(compareFractions({ n: 3, d: 8 }, { n: 1, d: 2 }), -1);
  assert.equal(compareFractions({ n: 4, d: 6 }, { n: 2, d: 3 }), 0);
});

test('equivalence matches different names only when their values agree', () => {
  assert.equal(areEquivalent({ n: 1, d: 2 }, { n: 2, d: 4 }), true);
  assert.equal(areEquivalent({ n: 2, d: 3 }, { n: 3, d: 4 }), false);
  assert.equal(areEquivalent({ n: 1, d: 0 }, { n: 1, d: 2 }), false);
});

test('number-line target stays the same while a compatible partition changes', () => {
  const target = { n: 3, d: 4 };
  const partitions = validLinePartitions(target, [2, 3, 4, 5, 6, 8, 10, 12]);
  assert.deepEqual(partitions, [4, 8, 12]);
  assert.deepEqual(partitions.map(parts => targetTick(target, parts)), [3, 6, 9]);
  assert.equal(targetTick(target, 5), null);
});

test('Fraction War mixes same-numerator, same-denominator and equal pairs the bars can build', () => {
  const sameTop = WAR_ROUNDS.filter(([a, b]) => a.n === b.n && a.d !== b.d);
  assert.ok(sameTop.length >= 3);
  // Same numerator: the smaller denominator (bigger parts) wins, on both sides.
  assert.ok(sameTop.some(([a, b]) => compareFractions(a, b) > 0) && sameTop.some(([a, b]) => compareFractions(a, b) < 0));
  assert.ok(WAR_ROUNDS.some(([a, b]) => a.d === b.d && a.n !== b.n));
  assert.ok(WAR_ROUNDS.some(([a, b]) => compareFractions(a, b) === 0));
  assert.ok(WAR_ROUNDS.flat().every(f => WAR_PARTS.includes(f.d)));
  assert.match(warHint({ n: 3, d: 4 }, { n: 3, d: 8 }), /bigger/);
});
