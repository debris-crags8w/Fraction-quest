/* One learner on two devices (say a phone and a tablet): the server refuses a save made from an older copy (409), and
   this device then merges the saved copy into its own before saving again (account.tsx). The merge keeps every lesson
   finished on either device, the best scores, and the latest of each dated thing, so nothing learned on one device is
   lost. A unit a grown-up reset stays reset (unitResets), each setting a grown-up chooses (time limit, breaks, display)
   comes from the copy where it was changed last (settingsAt), and minutes, answers and XP from each device add up.
   The result is cleaned by loadProgress / replaceFun as usual. */
import { MISSIONS, type Progress, type SkillReview } from './game';
import { resetUnitLearningProgress, type LearningRecord } from './learning';
import type { DayActivity, DayCount, FunState, SettingsAt } from './lib/fun';

type NumberMap = Record<string, number>;

/** Each key once, keeping the larger (or, with `pick`, the chosen) value. */
function mergeNumbers(saved: NumberMap | undefined, here: NumberMap | undefined, pick: (a: number, b: number) => number = Math.max): NumberMap | undefined {
  if (!saved && !here) return undefined;
  const merged: NumberMap = { ...saved };
  for (const [key, value] of Object.entries(here ?? {})) merged[key] = key in merged ? pick(merged[key], value) : value;
  return merged;
}

/** Each key once; when both copies have it, `better` chooses (ties go to this device's copy). */
function mergeBy<T>(saved: Record<string, T> | undefined, here: Record<string, T> | undefined, better: (saved: T, here: T) => T): Record<string, T> | undefined {
  if (!saved && !here) return undefined;
  const merged: Record<string, T> = { ...saved };
  for (const [key, value] of Object.entries(here ?? {})) merged[key] = key in merged ? better(merged[key], value) : value;
  return merged;
}

const later = <T>(at: (item: T) => number) => (saved: T, here: T): T => (at(saved) > at(here) ? saved : here);

/** How far a lesson got: finished first, then practice done, then how many checks and worksheet answers. */
function lessonProgress(record: LearningRecord): number[] {
  const checked = Object.values(record.checks ?? {}).filter((check) => check.passed).length
    + Object.values(record.worksheet ?? {}).filter((entry) => entry.checkedValue !== undefined).length;
  return [record.completedAt ? 1 : 0, record.practiceDone ? 1 : 0, checked];
}

/** How far a redo got: which round, when it started, then whether it is finished and how many answers were checked. */
function redoProgress(record: LearningRecord): number[] {
  const redo = record.redo;
  const checked = redo ? Object.values(redo.worksheet).filter((entry) => entry.checkedValue !== undefined).length
    + Object.values(redo.checks).filter((check) => check.passed).length : 0;
  return [record.redoRounds ?? 0, redo?.startedAt ?? 0, redo?.finishedAt ? 1 : 0, checked];
}

/** Both copies finished the lesson: the first finish is kept (its first-try answers are the ones the report counts), and
    the redos come from the copy further along with them, so a redo in progress on one device is not lost when an idle
    device with the same finished lesson saves. Miss and help counts only grow, so the larger of each is kept. */
function bothFinished(saved: LearningRecord, here: LearningRecord): LearningRecord {
  const first = saved.completedAt! < here.completedAt! ? saved : here;
  const other = first === saved ? here : saved;
  const a = redoProgress(first);
  const b = redoProgress(other);
  let redoFrom = first;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) { redoFrom = a[i] > b[i] ? first : other; break; }
  const merged: LearningRecord = { ...first };
  delete merged.redo;
  if (redoFrom.redo) merged.redo = redoFrom.redo;
  const rounds = Math.max(first.redoRounds ?? 0, other.redoRounds ?? 0);
  if (rounds) merged.redoRounds = rounds;
  const finished = Math.max(first.redosFinished ?? 0, other.redosFinished ?? 0);
  if (finished) merged.redosFinished = finished;
  const misses = mergeNumbers(first.redoMisconceptions, other.redoMisconceptions);
  if (misses) merged.redoMisconceptions = misses;
  if (saved.completedAt === here.completedAt) {
    // The same finish on both copies: what was counted since (help, misses) only grows.
    merged.helpUses = Math.max(first.helpUses, other.helpUses);
    merged.misconceptions = mergeNumbers(first.misconceptions, other.misconceptions) ?? {};
  }
  const confirmedAt = Math.max(saved.confirmedAt ?? 0, here.confirmedAt ?? 0);
  if (confirmedAt) merged.confirmedAt = confirmedAt;
  return merged;
}

