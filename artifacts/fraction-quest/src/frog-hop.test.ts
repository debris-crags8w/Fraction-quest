import assert from 'node:assert/strict';
import test from 'node:test';
import { cardSteps, crocodileLimit, fliesFor, FROG_ROUNDS, frogRound, hop, parHops, positionName, type FrogRound } from './frog-hop';

test('a card jumps the right number of steps on the line', () => {
  assert.equal(cardSteps({ n: 1, d: 4 }, 8), 2);
  assert.equal(cardSteps({ n: 3, d: 4 }, 8), 6);
  assert.equal(cardSteps({ n: 1, d: 3 }, 12), 4);
});

test('hops go toward the goal; passing it is a splash and the frog hops back', () => {
  const round: FrogRound = { denominator: 8, wholes: 1, goal: 7, cards: [{ n: 1, d: 2 }, { n: 1, d: 4 }, { n: 1, d: 8 }] };
  assert.deepEqual(hop(round, 0, { n: 1, d: 2 }), { from: 0, to: 4, splash: false, landed: false });
  assert.deepEqual(hop(round, 4, { n: 1, d: 2 }), { from: 4, to: 8, splash: true, landed: false }, 'past 7/8 is a splash (and stops at 1)');
  assert.deepEqual(hop(round, 8, { n: 1, d: 8 }), { from: 8, to: 7, splash: false, landed: true }, 'back toward the goal');
  assert.equal(parHops(round), 3, '1/2 + 1/4 + 1/8');
});

test('every round is reachable, never one hop away, and on the line; flies and the crocodile follow par', () => {
  for (let seed = 1; seed <= 60; seed++) {
    for (let index = 0; index < FROG_ROUNDS; index++) {
      const round = frogRound(seed, index);
      const par = parHops(round);
      assert.ok(Number.isFinite(par) && par >= 2, `seed ${seed} round ${index}: par ${par}`);
      assert.ok(round.goal > 0 && round.goal < round.wholes * round.denominator && round.goal % round.denominator !== 0);
      assert.ok(round.cards.every((card) => Number.isInteger(cardSteps(card, round.denominator))), 'cards fit the line');
      assert.ok(crocodileLimit(par) > par);
    }
  }
  assert.deepEqual([fliesFor(3, 3), fliesFor(4, 3), fliesFor(6, 3)], [3, 2, 1]);
});

test('positions read as simplest fractions and mixed numbers', () => {
  assert.equal(positionName(0, 8), '0');
  assert.equal(positionName(6, 8), '3/4');
  assert.equal(positionName(8, 8), '1');
  assert.equal(positionName(10, 8), '1 1/4');
});
