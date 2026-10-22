// Optional state: XP, daily goal, day streak, sound and presentation preferences.
// Guests keep it on this device; signed-in accounts sync it with their saved snapshot.
// It stays separate from learning progress so it cannot alter lesson gating.

import { postHaptic } from './native-shell';
import { CODE_LEVEL_COUNT } from '../code-quest';
import { PART_FINDER_SCORE_MAX } from '../part-finder';
import { scopedStorageKey } from '../storage-scope';

const FUN_KEY = 'fraction-quest-fun-v1';
export const DAILY_GOAL = 10;

export type BreakIntervalMinutes = 0 | 10 | 15 | 20;
export type BreakPreferences = { intervalMinutes: BreakIntervalMinutes; quietMode: boolean };
/** A grown-up's daily limit on active minutes (0 is off), and minutes a grown-up added for one day. */
export type TimeLimitMinutes = 0 | 15 | 20 | 30 | 45;
export const TIME_LIMIT_CHOICES: readonly TimeLimitMinutes[] = [0, 15, 20, 30, 45];
export type TimeLimit = { minutes: TimeLimitMinutes; extra?: { day: string; minutes: number } };
export const ADD_MINUTES = 10;
export type DisplayPreferences = { textSize: 'standard' | 'large'; highContrast: boolean; reducedMotion: boolean;
  /** Holiday looks like Halloween (on unless a grown-up turns them off). */ seasonalThemes?: boolean;
  /** Story comics with Numi's friends around lessons (on unless a grown-up turns them off). */ storyMode?: boolean;
  /** Quiet music under the story films (on unless a grown-up turns it off; never with sounds off). */ storyMusic?: boolean };
const DEFAULT_BREAK_PREFERENCES: BreakPreferences = { intervalMinutes: 15, quietMode: false };
const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: true, storyMode: true, storyMusic: true };

export type FunState = {
  xp: number;
  day: string;
  answeredToday: number;
  dayStreak: number;
  lastActiveDay: string | null;
  sound: boolean;
  /** Per-day activity for the grown-ups' report: minutes active and correct answers (last 35 days). */
  activity?: Record<string, DayActivity>;
  /** Fraction Race: best time (seconds) to 10 right answers, and the fastest robot beaten (1–3), per lesson. */
  raceBest?: Record<string, number>;
  robotBeaten?: Record<string, number>;
  /** Code challenge: how many of the six independent coding levels are solved, per lesson. */
  codeLevels?: Record<string, number>;
  /** Code Sprint: best time (seconds) per lesson. */
  sprintBest?: Record<string, number>;
  /** Part Finder: best score across all rounds. Kept separate from lesson mastery. */
  partFinderBest?: number;
  /** Worksheet questions that have already earned answer XP, so replay cannot reward them again. */
  worksheetRewards?: Record<string, string[]>;
  /** Preferred local read-aloud voice ID; another device may need to use a local fallback. */
  preferredLearningVoiceId?: string;
  /** Optional break reminders; kept with preferences, separate from all lesson evidence. */
  breakPreferences?: BreakPreferences;
  /** A grown-up's daily time limit, synced with this learner profile. */
  timeLimit?: TimeLimit;
  /** Adult-configured display and motion preferences, synced with this learner profile. */
  displayPreferences?: DisplayPreferences;
  /** Lessons finished during each seasonal theme (key like "halloween-2026"), for costume unlocks only. */
  seasonLessons?: Record<string, string[]>;
  /** The Whole Stone story: whether the prologue was shown, and the choice made when each chapter opened (unit → 0 or 1). */
  story?: StoryState;
  /** The model intros (how to build, how a number line works) already watched, so they open by themselves once. */
  introsSeen?: Partial<Record<IntroKind, true>>;
  /** Lessons whose Teach first screen was read (Next tapped), so it opens by itself only the first time. */
  lessonIntrosSeen?: string[];
  /** Spare oil (story mode) or streak savers: each covers one missed day so the streak keeps going. Up to SPARE_OIL_MAX. */
  spareOil?: number;
  /** Missed days a drop covered (last 35 days). They keep the streak going but do not add to it, and are not activity. */
  savedDays?: string[];
  /** The last day a drop covered. lastActiveDay stays the last day with a right answer. */
  streakKeptUntil?: string;
  /** What to tell the child next time the map shows: a drop was used for these days, or a drop was earned. */
  oilNotice?: OilNotice;
};
export type OilNotice = { kind: 'used'; days: string[] } | { kind: 'earned'; streak: number };
/** A drop for every 7 days in a row, and the jar holds 2. */
export const SPARE_OIL_EVERY = 7;
export const SPARE_OIL_MAX = 2;
export type IntroKind = 'builder' | 'line';
export type StoryState = { prologueSeen?: boolean; choices?: Record<string, 0 | 1>; /** Suspect board guesses: board number → suspect id. */ guesses?: Record<string, string> };
const SUSPECT_IDS = ['chomp', 'pip', 'tilly', 'bolt', 'bea'];
export type DayActivity = { minutes: number; answered: number };
const KEEP_DAYS = 35;

