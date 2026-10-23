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
/** A sentence under the picture; fractions in it are shown stacked. */
export type TextRow = { kind: 'text'; text: string; hidden?: boolean };
/** Two pictures side by side. */
export type PairRow = { kind: 'pair'; items: [BarRow | AreaRow, BarRow | AreaRow]; hidden?: boolean };
export type SceneRow = BarRow | AreaRow | TextRow | PairRow;

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
};
