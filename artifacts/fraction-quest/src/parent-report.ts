import { CHALLENGES, challengeMaxPoints } from './challenges';
import { isMissionUnlocked, MISSIONS, type Progress } from './game';
import { getLearningRecord, hasLearningGate, worksheetCount } from './learning';
import { answerMatches, getWorksheet } from './learning-content';
import { shownStreak, today, type FunState } from './lib/fun';
import { summarizeCodeProgress } from './code-progress';
import { CODE_LEVEL_COUNT } from './code-quest';
import { getAssessmentDefinitions, summarizeStandardMastery, type StandardMastery } from './assessments';
import { FRACTION_STANDARDS, type StandardId } from './standard-catalog';
import { ideaForMission } from './parent-ideas';

/* The grown-ups' report: everything here is read from progress the app already saves.
   Nothing in it changes progress or lesson gating. */

export type LessonStatus = 'done' | 'started' | 'skipped' | 'open' | 'locked';
export type LessonRow = {
  id: string; number: number; title: string; status: LessonStatus; stars: number;
  worksheet: number; firstTry: number | null; builds: 'On their own' | 'With help' | 'Not yet';
  remembered: 'Yes' | 'Not yet checked' | '—'; helpUses: number;
};
export type UnitRow = { number: number; title: string; done: number; total: number; challengeBest: number | null; challengeMax: number; lessons: LessonRow[] };
export type DayRow = { day: string; label: string; minutes: number; answered: number; /** No practice, but spare oil kept the streak going. */ saved: boolean };
export type PracticeTip = {
  /** What the group is: the idea of the lessons its wrong tries happened in ("Making equal fractions"), never one question's hint. */
  key: string; idea: string; /** One thing to try at home for this idea. */ home: string;
  lessons: string[]; /** The same lessons, by number. */ lessonNumbers: number[]; count: number; /** How many of the misses happened in redos. */ inRedos?: number;
  /** The lesson with the most of these misses: "Practice now" gives new questions from it. */ missionId: string; lessonNumber: number;
  standards: string[];
};
/** Something to try at home when no wrong tries have shown up yet: the next lesson's idea, or the weakest finished lesson's. */
export type HomeIdea = { heading: string; home: string; lessonNumber: number; lessonTitle: string; why: 'next' | 'review' };
/** One standard's steps: 0 not started, 1 learning, 2 practiced in lessons, 3 mastered in Check-ins. */
export type SkillStep = 0 | 1 | 2 | 3;
export type SkillRow = {
  standard: StandardId; grade: 3 | 4 | 5; canDo: string; step: SkillStep; mastery: StandardMastery;
  lessons: { id: string; number: number; title: string; status: LessonStatus; firstTry: number | null }[];
  /** The Check-in that covers this standard, for "Add a Check-in". */ checkinId: string;
  /** The lesson to do next (step 0 or 1). */ nextLesson: { id: string; number: number; title: string; started: boolean } | null;
};
export type MonthView = {
  weeks: { start: string; label: string; lessons: number }[]; lessonsFinished: number;
  /** Skills that became mastered in the 4 weeks. */ skillsGained: number;
  /** First-try accuracy for lessons finished in the earliest and the latest of the 4 weeks that have any (null until two weeks do). */
  firstTry: { first: number; latest: number } | null;
};
/** Steps 2 and 3 need at least this share of worksheet answers right on the first try across the standard's lessons. */
export const PRACTISED_FIRST_TRY = 70;
/** The report footer's line on how "First try" is counted (the tiles, the glance and the share text count the same way). */
export const HOW_TO_READ_FIRST_TRY = '"First try" counts worksheet answers that were right the first time they were checked, without the Hint.';
export type ParentReport = {
  lessonsDone: number; lessonsTotal: number; stars: number; xp: number; streak: number;
  /** Days in the last 35 that spare oil covered: they kept the streak going without practice. */ savedDays: number; spareOil: number;
  codeLevelsPassed: number; codeLevelsTotal: number; codeMissionsStarted: number; codeMissionsComplete: number;
  codeMissionRows: { id: string; title: string; levelsPassed: number }[];
  week: DayRow[]; minutesWeek: number; answeredWeek: number;
  /** Share of worksheet answers right on the first try (null before any are checked). */
  firstTryRate: number | null;
  /** Share of finished builds done with no hints or wrong tries. */
  onOwnRate: number | null;
  nextLesson: string | null; toPractice: PracticeTip[]; dueReviews: string[]; strengths: string[]; units: UnitRow[];
  placement: { unit: number; date: string } | null;
  assessmentChecksCompleted: number;
  standardMastery: StandardMastery[];
  /** Every taught standard with its steps; `grade` is where the child is working now. */
  skills: SkillRow[]; grade: 3 | 4 | 5;
  month: MonthView;
  adaptationReasons: { day: string; lesson: string; missionId: string; unit: number; reason: string }[];
  glance: Glance;
  /** Only when `toPractice` is empty. */ homeIdea: HomeIdea | null;
};

