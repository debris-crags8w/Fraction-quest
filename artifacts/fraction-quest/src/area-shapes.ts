/* Square "area" models: one whole square cut into pieces that may have different shapes.
   Kids learn that equal parts are the same SIZE, not always the same SHAPE, and that a fraction
   can be colored in more than one way (1 small square, or 2 triangles). Pure data, so it can be tested. */

export type Point = [number, number];
/** A region of the unit square (0..1 on both axes). */
export type Piece = { points: Point[]; shape: 'square' | 'rect' | 'triangle' };
export type AreaCut =
  | 'fourths-squares' | 'fourths-strips' | 'fourths-triangles' | 'fourths-mixed'
  | 'fourths-unequal' | 'strips-unequal' | 'quarter-and-triangles' | 'eighths-triangles' | 'halves-triangles';
export type AreaFigure = { cut: AreaCut; shaded?: number[] };
/** Color pieces that add up to n/d of the square. `avoid` pieces can't be used ("color it a different way"). */
export type AreaTask = { n: number; d: number; avoid?: number[] };

const sq = (x: number, y: number, w: number, h: number, shape: Piece['shape'] = w === h ? 'square' : 'rect'): Piece =>
  ({ points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], shape });
const tri = (...points: Point[]): Piece => ({ points, shape: 'triangle' });

export const AREA_CUTS: Record<AreaCut, Piece[]> = {
  'fourths-squares': [sq(0, 0, .5, .5), sq(.5, 0, .5, .5), sq(0, .5, .5, .5), sq(.5, .5, .5, .5)],
  'fourths-strips': [sq(0, 0, .25, 1), sq(.25, 0, .25, 1), sq(.5, 0, .25, 1), sq(.75, 0, .25, 1)],
  'fourths-triangles': [tri([0, 0], [1, 0], [.5, .5]), tri([1, 0], [1, 1], [.5, .5]), tri([1, 1], [0, 1], [.5, .5]), tri([0, 1], [0, 0], [.5, .5])],
  // Two small squares on the left, two big triangles on the right: all four are 1/4.
  'fourths-mixed': [sq(0, 0, .5, .5), sq(0, .5, .5, .5), tri([.5, 0], [1, 0], [.5, 1]), tri([1, 0], [1, 1], [.5, 1])],
  // Four pieces, but the cross is off-center, so they are not fourths.
  'fourths-unequal': [sq(0, 0, .65, .6, 'rect'), sq(.65, 0, .35, .6, 'rect'), sq(0, .6, .65, .4, 'rect'), sq(.65, .6, .35, .4, 'rect')],
  'strips-unequal': [sq(0, 0, .4, 1), sq(.4, 0, .2, 1), sq(.6, 0, .2, 1), sq(.8, 0, .2, 1)],
  // Like a classic worksheet: one quarter is a small square, the other quarters are cut into 2 triangles each.
  'quarter-and-triangles': [
    sq(0, 0, .5, .5),
    tri([.5, 0], [1, 0], [1, .5]), tri([.5, 0], [1, .5], [.5, .5]),
    tri([0, .5], [.5, .5], [.5, 1]), tri([0, .5], [.5, 1], [0, 1]),
    tri([.5, .5], [1, .5], [1, 1]), tri([.5, .5], [1, 1], [.5, 1]),
  ],
  'eighths-triangles': [
    tri([0, 0], [.5, 0], [.5, .5]), tri([0, 0], [.5, .5], [0, .5]), tri([.5, 0], [1, 0], [1, .5]), tri([.5, 0], [1, .5], [.5, .5]),
    tri([0, .5], [.5, .5], [.5, 1]), tri([0, .5], [.5, 1], [0, 1]), tri([.5, .5], [1, .5], [1, 1]), tri([.5, .5], [1, 1], [.5, 1]),
  ],
  'halves-triangles': [tri([0, 0], [1, 0], [0, 1]), tri([1, 0], [1, 1], [0, 1])],
};

/** Piece size as a share of the square (shoelace formula). */
export function pieceArea(piece: Piece): number {
  const p = piece.points;
  return Math.abs(p.reduce((sum, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return sum + x * y2 - x2 * y; }, 0)) / 2;
}
/** Every cut covers the whole square exactly once (checked in tests). */
export const cutTotal = (cut: AreaCut) => AREA_CUTS[cut].reduce((sum, piece) => sum + pieceArea(piece), 0);
export const allEqual = (cut: AreaCut) => { const sizes = AREA_CUTS[cut].map(pieceArea); return sizes.every((s) => Math.abs(s - sizes[0]) < 1e-9); };
export const shadedArea = (cut: AreaCut, shaded: number[]) => [...new Set(shaded)].reduce((sum, i) => sum + pieceArea(AREA_CUTS[cut][i]), 0);

/** Did the child color exactly n/d of the square, without using pieces they were asked to avoid? */
export function areaTaskDone(cut: AreaCut, task: AreaTask, shaded: number[]): boolean {
  if (!shaded.length || shaded.some((i) => task.avoid?.includes(i))) return false;
  return Math.abs(shadedArea(cut, shaded) - task.n / task.d) < 1e-9;
}

/** Short feedback while coloring: how much is colored so far, in eighths or the task's own pieces. */
export function areaFeedback(cut: AreaCut, task: AreaTask, shaded: number[]): string {
  if (shaded.some((i) => task.avoid?.includes(i))) return 'Try a different way: leave the small square white.';
  if (!shaded.length) return `Color pieces that make ${task.n}/${task.d} of the square.`;
  if (areaTaskDone(cut, task, shaded)) return `You colored ${task.n}/${task.d}! Now type the answer.`;
  const eighths = Math.round(shadedArea(cut, shaded) * 8);
  const goal = (task.n / task.d) * 8;
  return eighths > goal ? 'Too much. Tap a piece to take it away.' : 'Not enough yet. Compare the sizes of the pieces.';
}

export const areaLabel = (cut: AreaCut, shaded: number[] = []) =>
  `A square cut into ${AREA_CUTS[cut].length} pieces: ${describeShapes(cut)}${shaded.length ? `, ${shaded.length} shaded` : ''}`;
function describeShapes(cut: AreaCut): string {
  const count = (shape: Piece['shape']) => AREA_CUTS[cut].filter((p) => p.shape === shape).length;
  return [['square', count('square')], ['rectangle', count('rect')], ['triangle', count('triangle')]]
    .filter(([, n]) => n).map(([name, n]) => `${n} ${name}${n === 1 ? '' : 's'}`).join(', ');
}
