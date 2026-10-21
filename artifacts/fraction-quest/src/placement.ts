import { MISSIONS, type Progress } from './game';
import { getWorksheet, type WorksheetProblem } from './learning-content';
import { makeRng } from './practice-bank';

/* Placement quiz: answers built with tiles (from each unit's worksheets) to find where a child should start.
   A unit is passed only when every question in it is right. Passing units opens the next unit's lessons;
   it never marks lessons done or gives stars, so the evidence gates stay honest. */

export const PLACEMENT_UNITS = 12;      // grades 3–5: units 13–15 (applying fractions) open after unit 12 as usual
export const PER_UNIT = 3;

export type PlacementItem = { unit: number; missionId: string; problem: WorksheetProblem };

/** A worksheet row the quiz can show: bars, number lines, sets and read-only areas, never a ruler, line plot, slider
    or coloring task. */
const answerable = (problem: WorksheetProblem) => !problem.areaTask && !problem.rulerTask && !problem.linePlotTask && !problem.scaleTask
  && !/use the ruler|line plot|slider|colou?r the/i.test(problem.prompt);

/** Three questions for a unit: from its first, middle and last lessons that have rows the quiz can show. `seed` picks
    which worksheet rows. */
export function placementItems(unit: number, seed: number): PlacementItem[] {
  const lessons = MISSIONS.filter((mission) => mission.unit === unit && getWorksheet(mission.id).some(answerable));
  const picks = [lessons[0], lessons[Math.floor((lessons.length - 1) / 2)], lessons[lessons.length - 1]];
  const rng = makeRng(seed * 31 + unit);
  const asked = new Set<string>(); // lessons can share a question (or the same lesson is picked twice): never ask the same one twice
  return picks.map((mission) => {
    const sheet = getWorksheet(mission.id).filter(answerable);
    // Prefer rows that need no picture; fall back to any row (its picture is shown, read-only).
    const plain = sheet.filter((problem) => !problem.model && !problem.area);
    const pool = plain.length >= 3 ? plain : sheet;
    const fresh = pool.filter((problem) => !asked.has(`${problem.prompt}|${problem.answer}`));
    const problem = rng.pick(fresh.length ? fresh : pool);
    asked.add(`${problem.prompt}|${problem.answer}`);
    return { unit, missionId: mission.id, problem };
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