function cleanBreakPreferences(value: unknown): BreakPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_BREAK_PREFERENCES };
  const preferences = value as Partial<BreakPreferences>;
  const intervalMinutes = [0, 10, 15, 20].includes(preferences.intervalMinutes as number)
    ? preferences.intervalMinutes as BreakIntervalMinutes
    : DEFAULT_BREAK_PREFERENCES.intervalMinutes;
  return { intervalMinutes, quietMode: typeof preferences.quietMode === 'boolean' ? preferences.quietMode : DEFAULT_BREAK_PREFERENCES.quietMode };
}
function cleanTimeLimit(value: unknown, now = new Date()): TimeLimit {
  if (!value || typeof value !== 'object') return { minutes: 0 };
  const { minutes, extra } = value as Partial<TimeLimit>;
  const limit: TimeLimit = { minutes: TIME_LIMIT_CHOICES.includes(minutes as TimeLimitMinutes) ? minutes as TimeLimitMinutes : 0 };
  if (extra && typeof extra === 'object' && extra.day === today(now) && typeof extra.minutes === 'number' && Number.isFinite(extra.minutes)) {
    limit.extra = { day: extra.day, minutes: Math.max(0, Math.min(240, Math.floor(extra.minutes))) };
  }
  return limit;
}
function cleanDisplayPreferences(value: unknown): DisplayPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_DISPLAY_PREFERENCES };
  const preferences = value as Partial<DisplayPreferences>;
  return {
    textSize: preferences.textSize === 'large' ? 'large' : 'standard',
    highContrast: preferences.highContrast === true,
    reducedMotion: preferences.reducedMotion === true,
    seasonalThemes: preferences.seasonalThemes !== false,
    storyMode: preferences.storyMode !== false,
    storyMusic: preferences.storyMusic !== false,
  };
}

export const today = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const fresh = (): FunState => ({
  xp: 0,
  day: today(),
  answeredToday: 0,
  dayStreak: 0,
  lastActiveDay: null,
  sound: true,
  worksheetRewards: {},
  breakPreferences: { ...DEFAULT_BREAK_PREFERENCES },
  displayPreferences: { ...DEFAULT_DISPLAY_PREFERENCES },
});

/** Points, streak, today's count, the day and the sound switch from saved data, checked like every other field
    (points saved as text used to show "10010" after one right answer). */
function cleanBasics(saved: Partial<FunState>): Pick<FunState, 'xp' | 'day' | 'answeredToday' | 'dayStreak' | 'lastActiveDay' | 'sound'> {
  const base = fresh();
  const count = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback);
  const dayText = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  return {
    xp: count(saved.xp, base.xp),
    day: dayText(saved.day) ?? base.day,
    answeredToday: count(saved.answeredToday, base.answeredToday),
    dayStreak: count(saved.dayStreak, base.dayStreak),
    lastActiveDay: dayText(saved.lastActiveDay),
    sound: typeof saved.sound === 'boolean' ? saved.sound : base.sound,
  };
}

