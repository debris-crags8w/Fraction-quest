/* Seasonal themes: the same lessons in a costume. A theme only changes the look, Numi's outfit and a short
   story line; it never changes a question, an answer or a model, and grown-ups can turn it off. */

import type { FunState } from './lib/fun';
import type { ModelSpec } from './game';

export type SeasonId = 'halloween';
export type Costume = { id: 'bat-wings' | 'glow-hat'; name: string; lessons: number };
export type Season = {
  id: SeasonId;
  /** One key per season per year, so costumes are earned fresh each Halloween. */
  key: string;
  title: string;
  /** What points are called while the theme is on. */
  points: string;
  costumes: Costume[];
};

const HALLOWEEN_COSTUMES: Costume[] = [
  { id: 'bat-wings', name: "Numi's bat wings", lessons: 3 },
  { id: 'glow-hat', name: 'the glow-in-the-dark hat', lessons: 5 },
];

/** The season on this date, ignoring preferences. Halloween runs for all of October. */
export function seasonOn(now = new Date()): Season | null {
  if (now.getMonth() === 9) {
    return { id: 'halloween', key: `halloween-${now.getFullYear()}`, title: 'Spooky fraction night', points: 'candy', costumes: HALLOWEEN_COSTUMES };
  }
  return null;
}

/** The season to show: none when a grown-up turned seasonal themes off. */
export function activeSeason(fun: Pick<FunState, 'displayPreferences'> | null | undefined, now = new Date()): Season | null {
  if (fun?.displayPreferences?.seasonalThemes === false) return null;
  return seasonOn(now);
}

/** Lessons finished during this season (each lesson counts once). */
export const seasonLessonCount = (fun: Pick<FunState, 'seasonLessons'> | null | undefined, season: Season) =>
  fun?.seasonLessons?.[season.key]?.length ?? 0;

export const unlockedCostumes = (season: Season, lessons: number) => season.costumes.filter((costume) => lessons >= costume.lessons);
export const nextCostume = (season: Season, lessons: number) => season.costumes.find((costume) => lessons < costume.lessons) ?? null;

/** Numi's story line for a question: a little Halloween scene that fits the picture, never a hint. */
const LINES: Record<SeasonId, Partial<Record<ModelSpec['kind'], string[]>> & { other: string[] }> = {
  halloween: {
    bars: ['The bats got into my pumpkin bars!', 'Help me share the spooky chocolate bar.', 'This candy bar came from a haunted house!'],
    partition: ['Let’s cut the pumpkin pie fairly.', 'The ghosts want fair shares of cake!'],
    area: ['A haunted garden needs fair plots.', 'Help me cut this monster-size brownie.'],
    line: ['Help the frog hop across the moonlit swamp!', 'Follow the path to the haunted house.'],
    set: ['Let’s count the trick-or-treat candy!', 'How many ghosts are in this group?'],
    decimal: ['The witch’s potion needs careful measuring.'],
    equation: ['Crack the code to open the spooky door.'],
    other: ['Happy Halloween! Let’s solve this one.'],
  },
};
export function seasonLine(season: Season, kind: ModelSpec['kind'] | undefined, id: string): string {
  const lines = (kind && LINES[season.id][kind]) || LINES[season.id].other;
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return lines[hash % lines.length];
}
