import { MISSIONS, PLACEMENT_UNITS, type Mission, type Progress } from './game';
import { standardsForMission } from './standard-catalog';
import { PLACEMENT_EXTRAS } from './placement-extras';
import { getWorksheet, type WorksheetProblem } from './learning-content';
import { makeRng } from './practice-bank';

/* Placement quiz: answers built with tiles (from each unit's worksheets) to find where a child should start.
   A unit is passed only when every question in it is right. Passing units opens the next unit's lessons;
   it never marks lessons done or gives stars, so the evidence gates stay honest. */

export { PLACEMENT_UNITS };             // defined in game.ts (it also bounds the saved start unit); grades 3–5: units 13–15 (applying fractions) open after unit 12 as usual
export const PER_UNIT = 3;

export type PlacementItem = { unit: number; missionId: string; problem: WorksheetProblem };

/** A worksheet row the quiz can show: bars, number lines, sets and read-only areas, never a ruler, line plot, slider
    or coloring task. */
const answerable = (problem: WorksheetProblem) => !problem.areaTask && !problem.rulerTask && !problem.linePlotTask && !problem.scaleTask
  && !/use the ruler|line plot|slider|colou?r the/i.test(problem.prompt);

/** The rows the quiz can ask for a lesson: its answerable worksheet rows, or (for a ruler or line plot lesson with none) its own rows from placement-extras.ts. */
const askableRows = (missionId: string) => {
  const rows = getWorksheet(missionId).filter(answerable);
  return rows.length ? rows : PLACEMENT_EXTRAS[missionId] ?? [];
};

/** The lessons a unit's three questions come from: one from each third of the unit (its start, middle and end), so the
    quiz still spans the unit. Which lesson of a third rotates with `seed`, and a lesson that brings a standard the earlier
    picks have not asked is preferred, so over many quizzes every lesson, and so every standard, is asked. */
export function placementLessons(unit: number, seed: number): Mission[] {
  const lessons = MISSIONS.filter((mission) => mission.unit === unit && askableRows(mission.id).length > 0);
  const size = lessons.length;
  const picks: Mission[] = []; const covered = new Set<string>();
  for (let third = 0; third < PER_UNIT; third++) {
    const group = lessons.slice(Math.floor((third * size) / PER_UNIT), Math.floor(((third + 1) * size) / PER_UNIT));
    const options = (group.length ? group : lessons).map((_, k, list) => list[(seed + third + k) % list.length]);
    const pick = options.find((mission) => standardsForMission(mission.id).some((standard) => !covered.has(standard))) ?? options[0];
    standardsForMission(pick.id).forEach((standard) => covered.add(standard));
    picks.push(pick);
  }
  return picks;
}

/** Three questions for a unit, one from each of `placementLessons`. `seed` picks which worksheet rows. */
export function placementItems(unit: number, seed: number): PlacementItem[] {
  const rng = makeRng(seed * 31 + unit);
  const asked = new Set<string>(); // lessons can share a question (or the same lesson is picked twice): never ask the same one twice
  return placementLessons(unit, seed).map((mission) => {
    const sheet = askableRows(mission.id);
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
