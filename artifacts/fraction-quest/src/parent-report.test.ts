import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  addGrownUpPick, clearGrownUpPick, EMPTY_PROGRESS, loadProgress, MAX_GROWN_UP_PICKS, MISSIONS, saveProgress,
  type AssessmentAttempt, type Progress,
} from './game';
import { emptyLearningRecord, type LearningRecord } from './learning';
import { getBuildChecks, getWorksheet } from './learning-content';
import { buildParentReport, glanceShareText } from './parent-report';
import { FRACTION_STANDARDS } from './standard-catalog';
import { guideForUnit } from './teaching-guide-data';
import type { FunState } from './lib/fun';

const now = new Date('2026-10-20T18:00:00');
const DAY = 24 * 60 * 60 * 1000;
const day = (n: number) => now.getTime() - n * DAY;
const fun: FunState = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: '2026-10-20', sound: true };
const lessonsFor = (standard: string) => MISSIONS.filter((mission) => (mission.standards ?? []).includes(standard) && !mission.enrichment);
const report = (progress: Progress) => buildParentReport(progress, fun, [], now);
const skill = (progress: Progress, standard: string) => report(progress).skills.find((row) => row.standard === standard)!;

/** A finished lesson whose first `right` worksheet answers were right the first time and the rest wrong first. */
function finished(missionId: string, at: number, right = Infinity): LearningRecord {
  const worksheet: LearningRecord['worksheet'] = {};
  getWorksheet(missionId).forEach((problem, index) => {
    worksheet[problem.id] = index < right
      ? { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false }
      : { draft: problem.answer, checkedValue: problem.answer, attempts: 2, supported: false };
  });
  const checks = Object.fromEntries(getBuildChecks(missionId).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }]));
  return { ...emptyLearningRecord(), practiceDone: true, completedAt: at, worksheet, checks };
}
const withLessons = (records: Record<string, LearningRecord>): Progress => ({ ...EMPTY_PROGRESS, learning: records, completedMissionIds: Object.keys(records) });

/** A Check-in where every item is about `standard` and `correct` of 10 are right. */
const checkin = (assessmentId: string, standard: string, completedAt: number, correct = 10): AssessmentAttempt => ({
  assessmentId, seed: 1, startedAt: completedAt - 60_000, completedAt,
  responses: Array.from({ length: 10 }, (_, i) => ({ itemId: `${assessmentId}-${i}`, standards: [standard], modelBuilt: true, correct: i < correct })),
});

