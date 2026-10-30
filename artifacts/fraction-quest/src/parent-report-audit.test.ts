import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EMPTY_PROGRESS, MISSIONS, type AssessmentAttempt, type Progress } from './game';
import { emptyLearningRecord, type LearningRecord } from './learning';
import { getBuildChecks, getWorksheet } from './learning-content';
import { buildParentReport, glanceShareText } from './parent-report';
import { ideaForMission } from './parent-ideas';
import { getAssessmentDefinitions } from './assessments';
import { shownStreak, today, type FunState } from './lib/fun';

/* Fabricated-state checks for the grown-ups' report: every number is compared with independent arithmetic
   (ported from the rescore audit's v2.ts / v3.ts). */

const DAY = 24 * 60 * 60 * 1000;

function finished(id: string, at: number, right: number, supportedChecks: boolean[]): LearningRecord {
  const worksheet: LearningRecord['worksheet'] = {};
  getWorksheet(id).forEach((problem, index) => {
    worksheet[problem.id] = index < right
      ? { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false }
      : { draft: problem.answer, checkedValue: problem.answer, attempts: 2 + (index % 2), supported: true };
  });
  const checks = Object.fromEntries(getBuildChecks(id).map((check, index) => [check.id, { passed: true, supported: supportedChecks[index % supportedChecks.length], attempts: 1 }]));
  return { ...emptyLearningRecord(), practiceDone: true, completedAt: at, worksheet, checks };
}

