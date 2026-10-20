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
});
