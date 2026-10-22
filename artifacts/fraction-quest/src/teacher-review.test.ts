import assert from 'node:assert/strict';
import test from 'node:test';
import { buildErrors } from './lab-copy';
import { getBuildChecks, getBuildPracticeChecks } from './learning-content';
import { REASON_SLIPS } from './reason-slips';
import { getExtraPractice } from './practice-bank';
import { MISSIONS } from './game';

test('builds where an area or a remainder can be named more than one way accept any equal fraction', () => {
  const [area] = getBuildChecks('fractional-side-area');
  assert.equal(area.target.n / area.target.d, 1 / 2);
  // 6/12, the worked example's own answer, is right; 5/12 is not.
  assert.deepEqual(buildErrors('bar', area.target, { d: 12, count: 6, wholes: 1 }).msgs, []);
  assert.notDeepEqual(buildErrors('bar', area.target, { d: 12, count: 5, wholes: 1 }).msgs, []);
  for (const check of getBuildPracticeChecks('fraction-of-remainder', 0)) {
    const { n, d } = check.target;
    assert.deepEqual(buildErrors('bar', check.target, { d: d * 2, count: n * 2, wholes: check.target.wholes }).msgs, [], check.prompt);
  }
});

test('in naming lessons, a build still has to use the parts asked for', () => {
  const [check] = getBuildChecks('build-equivalents');
  const { n, d } = check.target;
  assert.notDeepEqual(buildErrors('bar', check.target, { d: d * 2, count: n * 2, wholes: check.target.wholes }).msgs, []);
});

test('no wrong "why" choice is a true idea from its own lesson', () => {
  assert.ok(!REASON_SLIPS['compare-same-denominator'].includes('Same denominator means same size'));
  for (const id of ['add-related-fractions', 'add-unlike-fractions', 'subtract-unlike-fractions', 'mixed-unlike-operations']) {
    assert.ok(!REASON_SLIPS[id].includes('Rename only one fraction'), id);
  }
});

test('"You can\'t tell" is only the answer when the bigger share is of the smaller pizza', () => {
  const mission = MISSIONS.find((m) => m.id === 'compare-decimals-grid')!;
  for (let round = 0; round < 40; round++) {
    for (const q of getExtraPractice(mission.id, mission.questions.map((x) => `${x.id}-${round}`))) {
      const m = /eats (0\.\d+) of a small pizza\. \w+ eats (0\.\d+) of a big pizza/.exec(q.prompt);
      if (!m) continue;
      assert.ok(Number(m[1]) > Number(m[2]), q.prompt);
    }
  }
});