describe('report numbers on 120 fabricated states', () => {
  // A small deterministic random generator, so a failure can be replayed.
  let seed = 12345;
  const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const titles = Array.from({ length: 15 }, (_, i) => `U${i + 1}`);

  it('matches independent arithmetic for lessons, accuracy, the week, units, month and skill steps', () => {
    for (let trial = 0; trial < 120; trial++) {
      const now = new Date(2026, 9, 1 + Math.floor(random() * 28), Math.floor(random() * 24), Math.floor(random() * 60));
      const learning: Record<string, LearningRecord> = {};
      let tried = 0; let first = 0; let builds = 0; let own = 0; let weekTried = 0; let weekFirst = 0; let recent = 0; let done = 0;
      const misses = new Map<string, { count: number; numbers: number[] }>();
      for (let i = 0; i < Math.floor(random() * 25); i++) {
        const index = Math.floor(random() * MISSIONS.length); const mission = MISSIONS[index];
        if (learning[mission.id]) continue;
        const ago = random() < 0.3 ? Math.floor(random() * 8 * DAY) : Math.floor(random() * 40 * DAY);
        const right = Math.floor(random() * 13); const supported = [random() < 0.5, random() < 0.5, random() < 0.5];
        const wrongTries = Math.floor(random() * 4); const redoTries = Math.floor(random() * 3);
        learning[mission.id] = { ...finished(mission.id, now.getTime() - ago, right, supported),
          misconceptions: wrongTries ? { [`hint ${index}`]: wrongTries } : {}, redoMisconceptions: redoTries ? { [`hint ${index}`]: redoTries } : undefined };
        done++; tried += 12; first += right;
        getBuildChecks(mission.id).forEach((_, k) => { builds++; if (!supported[k % 3]) own++; });
        // The week is the 7 calendar days of the day tiles: from midnight six days ago.
        if (now.getTime() - ago >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime()) { recent++; weekTried += 12; weekFirst += right; }
        if (wrongTries + redoTries) {
          const key = ideaForMission(mission).key;
          const entry = misses.get(key) ?? { count: 0, numbers: [] };
          entry.count += wrongTries + redoTries; entry.numbers.push(index + 1); misses.set(key, entry);
        }
      }
      const progress: Progress = { ...EMPTY_PROGRESS, learning, completedMissionIds: Object.keys(learning) };
      const activity: NonNullable<FunState['activity']> = {}; const savedDays: string[] = [];
      let minutes = 0; let answered = 0; let days = 0;
      for (let k = 0; k < 14; k++) {
        const date = new Date(now); date.setDate(now.getDate() - k);
        const mins = random() < 0.6 ? Math.floor(random() * 40) : 0;
        const ans = mins && random() < 0.8 ? Math.floor(random() * 30) : 0;
        if (mins || ans) activity[today(date)] = { minutes: mins, answered: ans };
        if (!mins && !ans && random() < 0.3 && k < 7) savedDays.push(today(date));
        if (k < 7) { minutes += mins; answered += ans; if (ans > 0) days++; }
      }
      const lastActive = Object.keys(activity).sort().pop() ?? today(now);
      const fun: FunState = { xp: 0, day: today(now), answeredToday: 0, dayStreak: 4, lastActiveDay: lastActive, sound: true, activity, savedDays };
      const report = buildParentReport(progress, fun, titles, now);
      const rate = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
      const label = `trial ${trial}`;
      assert.equal(report.lessonsDone, done, label);
      assert.equal(report.firstTryRate, rate(first, tried), `${label} all-time first try`);
      assert.equal(report.onOwnRate, rate(own, builds), label);
      assert.equal(report.glance.firstTryWeek, rate(weekFirst, weekTried), `${label} first try this week`);
      assert.equal(report.minutesWeek, minutes, label); assert.equal(report.answeredWeek, answered, label);
      assert.equal(report.glance.daysPracticed, days, label);
      assert.equal(report.glance.learned.length, recent, label);
      assert.equal(report.week.length, 7); assert.equal(report.week[6].day, today(now));
      assert.equal(report.units.reduce((sum, unit) => sum + unit.done, 0), done, label);
      assert.equal(report.units.reduce((sum, unit) => sum + unit.total, 0), MISSIONS.length, label);
      assert.equal(report.month.lessonsFinished, Object.values(learning).filter((record) => record.completedAt! > now.getTime() - 28 * DAY).length, label);
      assert.equal(report.month.weeks.reduce((sum, week) => sum + week.lessons, 0), report.month.lessonsFinished, label);
      assert.equal(report.streak, shownStreak(fun, now), label);
      for (const unit of report.units) for (const row of unit.lessons) {
        if (learning[row.id]) { assert.equal(row.status, 'done', label); assert.equal(row.worksheet, 12, label); } else assert.notEqual(row.status, 'done', label);
      }
      // What to practice: the three biggest idea groups, with the counts and lesson numbers summed independently.
      const expected = [...misses.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3);
      assert.deepEqual(report.toPractice.map((tip) => tip.count), expected.map(([, entry]) => entry.count), `${label} tip counts`);
      for (const tip of report.toPractice) {
        const entry = misses.get(tip.key)!;
        assert.equal(tip.count, entry.count, label);
        assert.deepEqual([...tip.lessonNumbers].sort((a, b) => a - b), [...entry.numbers].sort((a, b) => a - b), `${label} lessons for ${tip.key}`);
        assert.ok(tip.home.length > 20, 'every group has a try-this-at-home sentence');
      }
      // Skill steps: nothing is mastered without Check-ins; lessons decide steps 0 to 2.
      for (const skill of report.skills) {
        const lessons = MISSIONS.filter((mission) => (mission.standards ?? []).includes(skill.standard) && !mission.enrichment);
        const finishedHere = lessons.filter((mission) => learning[mission.id]).length;
        assert.notEqual(skill.step, 3, 'mastered without Check-ins');
        if (finishedHere === 0) assert.equal(skill.step, 0, `${label} ${skill.standard}`);
        if (finishedHere > 0 && finishedHere < lessons.length) assert.equal(skill.step, 1, `${label} ${skill.standard}`);
        if (finishedHere === lessons.length && lessons.length) {
          const total = lessons.length * 12;
          const right = lessons.reduce((sum, mission) => sum + Object.values(learning[mission.id].worksheet).filter((entry) => entry.attempts === 1).length, 0);
          assert.equal(skill.step, Math.round((right / total) * 100) >= 70 ? 2 : 1, `${label} ${skill.standard}`);
        }
      }
    }
  });
});

