import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAssessmentDefinitions } from './assessments';
import { EMPTY_PROGRESS, isMissionUnlocked, MISSIONS, type Progress } from './game';
import { getWorksheet } from './learning-content';
import { emptyLearningRecord } from './learning';
import { ALL_CHALLENGE_PUZZLES } from './challenges';
import { answerValue } from './learning-content';
import { CHALLENGE_STANDARDS, FRACTION_STANDARDS } from './standard-catalog';

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

  it('teaches every standard in at least two lessons', () => {
    const lessonsFor = (id: string) => MISSIONS.filter((mission) => mission.standards?.includes(id) && !mission.enrichment).map((mission) => mission.id);
    // Lessons that also practise a second standard: groups of a unit fraction (3 × 1/3), sharing and fitting unit
    // fractions, and a fraction of a unit in a smaller unit.
    assert.ok(lessonsFor('4.NF.4a').includes('multiply-whole-by-fraction'));
    assert.ok(lessonsFor('5.NF.7a').includes('share-or-fit'));
    assert.ok(lessonsFor('5.NF.7b').includes('share-or-fit'));
    assert.ok(lessonsFor('4.MD.2').includes('fractional-unit-conversions'));
    const single = FRACTION_STANDARDS.filter((standard) => lessonsFor(standard.id).length < 2).map((standard) => standard.id);
    assert.deepEqual(single, [], 'every standard has a second lesson');
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

  it('asks about every standard in the Unit challenges, and tags each puzzle with what it asks', () => {
    const puzzles = ALL_CHALLENGE_PUZZLES;
    assert.deepEqual(Object.keys(CHALLENGE_STANDARDS).sort(), puzzles.map((puzzle) => puzzle.id).sort(), 'one tag list per puzzle');
    const known = new Set(FRACTION_STANDARDS.map((standard) => standard.id));
    for (const puzzle of puzzles) for (const standard of puzzle.standards ?? []) assert.ok(known.has(standard as never), `${puzzle.id}: ${standard}`);
    // Only the chance puzzles and the percent puzzles go past the grade 3–5 standards.
    assert.deepEqual(puzzles.filter((puzzle) => !puzzle.standards?.length).map((puzzle) => puzzle.id), ['u13-p1', 'u13-c1', 'u13-c4', 'u14-p1', 'u14-c2', 'u14-c3']);
    const asked = new Set(puzzles.flatMap((puzzle) => puzzle.standards ?? []));
    assert.deepEqual(FRACTION_STANDARDS.filter((standard) => !asked.has(standard.id)).map((standard) => standard.id), [], 'standards no challenge asks about');
    // A puzzle only asks about what the course has taught by the end of its unit.
    const missing: string[] = [];
    for (const puzzle of puzzles) {
      const unit = Number(/^u(\d+)-/.exec(puzzle.id)![1]);
      const taught = new Set(MISSIONS.filter((mission) => mission.unit <= unit).flatMap((mission) => mission.standards ?? []));
      for (const standard of puzzle.standards ?? []) if (!taught.has(standard)) missing.push(`${puzzle.id}: ${standard}`);
    }
    assert.deepEqual(missing, [], 'tags not yet taught by the puzzle\'s unit');
  });

  it('tags the unit 14 percent puzzles only with grade 4 work they really ask', () => {
    // Percent is not a grade 3-5 standard. "40% shaded", "17/20 = 85%" (20 is not a grade 4 denominator) and "order 0.6, 1/2, 55%"
    // carry none. "3/4 = 75/100" renames fourths as hundredths (4.NF.1); the two stories add or take away tenths (4.NF.3d).
    assert.deepEqual(CHALLENGE_STANDARDS['u14-p1'], []);
    assert.deepEqual(CHALLENGE_STANDARDS['u14-c2'], []);
    assert.deepEqual(CHALLENGE_STANDARDS['u14-c3'], []);
    assert.deepEqual(CHALLENGE_STANDARDS['u14-c1'], ['4.NF.1']);
  });

  it('asks every standard in the challenge map in at least two different puzzles', () => {
    const puzzlesFor = new Map<string, string[]>();
    for (const [id, standards] of Object.entries(CHALLENGE_STANDARDS)) for (const standard of standards) puzzlesFor.set(standard, [...(puzzlesFor.get(standard) ?? []), id]);
    const thin = [...puzzlesFor].filter(([, ids]) => ids.length < 2).map(([standard, ids]) => `${standard}: only ${ids.join(', ')}`);
    assert.deepEqual(thin, [], 'standards with a single challenge puzzle');
  });

  it('draws each challenge line plot from the numbers in its puzzle', () => {
    const plots = ALL_CHALLENGE_PUZZLES.filter((puzzle) => puzzle.figure?.kind === 'lineplot');
    assert.deepEqual(plots.map((puzzle) => puzzle.id), ['u4-c3', 'u9-c5', 'u9-c8', 'u12-c5', 'u12-c9']);
    for (const puzzle of plots) {
      if (puzzle.figure?.kind !== 'lineplot') continue;
      const listed = /(?:: | hold )([\d/ ,]+) (?:inch|inches|liter)\./.exec(puzzle.prompt)![1].split(', ').map(answerValue);
      assert.deepEqual(puzzle.figure.values.map((tick) => tick / puzzle.figure!.denominator as number), listed, puzzle.id);
    }
  });

  it('gives every lesson its own name', () => {
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
    // Every lesson but the ones added after the reorder.
    const added = ['compare-decimals-grid', 'fraction-times-fraction', 'bigger-or-smaller', 'share-or-fit', 'dimes-and-pennies', 'plot-in-eighths', 'party-portions',
      'line-plot-totals', 'two-step-conversions'];
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
