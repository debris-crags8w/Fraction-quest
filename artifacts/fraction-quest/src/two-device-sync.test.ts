/* Rescore 4 (value): things two devices, or a reset, used to lose or undo when copies were merged. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_PROGRESS, MISSIONS, type Progress } from './game';
import { emptyLearningRecord, resetUnitLearningProgress, type LearningRecord } from './learning';
import { cleanFun, deviceId, recordCorrect, recordMinute, replaceFun, resetFun, setBreakPreferences, setDisplayPreferences, setTimeLimit, timeToday, today, type FunState } from './lib/fun';
import { mergeBundle, mergeFun, mergeProgress } from './progress-merge';

const day = today();
const progress = (extra: Partial<Progress>): Progress => ({ ...EMPTY_PROGRESS, completedMissionIds: [], starsByMission: {}, reviewQueue: [], ...extra });
const fun = (extra: Partial<FunState>): FunState => ({ xp: 0, day, answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true, ...extra });
const done = (at: number): LearningRecord => ({ ...emptyLearningRecord(), practiceDone: true, completedAt: at });
const unit1 = MISSIONS.filter((mission) => mission.unit === 1).map((mission) => mission.id);
const unit2 = MISSIONS.filter((mission) => mission.unit === 2).map((mission) => mission.id);

test('a grown-up\'s newer time limit, breaks and display settings are kept when the other device saved since', () => {
  const tablet = cleanFun(fun({ xp: 130 }));
  const phone = setDisplayPreferences(setBreakPreferences(setTimeLimit(cleanFun(fun({ xp: 150 })), 20), { intervalMinutes: 10, quietMode: true }),
    { textSize: 'large', highContrast: true, reducedMotion: false });
  const merged = mergeFun(tablet, phone);
  assert.equal(merged.timeLimit?.minutes, 20, 'the limit set on the phone stays');
  assert.deepEqual(merged.breakPreferences, { intervalMinutes: 10, quietMode: true });
  assert.equal(merged.displayPreferences?.textSize, 'large');
  // And the other way round: a newer setting on the saved copy wins over an older one here.
  const later = { ...setTimeLimit(tablet, 45), settingsAt: { timeLimit: (phone.settingsAt?.timeLimit ?? 0) + 1 } };
  assert.equal(mergeFun(later, phone).timeLimit?.minutes, 45);
});

test('the settings stamps survive saving and loading', () => {
  const set = setTimeLimit(cleanFun(fun({})), 30);
  assert.ok(typeof set.settingsAt?.timeLimit === 'number');
  assert.deepEqual(replaceFun(JSON.parse(JSON.stringify(set))).settingsAt, set.settingsAt);
});

test('same-day use on two devices adds up, for the report and for the time limit', () => {
  const tablet = fun({ xp: 130, xpByDevice: { tablet: 30 }, activity: { [day]: { minutes: 15, answered: 12, devices: { tablet: { minutes: 15, answered: 12 } } } }, timeLimit: { minutes: 20 } });
  const phone = fun({ xp: 150, xpByDevice: { phone: 50 }, activity: { [day]: { minutes: 10, answered: 8, devices: { phone: { minutes: 10, answered: 8 } } } } });
  const merged = mergeFun(tablet, phone);
  assert.equal(merged.activity?.[day]?.minutes, 25);
  assert.equal(merged.activity?.[day]?.answered, 20);
  assert.equal(merged.xp, 180, '100 before, 30 on the tablet and 50 on the phone');
  assert.equal(timeToday(merged)?.up, true, '25 minutes is past a 20-minute limit');
  // Merging again (the same copies) does not count anything twice.
  assert.deepEqual(mergeFun(merged, phone).activity, merged.activity);
  assert.equal(mergeFun(merged, phone).xp, 180);
});

test('each answer and minute is counted for this device, and old saved activity still loads', () => {
  const me = deviceId();
  const old = cleanFun(fun({ xp: 40, activity: { [day]: { minutes: 3, answered: 2 } } }));
  assert.deepEqual(old.activity?.[day], { minutes: 3, answered: 2 }, 'saved before devices were counted');
  const next = recordMinute(recordCorrect(old));
  assert.equal(next.xp, 50);
  assert.deepEqual(next.xpByDevice, { [me]: 10 });
  assert.equal(next.activity?.[day]?.minutes, 4);
  assert.equal(next.activity?.[day]?.answered, 3);
  assert.deepEqual(next.activity?.[day]?.devices, { [me]: { minutes: 1, answered: 1 } });
  // Another device with the old copy plus 2 answers of its own: the old 3 minutes are counted once.
  const other = fun({ xp: 60, xpByDevice: { other: 20 }, activity: { [day]: { minutes: 3, answered: 4, devices: { other: { minutes: 0, answered: 2 } } } } });
  const merged = mergeFun(cleanFun(other), next);
  assert.deepEqual({ minutes: merged.activity?.[day]?.minutes, answered: merged.activity?.[day]?.answered }, { minutes: 4, answered: 5 });
  assert.equal(merged.xp, 70);
  assert.equal(merged.answeredToday >= 5, true, 'today\'s goal counts both devices');
  assert.deepEqual(cleanFun(JSON.parse(JSON.stringify(next))).activity, next.activity, 'kept through saving');
});

test('resetting all progress keeps the grown-up\'s time limit, breaks and display settings', () => {
  const before = setDisplayPreferences(setBreakPreferences(setTimeLimit(cleanFun(fun({ xp: 500, dayStreak: 9 })), 20), { intervalMinutes: 10, quietMode: true }),
    { textSize: 'large', highContrast: true, reducedMotion: true });
  const after = resetFun(before);
  assert.equal(after.xp, 0);
  assert.equal(after.dayStreak, 0);
  assert.equal(after.timeLimit?.minutes, 20);
  assert.deepEqual(after.breakPreferences, { intervalMinutes: 10, quietMode: true });
  assert.equal(after.displayPreferences?.highContrast, true);
});

test('a unit reset is not undone by merging an older copy from another device', () => {
  const resetAt = 5_000;
  const tablet = progress({
    completedMissionIds: [unit1[0], unit1[1], unit2[0]], starsByMission: { [unit1[0]]: 3, [unit1[1]]: 2, [unit2[0]]: 1 },
    learning: { [unit1[0]]: done(1_000), [unit1[1]]: done(2_000), [unit2[0]]: done(3_000) }, challengeBest: { '1': 18, '2': 9 },
  });
  const phone = resetUnitLearningProgress(tablet, new Set(unit1), 1, resetAt);
  assert.equal(phone.unitResets?.['1'], resetAt);
  for (const [saved, here] of [[tablet, phone], [phone, tablet]]) {
    const merged = mergeProgress(saved, here);
    assert.deepEqual(merged.completedMissionIds, [unit2[0]], 'unit 1 stays cleared, unit 2 stays');
    assert.equal(merged.learning?.[unit1[0]], undefined);
    assert.deepEqual(merged.challengeBest, { '2': 9 });
    assert.equal(merged.unitResets?.['1'], resetAt);
  }
  // A lesson finished on the tablet after the reset is kept.
  const laterWork = { ...tablet, learning: { ...tablet.learning, [unit1[2]]: done(9_000) }, completedMissionIds: [...tablet.completedMissionIds, unit1[2]] };
  assert.deepEqual([...mergeProgress(laterWork, phone).completedMissionIds].sort(), [unit2[0], unit1[2]].sort());
});

test('a unit reset also keeps that unit\'s game results cleared after a merge', () => {
  const tabletFun = fun({ raceBest: { [unit1[0]]: 12, [unit2[0]]: 15 }, codeLevels: { [unit1[0]]: 4 } });
  const tablet = { progress: progress({ completedMissionIds: [unit1[0]], learning: { [unit1[0]]: done(1) } }), fun: tabletFun };
  const phone = { progress: resetUnitLearningProgress(tablet.progress, new Set(unit1), 1, 10), fun: fun({ raceBest: { [unit2[0]]: 15 }, codeLevels: {} }) };
  const merged = mergeBundle(tablet, phone);
  assert.deepEqual(merged.fun.raceBest, { [unit2[0]]: 15 });
  assert.deepEqual(merged.fun.codeLevels, {});
});

test('an unfinished lesson keeps the worksheet rows done on either device', () => {
  const id = unit1[0];
  const row = (value: string) => ({ draft: value, checkedValue: value, attempts: 1, supported: false });
  const tablet = progress({ learning: { [id]: { ...emptyLearningRecord(), practiceDone: true, worksheet: { '0': row('a'), '1': row('b') } } } });
  const phone = progress({ learning: { [id]: { ...emptyLearningRecord(), practiceDone: true, worksheet: { '2': row('c') } } } });
  const merged = mergeProgress(tablet, phone);
  assert.deepEqual(Object.keys(merged.learning?.[id]?.worksheet ?? {}).sort(), ['0', '1', '2']);
});
