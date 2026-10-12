import { AREA_CUTS, pieceArea, type AreaCut } from './area-shapes';

export type PartFinderMode = 'sort' | 'group' | 'tile' | 'match';
export type PartFinderRound = {
  id: 'sort' | 'tile' | 'match';
  title: string;
  prompt: string;
  cut: AreaCut;
  targetArea: number;
  targetLabel: string;
  mode: PartFinderMode;
  comparisonCut?: AreaCut;
  /** Sort rounds: how many fair shares every piece goes into. */
  shares?: number;
};
/** Sort rounds: assignment[piece] is the share (0, 1, 2…) it was put in, or -1 when not placed yet. */
export type ShareAssignment = number[];

export const PART_FINDER_LESSONS: ReadonlySet<string> = new Set(['equal-parts', 'unit-fractions', 'equivalent-models']);

/** Three short challenges built from the same square-piece geometry as the learning lab. */
export const PART_FINDER_ROUNDS: PartFinderRound[] = [
  {
    id: 'sort',
    title: 'Make 4 fair shares',
    prompt: 'Put all 8 equal pieces into 4 shares. Each share gets 2 pieces.',
    cut: 'eighths-triangles',
    targetArea: 1 / 4,
    targetLabel: '4 fair shares',
    mode: 'sort',
    shares: 4,
  },
  {
    id: 'tile',
    title: 'Tile the whole',
    prompt: 'Pick any piece. How many copies of it would cover the whole square?',
    cut: 'quarter-and-triangles',
    targetArea: 1 / 8,
    targetLabel: 'copies of one piece',
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

/** Sort rounds: the size of each share (pieces not placed yet count toward none). */
export function shareAreas(round: PartFinderRound, assignment: ShareAssignment): number[] {
  const pieces = AREA_CUTS[round.cut];
  const areas = Array.from({ length: round.shares ?? 0 }, () => 0);
  assignment.forEach((share, index) => { if (index < pieces.length && share >= 0 && share < areas.length) areas[share] += pieceArea(pieces[index]); });
  return areas;
}

/** Accept every grouping whose total area matches the goal, regardless of the pieces' shapes. */
export function isPartFinderAnswer(round: PartFinderRound, selected: number[], answer?: number): boolean {
  const pieces = AREA_CUTS[round.cut];
  if (round.mode === 'sort') {
    const shares = round.shares ?? 0;
    if (selected.length !== pieces.length || selected.some((share) => !Number.isInteger(share) || share < 0 || share >= shares)) return false;
    return shareAreas(round, selected).every((area) => Math.abs(area - 1 / shares) < EPSILON);
  }
  if (!selected.length || selected.some((index) => !Number.isInteger(index) || index < 0 || index >= pieces.length)) return false;
  if (new Set(selected).size !== selected.length) return false;
  if (round.mode === 'tile') {
    if (selected.length !== 1 || !Number.isInteger(answer)) return false;
    const copies = Math.round(1 / pieceArea(pieces[selected[0]]));
    return Math.abs(pieceArea(pieces[selected[0]]) * copies - 1) < EPSILON && answer === copies;
  }
  return Math.abs(partFinderSelectionArea(round, selected) - round.targetArea) < EPSILON;
}

/** Size in the smallest pieces of the cut, for kid-friendly hints ("2 triangles too big"). */
const inSmallest = (round: PartFinderRound, area: number) => {
  const smallest = Math.min(...AREA_CUTS[round.cut].map(pieceArea));
  return Math.round(area / smallest);
};

export function partFinderFeedback(round: PartFinderRound, selected: number[], answer?: number): string {
  if (round.mode === 'sort') {
    const left = selected.filter((share) => share < 0).length + Math.max(0, AREA_CUTS[round.cut].length - selected.length);
    if (left === AREA_CUTS[round.cut].length) return 'Choose a share color, then tap pieces to put them in it.';
    if (left) return `${left} ${left === 1 ? 'piece is' : 'pieces are'} not in a share yet. Every piece needs a share.`;
    const fair = 1 / (round.shares ?? 1);
    const areas = shareAreas(round, selected);
    const big = areas.findIndex((area) => area > fair + EPSILON);
    if (big >= 0) return `Share ${big + 1} is too big. Move a piece to a share that is too small.`;
    const small = areas.findIndex((area) => area < fair - EPSILON);
    if (small >= 0) return `Share ${small + 1} is too small.`;
    return 'All 4 shares are the same size! Each share has 2 equal pieces.';
  }
  if (!selected.length) return 'Tap a piece to start.';
  if (round.mode === 'tile' && selected.length > 1) return 'Choose just one piece to copy.';
  if (round.mode === 'tile') {
    if (typeof answer !== 'number' || !Number.isInteger(answer)) return 'Count the copies and enter your number.';
    const piece = AREA_CUTS[round.cut][selected[0]];
    const copies = Math.round(1 / pieceArea(piece));
    if (answer === copies) return `${answer} copies of this piece fill the whole square. Each one is 1/${copies} of the square.`;
    const tip = piece.shape === 'triangle' ? 'Tip: 2 triangles fit in the small square. How many small squares fill the whole?' : 'Tip: how many small squares fit across, and how many down?';
    return `${answer < copies ? 'More copies are needed.' : 'That is too many copies.'} ${tip}`;
  }
  const area = partFinderSelectionArea(round, selected);
  if (Math.abs(area - round.targetArea) < EPSILON) {
    return round.mode === 'match'
      ? 'Two eighths cover the same area as one fourth.'
      : 'That share is one fourth. The pieces can have different shapes and still be the same size.';
  }
  const off = inSmallest(round, Math.abs(area - round.targetArea));
  const unit = AREA_CUTS[round.cut].every((piece) => piece.shape === 'triangle') ? 'triangle' : 'small piece';
  return area > round.targetArea
    ? `Too much area: ${off} ${unit}${off === 1 ? '' : 's'} too big. Tap a piece to remove it.`
    : `Not enough yet: ${off} more ${unit}${off === 1 ? '' : 's'} needed. Compare the sizes with the fourth.`;
}

export function scorePartFinderRound(score: number, solvedOnFirstCheck: boolean): number {
  return Math.max(0, Math.min(3, Math.floor(score) + (solvedOnFirstCheck ? 1 : 0)));
}