/** Keep only well-formed recent days, so a bad or huge saved value can't break the report. */
function cleanActivity(value: unknown, now = new Date()): Record<string, DayActivity> {
  if (!value || typeof value !== 'object') return {};
  const oldest = new Date(now); oldest.setDate(now.getDate() - KEEP_DAYS);
  const out: Record<string, DayActivity> = {};
  for (const [day, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < today(oldest) || !raw || typeof raw !== 'object') continue;
    const { minutes, answered } = raw as Partial<DayActivity>;
    const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1440, Math.floor(n))) : 0);
    out[day] = { minutes: count(minutes), answered: count(answered) };
  }
  return out;
}
const bump = (state: FunState, key: keyof DayActivity): Record<string, DayActivity> => {
  const activity = cleanActivity(state.activity); const day = today();
  const current = activity[day] ?? { minutes: 0, answered: 0 };
  return { ...activity, [day]: { ...current, [key]: current[key] + 1 } };
};

let funStorageEnabled = true;

/** Temporarily keep local game activity in memory only (used by developer lesson previews). */
export function setFunStorageEnabled(enabled: boolean): void {
  funStorageEnabled = enabled;
}

/** A small lesson-id → number map, clamped (anything odd is dropped). */
function cleanScores(value: unknown, max: number): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(value as Record<string, unknown>)) {
    if (/^[a-z0-9-]{1,60}$/.test(id) && typeof n === 'number' && Number.isFinite(n) && n > 0) out[id] = Math.min(max, Math.round(n * 10) / 10);
  }
  return out;
}
const cleanGames = (saved: Partial<FunState>) => ({
  raceBest: cleanScores(saved.raceBest, 3600),
  robotBeaten: cleanScores(saved.robotBeaten, 3),
  codeLevels: cleanScores(saved.codeLevels, CODE_LEVEL_COUNT),
  sprintBest: cleanScores(saved.sprintBest, 3600),
  partFinderBest: typeof saved.partFinderBest === 'number' && Number.isFinite(saved.partFinderBest)
    ? Math.max(0, Math.min(PART_FINDER_SCORE_MAX, Math.floor(saved.partFinderBest)))
    : undefined,
});
function cleanWorksheetRewards(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [missionId, rawIds] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[a-z0-9-]{1,60}$/.test(missionId) || !Array.isArray(rawIds)) continue;
    const ids = [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && /^[a-z0-9-]{1,60}$/.test(id)))].slice(0, 512);
    if (ids.length) out[missionId] = ids;
  }
  return out;
}
function cleanSeasonLessons(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [key, rawIds] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[a-z]{1,20}-\d{4}$/.test(key) || !Array.isArray(rawIds)) continue;
    const ids = [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && /^[a-z0-9-]{1,60}$/.test(id)))].slice(0, 200);
    if (ids.length) out[key] = ids;
  }
  return out;
}
function cleanIntros(value: unknown): Partial<Record<IntroKind, true>> {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  return { ...(raw.builder === true ? { builder: true } : {}), ...(raw.line === true ? { line: true } : {}) } as Partial<Record<IntroKind, true>>;
}

const cleanLessonIntros = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && /^[a-z0-9-]{1,60}$/.test(id)))] : [];

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Spare oil from saved data: a count in range, recent well-formed days, and a notice that makes sense. */
function cleanOil(saved: Partial<FunState>, now = new Date()): Pick<FunState, 'spareOil' | 'savedDays' | 'streakKeptUntil' | 'oilNotice'> {
  const oldest = new Date(now); oldest.setDate(now.getDate() - KEEP_DAYS);
  const days = (value: unknown) => (Array.isArray(value) ? [...new Set(value.filter((day): day is string => typeof day === 'string' && DAY_RE.test(day)))] : []);
  const spareOil = typeof saved.spareOil === 'number' && Number.isFinite(saved.spareOil) ? Math.max(0, Math.min(SPARE_OIL_MAX, Math.floor(saved.spareOil))) : 0;
  const savedDays = days(saved.savedDays).filter((day) => day >= today(oldest)).sort();
  const streakKeptUntil = typeof saved.streakKeptUntil === 'string' && DAY_RE.test(saved.streakKeptUntil) ? saved.streakKeptUntil : undefined;
  const raw = saved.oilNotice as Partial<OilNotice & { days: unknown; streak: unknown }> | undefined;
  const noticeDays = raw?.kind === 'used' ? days(raw.days).slice(0, SPARE_OIL_MAX) : [];
  const oilNotice: OilNotice | undefined = raw?.kind === 'used' && noticeDays.length ? { kind: 'used', days: noticeDays }
    : raw?.kind === 'earned' && typeof raw.streak === 'number' && Number.isFinite(raw.streak) && raw.streak > 0 ? { kind: 'earned', streak: Math.floor(raw.streak) }
      : undefined;
  return { spareOil, savedDays, ...(streakKeptUntil ? { streakKeptUntil } : {}), ...(oilNotice ? { oilNotice } : {}) };
}

