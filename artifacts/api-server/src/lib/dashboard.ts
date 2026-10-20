// Dashboard aggregation for the admin page. Pure functions: given account rows (with each learner's saved
// progress and fun documents) they return counts and rates only. Breakdowns with fewer than MIN_GROUP
// learners are hidden so small classes cannot be picked out.

/** Lesson id -> unit. Mirrors the curriculum in artifacts/fraction-quest/src/game.ts (dashboard.test.ts checks they match). */
export const LESSON_UNITS: Record<string, number> = {
  "equal-parts": 1,
  "fraction-names": 1,
  "unit-fractions": 1,
  "unit-size": 2,
  "sets-unit-fractions": 11,
  "sets-nonunit": 11,
  "benchmark-half": 3,
  "benchmarks-zero-one": 3,
  "fraction-magnitude": 3,
  "number-line-basics": 4,
  "number-line-points": 4,
  "number-line-beyond-one": 4,
  "compare-same-denominator": 5,
  "compare-same-numerator": 2,
  "order-fractions": 5,
  "equivalent-models": 6,
  "build-equivalents": 6,
  "missing-equivalent": 6,
  "compose-to-one": 7,
  "decompose-fractions": 7,
  "improper-fractions": 7,
  "mixed-improper": 7,
  "add-like-denominators": 8,
  "subtract-like-denominators": 8,
  "add-related-fractions": 8,
  "tenths-decimals": 8,
  "hundredths-decimals": 8,
  "add-tenths-hundredths": 8,
  "unit-fraction-multiples": 8,
  "multiply-whole-by-fraction": 8,
  "simplify-fractions": 9,
  "equivalent-missing-both": 9,
  "whole-numbers-as-fractions": 9,
  "compare-unlike-fractions": 9,
  "order-unlike-fractions": 9,
  "subtract-unlike-fractions": 10,
  "add-unlike-fractions": 10,
  "add-mixed-numbers": 10,
  "subtract-mixed-numbers": 10,
  "fraction-of-quantity": 10,
  "mixed-unlike-operations": 10,
  "estimate-fraction-operations": 10,
  "multiply-fractions": 11,
  "fraction-of-collection": 11,
  "divide-whole-by-unit-fraction": 11,
  "multiplication-scaling": 11,
  "multiply-mixed-numbers": 11,
  "unit-fraction-divided-whole": 11,
  "fraction-of-length": 12,
  "fractional-measure-addition": 12,
  "ruler-measurement": 12,
  "build-line-plots": 12,
  "read-line-plots": 12,
  "line-plot-leveling": 12,
  "measurement-word-problems": 12,
  "fractional-unit-conversions": 12,
  "fractional-sharing": 12,
  "fraction-as-division": 12,
  "fraction-probability": 13,
  "fraction-of-area": 13,
  "fractional-side-area": 13,
  "equivalent-number-line": 13,
  "fraction-recipes": 13,
  "fractions-to-percent": 14,
  "percent-to-fraction": 14,
  "decimal-fraction-equivalence": 14,
  "compare-decimals": 14,
  "multi-step-fraction-stories": 14,
  "find-the-whole": 15,
  "spot-the-mistake": 15,
  "fraction-of-remainder": 15,
  "divide-fractions": 15,
};

export const MIN_GROUP = 5;
const DAY_MS = 864e5;

export type AccountRow = {
  username: string;
  createdAt: Date;
  hasConsent: boolean;
  hasRecoveryCode: boolean;
  progress: unknown | null;
  fun: unknown | null;
};
type Obj = Record<string, any>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
const avg = (sum: number, n: number) => (n > 0 ? Math.round((sum / n) * 10) / 10 : null);

type Learner = {
  username: string; createdAt: Date; p: Obj; f: Obj; activity: Record<string, { minutes: number; answered: number }>;
};

