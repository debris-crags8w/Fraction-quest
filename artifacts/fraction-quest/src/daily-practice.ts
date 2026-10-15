import {
  isMissionUnlocked,
  MISSIONS,
  type AdaptationEvent,
  type AdaptiveStandardState,
  type DailyPracticeQuestion,
  type DailyPracticeSession,
  type DifficultyBand,
  type PracticeQuestion,
  type Progress,
} from './game';
import { generateQuestions, hasGenerator } from './practice-bank';
import { standardsForMission, type StandardId } from './standard-catalog';

export const DAILY_PRACTICE_LENGTH = 5;
const MAX_DAILY_QUESTIONS = 10;
const RECENT_WINDOW = 6;
const MASTERY_ACCURACY = 0.84;
const RETEACH_MISS_STREAK = 3;

export function dailyPracticeDay(now = Date.now()): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function hash(value: string): number {
  return [...value].reduce((result, character) => Math.imul(result ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
}

function targetFor(missionId: string, day: string, round = 0): Pick<DailyPracticeQuestion, 'numerator' | 'denominator'> {
  const mission = MISSIONS.find((item) => item.id === missionId);
  const source = mission?.questions[hash(`${day}:${missionId}${round ? `:${round}` : ''}`) % (mission?.questions.length ?? 1)];
  const model = source?.model;
  let numerator = 0;
  let denominator = 0;

  if (model?.kind === 'bars') {
    numerator = model.bars[0]?.numerator ?? 0;
    denominator = model.bars[0]?.denominator ?? 0;
  } else if (model?.kind === 'line') {
    numerator = model.numerator;
    denominator = model.denominator;
  } else if (model?.kind === 'set' && model.selected > 0) {
    numerator = model.selected;
    denominator = model.total;
  } else if (model?.kind === 'partition') {
    numerator = 1;
    denominator = model.parts.length;
  } else if (model?.kind === 'decimal' && model.tenths > 0) {
    numerator = model.tenths;
    denominator = 10;
  }

  if (Number.isInteger(numerator) && numerator > 0 && Number.isInteger(denominator) && denominator >= numerator && denominator <= 12) {
    return { numerator, denominator };
  }

  const index = Math.max(0, MISSIONS.findIndex((item) => item.id === missionId));
  denominator = 2 + (index % 7);
  numerator = 1 + (hash(`${missionId}:${day}:fallback${round ? `:${round}` : ''}`) % denominator);
  return { numerator, denominator };
}

/** Small fractions (halves to eighths) used when a repeated lesson runs out of new examples. */
const BEGINNER_FRACTIONS: [number, number][] = [2, 3, 4, 5, 6, 8].flatMap((d) => Array.from({ length: d - 1 }, (_, i): [number, number] => [i + 1, d]));

const missionById = (missionId: string) => MISSIONS.find((mission) => mission.id === missionId);

function lessonAccuracy(progress: Progress, missionId: string): number | null {
  const record = progress.learning?.[missionId];
  if (!record) return null;
  const rows = Object.values(record.worksheet ?? {}).filter((entry) => entry.attempts > 0);
  if (!rows.length) return null;
  const correct = rows.filter((entry) => entry.checkedValue === entry.draft).length;
  return correct / rows.length;
}

function misconceptionMisses(progress: Progress, missionId: string): number {
  const record = progress.learning?.[missionId];
  if (!record) return 0;
  return Object.values(record.misconceptions ?? {}).reduce((sum, value) => sum + value, 0)
    + Object.values(record.redoMisconceptions ?? {}).reduce((sum, value) => sum + value, 0);
}

function standardStates(progress: Progress, missionId: string): AdaptiveStandardState[] {
  const standards = missionById(missionId)?.standards ?? [];
  return standards.flatMap((standard) => {
    const state = progress.adaptiveStandards?.[standard];
    return state ? [state] : [];
  });
}

function bandForMission(progress: Progress, missionId: string): { band: DifficultyBand; reason: string } {
  const mission = missionById(missionId);
  const states = standardStates(progress, missionId);
  const highestMissStreak = states.reduce((max, state) => Math.max(max, state.streakMisses), 0);
  const allMastered = states.length > 0 && states.every((state) =>
    state.status === 'mastered' && state.accuracy >= MASTERY_ACCURACY && state.streakCorrect >= 3,
  );
  const accuracy = lessonAccuracy(progress, missionId);
  const misses = misconceptionMisses(progress, missionId);
  const title = mission?.shortTitle.toLowerCase() ?? missionId;

  if (highestMissStreak >= RETEACH_MISS_STREAK) {
    return { band: 'scaffolded', reason: `moved to scaffolded ${title} set due to ${highestMissStreak} recent misses` };
  }
  if (misses >= 3 || (accuracy !== null && accuracy < 0.5)) {
    return { band: 'scaffolded', reason: `moved to scaffolded ${title} set due to misconception trend` };
  }
  if (allMastered || (accuracy !== null && accuracy >= 0.9 && misses === 0)) {
    const rate = states[0] ? Math.round(states[0].accuracy * 100) : Math.round((accuracy ?? 0.9) * 100);
    return { band: 'transfer', reason: `moved to transfer ${title} set due to high recent accuracy (${rate}%)` };
  }
  return { band: 'grade-level', reason: '' };
}

function transferMissionFor(progress: Progress, missionId: string, token: string): string | null {
  const source = missionById(missionId);
  const sourceStandards = new Set(source?.standards ?? []);
  const candidates = MISSIONS.filter((mission) =>
    mission.id !== missionId
    && isMissionUnlocked(progress, mission.id)
    && hasGenerator(mission.id)
    && mission.standards?.some((standard) => !sourceStandards.has(standard)),
  );
  if (!candidates.length) return null;
  return candidates[hash(token) % candidates.length].id;
}

function questionKind(missionId: string, index: number, day: string, band: DifficultyBand): DailyPracticeQuestion['kind'] {
  if (band === 'scaffolded') return 'build';
  if (band === 'transfer') return hasGenerator(missionId) ? 'choice' : 'build';
  return index % 2 === 0 && hasGenerator(missionId) ? 'choice' : 'build';
}

function adaptiveTarget(question: Pick<DailyPracticeQuestion, 'numerator' | 'denominator'>, band: DifficultyBand) {
  if (band === 'scaffolded') {
    const denominator = Math.max(2, Math.min(6, question.denominator));
    return { numerator: Math.max(1, Math.min(question.numerator, denominator)), denominator };
  }
  if (band === 'transfer') {
    const denominator = Math.max(6, question.denominator);
    const numerator = Math.max(1, Math.min(denominator, question.numerator + (denominator >= 8 ? 1 : 0)));
    return { numerator, denominator: Math.min(12, denominator) };
  }
  return question;
}

function makeDailyQuestion({
  progress, missionId, day, index, round, band, reason, reteachLoop = false, idSuffix = '',
}: {
  progress: Progress;
  missionId: string;
  day: string;
  index: number;
  round: number;
  band: DifficultyBand;
  reason: string;
  reteachLoop?: boolean;
  idSuffix?: string;
}): DailyPracticeQuestion {
  const mission = missionById(missionId)!;
  const baseTarget = targetFor(missionId, day, round);
  const target = adaptiveTarget(baseTarget, band);
  const modelKind = band === 'scaffolded'
    ? 'bar' as const
    : (index + hash(day)) % 2 === 0 ? 'bar' as const : 'number-line' as const;
  const kind = questionKind(missionId, index, day, band);
  const standards = (mission.standards ?? standardsForMission(missionId)) as StandardId[];
  return {
    kind,
    ...(kind === 'choice' ? { seed: hash(`${day}:${missionId}:${index}:${idSuffix}`) } : {}),
    id: `${round ? `daily-${day}-${missionId}-${round + 1}` : `daily-${day}-${missionId}`}${idSuffix}`,
    missionId,
    topicTitle: mission.shortTitle,
    standards,
    difficultyBand: band,
    ...(reason ? { adaptationReason: reason } : {}),
    ...(reteachLoop ? { reteachLoop: true } : {}),
    modelKind,
    numerator: target.numerator,
    denominator: target.denominator,
    explanation: modelKind === 'bar'
      ? `${target.denominator} equal parts make one whole. ${target.numerator} ${target.numerator === 1 ? 'part is' : 'parts are'} shaded, so the fraction is ${target.numerator}/${target.denominator}.`
      : `The line from 0 to 1 has ${target.denominator} equal spaces. ${target.numerator} jump${target.numerator === 1 ? '' : 's'} land at ${target.numerator}/${target.denominator}.`,
  };
}

/** Deterministic for the day so returning learners resume the same five topics and values. */
export function createDailyPractice(progress: Progress, now = Date.now()): DailyPracticeSession {
  const day = dailyPracticeDay(now);
  const due = progress.reviewQueue
    .filter((item) => item.dueAt <= now)
    .sort((first, second) => first.dueAt - second.dueAt)
    .map((item) => item.missionId);

  const misconceptionTopics = Object.entries(progress.learning ?? {})
    .map(([missionId, record]) => ({
      missionId,
      misses: Object.values(record.misconceptions ?? {}).reduce((sum, count) => sum + count, 0),
    }))
    .filter((item) => item.misses > 0)
    .sort((first, second) => second.misses - first.misses)
    .map((item) => item.missionId);

  const learnerEvidence = Object.entries(progress.learning ?? {})
    .filter(([missionId, record]) =>
      !progress.completedMissionIds.includes(missionId)
      && !record.completedAt
      && (record.practiceDone || Object.keys(record.checks ?? {}).length > 0 || Object.keys(record.worksheet ?? {}).length > 0),
    )
    .sort((first, second) => {
      const firstRecord = progress.learning?.[first[0]];
      const secondRecord = progress.learning?.[second[0]];
      const firstEvidence = Object.keys(firstRecord?.worksheet ?? {}).length + Object.keys(firstRecord?.checks ?? {}).length;
      const secondEvidence = Object.keys(secondRecord?.worksheet ?? {}).length + Object.keys(secondRecord?.checks ?? {}).length;
      return secondEvidence - firstEvidence;
    })
    .map(([missionId]) => missionId);

  const completed = MISSIONS
    .filter((mission) => progress.completedMissionIds.includes(mission.id))
    .sort((first, second) =>
      (progress.learning?.[first.id]?.completedAt ?? 0) - (progress.learning?.[second.id]?.completedAt ?? 0),
    );
  if (completed.length > 1) {
    const rotation = hash(day) % completed.length;
    completed.push(...completed.splice(0, rotation));
  }

  // Lessons the child has worked on come first; the rest is filled only from lessons they can open,
  // never from lessons that are still locked. A new learner repeats their open lesson with new numbers.
  const orderedIds = [...new Set([
    ...due,
    ...misconceptionTopics,
    ...learnerEvidence,
    ...completed.map((mission) => mission.id),
    ...MISSIONS.filter((mission) => isMissionUnlocked(progress, mission.id)).map((mission) => mission.id),
  ])].filter((missionId) => MISSIONS.some((mission) => mission.id === missionId));
  const pool = orderedIds.length ? orderedIds : [MISSIONS[0].id];
  const picks = Array.from({ length: DAILY_PRACTICE_LENGTH }, (_, index) => pool[index % pool.length]);
  const seen: string[] = [];
  const questions = picks.map((pickId, index) => {
    const { band, reason } = bandForMission(progress, pickId);
    const missionId = band === 'transfer'
      ? transferMissionFor(progress, pickId, `${day}:${index}:${pickId}`) ?? pickId
      : pickId;
    const round = picks.slice(0, index).filter((id) => id === missionId).length;
    const question = makeDailyQuestion({ progress, missionId, day, index, round, band, reason });
    let target = { numerator: question.numerator, denominator: question.denominator };
    // Repeated lessons get a fraction not already used today.
    for (let tries = 1; seen.includes(`${target.numerator}/${target.denominator}`) && tries < 12; tries++) target = targetFor(missionId, day, round + tries * 7);
    if (seen.includes(`${target.numerator}/${target.denominator}`)) {
      const fresh = BEGINNER_FRACTIONS.filter(([n, d]) => !seen.includes(`${n}/${d}`));
      const [n, d] = fresh[hash(`${day}:${index}`) % fresh.length];
      target = { numerator: n, denominator: d };
    }
    seen.push(`${target.numerator}/${target.denominator}`);
    return { ...question, numerator: target.numerator, denominator: target.denominator };
  });

  return { day, startedAt: now, questions, index: 0, attempts: {} };
}

/** The practice question behind a 'choice' item (the same seed always gives the same question). */
export function dailyChoiceQuestion(question: DailyPracticeQuestion): PracticeQuestion | null {
  if (question.kind !== 'choice' || question.seed === undefined || !hasGenerator(question.missionId)) return null;
  return generateQuestions(question.missionId, [], question.seed, 1)[0] ?? null;
}

/** A build is right when the shaded share of the chosen parts equals the target (3 of 5, or 6 of 10, for 3/5). */
export const dailyBuildCorrect = (question: DailyPracticeQuestion, parts: number | undefined, shaded: number) =>
  !!parts && shaded > 0 && shaded * question.denominator === question.numerator * parts;

function logAdaptiveEvent(progress: Progress, event: AdaptationEvent): Progress {
  const current = progress.adaptationLog ?? [];
  const duplicate = current.some((saved) =>
    saved.standard === event.standard
    && saved.band === event.band
    && saved.missionId === event.missionId
    && saved.reason === event.reason
    && Math.abs(saved.at - event.at) < 12 * 60 * 60 * 1000,
  );
  if (duplicate) return progress;
  return { ...progress, adaptationLog: [...current, event].slice(-120) };
}

function recordAdaptiveStandards(progress: Progress, question: DailyPracticeQuestion, correct: boolean, now: number): Progress {
  const standards = (question.standards?.length ? question.standards : standardsForMission(question.missionId)) as StandardId[];
  if (!standards.length) return progress;
  const nextStates = { ...(progress.adaptiveStandards ?? {}) };
  let updated = progress;
  for (const standard of standards) {
    const previous = nextStates[standard];
    const recent = [...(previous?.recent ?? []), correct].slice(-RECENT_WINDOW);
    const accuracy = recent.filter(Boolean).length / recent.length;
    const streakCorrect = correct ? (previous?.streakCorrect ?? 0) + 1 : 0;
    const streakMisses = correct ? 0 : (previous?.streakMisses ?? 0) + 1;
    const status = streakMisses >= RETEACH_MISS_STREAK || (recent.length >= 4 && accuracy < 0.5)
      ? 'not-yet'
      : (recent.length >= 5 && streakCorrect >= 3 && accuracy >= MASTERY_ACCURACY)
          ? 'mastered'
          : recent.length >= 2 ? 'developing' : previous?.status ?? 'not-yet';
    nextStates[standard] = { status, recent, accuracy, streakCorrect, streakMisses, lastUpdatedAt: now };
    if (streakMisses >= RETEACH_MISS_STREAK) {
      updated = logAdaptiveEvent(updated, {
        at: now,
        missionId: question.missionId,
        standard,
        band: 'scaffolded',
        reason: `moved to scaffolded ${question.topicTitle.toLowerCase()} set due to ${streakMisses} recent misses`,
      });
    } else if (status === 'mastered' && accuracy >= MASTERY_ACCURACY && streakCorrect >= 3) {
      updated = logAdaptiveEvent(updated, {
        at: now,
        missionId: question.missionId,
        standard,
        band: 'transfer',
        reason: `moved to transfer ${question.topicTitle.toLowerCase()} set due to high recent accuracy (${Math.round(accuracy * 100)}%)`,
      });
    }
  }
  return { ...updated, adaptiveStandards: nextStates };
}

function injectReteachQuestion(progress: Progress, session: DailyPracticeSession, index: number, reason: string): DailyPracticeSession {
  const current = session.questions[index];
  const next = session.questions[index + 1];
  if (!current || (next?.reteachLoop && next.missionId === current.missionId)) return session;
  const round = session.questions.slice(0, index + 1).filter((question) => question.missionId === current.missionId).length;
  const reteach = makeDailyQuestion({
    progress,
    missionId: current.missionId,
    day: session.day,
    index: index + 1,
    round,
    band: 'scaffolded',
    reason,
    reteachLoop: true,
    idSuffix: `-rt-${hash(`${session.day}:${current.id}:${round}`) % 999}`,
  });
  const questions = [...session.questions.slice(0, index + 1), reteach, ...session.questions.slice(index + 1)];
  if (questions.length > MAX_DAILY_QUESTIONS) questions.pop();
  return { ...session, questions };
}

function upgradeNextQuestion(progress: Progress, session: DailyPracticeSession, index: number, reason: string): DailyPracticeSession {
  const nextIndex = index + 1;
  if (nextIndex >= session.questions.length) return session;
  const current = session.questions[index];
  const existing = session.questions[nextIndex];
  if (existing.difficultyBand === 'transfer') return session;
  const missionId = transferMissionFor(progress, current.missionId, `${session.day}:${current.id}:transfer`) ?? existing.missionId;
  const round = session.questions.slice(0, nextIndex).filter((question) => question.missionId === missionId).length;
  const replacement = makeDailyQuestion({
    progress,
    missionId,
    day: session.day,
    index: nextIndex,
    round,
    band: 'transfer',
    reason,
    idSuffix: `-x${hash(`${existing.id}:${missionId}`) % 99}`,
  });
  return { ...session, questions: session.questions.map((question, at) => (at === nextIndex ? replacement : question)) };
}

/** Applies per-answer adaptation: updates standard mastery state, logs adaptation reasons, and updates next items. */
export function applyAdaptiveDailyPracticeUpdate(progress: Progress, nextSession: DailyPracticeSession, now = Date.now()): Progress {
  const previous = progress.dailyPractice;
  let nextProgress: Progress = { ...progress, dailyPractice: nextSession };
  if (!previous) return nextProgress;

  const answered = nextSession.questions.find((question) => {
    const before = previous.attempts[question.id];
    const after = nextSession.attempts[question.id];
    return !before?.answerChecked && !!after?.answerChecked;
  });
  if (!answered) return nextProgress;
  const outcome = !!nextSession.attempts[answered.id]?.answerCorrect;
  nextProgress = recordAdaptiveStandards(nextProgress, answered, outcome, now);

  const answeredIndex = nextSession.questions.findIndex((question) => question.id === answered.id);
  if (answeredIndex < 0) return nextProgress;
  const { band, reason } = bandForMission(nextProgress, answered.missionId);
  let adaptedSession = nextProgress.dailyPractice ?? nextSession;
  if (!outcome && band === 'scaffolded') adaptedSession = injectReteachQuestion(nextProgress, adaptedSession, answeredIndex, reason);
  if (outcome && band === 'transfer') adaptedSession = upgradeNextQuestion(nextProgress, adaptedSession, answeredIndex, reason);
  return { ...nextProgress, dailyPractice: adaptedSession };
}