function betterLesson(saved: LearningRecord, here: LearningRecord): LearningRecord {
  if (saved.completedAt && here.completedAt) return bothFinished(saved, here);
  if (saved.completedAt || here.completedAt) return saved.completedAt ? saved : here;
  const a = lessonProgress(saved);
  const b = lessonProgress(here);
  let winner = here;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) { winner = a[i] > b[i] ? saved : here; break; }
  // Neither finished: keep the worksheet rows answered on either device (a row answered on one only, or checked on one only).
  const other = winner === saved ? here : saved;
  const worksheet = { ...winner.worksheet };
  let added = false;
  for (const [row, entry] of Object.entries(other.worksheet ?? {})) {
    const mine = worksheet[row];
    if (!mine || (mine.checkedValue === undefined && (entry.checkedValue !== undefined || (!mine.draft && entry.draft)))) {
      worksheet[row] = entry;
      added = true;
    }
  }
  const changedAt = Math.max(saved.changedAt ?? 0, here.changedAt ?? 0);
  const result = added ? { ...winner, worksheet } : winner;
  return changedAt > (result.changedAt ?? 0) ? { ...result, changedAt } : result;
}

const UNIT_LESSONS = new Map<number, string[]>();
for (const mission of MISSIONS) UNIT_LESSONS.set(mission.unit, [...(UNIT_LESSONS.get(mission.unit) ?? []), mission.id]);

/** Work on a lesson from after a reset at `at`: finished after it, or not finished and last changed after it. */
function newerThan(record: LearningRecord | undefined, at: number): boolean {
  if (!record) return false;
  return record.completedAt ? record.completedAt > at : (record.changedAt ?? 0) > at;
}

/** The lessons of each unit reset on the other copy that this copy has not seen reset yet, and when. Lessons this copy
    worked on after the reset are not included: that is newer work. */
function unseenResets(copy: Progress, resets: Record<string, number>): { unit: number; at: number; lessons: Set<string> }[] {
  return Object.entries(resets)
    .filter(([unit, at]) => (copy.unitResets?.[unit] ?? 0) < at)
    .map(([unit, at]) => ({
      unit: Number(unit), at,
      lessons: new Set((UNIT_LESSONS.get(Number(unit)) ?? []).filter((id) => !newerThan(copy.learning?.[id], at))),
    }));
}

/** A copy with every unit reset it has not seen applied (as if it had been on this device when the grown-up reset it).
    The unit's challenge scored after the reset, and daily practice begun after it, are newer work and stay. */
function withResets(copy: Progress, resets: Record<string, number>): Progress {
  return unseenResets(copy, resets).reduce((next, reset) => {
    const cleared = resetUnitLearningProgress(next, reset.lessons, reset.unit);
    const unit = String(reset.unit);
    const kept: Partial<Progress> = {};
    if ((next.challengeAt?.[unit] ?? 0) > reset.at) {
      if (next.challengeBest?.[unit] !== undefined) kept.challengeBest = { ...cleared.challengeBest, [unit]: next.challengeBest[unit] };
      if (next.challengeAttempts?.[unit] !== undefined) kept.challengeAttempts = { ...cleared.challengeAttempts, [unit]: next.challengeAttempts[unit] };
      kept.challengeAt = { ...cleared.challengeAt, [unit]: next.challengeAt![unit] };
    }
    if (next.dailyPractice && next.dailyPractice.startedAt > reset.at) kept.dailyPractice = next.dailyPractice;
    return { ...cleared, ...kept };
  }, copy);
}

