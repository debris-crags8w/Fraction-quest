import { CHALLENGES, challengeMaxPoints } from './challenges';
import { isMissionUnlocked, MISSIONS, type Progress } from './game';
import { getLearningRecord, hasLearningGate, worksheetCount } from './learning';
import { answerMatches, getWorksheet } from './learning-content';
import { today, type FunState } from './lib/fun';

/* The grown-ups' report: everything here is read from progress the app already saves.
   Nothing in it changes progress or lesson gating. */

export type LessonStatus = 'done' | 'started' | 'skipped' | 'open' | 'locked';
export type LessonRow = {
  id: string; number: number; title: string; status: LessonStatus; stars: number;
  worksheet: number; firstTry: number | null; builds: 'On their own' | 'With help' | 'Not yet';
  remembered: 'Yes' | 'Not yet checked' | '—'; helpUses: number;
};
export type UnitRow = { number: number; title: string; done: number; total: number; challengeBest: number | null; challengeMax: number; lessons: LessonRow[] };
export type DayRow = { day: string; label: string; minutes: number; answered: number };
export type PracticeTip = { idea: string; lessons: string[]; count: number };
export type ParentReport = {
  lessonsDone: number; lessonsTotal: number; stars: number; xp: number; streak: number;
  week: DayRow[]; minutesWeek: number; answeredWeek: number;
  /** Share of worksheet answers right on the first try (null before any are checked). */
  firstTryRate: number | null;
  /** Share of finished builds done with no hints or wrong tries. */
  onOwnRate: number | null;
  nextLesson: string | null; toPractice: PracticeTip[]; dueReviews: string[]; strengths: string[]; units: UnitRow[];
  placement: { unit: number; date: string } | null;
};

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);

function lessonRow(progress: Progress, index: number): LessonRow {
  const mission = MISSIONS[index];
  const record = getLearningRecord(progress, mission.id);
  const done = hasLearningGate(progress, mission.id);
  const checks = Object.values(record.checks).filter((check) => check.passed);
  const sheet = getWorksheet(mission.id);
  const tried = sheet.filter((problem) => (record.worksheet[problem.id]?.attempts ?? 0) > 0);
  const firstTry = tried.filter((problem) => {
    const entry = record.worksheet[problem.id];
    return entry.attempts === 1 && entry.checkedValue === entry.draft && answerMatches(problem, entry.draft);
  }).length;
  const started = record.practiceDone || tried.length > 0 || checks.length > 0;
  return {
    id: mission.id, number: index + 1, title: mission.title,
    status: done ? 'done' : started ? 'started' : progress.placement && mission.unit < progress.placement.unit ? 'skipped' : isMissionUnlocked(progress, mission.id) ? 'open' : 'locked',
    stars: progress.starsByMission[mission.id] ?? 0,
    worksheet: worksheetCount(record, mission.id),
    firstTry: pct(firstTry, tried.length),
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
    return { day, label: date.toLocaleDateString(undefined, { weekday: 'short' }), minutes: activity?.minutes ?? 0, answered: activity?.answered ?? 0 };
  });

  // Accuracy across every lesson.
  let tried = 0; let firstTry = 0; let builds = 0; let onOwn = 0;
  for (const mission of MISSIONS) {
    const record = getLearningRecord(progress, mission.id);
    for (const problem of getWorksheet(mission.id)) {
      const entry = record.worksheet[problem.id];
      if (!entry || entry.attempts === 0) continue;
      tried++;
      if (entry.attempts === 1 && entry.checkedValue === entry.draft && answerMatches(problem, entry.draft)) firstTry++;
    }
    for (const check of Object.values(record.checks)) if (check.passed) { builds++; if (!check.supported) onOwn++; }
  }

  // What tripped them up most: the same idea across lessons is one line, with the lessons it came up in.
  const tips = new Map<string, PracticeTip>();
  for (const mission of MISSIONS) {
    for (const [idea, count] of Object.entries(getLearningRecord(progress, mission.id).misconceptions)) {
      const tip = tips.get(idea) ?? { idea, lessons: [], count: 0 };
      tip.count += count; if (!tip.lessons.includes(mission.title)) tip.lessons.push(mission.title);
      tips.set(idea, tip);
    }
  }
  const toPractice = [...tips.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const dueReviews = progress.reviewQueue.filter((item) => item.dueAt <= now.getTime())
    .map((item) => MISSIONS.find((mission) => mission.id === item.missionId)?.title).filter((title): title is string => !!title);
  const strengths = rows.filter((row) => row.status === 'done' && row.builds === 'On their own' && (row.firstTry ?? 0) >= 80)
    .map((row) => row.title).slice(-5);
  const next = rows.find((row) => row.status === 'started') ?? rows.find((row) => row.status === 'open');

  return {
    lessonsDone: rows.filter((row) => row.status === 'done').length, lessonsTotal: rows.length,
    stars: Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0), xp: fun.xp, streak: fun.dayStreak,
    week, minutesWeek: week.reduce((sum, day) => sum + day.minutes, 0), answeredWeek: week.reduce((sum, day) => sum + day.answered, 0),
    firstTryRate: pct(firstTry, tried), onOwnRate: pct(onOwn, builds),
    nextLesson: next ? `Lesson ${next.number}: ${next.title}` : null, toPractice, dueReviews, strengths, units,
    placement: progress.placement ? { unit: progress.placement.unit, date: new Date(progress.placement.at).toLocaleDateString() } : null,
  };
}
