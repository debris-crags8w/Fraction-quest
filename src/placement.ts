import { MISSIONS, type Progress } from './game';
import { getWorksheet, type WorksheetProblem } from './learning-content';
import { makeRng } from './practice-bank';

/* Placement quiz: typed answers (from each unit's worksheets) to find where a child should start.
   A unit is passed only when every question in it is right. Passing units opens the next unit's lessons;
   it never marks lessons done or gives stars, so the evidence gates stay honest. */

export const PLACEMENT_UNITS = 8;       // grades 3–4; units 9–14 open after unit 8 as usual
export const PER_UNIT = 3;

export type PlacementItem = { unit: number; missionId: string; problem: WorksheetProblem };

/** Three questions for a unit: from its first, middle and last lessons. `seed` picks which worksheet rows. */
export function placementItems(unit: number, seed: number): PlacementItem[] {
  const lessons = MISSIONS.filter((mission) => mission.unit === unit);
  const picks = [lessons[0], lessons[Math.floor((lessons.length - 1) / 2)], lessons[lessons.length - 1]];
  const rng = makeRng(seed * 31 + unit);
  return picks.map((mission) => {
    const sheet = getWorksheet(mission.id);
    // Prefer rows that need no picture; fall back to any row (the picture is shown, read-only).
    const plain = sheet.filter((problem) => !problem.model);
    const pool = plain.length >= 3 ? plain : sheet;
    return { unit, missionId: mission.id, problem: rng.pick(pool) };
  });
}

/** Where to start, given how many units in a row were passed from unit 1. */
export const startUnit = (unitsPassed: number) => Math.min(PLACEMENT_UNITS + 1, unitsPassed + 1);

/** Save the result. A retake can move the start later, never earlier (nothing gets locked again). */
export function applyPlacement(progress: Progress, unitsPassed: number, now = Date.now()): Progress {
  const unit = startUnit(unitsPassed);
  if (unit <= 1 || (progress.placement && progress.placement.unit >= unit)) return progress;
  return { ...progress, placement: { unit, at: now } };
}
