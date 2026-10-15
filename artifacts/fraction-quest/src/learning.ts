import type { Progress } from './game';
import { answerMatches, getBuildChecks, getBuildPracticeChecks, getWorksheet, type BuildCheck, type WorksheetProblem } from './learning-content';

export type WorksheetEntry = { draft: string; checkedValue?: string; attempts: number; supported: boolean };
export type CheckEvidence = { passed: boolean; supported: boolean; attempts: number };
export type LearningRecord = {
  practiceDone?: boolean; checks: Record<string, CheckEvidence>; worksheet: Record<string, WorksheetEntry>;
  completedAt?: number; confirmedAt?: number; helpUses: number; misconceptions: Record<string, number>;
  reviewSupportedUntil?: number;
  /** Stars earned in practice (on screen or on paper), used when the lesson is finished. */
  practiceStars?: number;
  /** A practice-only second try at a finished part. See RedoAttempt. */
  redo?: RedoAttempt;
  /** How many redos were started (each gets new numbers) and finished. */
  redoRounds?: number;
  redosFinished?: number;
  /** Mistakes made during redos (same keys as `misconceptions`). Kept apart so first-try results never change. */
  redoMisconceptions?: Record<string, number>;
};
export type RedoPart = 'worksheet' | 'builds';
/** A second try at a finished lesson's worksheet or builds, with new numbers. It is kept apart from the lesson's own
    answers, so it never changes completion, unlocks, stars or the parent report's first-try results. */
export type RedoAttempt = {
  part: RedoPart; round: number; startedAt: number;
  worksheet: Record<string, WorksheetEntry>; checks: Record<string, CheckEvidence>;
  /** Single worksheet rows the child swapped for a new question ("New question"), and how many times. */
  rowRounds: Record<string, number>;
  finishedAt?: number;
};
export const emptyLearningRecord = (): LearningRecord => ({ checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} });
export function getLearningRecord(progress: Progress, id: string): LearningRecord {
  return progress.learning?.[id] ?? emptyLearningRecord();
}
export function updateLearning(progress: Progress, id: string, record: LearningRecord): Progress {
  return { ...progress, learning: { ...progress.learning, [id]: record } };
}

/** Clear one unit's lesson evidence while preserving progress and practice from every other unit. */
export function resetUnitLearningProgress(progress: Progress, missionIds: ReadonlySet<string>, unit: number): Progress {
  const learning = Object.fromEntries(Object.entries(progress.learning ?? {}).filter(([id]) => !missionIds.has(id)));
  const starsByMission = Object.fromEntries(Object.entries(progress.starsByMission).filter(([id]) => !missionIds.has(id)));
  const dailyPractice = progress.dailyPractice;
  const keptDailyQuestions = dailyPractice?.questions.filter((question) => !missionIds.has(question.missionId));
  const removedDailyQuestionIds = new Set(
    dailyPractice?.questions.filter((question) => missionIds.has(question.missionId)).map((question) => question.id) ?? [],
  );
  const keptBeforeCurrent = dailyPractice
    ? dailyPractice.questions.slice(0, dailyPractice.index).filter((question) => !missionIds.has(question.missionId)).length
    : 0;
  const attempts = dailyPractice
    ? Object.fromEntries(Object.entries(dailyPractice.attempts).filter(([id]) => !removedDailyQuestionIds.has(id)))
    : undefined;
  const nextDailyPractice = dailyPractice && keptDailyQuestions?.length
    ? { ...dailyPractice, questions: keptDailyQuestions, index: Math.min(keptBeforeCurrent, keptDailyQuestions.length), attempts: attempts ?? dailyPractice.attempts }
    : undefined;

  return {
    ...progress,
    completedMissionIds: progress.completedMissionIds.filter((id) => !missionIds.has(id)),
    starsByMission,
    learning,
    reviewQueue: progress.reviewQueue.filter((item) => !missionIds.has(item.missionId)),
    challengeBest: Object.fromEntries(Object.entries(progress.challengeBest ?? {}).filter(([savedUnit]) => savedUnit !== String(unit))),
    ...(nextDailyPractice ? { dailyPractice: nextDailyPractice } : { dailyPractice: undefined }),
  };
}