function cleanStory(value: unknown): StoryState {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Partial<StoryState>;
  const choices: Record<string, 0 | 1> = {};
  for (const [unit, choice] of Object.entries(raw.choices ?? {})) {
    if (/^\d{1,2}$/.test(unit) && (choice === 0 || choice === 1)) choices[unit] = choice;
  }
  const guesses: Record<string, string> = {};
  for (const [board, suspect] of Object.entries(raw.guesses ?? {})) {
    if (/^[12]$/.test(board) && typeof suspect === 'string' && SUSPECT_IDS.includes(suspect)) guesses[board] = suspect;
  }
  return { prologueSeen: raw.prologueSeen === true, choices, ...(Object.keys(guesses).length ? { guesses } : {}) };
}
const cleanLearningVoicePreference = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 && value.length <= 512 ? value : undefined;

/** Record a finished race: keeps the best time and the fastest robot beaten (0 = no robot / lost). */
export function recordRace(state: FunState, missionId: string, seconds: number, robotLevel: number): FunState {
  const raceBest = { ...state.raceBest }; const robotBeaten = { ...state.robotBeaten };
  if (!(raceBest[missionId] <= seconds)) raceBest[missionId] = Math.round(seconds * 10) / 10;
  if (robotLevel > (robotBeaten[missionId] ?? 0)) robotBeaten[missionId] = robotLevel;
  return saveFun({ ...state, raceBest, robotBeaten });
}

/** Record a finished Code Sprint (keeps the best time). */
export function recordSprint(state: FunState, missionId: string, seconds: number): FunState {
  if (state.sprintBest?.[missionId] !== undefined && state.sprintBest[missionId] <= seconds) return state;
  return saveFun({ ...state, sprintBest: { ...state.sprintBest, [missionId]: Math.round(seconds * 10) / 10 } });
}

/** Record a solved code level (levels count up: solving level 2 means 2 levels done). */
export function recordCodeLevel(state: FunState, missionId: string, level: number): FunState {
  const completed = Math.max(0, Math.min(CODE_LEVEL_COUNT, Math.floor(level)));
  if ((state.codeLevels?.[missionId] ?? 0) >= completed) return state;
  return saveFun({ ...state, codeLevels: { ...state.codeLevels, [missionId]: completed } });
}

/** Keep the highest completed Part Finder score in optional game state only. */
export function recordPartFinder(state: FunState, score: number): FunState {
  const completed = Math.max(0, Math.min(PART_FINDER_SCORE_MAX, Math.floor(Number.isFinite(score) ? score : 0)));
  if (state.partFinderBest !== undefined && state.partFinderBest >= completed) return state;
  return saveFun({ ...state, partFinderBest: completed });
}

export function loadFun(): FunState {
  try {
    const raw = window.localStorage.getItem(scopedStorageKey(FUN_KEY));
    const parsed = raw ? (JSON.parse(raw) as Partial<FunState>) : {};
    const saved = {
      ...fresh(),
      ...parsed,
      ...cleanBasics(parsed),
      worksheetRewards: cleanWorksheetRewards(parsed.worksheetRewards),
      preferredLearningVoiceId: cleanLearningVoicePreference(parsed.preferredLearningVoiceId),
      breakPreferences: cleanBreakPreferences(parsed.breakPreferences),
      displayPreferences: cleanDisplayPreferences(parsed.displayPreferences),
      timeLimit: cleanTimeLimit(parsed.timeLimit),
      seasonLessons: cleanSeasonLessons(parsed.seasonLessons),
      story: cleanStory(parsed.story),
      introsSeen: cleanIntros(parsed.introsSeen),
      lessonIntrosSeen: cleanLessonIntros(parsed.lessonIntrosSeen),
      ...cleanOil(parsed),
      activity: cleanActivity(parsed.activity),
      ...cleanGames(parsed),
    };
    const opened = applySpareOil(saved);
    if (opened !== saved) saveFun(opened);
    return opened.day === today() ? opened : { ...opened, day: today(), answeredToday: 0 };
  } catch {
    return fresh();
  }
}

