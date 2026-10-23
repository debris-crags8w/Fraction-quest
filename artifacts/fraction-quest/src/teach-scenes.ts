/* The animated Teach first: each lesson step (and "Why it works") shows a short picture that plays once, then rests
   on its last frame. A step is a list of frames; each frame is the whole picture, and the screen slides from one to
   the next (bars cut, a checker moves, parts light up). Pure data, so every scene is checked by tests. Lessons
   without a scene keep the text card. */
import type { AreaCut } from './area-shapes';

/** One bar, cut into parts of these relative widths. */
export type BarRow = {
  kind: 'bar';
  parts: number[];
  /** The cut lines show (before this, it is one uncut bar). */
  cut?: boolean;
  /** Parts colored in (the fraction's parts). */
  shaded?: number[];
  /** Parts counted so far: each shows its number. */
  counted?: number[];
  /** Parts that glow orange (the part that is too big). */
  glow?: number[];
  /** Parts with a tick above (they fit the checker). */
  ticks?: number[];
  /** The dashed size checker sits over this part (null: no checker). */
  checker?: number | null;
  /** The checker's width, in the parts' units (default: the first part). */
  checkerSize?: number;
  /** A bracket under the bar, with this label ("1 whole"). */
  bracket?: string;
  /** A line above the bar ("Fair: every part fits"), colored by tone. */
  label?: string;
  tone?: 'fair' | 'unfair';
  hidden?: boolean;
};
/** A shape cut into pieces (squares, triangles, circle sectors), from the area models. */
export type AreaRow = {
  kind: 'area';
  cut: AreaCut;
  /** The inside edges show. */
  edges?: boolean;
  shaded?: number[];
  counted?: number[];
  glow?: number[];
  label?: string;
  tone?: 'fair' | 'unfair';
  hidden?: boolean;
};
/** A number line from 0 to `max` wholes, each whole cut into `spaces` equal spaces. Positions count spaces from 0. */
export type LineRow = {
  kind: 'line';
  max: number;
  spaces: number;
  /** The inside tick marks show (before this, only the whole numbers). */
  cut?: boolean;
  /** Jump arcs drawn from 0, one per space. */
  jumps?: number;
  /** A dot at this many spaces from 0, with an optional label above it. */
  point?: number | null;
  pointLabel?: string;
  /** Labels under the line at these values (in spaces): benchmarks like 1/2. */
  marks?: { at: number; label: string }[];
  /** A colored stretch from 0 to this many spaces (something being measured). */
  stretch?: number;
  /** Xs stacked above ticks: [space, how many]. */
  xs?: [number, number][];
  /** Draw it as a ruler (inches under the whole numbers). */
  ruler?: boolean;
  label?: string;
  tone?: 'fair' | 'unfair';
  hidden?: boolean;
};
/** A sentence under the picture; fractions in it are shown stacked. */
export type TextRow = { kind: 'text'; text: string; hidden?: boolean };
/** Two pictures side by side. */
export type PairRow = { kind: 'pair'; items: [BarRow | AreaRow, BarRow | AreaRow]; hidden?: boolean };
export type SceneRow = BarRow | AreaRow | LineRow | TextRow | PairRow;

/** One frame: the whole picture, held for `ms` before the next one (the last frame stays). */
export type SceneFrame = { rows: SceneRow[]; ms: number };
export type StepScene = SceneFrame[];
/** A lesson's scenes: one per step, then "Why it works". */
export type LessonScene = { steps: StepScene[]; why: StepScene };

type Patch = Record<number, Partial<SceneRow>>;
/** A scene from its first picture and the changes after it: [ms to wait, { row: changes }]. */
export function play(start: SceneRow[], ...beats: [number, Patch][]): StepScene {
  const frames: SceneFrame[] = [{ rows: start, ms: 0 }];
  for (const [ms, patch] of beats) {
    const last = frames[frames.length - 1]!;
    last.ms = ms; // hold the frame before for this long
    frames.push({ rows: last.rows.map((row, index) => (patch[index] ? ({ ...row, ...patch[index] } as SceneRow) : row)), ms: 0 });
  }
  return frames;
}