export type TargetedPracticePlan = {
  signal: string;
  difficultyBand: 'scaffolded' | 'grade-level' | 'transfer';
  reason: string;
  problems: WorksheetProblem[];
};
const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
};
/** Repeated errors add three fresh, lesson-aligned problems to the existing worksheet record. */
export function targetedPracticePlans(id: string, record: LearningRecord): TargetedPracticePlan[] {
  const checkedRows = Object.values(record.worksheet ?? {}).filter((entry) => entry.attempts > 0);
  const checkedCorrect = checkedRows.filter((entry) => entry.checkedValue === entry.draft).length;
  const accuracy = checkedRows.length ? checkedCorrect / checkedRows.length : null;
  return Object.entries(record.misconceptions)
    .filter(([, count]) => count >= 2)
    .sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b))
    .map(([signal, count]) => {
      const hash = stableHash(`${id}:${signal}`);
      const difficultyBand: TargetedPracticePlan['difficultyBand'] = count >= 3 || (accuracy !== null && accuracy < 0.5)
        ? 'scaffolded'
        : 'grade-level';
      const reason = difficultyBand === 'scaffolded'
        ? `scaffolded due to ${count} repeated misses`
        : 'grade-level targeted practice';
      const sheet = getWorksheet(id, 1 + (hash % 997));
      const terms = signal.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
      const related = sheet
        .map((problem) => ({
          problem,
          score: terms.reduce((total, term) => total + Number(`${problem.prompt} ${problem.hint}`.toLowerCase().includes(term)), 0),
        }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score);
      const picked = (related.length >= 3 ? related.map((row) => row.problem) : sheet).slice(0, 3);
      const key = hash.toString(36);
      return {
        signal,
        difficultyBand,
        reason,
        problems: picked.map((problem, index) => ({ ...problem, id: `rt-${key}-${index + 1}` })),
      };
    });
}
export function targetedPracticeCount(id: string, record: LearningRecord) {
  const plans = targetedPracticePlans(id, record);
  const problems = plans.flatMap((plan) => plan.problems);
  return { done: problems.filter((problem) => rowCorrect(problem, record.worksheet[problem.id])).length, total: problems.length };
}
export function worksheetCount(record: LearningRecord, id: string): number {
  return getWorksheet(id).filter(problem => {
    const entry = record.worksheet[problem.id];
    return entry?.checkedValue === entry?.draft && !!entry && answerMatches(problem, entry.draft);
  }).length;
}
/** Keep the newly added required check from re-locking lessons completed before it existed. */
export function requiredBuildChecks(progress: Progress, id: string): BuildCheck[] {
  const record = getLearningRecord(progress, id);
  const completedBeforeApplyStep = progress.completedMissionIds.includes(id)
    && typeof record.completedAt === 'number'
    && !record.checks.apply?.passed;
  return getBuildChecks(id).filter(check => !(completedBeforeApplyStep && check.id === 'apply'));
}
export function hasLearningGate(progress: Progress, id: string): boolean {
  const record = getLearningRecord(progress, id);
  const reteach = targetedPracticeCount(id, record);
  return !!record.practiceDone && requiredBuildChecks(progress, id).every(check => record.checks[check.id]?.passed)
    && worksheetCount(record, id) === 12 && reteach.done === reteach.total;
}
/** A lesson's steps as a fraction, for its badge on the map: each build check, then the worksheet. */
export function lessonSteps(progress: Progress, id: string): { done: number; total: number } {
  const checks = requiredBuildChecks(progress, id);
  const total = checks.length + 1;
  if (hasLearningGate(progress, id)) return { done: total, total };
  const record = getLearningRecord(progress, id);
  const done = checks.filter(check => record.checks[check.id]?.passed).length + (worksheetCount(record, id) === 12 ? 1 : 0);
  return { done: Math.min(done, total - 1), total };
}
export function editWorksheet(record: LearningRecord, problemId: string, draft: string): LearningRecord {
  const old = record.worksheet[problemId] ?? { draft: '', attempts: 0, supported: false };
  return { ...record, worksheet: { ...record.worksheet, [problemId]: { ...old, draft, checkedValue: undefined } }, confirmedAt: undefined };
}
export function checkWorksheet(record: LearningRecord, problem: WorksheetProblem, trackMisconception = true): LearningRecord {
  const old = record.worksheet[problem.id] ?? { draft: '', attempts: 0, supported: false };
  const correct = answerMatches(problem, old.draft);
  return { ...record,
    misconceptions: correct || !trackMisconception ? record.misconceptions : { ...record.misconceptions, [problem.hint]: (record.misconceptions[problem.hint] ?? 0) + 1 },
    worksheet: { ...record.worksheet, [problem.id]: { ...old, attempts: old.attempts + 1, supported: old.supported || !correct,
      checkedValue: correct ? old.draft : undefined } } };
}
export function learningSummary(record: LearningRecord) {
  return {
    independentChecks: Object.values(record.checks).filter(check => check.passed && !check.supported).length,
    transfer: record.checks.transfer?.passed ? record.checks.transfer.supported ? 'Done with help' : 'Done on my own' : 'Not yet',
    helpUses: record.helpUses,
    misconceptions: Object.entries(record.misconceptions).sort((a, b) => b[1] - a[1]),
    retention: record.confirmedAt ? 'Remembered on a later day' : record.completedAt ? 'Check again another day' : 'Finish the lesson first',
  };
}