/** The top of the report: the week in a few lines, grade level, and one thing to help with at home. */
export type GlanceLesson = { id: string; title: string; grade: 3 | 4 | 5 | null; standards: string[]; idea: string };
export type Glance = {
  /** Days in the last 7 with at least one right answer, and days spare oil covered. */
  daysPracticed: number; savedDays: number; minutes: number;
  /** Lessons finished in the last 7 days, oldest first. */
  learned: GlanceLesson[];
  /** Share of worksheet answers right the first time in the lessons finished in the last 7 days (null when none were checked). */
  firstTryWeek: number | null;
  /** The lesson with the most wrong tries so far: the "Working on" line of the summary to share. */
  focus: (GlanceLesson & { misses: number }) | null;
};

const glanceLesson = (mission: (typeof MISSIONS)[number]): GlanceLesson => ({
  id: mission.id, title: mission.title, grade: mission.gradeBand ?? null, standards: [...(mission.standards ?? [])], idea: mission.skill,
});

export function buildGlance(progress: Progress, week: DayRow[], now = new Date()): Glance {
  // The same 7 calendar days as the day tiles (from midnight six days ago), not the last 168 hours.
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const finishedThisWeek = MISSIONS
    .map((mission) => ({ mission, at: getLearningRecord(progress, mission.id).completedAt }))
    .filter((item): item is { mission: (typeof MISSIONS)[number]; at: number } => typeof item.at === 'number' && item.at >= weekStart.getTime() && item.at <= now.getTime())
    .sort((a, b) => a.at - b.at);
  const learned = finishedThisWeek.map(({ mission }) => glanceLesson(mission));
  let weekTried = 0; let weekFirstTry = 0;
  for (const { mission } of finishedThisWeek) { const counts = firstTryCounts(progress, mission.id); weekTried += counts.tried; weekFirstTry += counts.firstTry; }
  let focus: Glance['focus'] = null;
  for (const mission of MISSIONS) {
    const record = getLearningRecord(progress, mission.id);
    const misses = [record.misconceptions, record.redoMisconceptions ?? {}].reduce((sum, misses) => sum + Object.values(misses).reduce((a, b) => a + b, 0), 0);
    if (misses > (focus?.misses ?? 0)) focus = { ...glanceLesson(mission), misses };
  }
  return {
    daysPracticed: week.filter((day) => day.answered > 0).length, savedDays: week.filter((day) => day.saved).length,
    minutes: week.reduce((sum, day) => sum + day.minutes, 0), learned, firstTryWeek: pct(weekFirstTry, weekTried), focus,
  };
}

