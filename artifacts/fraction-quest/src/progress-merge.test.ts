import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EMPTY_PROGRESS, MISSIONS, type Progress } from './game';
import { emptyLearningRecord, type LearningRecord } from './learning';
import type { FunState } from './lib/fun';
import { mergeFun, mergeProgress } from './progress-merge';

const [a, b, c] = MISSIONS.map((mission) => mission.id);
const done = (at: number, extra: Partial<LearningRecord> = {}): LearningRecord => ({ ...emptyLearningRecord(), practiceDone: true, completedAt: at, ...extra });
const progress = (extra: Partial<Progress>): Progress => ({ ...EMPTY_PROGRESS, completedMissionIds: [], starsByMission: {}, reviewQueue: [], ...extra });
const fun = (extra: Partial<FunState>): FunState => ({ xp: 0, day: '2026-10-30', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true, ...extra });

describe('two devices: merging the saved copy with this device\'s copy', () => {
  it('keeps every lesson finished on either device, with its record', () => {
    const tablet = progress({ completedMissionIds: [a, b], starsByMission: { [a]: 2, [b]: 3 }, learning: { [a]: done(100), [b]: done(200) } });
    const phone = progress({ completedMissionIds: [a, c], starsByMission: { [a]: 3, [c]: 1 }, learning: { [a]: done(100), [c]: done(300) } });
    const merged = mergeProgress(tablet, phone);
    assert.deepEqual([...merged.completedMissionIds].sort(), [a, b, c].sort());
    assert.deepEqual(merged.starsByMission, { [a]: 3, [b]: 3, [c]: 1 }, 'best stars');
    assert.equal(merged.learning?.[b]?.completedAt, 200);
    assert.equal(merged.learning?.[c]?.completedAt, 300);
  });

  it('a finished lesson beats a half-done one, and of two half-done ones the one further along wins', () => {
    const saved = progress({ learning: { [a]: done(500), [b]: { ...emptyLearningRecord(), checks: { x: { passed: true, supported: false, attempts: 1 } } } } });
    const here = progress({ learning: {
      [a]: { ...emptyLearningRecord(), checks: { x: { passed: true, supported: false, attempts: 1 } } },
      [b]: { ...emptyLearningRecord(), checks: { x: { passed: true, supported: false, attempts: 1 }, y: { passed: true, supported: false, attempts: 2 } } },
    } });
    const merged = mergeProgress(saved, here);
    assert.equal(merged.learning?.[a]?.completedAt, 500);
    assert.deepEqual(Object.keys(merged.learning?.[b]?.checks ?? {}), ['x', 'y']);
  });

  it('keeps the latest of each dated thing: placement, revisits, skill states, best challenge scores, Check-ins', () => {
    const saved = progress({
      placement: { unit: 4, at: 900 }, lessonSeen: { [a]: { at: 50, n: 1 } }, challengeBest: { '1': 4 }, challengeAttempts: { '1': 2 },
      adaptiveStandards: { '3.NF.1': { status: 'mastered', recent: [true], accuracy: 1, streakCorrect: 3, streakMisses: 0, lastUpdatedAt: 900 } },
      assessments: [{ assessmentId: 'u1', seed: 1, startedAt: 10, completedAt: 20, responses: [] }],
    });
    const here = progress({
      placement: { unit: 2, at: 100 }, lessonSeen: { [a]: { at: 80, n: 2 } }, challengeBest: { '1': 2, '2': 5 }, challengeAttempts: { '1': 3 },
      adaptiveStandards: { '3.NF.1': { status: 'developing', recent: [false], accuracy: 0, streakCorrect: 0, streakMisses: 1, lastUpdatedAt: 100 } },
      assessments: [{ assessmentId: 'u2', seed: 2, startedAt: 30, completedAt: 40, responses: [] }],
    });
    const merged = mergeProgress(saved, here);
    assert.deepEqual(merged.placement, { unit: 4, at: 900 });
    assert.deepEqual(merged.lessonSeen?.[a], { at: 80, n: 2 });
    assert.deepEqual(merged.challengeBest, { '1': 4, '2': 5 });
    assert.deepEqual(merged.challengeAttempts, { '1': 3 });
    assert.equal(merged.adaptiveStandards?.['3.NF.1']?.status, 'mastered');
    assert.deepEqual(merged.assessments?.map((attempt) => attempt.assessmentId), ['u1', 'u2']);
  });

  it('merging a copy with itself changes nothing that matters', () => {
    const one = progress({ completedMissionIds: [a], starsByMission: { [a]: 2 }, learning: { [a]: done(100) } });
    assert.deepEqual(mergeProgress(one, one), one);
  });

  it('fun: keeps the most stars, the best game times, every day of activity, and the grown-up\'s settings from the saved copy', () => {
    const saved = fun({
      xp: 120, raceBest: { [a]: 30 }, codeLevels: { [a]: 2 }, activity: { '2026-10-29': { minutes: 10, answered: 8 } },
      lastActiveDay: '2026-10-29', dayStreak: 4, timeLimit: { minutes: 20 } as FunState['timeLimit'], story: { prologueSeen: true, choices: { '1': 0 } },
      introsSeen: { builder: true },
    });
    const here = fun({
      xp: 90, raceBest: { [a]: 25, [b]: 40 }, codeLevels: { [a]: 1 }, activity: { '2026-10-29': { minutes: 4, answered: 3 }, '2026-10-30': { minutes: 5, answered: 6 } },
      lastActiveDay: '2026-10-30', dayStreak: 5, story: { choices: { '2': 1 } }, introsSeen: { builder: 'watched', line: 'watched' }, sound: false,
    });
    const merged = mergeFun(saved, here);
    assert.equal(merged.xp, 120);
    assert.deepEqual(merged.raceBest, { [a]: 25, [b]: 40 }, 'the faster time');
    assert.deepEqual(merged.codeLevels, { [a]: 2 });
    assert.deepEqual(merged.activity, { '2026-10-29': { minutes: 10, answered: 8 }, '2026-10-30': { minutes: 5, answered: 6 } });
    assert.equal(merged.lastActiveDay, '2026-10-30');
    assert.equal(merged.dayStreak, 5);
    assert.deepEqual(merged.timeLimit, { minutes: 20 }, 'a time limit a grown-up set on the other device stays');
    assert.deepEqual(merged.story, { prologueSeen: true, choices: { '1': 0, '2': 1 } });
    assert.deepEqual(merged.introsSeen, { builder: true, line: 'watched' });
    assert.equal(merged.sound, false, 'this device\'s sound stays');
  });
});