/** Start a redo of a finished part. Every redo uses new numbers. */
export function startRedo(record: LearningRecord, part: RedoPart, now = Date.now()): LearningRecord {
  const round = (record.redoRounds ?? 0) + 1;
  return { ...record, redoRounds: round, redo: { part, round, startedAt: now, worksheet: {}, checks: {}, rowRounds: {} } };
}
/** The redo worksheet: the lesson's question types with new numbers; a swapped row gets its own new numbers. */
export function redoWorksheet(id: string, redo: RedoAttempt): WorksheetProblem[] {
  return getWorksheet(id, redo.round).map((row, i) => {
    const bump = redo.rowRounds[row.id] ?? 0;
    return bump ? getWorksheet(id, redo.round + bump * 13)[i] : row;
  });
}
const rowCorrect = (p: WorksheetProblem, entry?: WorksheetEntry) => !!entry && entry.checkedValue === entry.draft && answerMatches(p, entry.draft);
export function redoWorksheetCount(id: string, redo: RedoAttempt): number {
  return redoWorksheet(id, redo).filter(p => rowCorrect(p, redo.worksheet[p.id])).length;
}
/** Two new builds from the lesson's optional question bank (not the builds the child already did). */
export function redoChecks(id: string, round: number): BuildCheck[] {
  const batch = Math.max(0, Math.floor(round) - 1);
  return getBuildPracticeChecks(id, batch).slice(0, 2).map((check, index) => ({
    ...check, id: `redo-${index + 1}`, transfer: index === 1, stepLabel: `Redo build ${index + 1}`,
  }));
}
export function redoDone(id: string, redo: RedoAttempt): boolean {
  return redo.part === 'worksheet'
    ? redoWorksheetCount(id, redo) === 12
    : redoChecks(id, redo.round).every(c => redo.checks[c.id]?.passed);
}
/** Check one redo worksheet row. A wrong answer is also remembered for the grown-ups' "Worth practicing" list. */
export function checkRedoRow(record: LearningRecord, problem: WorksheetProblem): LearningRecord {
  if (!record.redo) return record;
  const checked = checkWorksheet({ ...emptyLearningRecord(), worksheet: record.redo.worksheet }, problem);
  const wrong = !answerMatches(problem, record.redo.worksheet[problem.id]?.draft ?? '');
  const misses = record.redoMisconceptions ?? {};
  return { ...record, redo: { ...record.redo, worksheet: checked.worksheet },
    redoMisconceptions: wrong ? { ...misses, [problem.hint]: (misses[problem.hint] ?? 0) + 1 } : record.redoMisconceptions };
}
/** Mark the redo finished (counted once). */
export function finishRedo(record: LearningRecord, now = Date.now()): LearningRecord {
  if (!record.redo || record.redo.finishedAt) return record;
  return { ...record, redosFinished: (record.redosFinished ?? 0) + 1, redo: { ...record.redo, finishedAt: now } };
}