describe('skills by standard', () => {
  it('has a plain "can do" sentence for every standard, with no slash outside a fraction', () => {
    for (const standard of FRACTION_STANDARDS) {
      assert.ok(standard.canDo.length > 10 && standard.canDo.length <= 100, standard.id);
      assert.doesNotMatch(standard.canDo.replace(/\d+\/\d+/g, ''), /\//, standard.id);
      assert.doesNotMatch(standard.canDo, /\.$/, `${standard.id}: no full stop, it is a list item`);
    }
  });

  it('starts every skill at step 0 with its first lesson next', () => {
    const row = skill(EMPTY_PROGRESS, '3.NF.1');
    assert.equal(row.step, 0);
    assert.equal(row.nextLesson?.id, lessonsFor('3.NF.1')[0].id);
    assert.equal(row.nextLesson?.started, false);
    assert.equal(report(EMPTY_PROGRESS).skills.length, 35);
  });

  it('is learning (step 1) once one of its lessons is done, and names the next lesson', () => {
    const [first, second] = lessonsFor('3.NF.1');
    const row = skill(withLessons({ [first.id]: finished(first.id, day(2)) }), '3.NF.1');
    assert.equal(row.step, 1);
    assert.equal(row.nextLesson?.id, second.id);
    assert.equal(row.lessons.find((lesson) => lesson.id === first.id)?.status, 'done');
  });

  it('is practiced (step 2) when every lesson is done with at least 70% right the first time, and points to its unit Check-in', () => {
    const lessons = lessonsFor('3.NF.1');
    const row = skill(withLessons(Object.fromEntries(lessons.map((mission) => [mission.id, finished(mission.id, day(3))]))), '3.NF.1');
    assert.equal(row.step, 2);
    assert.equal(row.nextLesson, null);
    assert.match(row.checkinId, /^unit-\d+-end$/);
    assert.equal(row.checkinId, `unit-${Math.max(...lessons.map((mission) => mission.unit))}-end`);
  });

  it('stays learning when the lessons are done but most first tries were wrong', () => {
    const lessons = lessonsFor('3.NF.1');
    const row = skill(withLessons(Object.fromEntries(lessons.map((mission) => [mission.id, finished(mission.id, day(3), 2)]))), '3.NF.1');
    assert.equal(row.step, 1);
  });

  it('is mastered (step 3) only from Check-ins, on two different days, even with no lessons done', () => {
    const oneDay = { ...EMPTY_PROGRESS, assessments: [checkin('unit-1-end', '3.NF.1', day(1))] };
    assert.equal(skill(oneDay, '3.NF.1').step, 0, 'one Check-in is not enough');
    const twoDays = { ...EMPTY_PROGRESS, assessments: [checkin('unit-1-mid', '3.NF.1', day(3)), checkin('unit-1-end', '3.NF.1', day(1))] };
    assert.equal(skill(twoDays, '3.NF.1').step, 3);
  });

  it('shows the grade of the lesson the child is on', () => {
    assert.equal(report(EMPTY_PROGRESS).grade, 3);
    const grade4 = MISSIONS.find((mission) => mission.gradeBand === 4)!;
    const before = MISSIONS.slice(0, MISSIONS.indexOf(grade4));
    const progress = withLessons(Object.fromEntries(before.map((mission) => [mission.id, finished(mission.id, day(5))])));
    assert.equal(report(progress).grade, 4);
  });

  it('lists mastered and practiced standards in the summary for a teacher', () => {
    const lessons = lessonsFor('3.NF.1');
    const progress = {
      ...withLessons(Object.fromEntries(lessons.map((mission) => [mission.id, finished(mission.id, day(3))]))),
      assessments: [checkin('unit-4-mid', '3.NF.2a', day(4)), checkin('unit-4-end', '3.NF.2a', day(1))],
    };
    const built = report(progress);
    const text = glanceShareText(built.glance, built.firstTryRate, 'Sam', now, built.skills);
    assert.match(text, /\nMastered: 3\.NF\.2a\.\n/);
    assert.match(text, /\nPracticed, ready to check: 3\.NF\.1(, [^\n]+)?\.\n/);
  });
});

describe('what to practice', () => {
  const [a, b, c, d] = MISSIONS;
  const progress: Progress = {
    ...EMPTY_PROGRESS,
    learning: {
      [a.id]: { ...emptyLearningRecord(), misconceptions: { 'Count the parts': 1, 'Same size parts': 4 } },
      [b.id]: { ...emptyLearningRecord(), misconceptions: { 'Count the parts': 3 }, redoMisconceptions: { 'Count the parts': 2 } },
      [c.id]: { ...emptyLearningRecord(), misconceptions: { 'Look at the top': 2 } },
      [d.id]: { ...emptyLearningRecord(), misconceptions: { 'Rarely': 1 } },
    },
  };
  const tips = report(progress).toPractice;

  it('keeps the top three ideas, most wrong tries first', () => {
    assert.deepEqual(tips.map((tip) => [tip.idea, tip.count]), [['Count the parts', 6], ['Same size parts', 4], ['Look at the top', 2]]);
    assert.equal(tips[0].inRedos, 2);
  });

  it('practices from the lesson where the idea came up most, with its standards', () => {
    assert.equal(tips[0].missionId, b.id);
    assert.equal(tips[0].lessonNumber, 2);
    assert.deepEqual(tips[0].standards, b.standards ?? []);
    assert.deepEqual(tips[0].lessons, [a.title, b.title]);
    assert.deepEqual(tips[0].lessonNumbers, [1, 2]);
  });

  it('shows each unit\'s idea for home once', () => {
    const notes = tips.map((tip) => tip.homeActivity).filter(Boolean);
    assert.equal(new Set(notes).size, notes.length);
    assert.equal(tips[0].homeActivity, guideForUnit(b.unit)?.familyNote);
  });
});

describe('the last 4 weeks', () => {
  const ids = MISSIONS.slice(0, 6).map((mission) => mission.id);
  const progress = withLessons({
    [ids[0]]: finished(ids[0], day(26), 6), [ids[1]]: finished(ids[1], day(25), 6),
    [ids[2]]: finished(ids[2], day(15)),
    [ids[3]]: finished(ids[3], day(3)), [ids[4]]: finished(ids[4], day(1)),
    [ids[5]]: finished(ids[5], day(40)),
  });
  const month = report(progress).month;

  it('counts lessons finished in each of the last 4 weeks, this week last', () => {
    assert.deepEqual(month.weeks.map((week) => week.lessons), [2, 1, 0, 2]);
    assert.equal(month.weeks[3].label, 'This week');
    assert.equal(month.lessonsFinished, 5, 'the lesson from 40 days ago is older than 4 weeks');
  });

  it('compares first-try accuracy in the earliest and latest weeks with lessons', () => {
    const firstRate = Math.round((12 / (getWorksheet(ids[0]).length + getWorksheet(ids[1]).length)) * 100);
    assert.deepEqual(month.firstTry, { first: firstRate, latest: 100 });
    assert.equal(report(withLessons({ [ids[0]]: finished(ids[0], day(1)) })).month.firstTry, null, 'one week: nothing to compare');
  });

  it('counts skills that became mastered in the 4 weeks', () => {
    const mastered = { ...EMPTY_PROGRESS, assessments: [
      checkin('unit-1-mid', '3.NF.1', day(40)), checkin('unit-1-end', '3.NF.1', day(35)),
      checkin('unit-4-mid', '3.NF.2a', day(10)), checkin('unit-4-end', '3.NF.2a', day(2)),
    ] };
    assert.equal(report(mastered).month.skillsGained, 1);
  });
});

describe('grown-up picks', () => {
  const memory = new Map<string, string>();
  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) } },
    });
  });

  it('adds a pick once, moves a repeat to the end, and keeps the newest three', () => {
    let progress = addGrownUpPick(EMPTY_PROGRESS, 'practice', MISSIONS[0].id, 1);
    progress = addGrownUpPick(progress, 'checkin', 'unit-1-end', 2);
    progress = addGrownUpPick(progress, 'practice', MISSIONS[0].id, 3);
    assert.deepEqual(progress.grownUpPicks?.map((pick) => [pick.id, pick.at]), [['unit-1-end', 2], [MISSIONS[0].id, 3]]);
    for (const [i, mission] of MISSIONS.slice(1, 5).entries()) progress = addGrownUpPick(progress, 'practice', mission.id, 10 + i);
    assert.equal(progress.grownUpPicks?.length, MAX_GROWN_UP_PICKS);
  });

  it('clears a pick, and drops the list when it is empty', () => {
    const progress = addGrownUpPick(EMPTY_PROGRESS, 'checkin', 'unit-2-end', 1);
    assert.equal(clearGrownUpPick(progress, 'practice', 'unit-2-end'), progress, 'a different kind is left alone');
    assert.equal('grownUpPicks' in clearGrownUpPick(progress, 'checkin', 'unit-2-end'), false);
  });

  it('survives a reload, dropping unknown lessons and Check-ins', () => {
    saveProgress({ ...EMPTY_PROGRESS, grownUpPicks: [
      { kind: 'practice', id: MISSIONS[2].id, at: 5 }, { kind: 'practice', id: 'no-such-lesson', at: 6 },
      { kind: 'checkin', id: 'unit-99-end', at: 7 }, { kind: 'checkin', id: 'grade-4-end', at: 8 },
    ] });
    assert.deepEqual(loadProgress().grownUpPicks, [{ kind: 'checkin', id: 'grade-4-end', at: 8 }],
      'only the newest three are read, and the bad ones among them are dropped');
  });
});
