import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MISSIONS } from './game';
import { keepTaughtParts, partTaught } from './taught-parts';

const order = MISSIONS.map((mission) => mission.id);
const taughtAt = (missionId: string, idea?: number) => (d: number) => partTaught(d, order, missionId, idea);

test('a part name is taught by the Words screen, a word card on a Learn page or a New word card, and not before', () => {
  // The Words screen: halves, thirds, fourths, sixths, eighths, from the first lesson on.
  for (const d of [2, 3, 4, 6, 8]) assert.ok(partTaught(d, order, order[0]!, 0), `${d} is on the Words screen`);
  // Fifths: a word card in lesson 8 (benchmarks-zero-one), none before.
  assert.equal(partTaught(5, order, 'unit-fractions'), false);
  assert.equal(partTaught(5, order, 'benchmark-half'), false);
  assert.ok(partTaught(5, order, 'fraction-magnitude'), 'the lesson after the card');
  // Sevenths: a Learn page card in lesson 3's first idea: taught for that idea's practice, not for the lesson before.
  assert.equal(partTaught(7, order, 'equal-parts'), false);
  assert.ok(partTaught(7, order, 'unit-fractions', 0), 'the idea whose Learn page has the card');
  assert.ok(partTaught(7, order, 'unit-fractions', 2), 'and the ideas after it');
  // A New word card sits at the top of the lesson page: after that lesson's ideas, before its Practice more.
  assert.equal(partTaught(10, order, 'build-equivalents', 0), false);
  assert.ok(partTaught(10, order, 'build-equivalents'));
});

test('a wrong choice with a part not taught yet becomes a real mistake with taught parts; the right answer stays', () => {
  const asked = { prompt: 'A whole is cut into 4 equal parts. What is 1 part?', choices: ['3/4', '1/3', '1/5', '1/4'], correctChoice: 3 };
  const kept = keepTaughtParts(asked, taughtAt('unit-fractions', 0))!;
  assert.equal(kept.choices[kept.correctChoice], '1/4');
  assert.equal(kept.choices.length, 4);
  assert.equal(new Set(kept.choices).size, 4, 'no choice repeats');
  assert.ok(!kept.choices.includes('1/5'));
  assert.ok(kept.choices.every((choice) => !/\/(5|9|10|12|15)\b/.test(choice)));
  // Already taught: nothing changes.
  assert.equal(keepTaughtParts(asked, taughtAt('fraction-magnitude')), asked);
});

test('a question whose own prompt or right answer needs a part not taught yet is not swapped', () => {
  const about = { prompt: 'Which is bigger, 1/5 or 1/3?', choices: ['1/5', 'They are equal', "You can't tell", '1/3'], correctChoice: 3 };
  assert.equal(keepTaughtParts(about, taughtAt('unit-size', 1)), null);
  const answer = { prompt: 'Which is NOT the same as 1/2?', choices: ['2/4', '3/6', '4/9', '5/10'], correctChoice: 2 };
  assert.equal(keepTaughtParts(answer, taughtAt('add-like-denominators')), null);
});

test('a swapped-in choice never reads as "n over one" and never repeats the value of another choice', () => {
  const asked = { prompt: 'Write 2/10 in simplest form.', choices: ['1/10', '1/9', '2/5', '1/5'], correctChoice: 3 };
  const kept = keepTaughtParts(asked, taughtAt('simplify-fractions', 0));
  assert.ok(kept === null || kept.choices.every((choice) => !/^\d+\/1$/.test(choice)));
});
