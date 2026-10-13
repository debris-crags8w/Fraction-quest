import {
  EMPTY_PROGRESS,
  MISSIONS,
  isMissionUnlocked,
  type Progress as WebProgress,
} from '../../fraction-quest/src/game';
import {
  answerMatches,
  getBuildChecks,
  getWorksheet,
  type BuildCheck,
  type LearningModel,
  type WorksheetProblem,
} from '../../fraction-quest/src/learning-content';
import {
  checkWorksheet,
  emptyLearningRecord,
  getLearningRecord,
  hasLearningGate,
  targetedPracticeCount,
  targetedPracticePlans,
  updateLearning,
  worksheetCount,
  type LearningRecord,
} from '../../fraction-quest/src/learning';

export { MISSIONS, answerMatches, checkWorksheet, emptyLearningRecord, getBuildChecks, getLearningRecord,
  getWorksheet, hasLearningGate, targetedPracticeCount, targetedPracticePlans, updateLearning, worksheetCount };
export type { BuildCheck, LearningModel, LearningRecord, WorksheetProblem };
export type { WebProgress };

export const UNIT_INFO = [
  { title: 'Meet fractions', subtitle: 'Fair shares, fraction names, and unit fractions' },
  { title: 'Fractions in groups', subtitle: 'Find equal shares and parts of collections' },
  { title: 'Size and landmarks', subtitle: 'Estimate with zero, one-half, and one whole' },
  { title: 'Fraction number lines', subtitle: 'Mark equal jumps, including past one' },
  { title: 'Compare and order', subtitle: 'Use equal pieces and benchmarks to reason' },
  { title: 'Equivalent fractions', subtitle: 'Rename an amount without changing its size' },
  { title: 'Put fractions together', subtitle: 'Compose, decompose, and go beyond one' },
  { title: 'Operations and decimals', subtitle: 'Add, subtract, and connect fractions to decimals' },
  { title: 'Rename and compare', subtitle: 'Grades 3–5 · Whole numbers as fractions and equivalent names' },
  { title: 'Mixed numbers and amounts', subtitle: 'Grades 4–5 · Unlike denominators, mixed numbers, and estimates' },
  { title: 'Multiply and divide', subtitle: 'Grades 4–5 · Unit fractions, scaling, multiplication, and sharing' },
  { title: 'Fractions in measurement', subtitle: 'Grades 3–5 · Rulers, line plots, conversions, and stories' },
  { title: 'Fraction models in context', subtitle: 'Grade 3 and 5 · Equal-area shapes and fractional-side area; chance is bonus' },
  { title: 'Fractions and decimals', subtitle: 'Grades 4–5 · Decimal comparison; percent is bonus' },
] as const;

export type SavedProgress = {
  learning: Record<string, LearningRecord>;
  practiceIndexByMission: Record<string, number>;
  legacyCompletedCount: number;
};

export const EMPTY_SAVED_PROGRESS: SavedProgress = {
  learning: {},
  practiceIndexByMission: {},
  legacyCompletedCount: 0,
};

export const toWebProgress = (saved: SavedProgress): WebProgress => ({
  ...EMPTY_PROGRESS,
  learning: saved.learning,
});

export function isLessonComplete(saved: SavedProgress, missionId: string): boolean {
  return hasLearningGate(toWebProgress(saved), missionId);
}

export function isLessonOpen(saved: SavedProgress, missionId: string): boolean {
  return isMissionUnlocked(toWebProgress(saved), missionId);
}

export function getLessonRecord(saved: SavedProgress, missionId: string): LearningRecord {
  return getLearningRecord(toWebProgress(saved), missionId);
}

export function cleanSavedProgress(value: unknown): SavedProgress {
  if (!value || typeof value !== 'object') {
    throw new Error('Saved progress is not in a readable format.');
  }
  const raw = value as Partial<SavedProgress> & { completedLessonIds?: unknown[] };
  if (raw.learning !== undefined && (!raw.learning || typeof raw.learning !== 'object' || Array.isArray(raw.learning))) {
    throw new Error('Saved learning records could not be read.');
  }
  const validIds = new Set(MISSIONS.map((mission) => mission.id));
  const learning: Record<string, LearningRecord> = {};
  for (const [id, record] of Object.entries(raw.learning ?? {})) {
    if (validIds.has(id) && record && typeof record === 'object') {
      learning[id] = { ...emptyLearningRecord(), ...record } as LearningRecord;
    }
  }
  const practiceIndexByMission: Record<string, number> = {};
  for (const [id, index] of Object.entries(raw.practiceIndexByMission ?? {})) {
    if (validIds.has(id) && Number.isInteger(index) && (index as number) >= 0) {
      practiceIndexByMission[id] = Math.min(index as number, MISSIONS.find((mission) => mission.id === id)?.questions.length ?? 0);
    }
  }
  return {
    learning,
    practiceIndexByMission,
    legacyCompletedCount: Number.isInteger(raw.legacyCompletedCount) && (raw.legacyCompletedCount ?? -1) >= 0
      ? raw.legacyCompletedCount!
      : Array.isArray(raw.completedLessonIds) ? raw.completedLessonIds.length : 0,
  };
}

export function findFirstUnfinishedPractice(missionId: string, saved: SavedProgress): number {
  return saved.practiceIndexByMission[missionId] ?? 0;
}

export function worksheetAndBuilds(missionId: string): { worksheet: WorksheetProblem[]; checks: BuildCheck[] } {
  return { worksheet: getWorksheet(missionId), checks: getBuildChecks(missionId) };
}
