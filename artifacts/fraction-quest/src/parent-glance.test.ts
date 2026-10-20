import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EMPTY_PROGRESS, MISSIONS, type Progress } from './game';
import { emptyLearningRecord } from './learning';
import { buildParentReport, glanceShareText } from './parent-report';
import { guideForUnit, GRADE_PACING } from './teaching-guide-data';
import type { FunState } from './lib/fun';

const now = new Date('2026-10-20T18:00:00');
const day = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).getTime();
const fun: FunState = {
  xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 3, lastActiveDay: '2026-10-20', sound: true, savedDays: ['2026-10-18'],
  activity: { '2026-10-20': { minutes: 12, answered: 6 }, '2026-10-19': { minutes: 10, answered: 4 }, '2026-10-16': { minutes: 16, answered: 9 } },
};
const mission = (id: string) => MISSIONS.find((item) => item.id === id)!;

describe('parent report at a glance', () => {
  const progress: Progress = {
    ...EMPTY_PROGRESS,
    learning: {
      'unit-size': { ...emptyLearningRecord(), completedAt: day(10) },
      'compare-same-numerator': { ...emptyLearningRecord(), completedAt: day(2), misconceptions: { 'Same count, smaller parts': 2 } },
      'add-like-denominators': { ...emptyLearningRecord(), completedAt: day(1) },
      'benchmark-half': { ...emptyLearningRecord(), misconceptions: { 'Half of 8 is 4': 3 }, redoMisconceptions: { 'Half of 8 is 4': 1 } },
    } as Progress['learning'],
  };
  const report = buildParentReport(progress, fun, [], now);
  const { glance } = report;

  it('counts practice days, spare oil days and minutes from the last 7 days only', () => {
    assert.equal(glance.daysPracticed, 3);
    assert.equal(glance.savedDays, 1);
    assert.equal(glance.minutes, 38);
  });

  it('lists lessons finished in the last 7 days, oldest first, with their grade, standards and idea', () => {
    assert.deepEqual(glance.learned.map((lesson) => lesson.id), ['compare-same-numerator', 'add-like-denominators']);
    const first = glance.learned[0];
    assert.equal(first.grade, 3);
    assert.deepEqual(first.standards, mission('compare-same-numerator').standards);
    assert.equal(first.idea, mission('compare-same-numerator').skill);
  });

  it('shows mastered skills out of every skill in each grade', () => {
    assert.deepEqual(glance.grades.map(({ grade, total }) => [grade, total]), [[3, 9], [4, 14], [5, 12]]);
    assert.ok(glance.grades.every((row) => row.mastered === 0 && !row.started), 'no Check-ins yet: nothing mastered');
  });

  it('picks the lesson with the most wrong tries, redos included, with its unit\'s activity for home', () => {
    assert.equal(glance.focus?.id, 'benchmark-half');
    assert.equal(glance.focus?.misses, 4);
    assert.equal(glance.focus?.homeActivity, guideForUnit(mission('benchmark-half').unit)?.familyNote);
    assert.equal(buildParentReport(EMPTY_PROGRESS, fun, [], now).glance.focus, null, 'no wrong tries: no focus card');
  });

  it('writes a short summary to share, with no account details', () => {
    const text = glanceShareText(glance, 82, 'Sam', now);
    assert.equal(text.split('\n')[1], 'Practiced 3 of 7 days (38 min). Finished 2 lessons.');
    assert.match(text, /^Fraction Quest · Sam · week of /);
    assert.match(text, /Learned: Same count, different sizes \(Grade 3, 3\.NF\.3d\); Add same-size parts \(Grade 4, 4\.NF\.3a, 4\.NF\.3d\)\./);
    assert.match(text, /Right the first time: 82%\./);
    assert.match(text, /Working on: Is it less or more than half\? \(Grade 3, 3\.NF\.3d\)\./);
    assert.doesNotMatch(glanceShareText({ ...glance, learned: [], focus: null }, null, null, now), /Learned|Working on|Right the first/);
  });
});

describe('the family guide matches each unit after the reorder', () => {
  it('unit 2 is about part size, not equal groups', () => {
    const guide = guideForUnit(2)!;
    for (const text of [guide.objective, guide.familyNote, guide.warmup.prompt]) assert.doesNotMatch(text, /group|collection|counter/i, text);
    assert.match(guide.familyNote, /smaller/);
    for (const plan of GRADE_PACING) assert.doesNotMatch(plan.rows.find((row) => row.unit === 2)!.focus, /group|collection/i);
  });
});
