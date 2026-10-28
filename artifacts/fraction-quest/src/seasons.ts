/* Seasonal themes: the same lessons in a costume. A theme only changes the look, Numi's outfit and a short
   story line; it never changes a question, an answer or a model, and grown-ups can turn it off. */

import type { FunState } from './lib/fun';
import type { ModelSpec } from './game';
import { MONTH_THEMES, type MonthCostumeId, type MonthTheme, type MonthThemeId } from './month-themes';

export type HolidaySeasonId = 'halloween' | 'christmas';
export type SeasonId = HolidaySeasonId | MonthThemeId;
export type Costume = {
  id: 'bat-wings' | 'glow-hat' | 'scarf' | 'twinkle-hat' | MonthCostumeId;
  /** Finishes "unlock ..." and "for ..." in the banner and the reward card. */
  name: string;
  /** Finishes "Numi with ..." in the dressed mascot's screen-reader name. */
  label: string;
  lessons: number;
};
export type Season = {
  id: SeasonId;
  /** One key per season per year, so costumes are earned fresh each Halloween. */
  key: string;
  title: string;
  /** The season's name for kickers ("Halloween costume"), and the line once every costume is earned. */
  name: string;
  greeting: string;
  /** The reward heading's first line ("Spooky good!"). */
  cheer: string;
  /** What points are called while the theme is on. */
  points: string;
  costumes: Costume[];
  /** A month theme's map colours (the two holidays paint the map in season.css instead). */
  map?: MonthTheme['map'];
  /** A month theme's one story line, used for every kind of question. */
  line?: string;
};

const HALLOWEEN_COSTUMES: Costume[] = [
  { id: 'bat-wings', name: "Numi's bat wings", label: 'bat wings', lessons: 3 },
  { id: 'glow-hat', name: 'the glow-in-the-dark hat', label: 'a glow-in-the-dark hat', lessons: 5 },
];

const CHRISTMAS_COSTUMES: Costume[] = [
  { id: 'scarf', name: "Numi's striped scarf", label: 'a striped scarf', lessons: 3 },
  { id: 'twinkle-hat', name: 'the twinkling Santa hat', label: 'a twinkling Santa hat', lessons: 5 },
];

/** A month theme as a season: the same parts as a holiday, with its two costumes. Its cheer is its greeting. */
const monthSeason = (theme: MonthTheme, year: number): Season => ({
  id: theme.id, key: `${theme.id}-${year}`, title: theme.title, name: theme.name, greeting: theme.greeting, cheer: theme.greeting,
  points: theme.points, costumes: theme.costumes, map: theme.map, line: theme.line,
});

/** The season on this date, ignoring preferences. Halloween runs for all of October, Christmas for all of December,
    and every other month has its own theme (month-themes.ts), so there is always one. */
export function seasonOn(now = new Date()): Season | null {
  const year = now.getFullYear();
  if (now.getMonth() === 9) {
    return { id: 'halloween', key: `halloween-${year}`, title: 'Spooky fraction night', name: 'Halloween', greeting: 'Happy Halloween!', cheer: 'Spooky good!', points: 'candy', costumes: HALLOWEEN_COSTUMES };
  }
  if (now.getMonth() === 11) {
    return { id: 'christmas', key: `christmas-${year}`, title: 'Snowy fraction nights', name: 'Christmas', greeting: 'Merry Christmas!', cheer: 'Merry and bright!', points: 'candy canes', costumes: CHRISTMAS_COSTUMES };
  }
  const theme = MONTH_THEMES.find((item) => item.month === now.getMonth());
  return theme ? monthSeason(theme, year) : null;
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
const LINES: Record<HolidaySeasonId, Partial<Record<ModelSpec['kind'], string[]>> & { other: string[] }> = {
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
  christmas: {
    bars: ['Help me share this peppermint bar.', 'The elves cut a candy cane bar. Let’s look!', 'This chocolate bar came in my stocking!'],
    partition: ['Let’s cut the Christmas cake fairly.', 'The reindeer want fair shares of the cookies!'],
    area: ['Let’s cut the gingerbread house walls fairly.', 'Help me share this big tray of fudge.'],
    line: ['Help the frog hop across the frozen pond!', 'Follow the sleigh tracks in the snow.'],
    set: ['Let’s count the ornaments on the tree!', 'How many presents are in this group?'],
    decimal: ['The hot cocoa needs careful measuring.'],
    equation: ['Crack the code to open the present.'],
    other: ['Merry Christmas! Let’s solve this one.'],
  },
};
export function seasonLine(season: Season, kind: ModelSpec['kind'] | undefined, id: string): string {
  if (season.line) return season.line;
  const lines = (kind && LINES[season.id as HolidaySeasonId][kind]) || LINES[season.id as HolidaySeasonId].other;
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return lines[hash % lines.length];
}
