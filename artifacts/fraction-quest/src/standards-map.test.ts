import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAssessmentDefinitions } from './assessments';
import { EMPTY_PROGRESS, isMissionUnlocked, MISSIONS, type Progress } from './game';
import { getWorksheet } from './learning-content';
import { emptyLearningRecord } from './learning';
import { FRACTION_STANDARDS, UNIT_CHALLENGE_STANDARDS } from './standard-catalog';

describe('standards map', () => {
  it('teaches, practices and checks every grade 3–5 fraction standard', () => {
    const checkIns = getAssessmentDefinitions();
    for (const standard of FRACTION_STANDARDS) {
      const lessons = MISSIONS.filter((mission) => mission.standards?.includes(standard.id) && !mission.enrichment);
      assert.ok(lessons.length >= 1, `${standard.id}: no lesson teaches it`);
      assert.ok(lessons.reduce((rows, mission) => rows + getWorksheet(mission.id).length, 0) >= 12, `${standard.id}: fewer than 12 worksheet questions`);
      assert.ok(checkIns.some((checkIn) => checkIn.standards.includes(standard.id)), `${standard.id}: no Check-in asks about it`);
    }
  });

  it('teaches every standard in at least two lessons, except the five whose second lesson is still to come', () => {
    const lessonsFor = (id: string) => MISSIONS.filter((mission) => mission.standards?.includes(id) && !mission.enrichment).map((mission) => mission.id);
    // Lessons that also practise a second standard: groups of a unit fraction (3 × 1/3), sharing and fitting unit
    // fractions, and a fraction of a unit in a smaller unit.
    assert.ok(lessonsFor('4.NF.4a').includes('multiply-whole-by-fraction'));
    assert.ok(lessonsFor('5.NF.7a').includes('share-or-fit'));
    assert.ok(lessonsFor('5.NF.7b').includes('share-or-fit'));
    assert.ok(lessonsFor('4.MD.2').includes('fractional-unit-conversions'));
    const single = FRACTION_STANDARDS.filter((standard) => lessonsFor(standard.id).length < 2).map((standard) => standard.id);
    assert.deepEqual(single, ['4.NF.4c', '4.NF.5', '4.MD.4', '5.MD.1', '5.MD.2'], 'take a standard off this list when its second lesson is added');
  });

  it('tags lessons only with catalogued standards, and keeps each lesson at or above its grade', () => {
    const known = new Set(FRACTION_STANDARDS.map((standard) => standard.id));
    for (const mission of MISSIONS) for (const standard of mission.standards ?? []) assert.ok(known.has(standard as never), `${mission.id}: ${standard}`);
    // A lesson never sits in a unit before every lesson of a lower grade that it builds on: grade 5 lessons start in unit 8.
    for (const mission of MISSIONS.filter((item) => item.gradeBand === 5)) assert.ok(mission.unit >= 8, `${mission.id} (grade 5) is in unit ${mission.unit}`);
    // Fraction of a group (a/b of q) is 5.NF.4a, taught with fraction multiplication.
    for (const id of ['sets-unit-fractions', 'sets-nonunit', 'fraction-of-quantity', 'fraction-of-collection', 'fraction-of-length']) {
      assert.deepEqual(MISSIONS.find((mission) => mission.id === id)?.standards, ['5.NF.4a'], id);
    }
  });

  it('tags each unit challenge set with what that unit teaches, and gives every lesson its own name', () => {
    for (const [unit, standards] of Object.entries(UNIT_CHALLENGE_STANDARDS)) {
      // Challenges may stretch past the unit, but each unit's set must name something its own lessons teach.
      const taught = MISSIONS.filter((mission) => mission.unit === Number(unit)).flatMap((mission) => mission.standards ?? []);
      assert.ok(standards.some((standard) => taught.includes(standard)), `unit ${unit} challenges: ${standards.join(', ')}; its lessons teach ${taught.join(', ')}`);
    }
    const titles = MISSIONS.map((mission) => mission.title);
    assert.deepEqual(titles.filter((title, index) => titles.indexOf(title) !== index), [], 'two lessons share a name');
  });

  it('writes each decimal and ruler hint for its own question', () => {
    for (const row of getWorksheet('decimal-fraction-equivalence')) {
      const asked = /Write (\S+) as a decimal/.exec(row.prompt)?.[1];
      assert.ok(asked && row.hint.includes(asked), `${row.prompt} | ${row.hint}`);
    }
    for (const row of getWorksheet('ruler-measurement')) {
      const object = /The blue (.+) starts/.exec(row.prompt)?.[1];
      assert.ok(!object || row.hint.endsWith(`end of the ${object}.`), `${row.prompt} | ${row.hint}`);
    }
  });

  it('keeps a learner\'s finished lessons open after the reorder, with compare same numerator open to do', () => {
    // Saved under the old order: units 1–4 done, including both group lessons, but compare same numerator (old unit 5) not yet.
    const done = ['equal-parts', 'fraction-names', 'unit-fractions', 'unit-size', 'sets-unit-fractions', 'sets-nonunit', 'benchmark-half',
      'benchmarks-zero-one', 'fraction-magnitude', 'number-line-basics', 'number-line-points', 'number-line-beyond-one'];
    const progress: Progress = { ...EMPTY_PROGRESS, completedMissionIds: done,
      learning: Object.fromEntries(done.map((id) => [id, { ...emptyLearningRecord(), completedAt: 1_700_000_000_000 }])) as Progress['learning'] };
    for (const id of done.filter((id) => !id.startsWith('sets-'))) assert.ok(isMissionUnlocked(progress, id), `${id} stays open`);
    assert.ok(isMissionUnlocked(progress, 'compare-same-numerator'), 'the moved lesson is open');
    assert.ok(isMissionUnlocked(progress, 'compare-same-denominator'), 'the next unit 5 lesson is open');
    // A new learner still takes compare same numerator right after unit size.
    const fresh: Progress = { ...EMPTY_PROGRESS, completedMissionIds: ['equal-parts', 'fraction-names', 'unit-fractions', 'unit-size'],
      learning: Object.fromEntries(['equal-parts', 'fraction-names', 'unit-fractions', 'unit-size'].map((id) => [id, { ...emptyLearningRecord(), completedAt: 1 }])) as Progress['learning'] };
    assert.ok(isMissionUnlocked(fresh, 'compare-same-numerator'));
    assert.ok(!isMissionUnlocked(fresh, 'benchmark-half'), 'unit 3 waits for unit 2');
  });

  it('keeps every finished lesson open for a learner part-way through the course order used before LESSON_PLAN', () => {
    // The order before the October 2026 reorder, unit by unit.
    const before = [
      'equal-parts', 'fraction-names', 'unit-fractions', 'unit-size', 'compare-same-numerator', 'benchmark-half', 'benchmarks-zero-one',
      'fraction-magnitude', 'number-line-basics', 'number-line-points', 'number-line-beyond-one', 'compare-same-denominator', 'order-fractions',
      'equivalent-models', 'build-equivalents', 'missing-equivalent', 'compose-to-one', 'decompose-fractions', 'improper-fractions', 'mixed-improper',
      'add-like-denominators', 'subtract-like-denominators', 'add-related-fractions', 'tenths-decimals', 'hundredths-decimals', 'add-tenths-hundredths',
      'unit-fraction-multiples', 'multiply-whole-by-fraction', 'simplify-fractions', 'equivalent-missing-both', 'whole-numbers-as-fractions',
      'compare-unlike-fractions', 'order-unlike-fractions', 'subtract-unlike-fractions', 'add-unlike-fractions', 'add-mixed-numbers',
      'subtract-mixed-numbers', 'fraction-of-quantity', 'mixed-unlike-operations', 'estimate-fraction-operations', 'sets-unit-fractions', 'sets-nonunit',
      'multiply-fractions', 'fraction-of-collection', 'divide-whole-by-unit-fraction', 'multiplication-scaling', 'multiply-mixed-numbers',
      'unit-fraction-divided-whole', 'fraction-of-length', 'fractional-measure-addition', 'ruler-measurement', 'build-line-plots', 'read-line-plots',
      'line-plot-leveling', 'measurement-word-problems', 'fractional-unit-conversions', 'fractional-sharing', 'fraction-as-division',
      'fraction-probability', 'fraction-of-area', 'fractional-side-area', 'equivalent-number-line', 'fraction-recipes', 'fractions-to-percent',
      'percent-to-fraction', 'decimal-fraction-equivalence', 'compare-decimals', 'multi-step-fraction-stories', 'find-the-whole', 'spot-the-mistake',
      'fraction-of-remainder', 'divide-fractions',
    ];
    // Every lesson but the four added after the reorder.
    const added = ['compare-decimals-grid', 'fraction-times-fraction', 'bigger-or-smaller', 'share-or-fit'];
    assert.deepEqual([...before, ...added].sort(), MISSIONS.map((mission) => mission.id).sort());
    for (let reached = 1; reached < before.length; reached++) {
      const done = before.slice(0, reached);
      const progress: Progress = { ...EMPTY_PROGRESS, completedMissionIds: done,
        learning: Object.fromEntries(done.map((id) => [id, { ...emptyLearningRecord(), completedAt: 1_700_000_000_000 }])) as Progress['learning'] };
      const relocked = done.filter((id) => !isMissionUnlocked(progress, id));
      assert.deepEqual(relocked, [], `after ${reached} lessons: finished lessons locked again`);
      // Something new is always open to do next.
      assert.ok(MISSIONS.some((mission) => !done.includes(mission.id) && isMissionUnlocked(progress, mission.id)), `after ${reached} lessons`);
    }
  });
});
