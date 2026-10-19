import assert from 'node:assert/strict';
import test from 'node:test';
import { blockValue, correctGap, TOWER_ROUNDS, towerHint, towerRound, towerStands, towerStars, versusHalf } from './stack-tower';

test('every tower mixes numerators and denominators, in simplest form, with values spread apart', () => {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  for (let seed = 1; seed <= 60; seed++) {
    for (let index = 0; index < TOWER_ROUNDS; index++) {
      const round = towerRound(seed, index);
      const blocks = [round.first, ...round.arriving];
      assert.equal(blocks.length, index < 3 ? 4 : 5);
      assert.equal(new Set(blocks.map((b) => b.d)).size, blocks.length, 'denominators differ');
      assert.ok(new Set(blocks.map((b) => b.n)).size >= 2, 'numerators differ');
      for (const b of blocks) { assert.ok(b.n > 0 && b.n < b.d); assert.equal(gcd(b.n, b.d), 1); }
      const values = blocks.map(blockValue).sort((x, y) => x - y);
      values.slice(1).forEach((v, i) => assert.ok(v - values[i] >= 0.06 - 1e-9));
      if (index >= 4) assert.ok(blocks.filter((b) => versusHalf(b) !== 0 && Math.abs(blockValue(b) - 0.5) <= 0.15).length >= 2);
    }
  }
  assert.deepEqual(towerRound(5, 2), towerRound(5, 2), 'seeded towers repeat');
});

test('placing each block in its correct gap always builds a standing tower', () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (let index = 0; index < TOWER_ROUNDS; index++) {
      const round = towerRound(seed, index);
      const tower = [round.first];
      for (const block of round.arriving) tower.splice(correctGap(tower, block), 0, block);
      assert.ok(towerStands(tower));
      assert.ok(!towerStands([...tower].reverse()));
    }
  }
});

test('hints teach the benchmark without naming the right gap', () => {
  const tower = [{ n: 5, d: 6 }, { n: 1, d: 5 }]; // bottom first
  // 3/8 belongs between them (gap 1); trying the top or bottom gets a hint.
  assert.equal(correctGap(tower, { n: 3, d: 8 }), 1);
  assert.equal(towerHint(tower, { n: 3, d: 8 }, 2), '3/8 and 1/5 are both less than 1/2. Which one is closer to 0?');
  assert.equal(towerHint(tower, { n: 3, d: 8 }, 0), 'Bigger blocks go lower. Is 3/8 more or less than 1/2? Half of 8 parts is 4 parts.');
  assert.equal(towerHint([{ n: 1, d: 2 }], { n: 2, d: 3 }, 1), '1/2 is the same as 1/2. Is 2/3 more or less than 1/2? Compare 2 parts with half of 3 parts.');
  assert.match(towerHint([{ n: 3, d: 4 }], { n: 5, d: 6 }, 1), /both more than 1\/2/);
  assert.match(towerHint([{ n: 3, d: 4 }], { n: 1, d: 9 }, 0), /Compare 1 part with half of 9 parts\./);
  for (const hint of [towerHint(tower, { n: 3, d: 8 }, 2), towerHint(tower, { n: 3, d: 8 }, 0)]) {
    assert.doesNotMatch(hint, /bottom|top|between|gap/i);
  }
});

test('stars drop with each wobble but never below 1', () => {
  assert.deepEqual([0, 1, 2, 3].map(towerStars), [3, 2, 1, 1]);
});