/** A review further along (more steps passed) is kept. */
const betterReview = (saved: SkillReview, here: SkillReview): SkillReview => {
  const step = (review: SkillReview) => (review.stage ?? 0) * 1000 + review.reviewCount;
  return step(saved) > step(here) ? saved : here;
};

/** Each item once (by `key`), in time order, newest `limit` kept. */
function mergeList<T>(saved: T[] | undefined, here: T[] | undefined, key: (item: T) => string, at: (item: T) => number, limit: number): T[] | undefined {
  if (!saved && !here) return undefined;
  const byKey = new Map<string, T>();
  for (const item of [...(saved ?? []), ...(here ?? [])]) byKey.set(key(item), item);
  return [...byKey.values()].sort((x, y) => at(x) - at(y)).slice(-limit);
}

export function mergeProgress(savedCopy: Progress, hereCopy: Progress): Progress {
  const unitResets = mergeNumbers(savedCopy.unitResets, hereCopy.unitResets);
  const saved = unitResets ? withResets(savedCopy, unitResets) : savedCopy;
  const here = unitResets ? withResets(hereCopy, unitResets) : hereCopy;
  const completed = [...here.completedMissionIds, ...saved.completedMissionIds.filter((id) => !here.completedMissionIds.includes(id))];
  const reviews = mergeBy(
    Object.fromEntries(saved.reviewQueue.map((review) => [review.missionId, review])),
    Object.fromEntries(here.reviewQueue.map((review) => [review.missionId, review])),
    betterReview,
  ) ?? {};
  const assessments = mergeList(saved.assessments, here.assessments, (attempt) => `${attempt.assessmentId}:${attempt.startedAt}`, (attempt) => attempt.completedAt, 90);
  const draft = here.assessmentDraft ?? saved.assessmentDraft;
  const draftDone = draft && assessments?.some((attempt) => attempt.assessmentId === draft.assessmentId && attempt.seed === draft.seed);
  const daily = saved.dailyPractice && here.dailyPractice
    ? (saved.dailyPractice.day !== here.dailyPractice.day
      ? (saved.dailyPractice.day > here.dailyPractice.day ? saved.dailyPractice : here.dailyPractice)
      : (saved.dailyPractice.completedAt && !here.dailyPractice.completedAt) || saved.dailyPractice.index > here.dailyPractice.index ? saved.dailyPractice : here.dailyPractice)
    : here.dailyPractice ?? saved.dailyPractice;
  const picks = mergeList(saved.grownUpPicks, here.grownUpPicks, (pick) => `${pick.kind}:${pick.id}`, (pick) => pick.at, 3);
  const merged: Progress = {
    ...saved,
    ...here,
    completedMissionIds: completed,
    starsByMission: mergeNumbers(saved.starsByMission, here.starsByMission) ?? {},
    reviewQueue: Object.values(reviews),
  };
  const optional: Partial<Progress> = {
    learning: mergeBy(saved.learning, here.learning, betterLesson),
    challengeBest: mergeNumbers(saved.challengeBest, here.challengeBest),
    challengeAttempts: mergeNumbers(saved.challengeAttempts, here.challengeAttempts),
    challengeAt: mergeNumbers(saved.challengeAt, here.challengeAt),
    adaptiveStandards: mergeBy(saved.adaptiveStandards, here.adaptiveStandards, later((state) => state.lastUpdatedAt)),
    lessonSeen: mergeBy(saved.lessonSeen, here.lessonSeen, later((seen) => seen.at)),
    adaptationLog: mergeList(saved.adaptationLog, here.adaptationLog, (event) => `${event.at}:${event.missionId}:${event.standard}`, (event) => event.at, 120),
    placement: saved.placement && here.placement ? later<NonNullable<Progress['placement']>>((place) => place.at)(saved.placement, here.placement) : here.placement ?? saved.placement,
    grownUpPicks: picks,
    assessments,
    assessmentDraft: draftDone ? undefined : draft,
    dailyPractice: daily,
    unitResets,
  };
  for (const [key, value] of Object.entries(optional) as [keyof Progress, unknown][]) {
    if (value === undefined) delete merged[key];
    else (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

const union = (saved: string[] | undefined, here: string[] | undefined) =>
  saved || here ? [...new Set([...(saved ?? []), ...(here ?? [])])] : undefined;

const sumParts = (devices: Record<string, DayCount> | undefined, key: keyof DayCount) =>
  Object.values(devices ?? {}).reduce((sum, part) => sum + part[key], 0);

/** One day on two copies: each device's own part once (a device's count only grows, so the larger is the newer), added
    up, plus the part counted before devices were (the larger, as before). */
function mergeDay(saved: DayActivity, here: DayActivity): DayActivity {
  const devices = mergeBy(saved.devices, here.devices, (a, b) => ({ minutes: Math.max(a.minutes, b.minutes), answered: Math.max(a.answered, b.answered) }));
  const older = (key: keyof DayCount) => Math.max(0, saved[key] - sumParts(saved.devices, key), here[key] - sumParts(here.devices, key));
  const day: DayActivity = { minutes: older('minutes') + sumParts(devices, 'minutes'), answered: older('answered') + sumParts(devices, 'answered') };
  return devices ? { ...day, devices } : day;
}

/** XP: each device's own XP once, added up, plus the XP from before devices were counted (the larger). */
function mergeXp(saved: FunState, here: FunState): { xp: number; xpByDevice?: Record<string, number> } {
  const byDevice = mergeNumbers(saved.xpByDevice, here.xpByDevice);
  if (!byDevice) return { xp: Math.max(saved.xp, here.xp) };
  const own = (copy: FunState) => Object.values(copy.xpByDevice ?? {}).reduce((sum, xp) => sum + xp, 0);
  const older = Math.max(0, saved.xp - own(saved), here.xp - own(here));
  return { xp: older + Object.values(byDevice).reduce((sum, xp) => sum + xp, 0), xpByDevice: byDevice };
}

/** A grown-up's setting from the copy where it changed last (no time on either: the saved copy, as before). */
function newerSetting<K extends 'timeLimit' | 'breakPreferences' | 'displayPreferences'>(saved: FunState, here: FunState, key: K, at: keyof SettingsAt): FunState[K] {
  const pick = (here.settingsAt?.[at] ?? 0) > (saved.settingsAt?.[at] ?? 0) ? here : saved;
  return pick[key] ?? (pick === here ? saved : here)[key];
}

/** Game results of lessons in a unit a grown-up reset that this copy has not seen reset. */
function withoutResetGames(fun: FunState, progress: Progress, resets: Record<string, number> | undefined): FunState {
  if (!resets) return fun;
  const lessons = new Set(unseenResets(progress, resets).flatMap((reset) => [...reset.lessons]));
  if (!lessons.size) return fun;
  const drop = (values: Record<string, number> | undefined) => values && Object.fromEntries(Object.entries(values).filter(([id]) => !lessons.has(id)));
  return { ...fun, raceBest: drop(fun.raceBest), robotBeaten: drop(fun.robotBeaten), codeLevels: drop(fun.codeLevels), sprintBest: drop(fun.sprintBest) };
}

/** Both halves of two copies of one learner: progress, and the fun state (where a unit reset clears game results too). */
export function mergeBundle(saved: { progress: Progress; fun: FunState }, here: { progress: Progress; fun: FunState }): { progress: Progress; fun: FunState } {
  const resets = mergeNumbers(saved.progress.unitResets, here.progress.unitResets);
  return {
    progress: mergeProgress(saved.progress, here.progress),
    fun: mergeFun(withoutResetGames(saved.fun, saved.progress, resets), withoutResetGames(here.fun, here.progress, resets)),
  };
}

export function mergeFun(saved: FunState, here: FunState): FunState {
  // The streak, its spare oil and the last active day travel together, from the copy that played most recently.
  const streakFrom = (saved.lastActiveDay ?? '') > (here.lastActiveDay ?? '') ? saved : here;
  const today = saved.day > here.day ? saved : saved.day === here.day && saved.answeredToday > here.answeredToday ? saved : here;
  const activity = mergeBy(saved.activity, here.activity, mergeDay);
  const rewards = mergeBy(saved.worksheetRewards, here.worksheetRewards, (a, b) => union(a, b) ?? []);
  const seasons = mergeBy(saved.seasonLessons, here.seasonLessons, (a, b) => union(a, b) ?? []);
  const intros = mergeBy(saved.introsSeen, here.introsSeen, (a, b) => (a === true || b === true ? true : b ?? a));
  const story = saved.story || here.story ? {
    ...saved.story, ...here.story,
    ...(saved.story?.prologueSeen || here.story?.prologueSeen ? { prologueSeen: true } : {}),
    ...(saved.story?.epilogueSeen || here.story?.epilogueSeen ? { epilogueSeen: true } : {}),
    ...(saved.story?.choices || here.story?.choices ? { choices: { ...saved.story?.choices, ...here.story?.choices } } : {}),
    ...(saved.story?.guesses || here.story?.guesses ? { guesses: { ...saved.story?.guesses, ...here.story?.guesses } } : {}),
  } : undefined;
  const merged: FunState = {
    ...saved,
    ...here,
    ...mergeXp(saved, here),
    day: today.day,
    // Today's right answers from both devices count toward the daily goal.
    answeredToday: Math.max(today.answeredToday, activity?.[today.day]?.answered ?? 0),
    dayStreak: saved.lastActiveDay === here.lastActiveDay ? Math.max(saved.dayStreak, here.dayStreak) : streakFrom.dayStreak,
    lastActiveDay: streakFrom.lastActiveDay,
  };
  const optional: Partial<FunState> = {
    spareOil: streakFrom.spareOil,
    streakKeptUntil: streakFrom.streakKeptUntil,
    savedDays: union(saved.savedDays, here.savedDays)?.sort(),
    activity,
    raceBest: mergeNumbers(saved.raceBest, here.raceBest, Math.min),
    sprintBest: mergeNumbers(saved.sprintBest, here.sprintBest, Math.min),
    robotBeaten: mergeNumbers(saved.robotBeaten, here.robotBeaten),
    codeLevels: mergeNumbers(saved.codeLevels, here.codeLevels),
    partFinderBest: saved.partFinderBest !== undefined || here.partFinderBest !== undefined ? Math.max(saved.partFinderBest ?? 0, here.partFinderBest ?? 0) : undefined,
    worksheetRewards: rewards,
    seasonLessons: seasons,
    introsSeen: intros,
    fractionWordsSeen: saved.fractionWordsSeen || here.fractionWordsSeen ? true : undefined,
    story,
    // A grown-up's settings: each from the copy where it was changed last.
    timeLimit: newerSetting(saved, here, 'timeLimit', 'timeLimit'),
    breakPreferences: newerSetting(saved, here, 'breakPreferences', 'breaks'),
    displayPreferences: newerSetting(saved, here, 'displayPreferences', 'display'),
    settingsAt: saved.settingsAt || here.settingsAt ? mergeNumbers(saved.settingsAt as NumberMap | undefined, here.settingsAt as NumberMap | undefined) as SettingsAt : undefined,
  };
  for (const [key, value] of Object.entries(optional) as [keyof FunState, unknown][]) {
    if (value === undefined) delete merged[key];
    else (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}