const gradeTag = (lesson: GlanceLesson) => [lesson.grade ? `Grade ${lesson.grade}` : null, ...lesson.standards].filter(Boolean).join(', ');
/** The short summary a grown-up can send to a teacher. It names no account details, only this week's learning. */
export function glanceShareText(glance: Glance, childName: string | null, now = new Date(), skills: SkillRow[] = []): string {
  const start = new Date(now); start.setDate(now.getDate() - 6);
  const lines = [
    `Fraction Quest · ${childName ?? 'My child'} · week of ${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
    `Practiced ${glance.daysPracticed} of 7 days (${glance.minutes} min). Finished ${glance.learned.length} ${glance.learned.length === 1 ? 'lesson' : 'lessons'}.`,
  ];
  if (glance.learned.length) lines.push(`Learned: ${glance.learned.map((lesson) => `${lesson.title} (${gradeTag(lesson)})`).join('; ')}.`);
  const standards = (step: SkillStep) => skills.filter((skill) => skill.step === step).map((skill) => skill.standard).join(', ');
  if (standards(3)) lines.push(`Mastered: ${standards(3)}.`);
  if (standards(2)) lines.push(`Practiced, ready to check: ${standards(2)}.`);
  if (glance.firstTryWeek !== null) lines.push(`Right the first time, without the Hint, in lessons finished this week: ${glance.firstTryWeek}%.`);
  if (glance.focus) lines.push(`Working on: ${glance.focus.title} (${gradeTag(glance.focus)}).`);
  return lines.join('\n');
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);

/** Worksheet answers checked, and how many were right the first time without opening the Hint (opening it marks the row `supported`). */
function firstTryCounts(progress: Progress, missionId: string): { tried: number; firstTry: number } {
  const record = getLearningRecord(progress, missionId);
  let tried = 0; let firstTry = 0;
  for (const problem of getWorksheet(missionId)) {
    const entry = record.worksheet[problem.id];
    if (!entry || entry.attempts === 0) continue;
    tried++;
    if (entry.attempts === 1 && !entry.supported && entry.checkedValue === entry.draft && answerMatches(problem, entry.draft)) firstTry++;
  }
  return { tried, firstTry };
}

function lessonRow(progress: Progress, index: number): LessonRow {
  const mission = MISSIONS[index];
  const record = getLearningRecord(progress, mission.id);
  const done = hasLearningGate(progress, mission.id);
  const checks = Object.values(record.checks).filter((check) => check.passed);
  const { tried, firstTry } = firstTryCounts(progress, mission.id);
  const started = record.practiceDone || tried > 0 || checks.length > 0;
  return {
    id: mission.id, number: index + 1, title: mission.title,
    status: done ? 'done' : started ? 'started' : progress.placement && mission.unit < progress.placement.unit ? 'skipped' : isMissionUnlocked(progress, mission.id) ? 'open' : 'locked',
    stars: progress.starsByMission[mission.id] ?? 0,
    worksheet: worksheetCount(record, mission.id),
    firstTry: pct(firstTry, tried),
    builds: checks.length === 0 ? 'Not yet' : checks.length >= 2 && checks.every((check) => !check.supported) ? 'On their own' : 'With help',
    remembered: record.confirmedAt ? 'Yes' : done ? 'Not yet checked' : '—',
    helpUses: record.helpUses,
  };
}

export function buildParentReport(progress: Progress, fun: FunState, unitTitles: string[], now = new Date()): ParentReport {
  const rows = MISSIONS.map((_, index) => lessonRow(progress, index));
  const units: UnitRow[] = unitTitles.map((title, i) => {
    const number = i + 1;
    const lessons = rows.filter((row) => MISSIONS[row.number - 1].unit === number);
    return {
      number, title, lessons, done: lessons.filter((row) => row.status === 'done').length, total: lessons.length,
      challengeBest: CHALLENGES[number] ? progress.challengeBest?.[String(number)] ?? null : null,
      challengeMax: challengeMaxPoints(number),
    };
  });

  // The last 7 days, oldest first.
  const week: DayRow[] = Array.from({ length: 7 }, (_, k) => {
    const date = new Date(now); date.setDate(now.getDate() - (6 - k));
    const day = today(date); const activity = fun.activity?.[day];
    return { day, label: date.toLocaleDateString(undefined, { weekday: 'short' }), minutes: activity?.minutes ?? 0, answered: activity?.answered ?? 0,
      saved: !(activity?.answered) && (fun.savedDays ?? []).includes(day) };
  });

  // Accuracy across every lesson.
  let tried = 0; let firstTry = 0; let builds = 0; let onOwn = 0;
  for (const mission of MISSIONS) {
    const record = getLearningRecord(progress, mission.id);
    const counts = firstTryCounts(progress, mission.id);
    tried += counts.tried; firstTry += counts.firstTry;
    for (const check of Object.values(record.checks)) if (check.passed) { builds++; if (!check.supported) onOwn++; }
  }

  // What tripped them up most: wrong tries are grouped by the idea of the lesson they happened in (see parent-ideas.ts),
  // so the four "equal fractions" lessons are one line, with the lessons it came up in. Redos count too, so a skill
  // that still trips them up after the lesson shows here.
  const tips = new Map<string, PracticeTip & { top: number }>();
  MISSIONS.forEach((mission, index) => {
    const record = getLearningRecord(progress, mission.id);
    const sum = (misses: Record<string, number> | undefined) => Object.values(misses ?? {}).reduce((total, count) => total + count, 0);
    const redo = sum(record.redoMisconceptions); const count = sum(record.misconceptions) + redo;
    if (count === 0) return;
    const idea = ideaForMission(mission);
    const tip = tips.get(idea.key) ?? { key: idea.key, idea: idea.heading, home: idea.home, lessons: [], lessonNumbers: [], count: 0, missionId: mission.id, lessonNumber: index + 1, standards: [], top: 0 };
    tip.count += count; if (redo) tip.inRedos = (tip.inRedos ?? 0) + redo;
    tip.lessons.push(mission.title); tip.lessonNumbers.push(index + 1);
    if (count > tip.top) Object.assign(tip, { top: count, missionId: mission.id, lessonNumber: index + 1 });
    tips.set(idea.key, tip);
  });
  const toPractice: PracticeTip[] = [...tips.values()].sort((a, b) => b.count - a.count).slice(0, 3).map(({ top: _top, ...tip }) => (
    { ...tip, standards: [...(MISSIONS[tip.lessonNumber - 1].standards ?? [])] }));

  const dueReviews = progress.reviewQueue.filter((item) => item.dueAt <= now.getTime())
    .map((item) => MISSIONS.find((mission) => mission.id === item.missionId)?.title).filter((title): title is string => !!title);
  const strengths = rows.filter((row) => row.status === 'done' && row.builds === 'On their own' && (row.firstTry ?? 0) >= 80)
    .map((row) => row.title).slice(-5);
  const next = rows.find((row) => row.status === 'started') ?? rows.find((row) => row.status === 'open');
  const codeProgress = summarizeCodeProgress(fun.codeLevels, MISSIONS.map((mission) => mission.id));
  const codeMissionRows = MISSIONS.flatMap((mission) => {
    const levelsPassed = Math.max(0, Math.min(CODE_LEVEL_COUNT, Math.floor(fun.codeLevels?.[mission.id] ?? 0)));
    return levelsPassed > 0 ? [{ id: mission.id, title: mission.title, levelsPassed }] : [];
  });
  const adaptationReasons = [...(progress.adaptationLog ?? [])]
    .sort((a, b) => b.at - a.at)
    .slice(0, 6)
    .map((event) => ({
      day: new Date(event.at).toLocaleDateString(),
      lesson: MISSIONS.find((mission) => mission.id === event.missionId)?.shortTitle ?? event.missionId,
      missionId: event.missionId, unit: MISSIONS.find((mission) => mission.id === event.missionId)?.unit ?? 0,
      reason: event.reason,
    }));

  const standardMastery = summarizeStandardMastery(progress.assessments);
  const current = next ?? [...rows].reverse().find((row) => row.status === 'done');
  return {
    lessonsDone: rows.filter((row) => row.status === 'done').length, lessonsTotal: rows.length,
    stars: Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0), xp: fun.xp, streak: shownStreak(fun, now), savedDays: fun.savedDays?.length ?? 0, spareOil: fun.spareOil ?? 0,
    codeLevelsPassed: codeProgress.levelsPassed, codeLevelsTotal: codeProgress.levelsTotal,
    codeMissionsStarted: codeProgress.missionsStarted, codeMissionsComplete: codeProgress.missionsComplete, codeMissionRows,
    week, minutesWeek: week.reduce((sum, day) => sum + day.minutes, 0), answeredWeek: week.reduce((sum, day) => sum + day.answered, 0),
    firstTryRate: pct(firstTry, tried), onOwnRate: pct(onOwn, builds),
    nextLesson: next ? `Lesson ${next.number}: ${next.title}` : null, toPractice, dueReviews, strengths, units,
    placement: progress.placement ? { unit: progress.placement.unit, date: new Date(progress.placement.at).toLocaleDateString() } : null,
    assessmentChecksCompleted: (progress.assessments ?? []).filter(attempt => !attempt.assessmentId.endsWith('-pre')).length,
    standardMastery,
    skills: buildSkills(progress, rows, standardMastery),
    grade: (current && MISSIONS[current.number - 1].gradeBand) || 3,
    month: buildMonth(progress, now),
    adaptationReasons,
    glance: buildGlance(progress, week, now),
    homeIdea: toPractice.length ? null : buildHomeIdea(rows, next),
  };
}

/** With no wrong tries to go on: the next lesson's idea (so a grown-up can prepare), or once every lesson is done, the one with the lowest first-try rate. */
function buildHomeIdea(rows: LessonRow[], next: LessonRow | undefined): HomeIdea | null {
  const weakest = rows.filter((row) => row.status === 'done' && row.firstTry !== null).sort((a, b) => a.firstTry! - b.firstTry! || a.number - b.number)[0];
  const pick = next ?? weakest;
  if (!pick) return null;
  const idea = ideaForMission(MISSIONS[pick.number - 1]);
  return { heading: idea.heading, home: idea.home, lessonNumber: pick.number, lessonTitle: pick.title, why: next ? 'next' : 'review' };
}

/** Lessons count toward a standard's steps; the Check-ins alone decide "mastered" (the existing rule). */
export function buildSkills(progress: Progress, rows: LessonRow[], mastery: StandardMastery[]): SkillRow[] {
  const definitions = getAssessmentDefinitions();
  return mastery.map((row) => {
    const info = FRACTION_STANDARDS.find((standard) => standard.id === row.standard)!;
    const lessons = MISSIONS.flatMap((mission, index) => (mission.standards ?? []).includes(row.standard) && !mission.enrichment
      ? [{ id: mission.id, number: index + 1, title: mission.title, status: rows[index].status, firstTry: rows[index].firstTry }] : []);
    let tried = 0; let firstTry = 0;
    for (const lesson of lessons) { const counts = firstTryCounts(progress, lesson.id); tried += counts.tried; firstTry += counts.firstTry; }
    const allDone = lessons.length > 0 && lessons.every((lesson) => lesson.status === 'done');
    const anyStarted = lessons.some((lesson) => lesson.status === 'done' || lesson.status === 'started');
    const step: SkillStep = row.status === 'mastered' ? 3
      : allDone && (pct(firstTry, tried) ?? 100) >= PRACTISED_FIRST_TRY ? 2
        : anyStarted ? 1 : 0;
    const lastUnit = Math.max(0, ...lessons.map((lesson) => MISSIONS[lesson.number - 1].unit));
    const unitCheck = definitions.find((item) => item.id === `unit-${lastUnit}-end` && item.standards.includes(row.standard));
    const nextRow = lessons.find((lesson) => lesson.status === 'started') ?? lessons.find((lesson) => lesson.status !== 'done');
    return {
      standard: row.standard, grade: row.grade, canDo: info.canDo, step, mastery: row, lessons,
      checkinId: unitCheck?.id ?? `grade-${row.grade}-end`,
      nextLesson: step < 2 && nextRow ? { id: nextRow.id, number: nextRow.number, title: nextRow.title, started: nextRow.status === 'started' } : null,
    };
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** The last 4 weeks (this week last), each ending on today's weekday. */
export function buildMonth(progress: Progress, now = new Date()): MonthView {
  const end = now.getTime();
  const finished = MISSIONS.map((mission) => ({ id: mission.id, at: getLearningRecord(progress, mission.id).completedAt }))
    .filter((item): item is { id: string; at: number } => typeof item.at === 'number' && item.at <= end);
  const weeks = Array.from({ length: 4 }, (_, k) => {
    const to = end - (3 - k) * 7 * DAY_MS; const from = to - 7 * DAY_MS;
    const start = new Date(from + DAY_MS);
    return {
      start: today(start), label: k === 3 ? 'This week' : start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      lessons: finished.filter((item) => item.at > from && item.at <= to).length,
    };
  });
  const monthStart = end - 28 * DAY_MS;
  const masteredBy = (time: number) => summarizeStandardMastery((progress.assessments ?? []).filter((attempt) => attempt.completedAt <= time))
    .filter((row) => row.status === 'mastered').length;
  // First-try accuracy by the week a lesson was finished, counted in whole weeks back from today.
  const byWeek = new Map<number, { tried: number; firstTry: number }>();
  for (const item of finished.filter((lesson) => lesson.at > monthStart)) {
    const week = Math.floor((end - item.at) / (7 * DAY_MS));
    const counts = firstTryCounts(progress, item.id);
    if (!counts.tried) continue;
    const total = byWeek.get(week) ?? { tried: 0, firstTry: 0 };
    byWeek.set(week, { tried: total.tried + counts.tried, firstTry: total.firstTry + counts.firstTry });
  }
  const weeksBack = [...byWeek.keys()].sort((a, b) => a - b);
  const rate = (week: number) => pct(byWeek.get(week)!.firstTry, byWeek.get(week)!.tried)!;
  return {
    weeks, lessonsFinished: finished.filter((item) => item.at > monthStart).length,
    skillsGained: Math.max(0, masteredBy(end) - masteredBy(monthStart)),
    firstTry: weeksBack.length >= 2 ? { first: rate(weeksBack[weeksBack.length - 1]), latest: rate(weeksBack[0]) } : null,
  };
}
