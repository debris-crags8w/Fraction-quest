/* Merging two copies of a child's saved data (this device + iCloud, or + a backup file).
   Rule of thumb: never lose progress. Each lesson keeps the copy with more evidence; scores keep the best;
   settings keep this device's choice. Both inputs should already be cleaned by parseProgress / parseFun. */

import type { Progress, SkillReview } from '../game';
import { worksheetCount, type LearningRecord } from '../learning';
import type { DayActivity, FunState } from './fun';

/** How much a lesson record shows the child has done (higher = more). */
export function evidenceScore(id: string, record: LearningRecord | undefined): number {
  if (!record) return -1;
  return (record.completedAt ? 1_000_000 : 0) + (record.confirmedAt ? 500_000 : 0)
    + worksheetCount(record, id) * 1_000
    + Object.values(record.checks).filter((c) => c.passed).length * 100
    + (record.practiceDone ? 10 : 0)
    + Math.min(9, Object.keys(record.worksheet).length);
}

const maxRecord = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? v, v);
  return out;
};
const minRecord = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.min(out[k] ?? v, v);
  return out;
};

/** Merge two copies of one child's progress. Ties go to `local`. */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const learning: Record<string, LearningRecord> = { ...(local.learning ?? {}) };
  for (const [id, theirs] of Object.entries(remote.learning ?? {})) {
    const mine = learning[id];
    const winner = evidenceScore(id, theirs) > evidenceScore(id, mine) ? theirs : mine;
    // Redo counters only ever grow; keep the larger from either copy.
    learning[id] = {
      ...winner,
      redoRounds: Math.max(mine?.redoRounds ?? 0, theirs.redoRounds ?? 0) || undefined,
      redosFinished: Math.max(mine?.redosFinished ?? 0, theirs.redosFinished ?? 0) || undefined,
    };
  }

  const reviews = new Map<string, SkillReview>();
  for (const item of [...local.reviewQueue, ...remote.reviewQueue]) {
    const seen = reviews.get(item.missionId);
    if (!seen || item.reviewCount > seen.reviewCount || (item.reviewCount === seen.reviewCount && item.dueAt < seen.dueAt)) reviews.set(item.missionId, item);
  }

  const daily = (() => {
    const a = local.dailyPractice; const b = remote.dailyPractice;
    if (!a || !b) return a ?? b;
    if (a.day !== b.day) return a.day > b.day ? a : b;
    if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? a : b;
    return b.index > a.index ? b : a;
  })();

  const placement = (() => {
    const a = local.placement; const b = remote.placement;
    if (!a || !b) return a ?? b;
    return b.unit > a.unit ? b : a;
  })();

  const challengeBest = maxRecord(local.challengeBest, remote.challengeBest);
  return {
    completedMissionIds: [...new Set([...local.completedMissionIds, ...remote.completedMissionIds])],
    starsByMission: maxRecord(local.starsByMission, remote.starsByMission),
    reviewQueue: [...reviews.values()],
    ...(Object.keys(learning).length ? { learning } : {}),
    ...(Object.keys(challengeBest).length ? { challengeBest } : {}),
    ...(daily ? { dailyPractice: daily } : {}),
    ...(placement ? { placement } : {}),
  };
}

/** Merge two copies of one child's games and settings. Settings (sound, voice) stay as on this device. */
export function mergeFun(local: FunState, remote: FunState): FunState {
  const activity: Record<string, DayActivity> = { ...(local.activity ?? {}) };
  for (const [day, theirs] of Object.entries(remote.activity ?? {})) {
    const mine = activity[day];
    activity[day] = mine ? { minutes: Math.max(mine.minutes, theirs.minutes), answered: Math.max(mine.answered, theirs.answered) } : theirs;
  }
  const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);
  const sameDay = local.day === remote.day;
  const partFinderBest = Math.max(local.partFinderBest ?? -1, remote.partFinderBest ?? -1);
  return {
    ...local,
    xp: Math.max(local.xp, remote.xp),
    day: sameDay ? local.day : later(local.day, remote.day)!,
    answeredToday: sameDay ? Math.max(local.answeredToday, remote.answeredToday) : (local.day > remote.day ? local.answeredToday : remote.answeredToday),
    dayStreak: Math.max(local.dayStreak, remote.dayStreak),
    lastActiveDay: later(local.lastActiveDay, remote.lastActiveDay),
    activity,
    raceBest: minRecord(local.raceBest, remote.raceBest),
    robotBeaten: maxRecord(local.robotBeaten, remote.robotBeaten),
    codeLevels: maxRecord(local.codeLevels, remote.codeLevels),
    sprintBest: minRecord(local.sprintBest, remote.sprintBest),
    ...(partFinderBest >= 0 ? { partFinderBest } : {}),
    preferredLearningVoiceId: local.preferredLearningVoiceId ?? remote.preferredLearningVoiceId,
  };
}
