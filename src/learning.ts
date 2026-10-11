import type { Progress } from './game';
import { answerMatches, getBuildChecks, getWorksheet, type WorksheetProblem } from './learning-content';

export type WorksheetEntry = { draft: string; checkedValue?: string; attempts: number; supported: boolean };
export type CheckEvidence = { passed: boolean; supported: boolean; attempts: number };
export type LearningRecord = {
  practiceDone?: boolean; checks: Record<string, CheckEvidence>; worksheet: Record<string, WorksheetEntry>;
  completedAt?: number; confirmedAt?: number; helpUses: number; misconceptions: Record<string, number>;
  reviewSupportedUntil?: number;
};
export const emptyLearningRecord = (): LearningRecord => ({ checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} });
export function getLearningRecord(progress: Progress, id: string): LearningRecord {
  return progress.learning?.[id] ?? emptyLearningRecord();
}
export function updateLearning(progress: Progress, id: string, record: LearningRecord): Progress {
  return { ...progress, learning: { ...progress.learning, [id]: record } };
}
export function worksheetCount(record: LearningRecord, id: string): number {
  return getWorksheet(id).filter(problem => {
    const entry = record.worksheet[problem.id];
    return entry?.checkedValue === entry?.draft && !!entry && answerMatches(problem, entry.draft);
  }).length;
}
export function hasLearningGate(progress: Progress, id: string): boolean {
  const record = getLearningRecord(progress, id);
  return !!record.practiceDone && getBuildChecks(id).every(check => record.checks[check.id]?.passed) && worksheetCount(record, id) === 12;
}
export function editWorksheet(record: LearningRecord, problemId: string, draft: string): LearningRecord {
  const old = record.worksheet[problemId] ?? { draft: '', attempts: 0, supported: false };
  return { ...record, worksheet: { ...record.worksheet, [problemId]: { ...old, draft, checkedValue: undefined } }, confirmedAt: undefined };
}
export function checkWorksheet(record: LearningRecord, problem: WorksheetProblem): LearningRecord {
  const old = record.worksheet[problem.id] ?? { draft: '', attempts: 0, supported: false };
  const correct = answerMatches(problem, old.draft);
  return { ...record,
    misconceptions: correct ? record.misconceptions : { ...record.misconceptions, [problem.hint]: (record.misconceptions[problem.hint] ?? 0) + 1 },
    worksheet: { ...record.worksheet, [problem.id]: { ...old, attempts: old.attempts + 1, supported: old.supported || !correct,
      checkedValue: correct ? old.draft : undefined } } };
}
export function learningSummary(record: LearningRecord) {
  return {
    independentChecks: Object.values(record.checks).filter(check => check.passed && !check.supported).length,
    transfer: record.checks.transfer?.passed ? record.checks.transfer.supported ? 'Passed with support' : 'Passed independently' : 'Not yet checked',
    helpUses: record.helpUses,
    misconceptions: Object.entries(record.misconceptions).sort((a, b) => b[1] - a[1]),
    retention: record.confirmedAt ? 'Confirmed on a later day' : record.completedAt ? 'Later independent review needed' : 'Finish the lesson first',
  };
}