describe('mastery edges and skills', () => {
  const now = new Date('2026-10-20T18:00:00');
  const fun: FunState = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: '2026-10-20', sound: true };
  const checkin = (id: string, at: number, correct: number, n = 10): AssessmentAttempt => ({
    assessmentId: id, seed: 1, startedAt: at - 1000, completedAt: at,
    responses: Array.from({ length: n }, (_, i) => ({ itemId: id + i, standards: ['3.NF.1'], modelBuilt: true, correct: i < correct })),
  });
  const step = (assessments: AssessmentAttempt[]) => buildParentReport({ ...EMPTY_PROGRESS, assessments }, fun, [], now).skills.find((skill) => skill.standard === '3.NF.1')!.step;
  const at = (days: number) => now.getTime() - days * DAY;

  it('is mastered at exactly 24 hours apart and 8 of 10, and not before', () => {
    assert.equal(step([checkin('unit-1-mid', at(2), 8), checkin('unit-1-end', at(1), 8)]), 3);
    assert.equal(step([checkin('unit-1-mid', at(2) + 60_000, 8), checkin('unit-1-end', at(1), 8)]), 0, '23 h 59 min apart');
    assert.equal(step([checkin('unit-1-mid', at(5), 78, 100), checkin('unit-1-end', at(1), 80, 100)]), 0, '79%');
    assert.equal(step([checkin('unit-1-mid', at(5), 9), checkin('unit-1-mid', at(1), 9)]), 0, 'the same form twice');
    assert.equal(step([checkin('unit-1-mid', at(5), 9), checkin('unit-1-end', at(3), 9), checkin('unit-1-end', at(1), 2)]), 0, 'a worse retake replaces the earlier one');
    assert.equal(step([checkin('unit-1-pre', at(5), 10), checkin('unit-1-mid', at(1), 10)]), 0, 'pre-checks do not count');
  });

  it('has 35 standards, each with lessons and a Check-in that exists', () => {
    const skills = buildParentReport(EMPTY_PROGRESS, fun, [], now).skills;
    const ids = new Set(getAssessmentDefinitions().map((definition) => definition.id));
    assert.equal(skills.length, 35);
    assert.deepEqual(skills.filter((skill) => skill.lessons.length === 0).map((skill) => skill.standard), []);
    assert.deepEqual(skills.filter((skill) => !ids.has(skill.checkinId)).map((skill) => skill.standard), []);
  });
});

describe('the share summary says what its first-try number covers', () => {
  const now = new Date('2026-10-20T18:00:00');
  const fun: FunState = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: '2026-10-20', sound: true };
  const [a, b] = MISSIONS;
  const build = (week: number, old: number) => buildParentReport({
    ...EMPTY_PROGRESS, completedMissionIds: [a.id, b.id],
    learning: { [a.id]: finished(a.id, now.getTime() - 2 * DAY, week, [false]), [b.id]: finished(b.id, now.getTime() - 30 * DAY, old, [false]) },
  }, fun, [], now);

  it('uses only lessons finished this week, not the all-time rate', () => {
    const report = build(3, 12); // this week 3 of 12 = 25%; all time 15 of 24 = 63%
    assert.equal(report.glance.firstTryWeek, 25);
    assert.equal(report.firstTryRate, 63);
    const text = glanceShareText(report.glance, 'Sam', now);
    assert.match(text, /Right the first time, without the Hint, in lessons finished this week: 25%\./);
    assert.doesNotMatch(text, /63%/);
  });

  it('has no first-try line when no lesson was finished this week', () => {
    const report = buildParentReport({ ...EMPTY_PROGRESS, completedMissionIds: [b.id], learning: { [b.id]: finished(b.id, now.getTime() - 30 * DAY, 12, [false]) } }, fun, [], now);
    assert.equal(report.firstTryRate, 100);
    assert.equal(report.glance.firstTryWeek, null);
    assert.doesNotMatch(glanceShareText(report.glance, 'Sam', now), /first time/);
  });
});