function saveFun(state: FunState): FunState {
  if (!funStorageEnabled) return state;
  try {
    window.localStorage.setItem(scopedStorageKey(FUN_KEY), JSON.stringify(state));
  } catch {
    // Storage blocked: fun state just lasts for this tab.
  }
  return state;
}

function isYesterday(day: string | null, now = new Date()): boolean {
  if (!day) return false;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return day === today(yesterday);
}

/** The last day the streak reached: a day with a right answer, or a missed day a drop covered. */
const streakReached = (state: FunState): string | null => {
  const kept = state.streakKeptUntil ?? null;
  return kept && (!state.lastActiveDay || kept > state.lastActiveDay) ? kept : state.lastActiveDay;
};

/** The streak to show: it ends once a whole day goes by with no correct answer and no drop to cover it
    (the saved number only changes on the next answer). */
export function shownStreak(state: FunState, now = new Date()): number {
  const reached = streakReached(state);
  return reached === today(now) || isYesterday(reached, now) ? state.dayStreak : 0;
}

/** On opening the app: if whole days went by with no right answer and there are enough drops, use one per missed day
    so the streak keeps going. Not enough drops: nothing is used and the streak ends as before. */
export function applySpareOil(state: FunState, now = new Date()): FunState {
  const reached = streakReached(state);
  const oil = state.spareOil ?? 0;
  if (!reached || state.dayStreak <= 0 || oil <= 0 || reached >= today(now) || isYesterday(reached, now)) return state;
  const missed: string[] = [];
  const day = new Date(`${reached}T12:00:00`);
  for (day.setDate(day.getDate() + 1); today(day) < today(now) && missed.length <= oil; day.setDate(day.getDate() + 1)) missed.push(today(day));
  if (!missed.length || missed.length > oil) return state;
  const oldest = new Date(now); oldest.setDate(now.getDate() - KEEP_DAYS);
  const savedDays = [...new Set([...(state.savedDays ?? []), ...missed])].filter((saved) => saved >= today(oldest)).sort();
  return { ...state, spareOil: oil - missed.length, savedDays, streakKeptUntil: missed[missed.length - 1], oilNotice: { kind: 'used', days: missed } };
}

/** The notice was shown: clear it. */
export function clearOilNotice(state: FunState): FunState {
  if (!state.oilNotice) return state;
  const { oilNotice: _shown, ...rest } = state;
  return saveFun(rest);
}

/** Record one correct answer: +10 XP, one step toward the daily goal, and keep the day streak alive.
    Every SPARE_OIL_EVERY days in a row earns a drop of spare oil, while the jar has room. */
export function recordCorrect(state: FunState): FunState {
  const current = state.day === today() ? state : { ...state, day: today(), answeredToday: 0 };
  const reached = streakReached(current);
  const newDay = current.lastActiveDay !== today();
  const dayStreak = !newDay ? current.dayStreak : reached === today() || isYesterday(reached) ? current.dayStreak + 1 : 1;
  const oil = current.spareOil ?? 0;
  const earned = newDay && dayStreak % SPARE_OIL_EVERY === 0 && oil < SPARE_OIL_MAX;
  return saveFun({
    ...current, xp: current.xp + 10, answeredToday: current.answeredToday + 1, dayStreak, lastActiveDay: today(), activity: bump(current, 'answered'),
    ...(earned ? { spareOil: oil + 1, oilNotice: { kind: 'earned', streak: dayStreak } as OilNotice } : {}),
  });
}