/** How long a scene takes to reach its last frame. */
export const sceneLength = (scene: StepScene) => scene.reduce((total, frame) => total + frame.ms, 0);

const four = [1, 1, 1, 1];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const ones = (n: number) => Array.from({ length: n }, () => 1);
/** Beats that count parts 1, 2, 3 ... on row `row` (optionally coloring them in as they are counted). */
const countUp = (row: number, n: number, ms = 420, shade = false): [number, Patch][] =>
  range(n).map((i): [number, Patch] => [ms, { [row]: shade ? { counted: range(i + 1), shaded: range(i + 1) } : { counted: range(i + 1) } }]);
/** Beats that draw jump arcs 1, 2, 3 ... on number line `row`. */
const jumpUp = (row: number, n: number, ms = 380, from = 0): [number, Patch][] =>
  range(n - from).map((i): [number, Patch] => [ms, { [row]: { jumps: from + i + 1 } }]);
/** The 1/2 label under a 0-to-1 line (0 and 1 are already labeled). */
const halfMarks = (spaces: number) => [{ at: spaces / 2, label: '1/2' }];
const fourthMarks = [{ at: 1, label: '1/4' }, { at: 2, label: '2/4' }, { at: 3, label: '3/4' }];

export const LESSON_SCENES: Record<string, LessonScene> = {
  'equal-parts': {
    steps: [
      // Look at one whole: the bar arrives, a bracket draws under it, then its name.
      play([{ kind: 'bar', parts: [1], hidden: true }, { kind: 'text', text: 'The whole is the whole bar. We will share it.', hidden: true }],
        [500, { 0: { hidden: false } }],
        [800, { 0: { bracket: '1 whole' } }],
        [600, { 1: { hidden: false } }]),
      // Same size: cuts drop in, a checker the size of one part slides across; on an unfair bar it doesn't fit.
      play([
        { kind: 'bar', parts: four, label: 'Fair: every part fits the checker', tone: 'fair' },
        { kind: 'bar', parts: [2, 1, 1, 1], label: 'Not fair: one part is too big', tone: 'unfair', hidden: true },
      ],
        [500, { 0: { cut: true } }],
        [700, { 0: { checker: 0, ticks: [0] } }],
        [700, { 0: { checker: 1, ticks: [0, 1] } }],
        [700, { 0: { checker: 2, ticks: [0, 1, 2] } }],
        [700, { 0: { checker: 3, ticks: [0, 1, 2, 3] } }],
        [700, { 0: { checker: null }, 1: { hidden: false, cut: true } }],
        [700, { 1: { checker: 0, checkerSize: 1 } }],
        [600, { 1: { glow: [0] } }]),
      // Count to name them: parts light up one at a time, then the name, stacked.
      play([{ kind: 'bar', parts: four, cut: true }, { kind: 'text', text: '4 equal parts are fourths. One part is 1/4.', hidden: true }],
        [500, { 0: { counted: [0] } }],
        [450, { 0: { counted: [0, 1] } }],
        [450, { 0: { counted: [0, 1, 2] } }],
        [450, { 0: { counted: [0, 1, 2, 3] } }],
        [600, { 1: { hidden: false } }]),
    ],
    // Why: a fair pizza is fourths; an unfair one is not.
    why: play([{ kind: 'pair', hidden: true, items: [
      { kind: 'area', cut: 'circle-fourths', edges: true, shaded: [0], label: 'Fair: 1/4', tone: 'fair' },
      { kind: 'area', cut: 'circle-unequal', edges: true, glow: [0], label: 'Not fourths', tone: 'unfair' },
    ] }],
    [400, { 0: { hidden: false } }]),
  },

  'fraction-names': {
    steps: [
      // The denominator: count the equal parts in one whole.
      play([{ kind: 'bar', parts: four }, { kind: 'text', text: '4 equal parts in one whole: the denominator is 4.', hidden: true }],
        [500, { 0: { cut: true } }],
        [450, { 0: { counted: [0] } }],
        [450, { 0: { counted: [0, 1] } }],
        [450, { 0: { counted: [0, 1, 2] } }],
        [450, { 0: { counted: [0, 1, 2, 3] } }],
        [600, { 1: { hidden: false } }]),
      // The numerator: color the parts you count.
      play([{ kind: 'bar', parts: four, cut: true }, { kind: 'text', text: '3 parts are colored: the numerator is 3.', hidden: true }],
        [500, { 0: { shaded: [0], counted: [0] } }],
        [500, { 0: { shaded: [0, 1], counted: [0, 1] } }],
        [500, { 0: { shaded: [0, 1, 2], counted: [0, 1, 2] } }],
        [600, { 1: { hidden: false } }]),
      // Say it: 3 out of 4 equal parts.
      play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1, 2], bracket: '4 equal parts' }, { kind: 'text', text: '3/4 is 3 out of 4 equal parts.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    // Why: the bottom number sets the size; more parts in the same whole are smaller.
    why: play([
      { kind: 'bar', parts: four, cut: true, shaded: [0], label: 'Fourths: 1/4', tone: 'fair' },
      { kind: 'bar', parts: [1, 1, 1, 1, 1, 1, 1, 1], label: 'Eighths: 1/8 is smaller', tone: 'fair', hidden: true },
    ],
    [600, { 1: { hidden: false } }],
    [600, { 1: { cut: true } }],
    [600, { 1: { shaded: [0] } }]),
  },

  'unit-fractions': {
    steps: [
      // Count the equal parts.
      play([{ kind: 'bar', parts: [1, 1, 1, 1, 1, 1] }],
        [500, { 0: { cut: true } }],
        ...range(6).map((i): [number, Patch] => [380, { 0: { counted: range(i + 1) } }])),
      // That number is the denominator.
      play([{ kind: 'bar', parts: [1, 1, 1, 1, 1, 1], cut: true, counted: range(6), bracket: '6 equal parts' }, { kind: 'text', text: '6 equal parts: the denominator is 6.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // One part: 1 on top.
      play([{ kind: 'bar', parts: [1, 1, 1, 1, 1, 1], cut: true }, { kind: 'text', text: 'One part is 1/6.', hidden: true }],
        [500, { 0: { shaded: [0] } }],
        [600, { 1: { hidden: false } }]),
    ],
    // Why: a unit fraction is always one part, whatever the size.
    why: play([
      { kind: 'bar', parts: [1, 1, 1], cut: true, shaded: [0], label: '1/3', hidden: true },
      { kind: 'bar', parts: four, cut: true, shaded: [0], label: '1/4', hidden: true },
      { kind: 'bar', parts: [1, 1, 1, 1, 1, 1], cut: true, shaded: [0], label: '1/6', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }],
    [400, { 2: { hidden: false } }]),
  },

  'fraction-of-area': {
    steps: [
      // Same amount of space: two small squares and two triangles, each a fourth of the square.
      play([{ kind: 'area', cut: 'fourths-mixed' }, { kind: 'text', text: 'Different shapes, same size: each part covers 1/4 of the square.', hidden: true }],
        [500, { 0: { edges: true } }],
        [500, { 0: { glow: [0] } }],
        [500, { 0: { glow: [1] } }],
        [500, { 0: { glow: [2] } }],
        [500, { 0: { glow: [3] } }],
        [600, { 0: { glow: [] }, 1: { hidden: false } }]),
      // Count all the parts: the denominator.
      play([{ kind: 'area', cut: 'fourths-mixed', edges: true }, { kind: 'text', text: '4 equal parts: the denominator is 4.', hidden: true }],
        ...range(4).map((i): [number, Patch] => [450, { 0: { counted: range(i + 1) } }]),
        [600, { 1: { hidden: false } }]),
      // Count the shaded parts: the numerator.
      play([{ kind: 'area', cut: 'fourths-mixed', edges: true }, { kind: 'text', text: '2 parts are shaded: 2/4.', hidden: true }],
        [500, { 0: { shaded: [0], counted: [0] } }],
        [500, { 0: { shaded: [0, 2], counted: [0, 2] } }],
        [600, { 1: { hidden: false } }]),
    ],
    // Why: the shape doesn't matter, the space does.
    why: play([{ kind: 'pair', hidden: true, items: [
      { kind: 'area', cut: 'fourths-mixed', edges: true, shaded: [2], label: 'Fourths', tone: 'fair' },
      { kind: 'area', cut: 'fourths-unequal', edges: true, glow: [0], label: 'Not fourths', tone: 'unfair' },
    ] }],
    [400, { 0: { hidden: false } }]),
  },
  // Unit 2 · Part size
  'unit-size': {
    steps: [
      // Look at the denominators: thirds and sixths of the same whole.
      play([
        { kind: 'bar', parts: ones(3), label: '1/3: the whole cut into 3 parts', hidden: true },
        { kind: 'bar', parts: ones(6), label: '1/6: the same whole cut into 6 parts', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [500, { 0: { cut: true } }],
      [600, { 1: { hidden: false } }],
      [500, { 1: { cut: true } }]),
      // More parts in the same whole: smaller parts.
      play([{ kind: 'bar', parts: ones(3), cut: true, label: 'Thirds' }, { kind: 'bar', parts: ones(6), cut: true, label: 'Sixths' }, { kind: 'text', text: '6 parts are smaller than 3 parts of the same whole.', hidden: true }],
        [500, { 0: { shaded: [0] } }],
        [600, { 1: { shaded: [0] } }],
        [600, { 2: { hidden: false } }]),
      // The smaller denominator is the bigger part.
      play([{ kind: 'bar', parts: ones(3), cut: true, shaded: [0], label: '1/3' }, { kind: 'bar', parts: ones(6), cut: true, shaded: [0], label: '1/6' }, { kind: 'text', text: '3 is less than 6, so 1/3 > 1/6.', hidden: true }],
        [500, { 0: { glow: [0] } }],
        [700, { 0: { glow: [] }, 2: { hidden: false } }]),
    ],
    // Why: cut the same bar again and again; each part gets smaller.
    why: play([
      { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2', hidden: true },
      { kind: 'bar', parts: four, cut: true, shaded: [0], label: '1/4', hidden: true },
      { kind: 'bar', parts: ones(8), cut: true, shaded: [0], label: '1/8', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }],
    [400, { 2: { hidden: false } }]),
  },

  'compare-same-numerator': {
    steps: [
      // The numerators match: 3 parts each.
      play([{ kind: 'bar', parts: four, cut: true, label: '3/4' }, { kind: 'bar', parts: ones(8), cut: true, label: '3/8' }, { kind: 'text', text: 'Both count 3 parts.', hidden: true }],
        ...range(3).map((i): [number, Patch] => [450, { 0: { counted: range(i + 1), shaded: range(i + 1) }, 1: { counted: range(i + 1), shaded: range(i + 1) } }]),
        [600, { 2: { hidden: false } }]),
      // The smaller denominator has bigger parts.
      play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1, 2], label: 'Fourths: bigger parts' }, { kind: 'bar', parts: ones(8), cut: true, shaded: [0, 1, 2], label: 'Eighths: smaller parts' }],
        [500, { 0: { glow: [0] } }],
        [500, { 0: { glow: [] }, 1: { glow: [0] } }],
        [500, { 1: { glow: [] } }]),
      // With a sign.
      play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1, 2], label: '3/4' }, { kind: 'bar', parts: ones(8), cut: true, shaded: [0, 1, 2], label: '3/8' }, { kind: 'text', text: '3/4 > 3/8. The open side faces the bigger amount.', hidden: true }],
        [600, { 2: { hidden: false } }]),
    ],
    why: play([
      { kind: 'bar', parts: ones(3), cut: true, shaded: [0, 1], label: '2/3', hidden: true },
      { kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], label: '2/6', hidden: true },
      { kind: 'text', text: 'Same count, bigger parts: 2/3 > 2/6.', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }],
    [500, { 2: { hidden: false } }]),
  },

  // Unit 3 · Benchmarks
  'benchmark-half': {
    steps: [
      // Half of the denominator: half of 8 parts is 4.
      play([{ kind: 'bar', parts: ones(8), cut: true }, { kind: 'text', text: 'Half of 8 is 4, so 4/8 is one half.', hidden: true }],
        ...countUp(0, 4),
        [500, { 0: { shaded: range(4) } }],
        [500, { 1: { hidden: false } }]),
      // Compare the numerator with that half.
      play([{ kind: 'bar', parts: ones(8), cut: true, label: '5/8' }, { kind: 'text', text: '5 is more than 4.', hidden: true }],
        ...countUp(0, 5, 380, true),
        [600, { 1: { hidden: false } }]),
      // More than half.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, marks: halfMarks(8), point: null, pointLabel: '5/8' }, { kind: 'text', text: '5/8 is more than 1/2.', hidden: true }],
        [500, { 0: { point: 5 } }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([
      { kind: 'bar', parts: ones(6), cut: true, shaded: range(3), label: '3/6 is exactly half', hidden: true },
      { kind: 'bar', parts: ones(6), cut: true, shaded: range(4), label: '4/6 is more than half', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [500, { 1: { hidden: false } }]),
  },

  'benchmarks-zero-one': {
    steps: [
      // Half of the denominator.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true }, { kind: 'text', text: 'Half of 8 is 4: 4/8 is 1/2.', hidden: true }],
        [500, { 0: { marks: halfMarks(8) } }],
        [600, { 1: { hidden: false } }]),
      // Far below half: near 0. Close to half: near 1/2.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, marks: halfMarks(8), point: null, pointLabel: '1/8' }, { kind: 'text', text: '1/8 is near 0. 3/8 is near 1/2.', hidden: true }],
        [500, { 0: { point: 1 } }],
        [900, { 0: { point: 3, pointLabel: '3/8' } }],
        [500, { 1: { hidden: false } }]),
      // Close to the denominator: near 1.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, marks: halfMarks(8), point: null, pointLabel: '7/8' }, { kind: 'text', text: '7 is close to 8, so 7/8 is near 1.', hidden: true }],
        [500, { 0: { point: 7 } }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 2, cut: true, marks: halfMarks(2), hidden: true }, { kind: 'text', text: '0, 1/2 and 1 are easy to picture.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [500, { 1: { hidden: false } }]),
  },

  'fraction-magnitude': {
    steps: [
      // Picture it on a line from 0 to 1.
      play([{ kind: 'line', max: 1, spaces: 6 }, { kind: 'text', text: 'Where is 5/6?', hidden: true }],
        [400, { 1: { hidden: false } }],
        [500, { 0: { cut: true } }],
        ...jumpUp(0, 5),
        [400, { 0: { point: 5, pointLabel: '5/6' } }]),
      // The nearest benchmark.
      play([{ kind: 'line', max: 1, spaces: 6, cut: true, point: 5, pointLabel: '5/6' }, { kind: 'text', text: '5/6 is closest to 1.', hidden: true }],
        [500, { 0: { marks: halfMarks(6) } }],
        [600, { 1: { hidden: false } }]),
      // A little more or a little less.
      play([{ kind: 'line', max: 1, spaces: 6, cut: true, point: 5, pointLabel: '5/6', marks: halfMarks(6), jumps: 5 }, { kind: 'text', text: '1 space short of 1: a little less than 1.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 8, cut: true, marks: halfMarks(8), point: 3, pointLabel: '3/8' }, { kind: 'text', text: '3/8 is a little less than 1/2.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },

  // Unit 4 · Number lines
  'number-line-basics': {
    steps: [
      // Find 0 and 1.
      play([{ kind: 'line', max: 1, spaces: 4, hidden: true }, { kind: 'text', text: 'One whole is from 0 to 1.', hidden: true }],
        [400, { 0: { hidden: false } }],
        [600, { 1: { hidden: false } }]),
      // The denominator chooses the spaces.
      play([{ kind: 'line', max: 1, spaces: 4 }, { kind: 'text', text: 'Fourths: 4 equal spaces.', hidden: true }],
        [500, { 0: { cut: true } }],
        [500, { 1: { hidden: false } }]),
      // Every space the same size.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true }, { kind: 'text', text: 'Each space is 1/4 of the whole.', hidden: true }],
        ...jumpUp(0, 4, 450),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, hidden: true }, { kind: 'line', max: 1, spaces: 4, cut: true, hidden: true }],
      [400, { 0: { hidden: false } }],
      [500, { 1: { hidden: false } }],
      [500, { 0: { shaded: [0] }, 1: { jumps: 1 } }]),
  },

  'number-line-points': {
    steps: [
      // Count the spaces: the denominator.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, point: 3 }, { kind: 'text', text: '4 spaces from 0 to 1: the denominator is 4.', hidden: true }],
        ...jumpUp(0, 4, 400),
        [500, { 1: { hidden: false } }]),
      // Count the jumps to the point: the numerator.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, point: 3 }, { kind: 'text', text: '3 jumps to the point: the numerator is 3.', hidden: true }],
        ...jumpUp(0, 3, 500),
        [500, { 1: { hidden: false } }]),
      // Jumps over spaces.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, point: 3, jumps: 3 }, { kind: 'text', text: '3 jumps over 4 spaces: 3/4.', hidden: true }],
        [500, { 0: { pointLabel: '3/4' } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1, 2], label: '3/4', hidden: true }, { kind: 'line', max: 1, spaces: 4, cut: true, jumps: 3, point: 3, pointLabel: '3/4', hidden: true }],
      [400, { 0: { hidden: false } }],
      [500, { 1: { hidden: false } }]),
  },

  'number-line-beyond-one': {
    steps: [
      // One jump's size.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true }, { kind: 'text', text: 'One jump is 1/4.', hidden: true }],
        [500, { 0: { jumps: 1 } }],
        [500, { 1: { hidden: false } }]),
      // Keep jumping past 1.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true, jumps: 1 }],
        ...jumpUp(0, 7, 380, 1)),
      // Count every jump from 0.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true, jumps: 7 }, { kind: 'text', text: '7 jumps of 1/4: 7/4.', hidden: true }],
        [500, { 0: { point: 7, pointLabel: '7/4' } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 2, spaces: 3, cut: true, hidden: true }, { kind: 'text', text: 'After 1 the spaces stay the same size.', hidden: true }],
      [400, { 0: { hidden: false } }],
      ...jumpUp(0, 6, 300),
      [400, { 1: { hidden: false } }]),
  },

  'ruler-measurement': {
    steps: [
      // Line the end up with 0.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true, ruler: true }, { kind: 'text', text: 'Start the pencil at 0.', hidden: true }],
        [500, { 0: { stretch: 5 } }],
        [800, { 1: { hidden: false } }]),
      // Count the spaces.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true, ruler: true, stretch: 5 }, { kind: 'text', text: '4 spaces in an inch: each space is 1/4 inch.', hidden: true }],
        ...jumpUp(0, 5, 420),
        [500, { 1: { hidden: false } }]),
      // Whole inches and the extra part.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true, ruler: true, stretch: 5, jumps: 5 }, { kind: 'text', text: '1 inch and 1/4 more: 1 1/4 inches.', hidden: true }],
        [500, { 0: { point: 5 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 4, cut: true, ruler: true, hidden: true }, { kind: 'line', max: 1, spaces: 4, cut: true, hidden: true }, { kind: 'text', text: 'A ruler is a number line.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }],
      [400, { 2: { hidden: false } }]),
  },

  'build-line-plots': {
    steps: [
      // Find each measurement: 1/4, 2/4, 2/4, 3/4 inch.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, xs: [], marks: fourthMarks }, { kind: 'text', text: 'Leaves: 1/4, 2/4, 2/4 and 3/4 inch.', hidden: true }],
        [400, { 1: { hidden: false } }],
        [500, { 0: { point: 1 } }],
        [500, { 0: { point: 2 } }],
        [500, { 0: { point: 3 } }]),
      // One X above each.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, xs: [], marks: fourthMarks }],
        [500, { 0: { xs: [[1, 1]] } }],
        [500, { 0: { xs: [[1, 1], [2, 1]] } }],
        [500, { 0: { xs: [[1, 1], [2, 1], [3, 1]] } }]),
      // Stack the matching ones.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, xs: [[1, 1], [2, 1], [3, 1]], marks: fourthMarks }, { kind: 'text', text: 'Two leaves are 2/4 inch: two Xs.', hidden: true }],
        [600, { 0: { xs: [[1, 1], [2, 2], [3, 1]] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 4, cut: true, xs: [[1, 1], [2, 2], [3, 1]], marks: fourthMarks }, { kind: 'text', text: 'The tallest stack is the most common length.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },

  // Unit 5 · Compare and order
  'compare-same-denominator': {
    steps: [
      // The denominators match.
      play([{ kind: 'bar', parts: ones(5), label: '2/5 has fifths' }, { kind: 'bar', parts: ones(5), label: '4/5 has fifths' }, { kind: 'text', text: 'Same denominator: same-size parts.', hidden: true }],
        [500, { 0: { cut: true }, 1: { cut: true } }],
        [500, { 2: { hidden: false } }]),
      // Compare the numerators.
      play([{ kind: 'bar', parts: ones(5), cut: true, label: '2/5' }, { kind: 'bar', parts: ones(5), cut: true, label: '4/5' }],
        ...countUp(0, 2, 420, true),
        ...countUp(1, 4, 420, true)),
      // More parts is bigger.
      play([{ kind: 'bar', parts: ones(5), cut: true, shaded: [0, 1], label: '2/5' }, { kind: 'bar', parts: ones(5), cut: true, shaded: range(4), label: '4/5' }, { kind: 'text', text: '4 parts is more than 2 parts: 4/5 > 2/5.', hidden: true }],
        [600, { 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(6), cut: true, shaded: [0], label: '1/6', hidden: true }, { kind: 'bar', parts: ones(6), cut: true, shaded: range(5), label: '5/6', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'order-fractions': {
    steps: [
      // Two at a time.
      play([{ kind: 'bar', parts: ones(6), cut: true, shaded: range(5), label: '5/6' }, { kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], label: '2/6' }, { kind: 'text', text: 'Same denominators: 2/6 < 5/6.', hidden: true }],
        [600, { 2: { hidden: false } }]),
      // The smallest first.
      play([
        { kind: 'bar', parts: ones(6), cut: true, shaded: range(5), label: '5/6' },
        { kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], label: '2/6' },
        { kind: 'bar', parts: ones(6), cut: true, shaded: range(4), label: '4/6' },
      ],
      [500, { 1: { glow: [0, 1] } }],
      [700, { 1: { glow: [], label: '2/6 is the smallest: it goes first.', tone: 'fair' } }]),
      // All in order.
      play([
        { kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], label: '2/6', hidden: true },
        { kind: 'bar', parts: ones(6), cut: true, shaded: range(4), label: '4/6', hidden: true },
        { kind: 'bar', parts: ones(6), cut: true, shaded: range(5), label: '5/6', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }],
      [400, { 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1], label: '2/4 of a bar' }, { kind: 'text', text: 'Compare parts of the same-size whole.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },
};
