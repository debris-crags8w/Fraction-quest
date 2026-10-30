/* One learner on two devices (say a phone and a tablet): the server refuses a save made from an older copy (409), and
   this device then merges the saved copy into its own before saving again (account.tsx). The merge keeps every lesson
   finished on either device, the best scores, and the latest of each dated thing, so nothing learned on one device is
   lost. Settings a grown-up chooses (time limit, breaks, display) come from the saved copy: the other device saved them
   more recently than this device last loaded. The result is cleaned by loadProgress / replaceFun as usual. */
import type { Progress, SkillReview } from './game';
import type { LearningRecord } from './learning';
import type { FunState } from './lib/fun';

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

function betterLesson(saved: LearningRecord, here: LearningRecord): LearningRecord {
  // Both finished: keep the first finish (its first-try answers are the ones the report counts).
  if (saved.completedAt && here.completedAt) {
    const first = saved.completedAt < here.completedAt ? saved : here;
    const confirmedAt = Math.max(saved.confirmedAt ?? 0, here.confirmedAt ?? 0);
    return confirmedAt ? { ...first, confirmedAt } : first;
  }
  const a = lessonProgress(saved);
  const b = lessonProgress(here);
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] > b[i] ? saved : here;
  return here;
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

export function mergeProgress(saved: Progress, here: Progress): Progress {
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
    adaptiveStandards: mergeBy(saved.adaptiveStandards, here.adaptiveStandards, later((state) => state.lastUpdatedAt)),
    lessonSeen: mergeBy(saved.lessonSeen, here.lessonSeen, later((seen) => seen.at)),
    adaptationLog: mergeList(saved.adaptationLog, here.adaptationLog, (event) => `${event.at}:${event.missionId}:${event.standard}`, (event) => event.at, 120),
    placement: saved.placement && here.placement ? later<NonNullable<Progress['placement']>>((place) => place.at)(saved.placement, here.placement) : here.placement ?? saved.placement,
    grownUpPicks: picks,
    assessments,
    assessmentDraft: draftDone ? undefined : draft,
    dailyPractice: daily,
  };
  for (const [key, value] of Object.entries(optional) as [keyof Progress, unknown][]) {
    if (value === undefined) delete merged[key];
    else (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

const union = (saved: string[] | undefined, here: string[] | undefined) =>
  saved || here ? [...new Set([...(saved ?? []), ...(here ?? [])])] : undefined;

export function mergeFun(saved: FunState, here: FunState): FunState {
  // The streak, its spare oil and the last active day travel together, from the copy that played most recently.
  const streakFrom = (saved.lastActiveDay ?? '') > (here.lastActiveDay ?? '') ? saved : here;
  const today = saved.day > here.day ? saved : saved.day === here.day && saved.answeredToday > here.answeredToday ? saved : here;
  const activity = mergeBy(saved.activity, here.activity, (a, b) => ({ minutes: Math.max(a.minutes, b.minutes), answered: Math.max(a.answered, b.answered) }));
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
    xp: Math.max(saved.xp, here.xp),
    day: today.day,
    answeredToday: today.answeredToday,
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
    // A grown-up's settings: the saved copy is the newer one.
    timeLimit: saved.timeLimit ?? here.timeLimit,
    breakPreferences: saved.breakPreferences ?? here.breakPreferences,
    displayPreferences: saved.displayPreferences ?? here.displayPreferences,
  };
  for (const [key, value] of Object.entries(optional) as [keyof FunState, unknown][]) {
    if (value === undefined) delete merged[key];
    else (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}
