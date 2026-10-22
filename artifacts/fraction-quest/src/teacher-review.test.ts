import assert from 'node:assert/strict';
import test from 'node:test';
import { buildErrors } from './lab-copy';
import { getBuildChecks, getBuildPracticeChecks, getWorksheet } from './learning-content';
import { LESSON_INTROS } from './lesson-intros';
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

test('adding unlike fractions fades the renaming step: written out early, found by the child later', () => {
  for (const id of ['add-unlike-fractions', 'mixed-unlike-operations']) {
    const sheet = getWorksheet(id);
    assert.ok(sheet.slice(0, 6).some((row) => row.prompt.startsWith('Rename:')), `${id}: early rows show the renaming`);
    for (const row of sheet.slice(6)) {
      assert.doesNotMatch(row.prompt, /Rename:/, `${id}: ${row.prompt}`);
      assert.match(row.hint, /List multiples/, `${id}: ${row.hint}`);
    }
    // The lesson's last question (its checkpoint) asks without the renaming written out.
    const lesson = MISSIONS.find((mission) => mission.id === id)!;
    assert.doesNotMatch(lesson.questions[lesson.questions.length - 1].prompt, /Rename:/, id);
  }
});

test('the lessons the review found teaching too little now show each step before asking', () => {
  assert.ok(LESSON_INTROS['fraction-of-length'].steps.some((step) => /12 ÷ 4/.test(step)));
  assert.ok(LESSON_INTROS['ruler-measurement'].steps.some((step) => /Past 1 inch/.test(step)));
  const [length] = getBuildChecks('fraction-of-length');
  assert.equal(length.target.kind, 'set');
  assert.equal(length.target.total, 12);
});
