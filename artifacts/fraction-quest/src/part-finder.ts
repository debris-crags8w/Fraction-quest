import { AREA_CUTS, pieceArea, type AreaCut } from './area-shapes';

export type PartFinderMode = 'group' | 'tile' | 'match';
export type PartFinderRound = {
  id: 'share' | 'tile' | 'match';
  title: string;
  prompt: string;
  cut: AreaCut;
  targetArea: number;
  targetLabel: string;
  mode: PartFinderMode;
  comparisonCut?: AreaCut;
};

export const PART_FINDER_LESSONS: ReadonlySet<string> = new Set(['equal-parts', 'unit-fractions', 'equivalent-models']);

/** Three short challenges built from the same square-piece geometry as the learning lab. */
export const PART_FINDER_ROUNDS: PartFinderRound[] = [
  {
    id: 'share',
    title: 'Find one fair share',
    prompt: 'Choose pieces that make one fourth of the square.',
    cut: 'quarter-and-triangles',
    targetArea: 1 / 4,
    targetLabel: 'one fourth',
    mode: 'group',
  },
  {
    id: 'tile',
    title: 'Tile the whole',
    prompt: 'Pick one small triangle. How many copies cover the square?',
    cut: 'eighths-triangles',
    targetArea: 1 / 8,
    targetLabel: 'one eighth',
    mode: 'tile',
  },
  {
    id: 'match',
    title: 'Match a fourth',
    prompt: 'Choose eighths that cover the same area as one fourth.',
    cut: 'eighths-triangles',
    targetArea: 1 / 4,
    targetLabel: 'one fourth',
    mode: 'match',
    comparisonCut: 'fourths-squares',
  },
];

const EPSILON = 1e-9;

/** Area represented by valid, unique piece indices. Invalid indices contribute no area. */
export function partFinderSelectionArea(round: PartFinderRound, selected: number[]): number {
  const pieces = AREA_CUTS[round.cut];
  return [...new Set(selected)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < pieces.length)
    .reduce((sum, index) => sum + pieceArea(pieces[index]), 0);
}

/** Accept every grouping whose total area matches the goal, regardless of the pieces' shapes. */
export function isPartFinderAnswer(round: PartFinderRound, selected: number[], answer?: number): boolean {
  const pieces = AREA_CUTS[round.cut];
  if (!selected.length || selected.some((index) => !Number.isInteger(index) || index < 0 || index >= pieces.length)) return false;
  if (new Set(selected).size !== selected.length) return false;
  if (round.mode === 'tile') {
    if (selected.length !== 1 || !Number.isInteger(answer)) return false;
    const copies = Math.round(1 / pieceArea(pieces[selected[0]]));
    return Math.abs(pieceArea(pieces[selected[0]]) * copies - 1) < EPSILON && answer === copies;
  }
  return Math.abs(partFinderSelectionArea(round, selected) - round.targetArea) < EPSILON;
}

export function partFinderFeedback(round: PartFinderRound, selected: number[], answer?: number): string {
  if (!selected.length) return 'Tap a piece to start.';
  if (round.mode === 'tile' && selected.length > 1) return 'Choose just one piece to copy.';
  if (round.mode === 'tile') {
    if (typeof answer !== 'number' || !Number.isInteger(answer)) return 'Count the copies and enter your number.';
    const copies = Math.round(1 / pieceArea(AREA_CUTS[round.cut][selected[0]]));
    return answer === copies
      ? `${answer} copies of this piece fill the whole square.`
      : answer < copies ? 'More copies are needed to fill the square.' : 'That is too many copies. Count the pieces again.';
  }
  const area = partFinderSelectionArea(round, selected);
  if (Math.abs(area - round.targetArea) < EPSILON) {
    return round.mode === 'match'
      ? 'Two eighths cover the same area as one fourth.'
      : 'That share is one fourth. The pieces can have different shapes and still be the same size.';
  }
  return area > round.targetArea ? 'Too much area. Tap a piece to remove it.' : 'Not enough yet. Compare the sizes and choose another piece.';
}

export function scorePartFinderRound(score: number, solvedOnFirstCheck: boolean): number {
  return Math.max(0, Math.min(3, Math.floor(score) + (solvedOnFirstCheck ? 1 : 0)));
}