function windowStats(learners: Learner[], accounts: AccountRow[], fromDay: string, toDay: string, fromMs: number, toMs: number) {
  let activeLearners = 0, minutes = 0, answers = 0, activeDays = 0;
  for (const l of learners) {
    let active = false;
    for (const [day, a] of Object.entries(l.activity)) {
      if (day < fromDay || day >= toDay || (num(a.minutes) <= 0 && num(a.answered) <= 0)) continue;
      active = true; activeDays++; minutes += num(a.minutes); answers += num(a.answered);
    }
    if (active) activeLearners++;
  }
  const newAccounts = accounts.filter((a) => a.createdAt.getTime() >= fromMs && a.createdAt.getTime() < toMs).length;
  return { newAccounts, activeLearners, minutes, answers, activeDays };
}

export function buildDashboard(accounts: AccountRow[], days: number, now = Date.now()) {
  const today = dayKey(now);
  const learners: Learner[] = accounts.filter((a) => a.progress || a.fun).map((a) => {
    const f = obj(a.fun);
    const activity: Learner["activity"] = {};
    for (const [day, v] of Object.entries(obj(f.activity))) activity[day] = { minutes: num(obj(v).minutes), answered: num(obj(v).answered) };
    return { username: a.username, createdAt: a.createdAt, p: obj(a.progress), f, activity };
  });
  const enough = learners.length >= MIN_GROUP;

  // Per-day activity is only kept for 35 days, so earlier periods cannot be compared.
  const trendDays = Math.min(days, 35);
  const trend = Array.from({ length: trendDays }, (_, i) => {
    const day = dayKey(now - (trendDays - 1 - i) * DAY_MS);
    let active = 0, minutes = 0, answers = 0;
    for (const l of learners) {
      const a = l.activity[day];
      if (a && (a.minutes > 0 || a.answered > 0)) { active++; minutes += a.minutes; answers += a.answered; }
    }
    return { day, active, minutes, answers };
  });
  let weeklyActive = 0;
  for (const l of learners) if (Object.entries(l.activity).some(([d, a]) => d > dayKey(now - 7 * DAY_MS) && (a.minutes > 0 || a.answered > 0))) weeklyActive++;

  const fromDay = dayKey(now - (days - 1) * DAY_MS), toDay = dayKey(now + DAY_MS);
  const current = windowStats(learners, accounts, fromDay, toDay, now - days * DAY_MS, now + 1);
  const canCompare = days * 2 <= 35;
  const previous = canCompare
    ? windowStats(learners, accounts, dayKey(now - (2 * days - 1) * DAY_MS), fromDay, now - 2 * days * DAY_MS, now - days * DAY_MS)
    : null;

  // Retention: of accounts old enough, how many were last active at least N days after signing up.
  const retention = (n: number) => {
    const old = accounts.filter((a) => now - a.createdAt.getTime() >= n * DAY_MS);
    const kept = old.filter((a) => {
      const last = obj(a.fun).lastActiveDay;
      return typeof last === "string" && last >= dayKey(a.createdAt.getTime() + n * DAY_MS);
    }).length;
    return { eligible: old.length, percent: old.length >= MIN_GROUP ? pct(kept, old.length) : null };
  };

  const streaks = { none: 0, short: 0, medium: 0, long: 0 };
  for (const l of learners) {
    const s = num(l.f.dayStreak);
    if (s <= 0) streaks.none++; else if (s < 3) streaks.short++; else if (s < 7) streaks.medium++; else streaks.long++;
  }

  // Lessons.
  type Lesson = { started: number; passed: number; firstTry: number; stars: number; starred: number; checks: number; checkAttempts: number; help: number };
  const lessons: Record<string, Lesson> = {};
  const lesson = (id: string) => (lessons[id] ??= { started: 0, passed: 0, firstTry: 0, stars: 0, starred: 0, checks: 0, checkAttempts: 0, help: 0 });
  const unitStarted: Record<number, number> = {}, unitPassedAny: Record<number, number> = {}, unitFinished: Record<number, number> = {};
  const unitSizes: Record<number, number> = {};
  for (const unit of Object.values(LESSON_UNITS)) unitSizes[unit] = (unitSizes[unit] ?? 0) + 1;
  const skillMisses: Record<string, number> = {};
  const misconceptions: Record<string, number> = {};
  const modes = { race: 0, codeQuest: 0, codeSprint: 0, partFinder: 0, dailyPractice: 0, assessment: 0, placement: 0 };
  const assessmentScores = [0, 0, 0, 0]; // 0-49, 50-74, 75-99, 100
  const needsAttention: { username: string; reason: string }[] = [];

  for (const l of learners) {
    const completed = new Set<string>(Array.isArray(l.p.completedMissionIds) ? l.p.completedMissionIds.filter((x: unknown) => typeof x === "string") : []);
    const stars = obj(l.p.starsByMission), learning = obj(l.p.learning);
    const touched = new Set<string>([...completed, ...Object.keys(stars), ...Object.keys(learning)].filter((id) => id in LESSON_UNITS));
    for (const id of touched) {
      const row = lesson(id), rec = obj(learning[id]);
      row.started++;
      row.help += num(rec.helpUses);
      for (const c of Object.values(obj(rec.checks))) { row.checks++; row.checkAttempts += Math.max(1, num(obj(c).attempts)); }
      if (completed.has(id)) {
        row.passed++;
        if (Object.values(obj(rec.checks)).every((c) => num(obj(c).attempts) <= 1)) row.firstTry++;
      }
      if (typeof stars[id] === "number") { row.stars += stars[id]; row.starred++; }
      for (const [k, v] of Object.entries(obj(rec.misconceptions))) misconceptions[k] = (misconceptions[k] ?? 0) + num(v);
    }
    for (const unit of new Set([...touched].map((id) => LESSON_UNITS[id]!))) {
      unitStarted[unit] = (unitStarted[unit] ?? 0) + 1;
      const ids = Object.keys(LESSON_UNITS).filter((id) => LESSON_UNITS[id] === unit);
      if (ids.some((id) => completed.has(id))) unitPassedAny[unit] = (unitPassedAny[unit] ?? 0) + 1;
      if (ids.every((id) => completed.has(id))) unitFinished[unit] = (unitFinished[unit] ?? 0) + 1;
    }
    for (const r of Array.isArray(l.p.reviewQueue) ? l.p.reviewQueue : []) {
      const id = obj(r).missionId;
      if (typeof id === "string" && id in LESSON_UNITS) skillMisses[id] = (skillMisses[id] ?? 0) + 1;
    }
    if (Object.keys(obj(l.f.raceBest)).length || Object.keys(obj(l.f.robotBeaten)).length) modes.race++;
    if (Object.values(obj(l.f.codeLevels)).some((v) => num(v) > 0)) modes.codeQuest++;
    if (Object.keys(obj(l.f.sprintBest)).length) modes.codeSprint++;
    if (num(l.f.partFinderBest) > 0) modes.partFinder++;
    if (obj(l.p.dailyPractice).day) modes.dailyPractice++;
    if (l.p.placement) modes.placement++;
    const attempts = Array.isArray(l.p.assessments) ? l.p.assessments : [];
    if (attempts.length) modes.assessment++;
    for (const at of attempts) {
      const rs = Array.isArray(obj(at).responses) ? obj(at).responses : [];
      if (!rs.length) continue;
      const score = pct(rs.filter((r: unknown) => obj(r).correct === true).length, rs.length)!;
      assessmentScores[score >= 100 ? 3 : score >= 75 ? 2 : score >= 50 ? 1 : 0]++;
    }

    // Needs attention.
    const last = l.f.lastActiveDay;
    if (num(l.f.dayStreak) >= 3 && typeof last === "string" && last < dayKey(now - 7 * DAY_MS)) {
      needsAttention.push({ username: l.username, reason: "Inactive 7+ days after a streak" });
    } else if (Object.values(stars).filter((v) => num(v) === 1).length >= 2) {
      needsAttention.push({ username: l.username, reason: "Repeated 1-star lessons" });
    }
  }

  const lessonRows = Object.entries(lessons).filter(([, r]) => r.started >= MIN_GROUP).map(([id, r]) => ({
    id, unit: LESSON_UNITS[id]!, started: r.started, passRate: pct(r.passed, r.started), firstTryRate: pct(r.firstTry, r.passed),
    avgStars: avg(r.stars, r.starred), avgCheckAttempts: avg(r.checkAttempts, r.checks), helpPerLearner: avg(r.help, r.started),
  }));
  const allStars = Object.values(lessons).reduce((a, r) => ({ s: a.s + r.stars, n: a.n + r.starred }), { s: 0, n: 0 });
  const allPassed = Object.values(lessons).reduce((a, r) => ({ p: a.p + r.passed, f: a.f + r.firstTry }), { p: 0, f: 0 });

  const top = (rec: Record<string, number>, n: number) => Object.entries(rec).sort((a, b) => b[1] - a[1]).slice(0, n);
  const noProgress = accounts.length - learners.length;
  const hide = <T,>(value: T): T | null => (enough ? value : null);

  return {
    days, generatedAt: new Date(now).toISOString(), tooFewLearners: !enough, minGroup: MIN_GROUP,
    cards: {
      accounts: accounts.length, learnersWithProgress: learners.length, weeklyActive,
      current, previous,
      avgMinutesPerActiveDay: avg(current.minutes, current.activeDays), avgAnswersPerActiveDay: avg(current.answers, current.activeDays),
      noProgressYet: noProgress,
    },
    trend: { days: trendDays, points: trend, note: days > 35 ? "Daily activity is only kept for 35 days." : null },
    retention: { day7: retention(7), day30: retention(30) },
    streaks: hide(streaks),
    funnel: hide(Object.keys(unitSizes).map(Number).sort((a, b) => a - b).map((unit) => ({
      unit, lessons: unitSizes[unit], started: unitStarted[unit] ?? 0, passedOne: unitPassedAny[unit] ?? 0, finished: unitFinished[unit] ?? 0,
    })).map((r) => (r.started >= MIN_GROUP ? r : { unit: r.unit, lessons: r.lessons, started: null, passedOne: null, finished: null }))),
    outcomes: hide({
      avgStars: avg(allStars.s, allStars.n), firstTryShare: pct(allPassed.f, allPassed.p),
      assessmentScores: { under50: assessmentScores[0], from50: assessmentScores[1], from75: assessmentScores[2], perfect: assessmentScores[3] },
      placementTaken: modes.placement,
    }),
    modes: hide(modes),
    struggles: hide({
      lowestPassRate: [...lessonRows].sort((a, b) => (a.passRate ?? 101) - (b.passRate ?? 101)).slice(0, 8),
      mostAttempts: [...lessonRows].sort((a, b) => (b.avgCheckAttempts ?? 0) - (a.avgCheckAttempts ?? 0)).slice(0, 8),
      reviewQueueByLesson: top(skillMisses, 8).filter(([, n]) => n >= MIN_GROUP).map(([id, n]) => ({ id, unit: LESSON_UNITS[id], count: n })),
      commonMisconceptions: top(misconceptions, 8).filter(([, n]) => n >= MIN_GROUP).map(([key, count]) => ({ key, count })),
    }),
    needsAttention: { count: needsAttention.length, list: needsAttention.slice(0, 25) },
    health: {
      consentPercent: pct(accounts.filter((a) => a.hasConsent).length, accounts.length),
      noRecoveryCode: accounts.filter((a) => !a.hasRecoveryCode).length,
    },
  };
}
