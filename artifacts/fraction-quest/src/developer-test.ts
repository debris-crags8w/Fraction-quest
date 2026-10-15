import { MISSIONS, type Progress } from './game';
import { getLearningRecord, resetUnitLearningProgress } from './learning';

/**
 * Build an isolated progress snapshot that opens one lesson as if its prerequisites were passed.
 * The caller must keep this snapshot in memory only; it is for developer testing, not learner progress.
 */
export function createDeveloperLessonProgress(progress: Progress, missionId: string, now = Date.now()): Progress | null {
  const targetIndex = MISSIONS.findIndex((mission) => mission.id === missionId);
  if (targetIndex < 0) return null;

  const target = MISSIONS[targetIndex];
  const isolated = resetUnitLearningProgress(progress, new Set([missionId]), target.unit);
  const prerequisites = MISSIONS.slice(0, targetIndex);
  const completedMissionIds = new Set(isolated.completedMissionIds);
  const learning = { ...isolated.learning };

  for (const mission of prerequisites) {
    completedMissionIds.add(mission.id);
    const record = getLearningRecord(isolated, mission.id);
    learning[mission.id] = { ...record, completedAt: record.completedAt ?? now };
  }

  return {
    ...isolated,
    completedMissionIds: [...completedMissionIds],
    learning,
  };
}
