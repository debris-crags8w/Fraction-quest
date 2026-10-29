/* Which finished lesson should come back next? One rule for the review item inside a new lesson and for Daily Practice,
   so every finished lesson is revisited, not only the ones with mistakes.
   A lesson is revisited after 1 day, then 3, 7 and 14 days (the interval grows each time it was answered right first time,
   and stays at 14). The lesson furthest past its due day comes first; a lesson that was shaky (a revisit that needed help)
   or weak (many mistakes when it was learned) is due a little sooner.
   Pure functions with no imports from the game, so game.ts and daily-practice.ts can both use them. */

export const REVISIT_DAYS = [1, 3, 7, 14] as const;
export const MAX_REVISIT_DAYS = REVISIT_DAYS[REVISIT_DAYS.length - 1];
const DAY = 24 * 60 * 60 * 1000;

/** What is remembered for a finished lesson: when a question of it was last answered right first time (or, after
    help, when it was last asked), how many right first-time revisits in a row, and whether the last one needed help. */
export type LessonSeen = { at: number; n: number; shaky?: boolean; /** Revisits so far (so each one asks a different question of the lesson). */ v?: number };

export type RevisitCandidate = {
  id: string;
  /** Its place in the course (earlier lessons win a tie). */
  order: number;
  completedAt?: number;
  seen?: LessonSeen;
  /** Many mistakes or only one star when it was first learned. */
  weak?: boolean;
};

/** Days until a lesson is due again: its interval, shorter for a lesson that was shaky or weak when it was learned. */
const intervalFor = (seen: LessonSeen | undefined, weak: boolean | undefined) => {
  const days = REVISIT_DAYS[Math.min(seen?.n ?? 0, REVISIT_DAYS.length - 1)];
  return seen?.shaky ? Math.max(1, Math.floor(days / 2)) : weak ? Math.max(1, days - 1) : days;
};

/** How many whole days past its due day a lesson is (0 is due today, negative is not due yet). The most overdue lesson
    comes first, which keeps the longest wait as short as it can be when there are more lessons than places. A lesson with
    no record at all (finished before the app kept dates) counts as very old. */
export function overdueScore(candidate: RevisitCandidate, now: number): number {
  const since = candidate.seen?.at ?? candidate.completedAt;
  const days = since === undefined ? 365 : Math.max(0, Math.floor((now - since) / DAY));
  return days - intervalFor(candidate.seen, candidate.weak);
}

/** The lessons due for a revisit (not before their due day), most overdue first. Two lessons with the same score: the one
    seen longest ago, then the earlier one in the course. */
export function dueLessons(candidates: RevisitCandidate[], now: number): string[] {
  return candidates
    .map((candidate) => ({ candidate, score: overdueScore(candidate, now) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score
      || (a.candidate.seen?.at ?? a.candidate.completedAt ?? 0) - (b.candidate.seen?.at ?? b.candidate.completedAt ?? 0)
      || a.candidate.order - b.candidate.order)
    .map(({ candidate }) => candidate.id);
}

/** Every candidate, most overdue first (Daily Practice fills its five from the top, due or not). */
export function byOverdue(candidates: RevisitCandidate[], now: number): string[] {
  return candidates
    .map((candidate) => ({ candidate, score: overdueScore(candidate, now) }))
    .sort((a, b) => b.score - a.score
      || (a.candidate.seen?.at ?? a.candidate.completedAt ?? 0) - (b.candidate.seen?.at ?? b.candidate.completedAt ?? 0)
      || a.candidate.order - b.candidate.order)
    .map(({ candidate }) => candidate.id);
}

/** After a revisit: right first time moves the lesson up one interval (a second look on the same day does not: it is the same
    look). Help or a miss keeps the interval and makes the lesson shaky. */
export function afterRevisit(seen: LessonSeen | undefined, correctFirstTime: boolean, now: number): LessonSeen {
  const v = (seen?.v ?? 0) + 1;
  if (!correctFirstTime) return { at: now, n: seen?.n ?? 0, shaky: true, v };
  const sameDay = !!seen && Math.floor(seen.at / DAY) === Math.floor(now / DAY);
  return { at: now, n: sameDay ? seen.n : Math.min((seen?.n ?? 0) + 1, REVISIT_DAYS.length - 1), ...(sameDay && seen.shaky ? { shaky: true } : {}), v };
}

/** Is this finished lesson due for a revisit today? */
export const isDue = (candidate: RevisitCandidate, now: number): boolean => overdueScore(candidate, now) >= 0;