/** Award worksheet answer XP once per distinct, saved question, even across retries and reloads. */
export function recordWorksheetCorrect(state: FunState, missionId: string, questionId: string): FunState {
  if (!/^[a-z0-9-]{1,60}$/.test(missionId) || !/^[a-z0-9-]{1,60}$/.test(questionId)) return state;
  const rewards = cleanWorksheetRewards(state.worksheetRewards);
  const existing = rewards[missionId] ?? [];
  if (existing.includes(questionId) || existing.length >= 512) return state;
  return recordCorrect({
    ...state,
    worksheetRewards: { ...rewards, [missionId]: [...existing, questionId] },
  });
}

/** One more active minute today (called while the child is using the app). */
export function recordMinute(state: FunState): FunState {
  return saveFun({ ...state, activity: bump(state, 'minutes') });
}

export function setSound(state: FunState, sound: boolean): FunState {
  return saveFun({ ...state, sound });
}

/** Save adult-configured reminders without touching lesson, reward, or game progress. */
export function setBreakPreferences(state: FunState, preferences: BreakPreferences): FunState {
  return saveFun({ ...state, breakPreferences: cleanBreakPreferences(preferences) });
}

/** A grown-up sets the daily limit (today's added minutes stay). */
export function setTimeLimit(state: FunState, minutes: TimeLimitMinutes): FunState {
  return saveFun({ ...state, timeLimit: cleanTimeLimit({ ...state.timeLimit, minutes }) });
}

/** A grown-up gives ten more minutes, for today only. */
export function addMinutesToday(state: FunState, minutes = ADD_MINUTES): FunState {
  const current = cleanTimeLimit(state.timeLimit);
  return saveFun({ ...state, timeLimit: { ...current, extra: { day: today(), minutes: (current.extra?.minutes ?? 0) + minutes } } });
}

/** Today's active minutes against the limit (with any added minutes), or null when there is no limit. */
export function timeToday(state: FunState, now = new Date()): { used: number; allowed: number; up: boolean } | null {
  const limit = cleanTimeLimit(state.timeLimit, now);
  if (!limit.minutes) return null;
  const day = today(now);
  const used = cleanActivity(state.activity, now)[day]?.minutes ?? 0;
  const allowed = limit.minutes + (limit.extra?.minutes ?? 0);
  return { used, allowed, up: used >= allowed };
}

export function setDisplayPreferences(state: FunState, preferences: DisplayPreferences): FunState {
  return saveFun({ ...state, displayPreferences: cleanDisplayPreferences(preferences) });
}

/** Remember a model intro was watched (or skipped): it won't open by itself again. Helper still has it. */
export function recordIntro(state: FunState, kind: IntroKind): FunState {
  return saveFun({ ...state, introsSeen: { ...cleanIntros(state.introsSeen), [kind]: true } });
}

/** Remember a lesson's Teach first screen was read: it stays a tap away ("How it works") but won't open by itself. */
export function recordLessonIntro(state: FunState, missionId: string): FunState {
  return saveFun({ ...state, lessonIntrosSeen: cleanLessonIntros([...(state.lessonIntrosSeen ?? []), missionId]) });
}

/** Remember story progress (the prologue, a chapter's choice). It never touches lesson progress. */
export function recordStory(state: FunState, update: { prologueSeen?: true; unit?: number; choice?: 0 | 1; board?: 1 | 2; suspect?: string }): FunState {
  const story = cleanStory(state.story);
  const choices = update.unit !== undefined && update.choice !== undefined ? { ...story.choices, [String(update.unit)]: update.choice } : story.choices;
  const guesses = update.board !== undefined && update.suspect !== undefined ? { ...story.guesses, [String(update.board)]: update.suspect } : story.guesses;
  return saveFun({ ...state, story: cleanStory({ prologueSeen: story.prologueSeen || update.prologueSeen === true, choices, guesses }) });
}

/** Count a finished lesson toward this season's costumes (each lesson once). Lesson progress is untouched. */
export function recordSeasonLesson(state: FunState, seasonKey: string, missionId: string): FunState {
  const lessons = cleanSeasonLessons(state.seasonLessons);
  const existing = lessons[seasonKey] ?? [];
  if (existing.includes(missionId) || !/^[a-z]{1,20}-\d{4}$/.test(seasonKey) || !/^[a-z0-9-]{1,60}$/.test(missionId)) return state;
  return saveFun({ ...state, seasonLessons: { ...lessons, [seasonKey]: [...existing, missionId] } });
}

/** Save a local read-aloud voice preference; signed-in app state also syncs through the account snapshot. */
export function setLearningVoicePreference(state: FunState, preferredLearningVoiceId: string): FunState {
  const preference = cleanLearningVoicePreference(preferredLearningVoiceId);
  return preference ? saveFun({ ...state, preferredLearningVoiceId: preference }) : state;
}

export function resetFun(): FunState {
  return saveFun({ ...fresh(), sound: loadFun().sound });
}

/** Clear per-lesson game results for a unit without changing global rewards or family preferences. */
export function resetMissionGameProgress(state: FunState, missionIds: ReadonlySet<string>): FunState {
  const withoutMissions = <T,>(values: Record<string, T> | undefined): Record<string, T> | undefined => {
    if (!values) return values;
    return Object.fromEntries(Object.entries(values).filter(([id]) => !missionIds.has(id)));
  };
  return saveFun({
    ...state,
    raceBest: withoutMissions(state.raceBest),
    robotBeaten: withoutMissions(state.robotBeaten),
    codeLevels: withoutMissions(state.codeLevels),
    sprintBest: withoutMissions(state.sprintBest),
  });
}

let audio: AudioContext | null = null;
/** The one audio context the app's sounds share (cues and story music), made on first use; null without Web Audio. */
export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audio ??= new Ctx();
  return audio;
}
type Cue = 'correct' | 'retry' | 'star' | 'complete' | 'impact';
const CUES: Record<Cue, number[]> = {
  correct: [660, 880],
  retry: [392, 330],
  star: [990],
  complete: [523, 659, 784, 1047],
  impact: [150, 70], // a deep "thud" for a big story moment
};

/** Short synth chimes. Silently does nothing if audio is unavailable or sound is off. */
export function playCue(cue: Cue, enabled: boolean) {
  playHaptic(cue);
  if (!enabled || typeof window === 'undefined') return;
  try {
    if (!audioContext()) return;
    const start = audio!.currentTime;
    CUES[cue].forEach((freq, index) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      const at = start + index * 0.09;
      const thud = cue === 'impact';
      osc.type = thud ? 'triangle' : 'sine'; // a soft "boop" for a miss, never a buzzer
      osc.frequency.setValueAtTime(freq, at);
      if (thud) osc.frequency.exponentialRampToValueAtTime(freq * 0.5, at + 0.3);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(cue === 'retry' ? 0.08 : thud ? 0.3 : 0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + (thud ? 0.4 : 0.22));
      osc.connect(gain).connect(audio!.destination);
      osc.start(at);
      osc.stop(at + (thud ? 0.45 : 0.25));
    });
  } catch {
    // Audio is a bonus; ignore failures.
  }
}

/** Native-only tactile feedback; browser previews and ordinary web use remain unchanged. */
export function playHaptic(cue: 'selection' | Cue) {
  postHaptic(cue);
}

/** Replace this device's fun state with one loaded from the student's account. */
export function replaceFun(saved: Partial<FunState>): FunState {
  const merged = {
    ...fresh(),
    ...saved,
    ...cleanBasics(saved),
    worksheetRewards: cleanWorksheetRewards(saved.worksheetRewards),
    preferredLearningVoiceId: cleanLearningVoicePreference(saved.preferredLearningVoiceId),
    breakPreferences: cleanBreakPreferences(saved.breakPreferences),
    displayPreferences: cleanDisplayPreferences(saved.displayPreferences),
    timeLimit: cleanTimeLimit(saved.timeLimit),
    seasonLessons: cleanSeasonLessons(saved.seasonLessons),
    story: cleanStory(saved.story),
    introsSeen: cleanIntros(saved.introsSeen),
    lessonIntrosSeen: cleanLessonIntros(saved.lessonIntrosSeen),
    ...cleanOil(saved),
    sound: loadFun().sound,
    activity: cleanActivity(saved.activity),
    ...cleanGames(saved),
  };
  const opened = applySpareOil(merged);
  return saveFun(opened.day === today() ? opened : { ...opened, day: today(), answeredToday: 0 });
}
