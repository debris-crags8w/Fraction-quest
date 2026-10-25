/* The animated Teach first: each lesson step (and "Why it works") shows a short picture that plays once, then rests
   on its last frame. A step is a list of frames; each frame is the whole picture, and the screen slides from one to
   the next (bars cut, a checker moves, parts light up). Pure data, so every scene is checked by tests. Lessons
   without a scene keep the text card. */
import { gridOverlap, type AreaCut } from './area-shapes';

/** One bar, cut into parts of these relative widths. */
export type BarRow = {
  kind: 'bar';
  parts: number[];
  /** The cut lines show (before this, it is one uncut bar). */
  cut?: boolean;
  /** Only every `group`-th cut shows: 6 parts with group 2 look like thirds until group becomes 1. */
  group?: number;
  /** Parts colored in (the fraction's parts). */
  shaded?: number[];
  /** Parts colored in a second color (one of two addends). */
  shaded2?: number[];
  /** The first counted part shows this number (a second bar carries on the count). */
  countFrom?: number;
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
  /** Pieces colored in a second color (one of two addends). */
  shaded2?: number[];
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
  /** Only every `group`-th tick shows: 8 spaces with group 2 look like fourths until group becomes 1. */
  group?: number;
  /** Jump arcs drawn from 0, one per space. */
  jumps?: number;
  /** A dot at this many spaces from 0, with an optional label above it. */
  point?: number | null;
  pointLabel?: string;
  /** Labels under the line at these values (in spaces): benchmarks like 1/2. */
  marks?: { at: number; label: string }[];
  /** A colored stretch from 0 to this many spaces (something being measured). */
  stretch?: number;
  /** Where the stretch starts instead of 0 (the gap between two lengths). */
  stretchFrom?: number;
  /** A unit after each whole number but 0 ("1 hour"). */
  unit?: string;
  /** Xs stacked above ticks: [space, how many]. */
  xs?: [number, number][];
  /** Draw it as a ruler (inches under the whole numbers). */
  ruler?: boolean;
  label?: string;
  tone?: 'fair' | 'unfair';
  hidden?: boolean;
};
/** A set of counters (cards, apples) shared out into equal groups. */
export type SetRow = {
  kind: 'set';
  count: number;
  /** The equal groups the counters are shared into (none: one loose pile). */
  groups?: number;
  /** Counters dealt so far, one to each group in turn; the rest wait in the pile above (default: all). */
  dealt?: number;
  /** Groups taken (the numerator's groups): their counters are colored in. */
  shaded?: number[];
  /** Groups whose counters show 1, 2, 3 ... */
  counted?: number[];
  /** The counted numbers carry on from one group to the next (counting all the taken things). */
  countOn?: boolean;
  glow?: number[];
  label?: string;
  tone?: 'fair' | 'unfair';
  hidden?: boolean;
};
/** A sentence under the picture; fractions in it are shown stacked. */
export type TextRow = { kind: 'text'; text: string; hidden?: boolean };
/** Two pictures side by side. */
export type PairRow = { kind: 'pair'; items: [BarRow | AreaRow, BarRow | AreaRow]; hidden?: boolean };
export type SceneRow = BarRow | AreaRow | LineRow | SetRow | TextRow | PairRow;

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

/** The sentences shown under a step's picture once it has played (its worked numbers). */
export const sceneSentences = (scene: StepScene): string[] =>
  (scene[scene.length - 1]?.rows ?? []).flatMap((row) => (row.kind === 'text' ? [row.text] : []));

/** What Listen reads on a Teach first page: the step (the first also says the goal), then the sentences under its
    picture, so a child who listens hears the worked example too. `page` counts the steps, then "Why it works". */
export function teachPageScript(intro: { goal: string; steps: string[]; why: string }, scene: LessonScene, page: number): string {
  const said = page < intro.steps.length ? intro.steps[page]! : intro.why;
  const opening = page === 0 ? `${intro.goal} ${said}` : said;
  const picture = page < scene.steps.length ? scene.steps[page]! : scene.why;
  return [opening, ...sceneSentences(picture)].join(' ');
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
/** The first n hundredths of a 10-by-10 grid, a column (one tenth) at a time. `from` skips the first ones. */
const gridFill = (n: number, from = 0) => range(n).map((k) => ((from + k) % 10) * 10 + Math.floor((from + k) / 10));
/** Beats that deal a set's counters into its groups, one round (a counter to every group) at a time. */
const dealRounds = (row: number, count: number, groups: number, ms = 420): [number, Patch][] =>
  range(count / groups).map((k): [number, Patch] => [ms, { [row]: { dealt: (k + 1) * groups } }]);
const eighthMarks = [1, 2, 3, 4, 5, 6, 7].map((at) => ({ at, label: `${at}/8` }));
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
    // Why: a fair pizza has same-size slices; an unfair one does not (names come in idea 2, so no fraction labels).
    why: play([{ kind: 'pair', hidden: true, items: [
      { kind: 'area', cut: 'circle-fourths', edges: true, shaded: [0], label: 'Fair', tone: 'fair' },
      { kind: 'area', cut: 'circle-unequal', edges: true, glow: [0], label: 'Not fair', tone: 'unfair' },
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
      play([{ kind: 'bar', parts: ones(3), cut: true, shaded: [0], label: '1/3' }, { kind: 'bar', parts: ones(6), cut: true, shaded: [0], label: '1/6' }, { kind: 'text', text: '3 is less than 6, so 1/3 is bigger than 1/6.', hidden: true }],
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
    // Why: 2/6 is near the benchmark 1/2, just under it (not 3/8, which a practice question asks about).
    why: play([{ kind: 'line', max: 1, spaces: 6, cut: true, marks: halfMarks(6), point: 2, pointLabel: '2/6' }, { kind: 'text', text: '2/6 is a little less than 1/2.', hidden: true }],
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
      // Count the spaces: the denominator (the point comes with the next step, which counts the jumps to it).
      play([{ kind: 'line', max: 1, spaces: 4, cut: true }, { kind: 'text', text: '4 spaces from 0 to 1: the denominator is 4.', hidden: true }],
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
  // Unit 6 · Equivalent fractions
  'equivalent-models': {
    steps: [
      // Start with one fraction on a bar: 2/3.
      play([{ kind: 'bar', parts: ones(6), group: 2, label: '2/3' }],
        [500, { 0: { cut: true } }],
        [600, { 0: { shaded: range(4) } }]),
      // Split every part the same way: each third into 2.
      play([{ kind: 'bar', parts: ones(6), group: 2, cut: true, shaded: range(4), label: 'Thirds' }, { kind: 'text', text: 'Each third splits into 2 sixths.', hidden: true }],
        [700, { 0: { group: 1, label: 'Sixths' } }],
        [600, { 1: { hidden: false } }]),
      // Count the new parts: the shaded amount has not changed.
      play([{ kind: 'bar', parts: ones(6), cut: true, shaded: range(4), label: '4/6' }, { kind: 'text', text: '4/6 = 2/3: the same amount.', hidden: true }],
        ...countUp(0, 4),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([
      { kind: 'bar', parts: ones(6), group: 2, cut: true, shaded: range(4), label: '2/3', hidden: true },
      { kind: 'bar', parts: ones(6), cut: true, shaded: range(4), label: '4/6', hidden: true },
      { kind: 'text', text: 'New name, same amount.', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }],
    [400, { 2: { hidden: false } }]),
  },

  'equivalent-number-line': {
    steps: [
      // Mark the first fraction: 2/4.
      play([{ kind: 'line', max: 1, spaces: 8, group: 2, cut: true, pointLabel: '2/4' }],
        [600, { 0: { point: 4 } }]),
      // Split every space the same way.
      play([{ kind: 'line', max: 1, spaces: 8, group: 2, cut: true, point: 4, pointLabel: '2/4' }, { kind: 'text', text: 'Each fourth splits into 2 eighths.', hidden: true }],
        [700, { 0: { group: 1 } }],
        [500, { 1: { hidden: false } }]),
      // Count the jumps to the same point.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, point: 4, pointLabel: '2/4' }, { kind: 'text', text: '4 jumps of 1/8: 4/8 = 2/4.', hidden: true }],
        ...jumpUp(0, 4, 420),
        [500, { 0: { pointLabel: '4/8' }, 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 8, cut: true, point: 4, pointLabel: '2/4 = 4/8', marks: halfMarks(8) }, { kind: 'text', text: 'The point did not move.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },

  'build-equivalents': {
    steps: [
      // Multiply top and bottom by the same number.
      play([{ kind: 'bar', parts: ones(6), group: 2, cut: true, shaded: [0, 1], label: '1/3' }, { kind: 'text', text: '1 × 2 = 2 and 3 × 2 = 6: 1/3 = 2/6.', hidden: true }],
        [800, { 0: { group: 1, label: '2/6' } }],
        [500, { 1: { hidden: false } }]),
      // Or divide both: parts join into bigger parts.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(4), label: '4/8' }, { kind: 'text', text: '4 ÷ 2 = 2 and 8 ÷ 2 = 4: 4/8 = 2/4.', hidden: true }],
        [800, { 0: { group: 2, label: '2/4' } }],
        [500, { 1: { hidden: false } }]),
      // Check both show the same amount.
      play([
        { kind: 'bar', parts: ones(6), group: 2, cut: true, shaded: [0, 1], label: '1/3', hidden: true },
        { kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], label: '2/6', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(6), group: 2, cut: true, shaded: [0, 1] }, { kind: 'text', text: 'More, smaller parts: count more of them.', hidden: true }],
      [700, { 0: { group: 1 } }],
      [400, { 1: { hidden: false } }]),
  },

  'missing-equivalent': {
    steps: [
      // What was the bottom multiplied by?
      play([{ kind: 'bar', parts: ones(8), group: 2, cut: true, shaded: range(6), label: '3/4 = ?/8' }, { kind: 'text', text: '4 × 2 = 8.', hidden: true }],
        [700, { 0: { group: 1 } }],
        [500, { 1: { hidden: false } }]),
      // Do the same to the top.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '3/4 = ?/8' }, { kind: 'text', text: '3 × 2 = 6.', hidden: true }],
        ...countUp(0, 6, 380),
        [500, { 1: { hidden: false } }]),
      // Check the amount.
      play([
        { kind: 'bar', parts: four, cut: true, shaded: range(3), label: '3/4', hidden: true },
        { kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '6/8', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(8), group: 2, cut: true, shaded: range(6), label: '3/4' }, { kind: 'text', text: 'Times 2 on the bottom, times 2 on the top: 3/4 = 6/8.', hidden: true }],
      [700, { 0: { group: 1, label: '6/8' } }],
      [400, { 1: { hidden: false } }]),
  },

  // Unit 7 · Wholes, parts and mixed numbers
  'compose-to-one': {
    steps: [
      // Same-size parts.
      play([{ kind: 'bar', parts: ones(5) }, { kind: 'text', text: 'Fifths: all the parts are the same size.', hidden: true }],
        [500, { 0: { cut: true } }],
        [500, { 1: { hidden: false } }]),
      // Add the numerators: 2/5 + 3/5.
      play([{ kind: 'bar', parts: ones(5), cut: true, label: '2/5 + 3/5' }],
        [500, { 0: { shaded: [0, 1] } }],
        [600, { 0: { shaded2: [2, 3, 4] } }],
        [500, { 0: { counted: range(5) } }]),
      // The numerator equals the denominator: one whole.
      play([{ kind: 'bar', parts: ones(5), cut: true, shaded: [0, 1], shaded2: [2, 3, 4] }, { kind: 'text', text: '5/5 is one whole.', hidden: true }],
        [600, { 0: { bracket: '1 whole' } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: range(4), bracket: '4/4 = 1 whole', hidden: true }],
      [400, { 0: { hidden: false } }]),
  },

  'decompose-fractions': {
    steps: [
      // Keep the denominator.
      play([{ kind: 'bar', parts: ones(8), cut: true, label: '5/8' }],
        [600, { 0: { shaded: range(5) } }]),
      // Split the numerator: 5 = 2 + 3.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(5), label: '5/8' }, { kind: 'text', text: '5/8 = 2/8 + 3/8.', hidden: true }],
        [700, { 0: { shaded: [0, 1], shaded2: [2, 3, 4] } }],
        [500, { 1: { hidden: false } }]),
      // Check they add back.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: [0, 1], shaded2: [2, 3, 4] }, { kind: 'text', text: '2 + 3 = 5, so it is still 5/8.', hidden: true }],
        ...countUp(0, 5, 380),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: [0], shaded2: [1, 2, 3, 4], label: '1/8 + 4/8 is also 5/8', hidden: true }],
      [400, { 0: { hidden: false } }]),
  },

  'whole-numbers-as-fractions': {
    steps: [
      // The denominator: the parts in one whole.
      play([{ kind: 'bar', parts: ones(3), label: 'Thirds: 3 parts in one whole' }],
        [600, { 0: { cut: true } }]),
      // Count that many parts for each whole.
      play([{ kind: 'bar', parts: ones(3), cut: true, label: '1 whole' }, { kind: 'bar', parts: ones(3), cut: true, countFrom: 4, label: '2 wholes' }],
        ...countUp(0, 3, 380, true),
        ...countUp(1, 3, 380, true)),
      // The total on top.
      play([{ kind: 'bar', parts: ones(3), cut: true, shaded: range(3) }, { kind: 'bar', parts: ones(3), cut: true, shaded: range(3) }, { kind: 'text', text: '2 wholes = 6/3.', hidden: true }],
        [600, { 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: range(4), bracket: '1 = 4/4', hidden: true }],
      [400, { 0: { hidden: false } }]),
  },

  'improper-fractions': {
    steps: [
      // Compare the numerator with the denominator.
      play([{ kind: 'text', text: '7/4: 7 parts, but only 4 fit in one whole.', hidden: true }, { kind: 'bar', parts: four, cut: true }, { kind: 'bar', parts: four, cut: true, countFrom: 5 }],
        [400, { 0: { hidden: false } }],
        ...countUp(1, 4, 380, true),
        ...countUp(2, 3, 380, true)),
      // Each full denominator makes one whole.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(4) }, { kind: 'bar', parts: four, cut: true, shaded: range(3) }],
        [600, { 0: { bracket: '4/4 = 1 whole' } }]),
      // The leftover parts.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(4), bracket: '1 whole' }, { kind: 'bar', parts: four, cut: true, shaded: range(3) }, { kind: 'text', text: '3/4 left over: 7/4 is 1 whole and 3/4 more.', hidden: true }],
        [500, { 1: { glow: range(3) } }],
        [600, { 1: { glow: [] }, 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 2, spaces: 4, cut: true, jumps: 7, point: 7, pointLabel: '7/4', hidden: true }, { kind: 'text', text: 'Past 4/4, the parts start the next whole.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'mixed-improper': {
    steps: [
      // Wholes times the denominator: 2 wholes of thirds.
      play([{ kind: 'text', text: '2 1/3: 2 wholes and 1 third.', hidden: true }, { kind: 'bar', parts: ones(3), cut: true }, { kind: 'bar', parts: ones(3), cut: true, countFrom: 4 }],
        [400, { 0: { hidden: false } }],
        ...countUp(1, 3, 360, true),
        ...countUp(2, 3, 360, true)),
      // Add the extra parts.
      play([{ kind: 'bar', parts: ones(3), cut: true, shaded: range(3) }, { kind: 'bar', parts: ones(3), cut: true, shaded: range(3) }, { kind: 'bar', parts: ones(3), cut: true, countFrom: 7 }, { kind: 'text', text: '6 + 1 = 7 thirds.', hidden: true }],
        [600, { 2: { shaded: [0], counted: [0] } }],
        [500, { 3: { hidden: false } }]),
      // Keep the denominator.
      play([{ kind: 'bar', parts: ones(3), cut: true, shaded: range(3) }, { kind: 'bar', parts: ones(3), cut: true, shaded: range(3) }, { kind: 'bar', parts: ones(3), cut: true, shaded: [0] }, { kind: 'text', text: '2 1/3 = 7/3.', hidden: true }],
        [600, { 3: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(3), cut: true, shaded: range(3), bracket: '1 whole = 3/3', hidden: true }],
      [400, { 0: { hidden: false } }]),
  },
  // Unit 8 · Add, subtract, decimals, multiply
  'add-like-denominators': {
    steps: [
      // The denominators match.
      play([{ kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], label: '2/6', hidden: true }, { kind: 'bar', parts: ones(6), cut: true, shaded2: [0, 1, 2], label: '3/6', hidden: true }, { kind: 'text', text: 'Both are sixths.', hidden: true }],
        [400, { 0: { hidden: false } }],
        [400, { 1: { hidden: false } }],
        [400, { 2: { hidden: false } }]),
      // Add the numerators: put them together.
      play([{ kind: 'bar', parts: ones(6), cut: true, label: '2/6 + 3/6' }, { kind: 'text', text: '2 + 3 = 5.', hidden: true }],
        [500, { 0: { shaded: [0, 1] } }],
        [600, { 0: { shaded2: [2, 3, 4] } }],
        [500, { 0: { counted: range(5) } }],
        [500, { 1: { hidden: false } }]),
      // Keep the denominator.
      play([{ kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], shaded2: [2, 3, 4], label: '5/6' }, { kind: 'text', text: 'Still sixths: 2/6 + 3/6 = 5/6.', hidden: true }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], shaded2: [2, 3, 4] }, { kind: 'text', text: 'The parts stay the same size; you just count more of them.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },

  'subtract-like-denominators': {
    steps: [
      // The denominators match.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(5), label: '5/8 − 2/8' }, { kind: 'text', text: 'Both are eighths.', hidden: true }],
        [500, { 1: { hidden: false } }]),
      // Take the parts away.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(5), label: '5/8 − 2/8' }, { kind: 'text', text: '5 − 2 = 3.', hidden: true }],
        [600, { 0: { glow: [3, 4] } }],
        [700, { 0: { glow: [], shaded: range(3) } }],
        [500, { 0: { counted: range(3) } }],
        [500, { 1: { hidden: false } }]),
      // Keep the denominator.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(3), label: '3/8' }, { kind: 'text', text: 'Still eighths: 5/8 − 2/8 = 3/8.', hidden: true }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(3), label: '3/8' }, { kind: 'text', text: 'Fewer parts, same size parts.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },

  'add-mixed-numbers': {
    steps: [
      // Add the wholes.
      play([{ kind: 'text', text: '1 2/4 + 1 3/4', hidden: true }, { kind: 'bar', parts: [1], shaded: [0], label: '1' }, { kind: 'bar', parts: [1], shaded2: [0], label: '1' }, { kind: 'text', text: '1 + 1 = 2 wholes.', hidden: true }],
        [400, { 0: { hidden: false } }],
        [700, { 3: { hidden: false } }]),
      // Add the parts.
      play([{ kind: 'bar', parts: four, cut: true, label: '2/4 + 3/4' }, { kind: 'bar', parts: four, cut: true, countFrom: 5 }, { kind: 'text', text: '2/4 + 3/4 = 5/4.', hidden: true }],
        [500, { 0: { shaded: [0, 1] } }],
        [600, { 0: { shaded2: [2, 3] }, 1: { shaded2: [0] } }],
        [500, { 0: { counted: range(4) }, 1: { counted: [0] } }],
        [500, { 2: { hidden: false } }]),
      // The parts make one more whole.
      play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1], shaded2: [2, 3] }, { kind: 'bar', parts: four, cut: true, shaded2: [0] }, { kind: 'text', text: '4/4 is 1 more whole: 2 + 1 + 1/4 = 3 1/4.', hidden: true }],
        [600, { 0: { bracket: '1 more whole' } }],
        [500, { 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1], shaded2: [2, 3], bracket: '4/4 = 1 whole', hidden: true }, { kind: 'text', text: 'Parts that fill a whole become one more whole.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'subtract-mixed-numbers': {
    steps: [
      // Enough parts? 3 1/4 − 1 3/4.
      play([{ kind: 'text', text: '3 1/4 − 1 3/4', hidden: true }, { kind: 'bar', parts: four, cut: true, shaded: [0], label: '1/4' }, { kind: 'text', text: 'Only 1 fourth: not enough to take away 3 fourths.', hidden: true }],
        [400, { 0: { hidden: false } }],
        [500, { 1: { glow: [0] } }],
        [500, { 1: { glow: [] }, 2: { hidden: false } }]),
      // Trade one whole for parts.
      play([{ kind: 'bar', parts: four, shaded: range(4), label: '1 whole' }, { kind: 'bar', parts: four, cut: true, shaded: [0] }, { kind: 'text', text: '1 whole = 4/4. Now there are 5/4 and 2 wholes.', hidden: true }],
        [700, { 0: { cut: true, label: '4/4' } }],
        [500, { 0: { counted: range(4) }, 1: { counted: [0], countFrom: 5 } }],
        [500, { 2: { hidden: false } }]),
      // Subtract the parts, then the wholes.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(4) }, { kind: 'bar', parts: four, cut: true, shaded: [0] }, { kind: 'text', text: '5/4 − 3/4 = 2/4, and 2 − 1 = 1: the answer is 1 2/4.', hidden: true }],
        [600, { 0: { glow: [1, 2] }, 1: { glow: [0] } }],
        [700, { 0: { glow: [], shaded: [0, 1] }, 1: { glow: [], shaded: [] } }],
        [500, { 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: range(4), bracket: '1 whole = 4/4', hidden: true }, { kind: 'text', text: 'Trading never changes the amount.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'tenths-decimals': {
    steps: [
      // Find the tenths.
      play([{ kind: 'bar', parts: ones(10), cut: true, label: '7/10' }],
        ...countUp(0, 7, 300, true)),
      // 0 and the decimal point.
      play([{ kind: 'bar', parts: ones(10), cut: true, shaded: range(7) }, { kind: 'text', text: 'Less than one whole: write 0 and the point, 0.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // The tenths go right after the point.
      play([{ kind: 'bar', parts: ones(10), cut: true, shaded: range(7), label: '0.7' }, { kind: 'text', text: '7 tenths: 7/10 = 0.7.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 10, cut: true, point: 7, pointLabel: '0.7', hidden: true }, { kind: 'text', text: 'The first place after the point counts tenths.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'hundredths-decimals': {
    steps: [
      // Find the hundredths: 23 small squares.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true }, { kind: 'text', text: '23 of 100 squares: 23/100.', hidden: true }],
        [600, { 0: { shaded: gridFill(10) } }],
        [600, { 0: { shaded: gridFill(20) } }],
        [600, { 0: { shaded: gridFill(23) } }],
        [500, { 1: { hidden: false } }]),
      // 0 and the point.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(23) }, { kind: 'text', text: 'Less than one whole: 0 and the point, 0.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Two places after the point.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(23), label: '0.23' }, { kind: 'text', text: '2 tenths and 3 hundredths: 23/100 = 0.23.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(20), shaded2: gridFill(3, 20) }, { kind: 'text', text: 'Columns are tenths; single squares are hundredths.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },

  'decimal-fraction-equivalence': {
    steps: [
      // Rename in tenths: 3/5 = 6/10.
      play([{ kind: 'bar', parts: ones(10), group: 2, cut: true, shaded: range(6), label: '3/5' }, { kind: 'text', text: 'Split each fifth in 2: 3/5 = 6/10.', hidden: true }],
        [700, { 0: { group: 1, label: '6/10' } }],
        [500, { 1: { hidden: false } }]),
      // Tenths: one place.
      play([{ kind: 'bar', parts: ones(10), cut: true, shaded: range(6), label: '6/10' }, { kind: 'text', text: '6 tenths: 0.6.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Hundredths: two places.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true }, { kind: 'text', text: '60 hundredths: 60/100 = 0.60, the same as 0.6.', hidden: true }],
        [700, { 0: { shaded: gridFill(60) } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 10, cut: true, point: 6, pointLabel: '6/10 = 0.6', hidden: true }, { kind: 'text', text: 'A decimal is a fraction out of 10 or 100.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'compare-decimals': {
    steps: [
      // The same number of places.
      play([{ kind: 'text', text: '0.4 or 0.35? Write 0.4 as 0.40.', hidden: true }, { kind: 'pair', items: [
        { kind: 'area', cut: 'grid-10x10', edges: true, label: '0.40' },
        { kind: 'area', cut: 'grid-10x10', edges: true, label: '0.35' },
      ] }],
      [400, { 0: { hidden: false } }],
      [700, { 1: { items: [
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(40), label: '0.40' },
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(35), label: '0.35' },
      ] } }]),
      // Compare the tenths first.
      play([{ kind: 'pair', items: [
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(40), label: '4 tenths' },
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(35), label: '3 tenths' },
      ] }, { kind: 'text', text: '4 tenths is more than 3 tenths.', hidden: true }],
      [600, { 1: { hidden: false } }]),
      // Hundredths only if the tenths match.
      play([{ kind: 'pair', items: [
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(40), label: '0.4' },
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(35), label: '0.35' },
      ] }, { kind: 'text', text: '0.4 > 0.35. More digits does not mean bigger.', hidden: true }],
      [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'pair', hidden: true, items: [
      { kind: 'bar', parts: ones(10), cut: true, shaded: range(4), label: '0.4' },
      { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(40), label: '0.40' },
    ] }, { kind: 'text', text: 'Same amount: 4 tenths is 40 hundredths.', hidden: true }],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }]),
  },

  'compare-decimals-grid': {
    steps: [
      // Write both in hundredths.
      play([{ kind: 'pair', items: [
        { kind: 'bar', parts: ones(10), cut: true, shaded: range(6), label: '0.6 = 6 tenths' },
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(60), label: '= 60 hundredths' },
      ] }, { kind: 'text', text: '0.6 = 0.60 = 60 hundredths. 0.58 = 58 hundredths.', hidden: true }],
      [500, { 1: { hidden: false } }]),
      // Shade the squares.
      play([{ kind: 'pair', items: [
        { kind: 'area', cut: 'grid-10x10', edges: true, label: '0.6' },
        { kind: 'area', cut: 'grid-10x10', edges: true, label: '0.58' },
      ] }],
      [700, { 0: { items: [
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(60), label: '0.6' },
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(58), label: '0.58' },
      ] } }]),
      // More squares is bigger.
      play([{ kind: 'pair', items: [
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(60), label: '60' },
        { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(58), label: '58' },
      ] }, { kind: 'text', text: '60 > 58, so 0.6 > 0.58.', hidden: true }],
      [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '1 square = 1/100' }, { kind: 'text', text: '100 squares make one whole.', hidden: true }],
      [500, { 0: { glow: [0] } }],
      [400, { 1: { hidden: false } }]),
  },

  'add-tenths-hundredths': {
    steps: [
      // Rename the tenths as hundredths.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '3/10' }, { kind: 'text', text: '3 tenths = 30 hundredths.', hidden: true }],
        [700, { 0: { shaded: gridFill(30), label: '30/100' } }],
        [500, { 1: { hidden: false } }]),
      // Add the hundredths.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(30), label: '30/100 + 25/100' }],
        [800, { 0: { shaded2: gridFill(25, 30) } }]),
      // The total in hundredths.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(30), shaded2: gridFill(25, 30), label: '55/100' }, { kind: 'text', text: '30 + 25 = 55: 3/10 + 25/100 = 55/100.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'pair', hidden: true, items: [
      { kind: 'bar', parts: ones(10), cut: true, shaded: [0], label: '1/10' },
      { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(10), label: '10/100' },
    ] }, { kind: 'text', text: 'One tenth is ten hundredths.', hidden: true }],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }]),
  },

  'dimes-and-pennies': {
    steps: [
      // Each dime is 10 hundredths.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '2 dimes' }, { kind: 'text', text: '2 dimes = 20 hundredths of a dollar.', hidden: true }],
        [600, { 0: { shaded: gridFill(10) } }],
        [600, { 0: { shaded: gridFill(20) } }],
        [500, { 1: { hidden: false } }]),
      // Each penny is 1 hundredth.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(20), label: '2 dimes and 3 pennies' }, { kind: 'text', text: '3 pennies = 3 hundredths.', hidden: true }],
        [500, { 0: { shaded2: gridFill(1, 20) } }],
        [400, { 0: { shaded2: gridFill(2, 20) } }],
        [400, { 0: { shaded2: gridFill(3, 20) } }],
        [500, { 1: { hidden: false } }]),
      // Add them.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(20), shaded2: gridFill(3, 20), label: '23/100' }, { kind: 'text', text: '20 + 3 = 23: 23/100 of a dollar.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(10), shaded2: gridFill(1, 10), label: 'A dime: 1/10. A penny: 1/100.', hidden: true }],
      [400, { 0: { hidden: false } }]),
  },

  'unit-fraction-multiples': {
    steps: [
      // Count the copies: 4 copies of 1/5.
      play([{ kind: 'bar', parts: ones(5), cut: true, label: '4 × 1/5' }],
        ...countUp(0, 4, 450, true)),
      // That number on top.
      play([{ kind: 'bar', parts: ones(5), cut: true, shaded: range(4), counted: range(4) }, { kind: 'text', text: '4 copies: 4 on top.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Keep the denominator.
      play([{ kind: 'bar', parts: ones(5), cut: true, shaded: range(4), label: '4/5' }, { kind: 'text', text: '4 × 1/5 = 4/5.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 5, cut: true, hidden: true }, { kind: 'text', text: 'Each copy adds one more fifth.', hidden: true }],
      [400, { 0: { hidden: false } }],
      ...jumpUp(0, 4, 350),
      [400, { 1: { hidden: false } }]),
  },

  'multiply-whole-by-fraction': {
    steps: [
      // Groups times the numerator: 3 groups of 2/5.
      play([
        { kind: 'bar', parts: ones(5), cut: true, label: '3 groups of 2/5' },
        { kind: 'bar', parts: ones(5), cut: true },
        { kind: 'bar', parts: ones(5), cut: true },
      ],
      [500, { 0: { shaded: [0, 1] } }],
      [500, { 1: { shaded: [0, 1] } }],
      [500, { 2: { shaded: [0, 1] } }]),
      // Keep the denominator.
      play([
        { kind: 'bar', parts: ones(5), cut: true, shaded: [0, 1] },
        { kind: 'bar', parts: ones(5), cut: true, shaded: [0, 1], countFrom: 3 },
        { kind: 'bar', parts: ones(5), cut: true, shaded: [0, 1], countFrom: 5 },
        { kind: 'text', text: '3 × 2 = 6 fifths: 6/5.', hidden: true },
      ],
      [450, { 0: { counted: [0, 1] } }],
      [450, { 1: { counted: [0, 1] } }],
      [450, { 2: { counted: [0, 1] } }],
      [500, { 3: { hidden: false } }]),
      // Six fifths is six of 1/5.
      play([{ kind: 'bar', parts: ones(5), cut: true, shaded: range(5) }, { kind: 'bar', parts: ones(5), cut: true, shaded: [0] }, { kind: 'text', text: '6/5 = 6 × 1/5.', hidden: true }],
        [600, { 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 2, spaces: 5, cut: true, hidden: true }, { kind: 'text', text: 'Three jumps of 2/5 land on 6/5.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [450, { 0: { jumps: 2 } }],
      [450, { 0: { jumps: 4 } }],
      [450, { 0: { jumps: 6, point: 6, pointLabel: '6/5' } }],
      [400, { 1: { hidden: false } }]),
  },
  // Unit 9 · Simplify, unlike fractions, line plots, measurement
  'simplify-fractions': {
    steps: [
      // A number that divides top and bottom.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '6/8' }, { kind: 'text', text: '2 divides both 6 and 8.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Divide both: parts join into bigger parts.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '6/8' }, { kind: 'text', text: '6 ÷ 2 = 3 and 8 ÷ 2 = 4: 3/4.', hidden: true }],
        [800, { 0: { group: 2, label: '3/4' } }],
        [500, { 1: { hidden: false } }]),
      // Until no number but 1 divides both.
      play([{ kind: 'bar', parts: ones(8), group: 2, cut: true, shaded: range(6), label: '3/4' }, { kind: 'text', text: 'Only 1 divides 3 and 4: 3/4 is in simplest form.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([
      { kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '6/8', hidden: true },
      { kind: 'bar', parts: ones(8), group: 2, cut: true, shaded: range(6), label: '3/4', hidden: true },
      { kind: 'text', text: 'Fewer, bigger parts: the same amount.', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }],
    [400, { 2: { hidden: false } }]),
  },

  'equivalent-missing-both': {
    steps: [
      // What was the denominator multiplied by?
      play([{ kind: 'bar', parts: ones(10), group: 2, cut: true, shaded: range(4), label: '2/5 = ?/10' }, { kind: 'text', text: '5 × 2 = 10.', hidden: true }],
        [700, { 0: { group: 1 } }],
        [500, { 1: { hidden: false } }]),
      // The same to the numerator.
      play([{ kind: 'bar', parts: ones(10), cut: true, shaded: range(4), label: '2/5 = ?/10' }, { kind: 'text', text: '2 × 2 = 4: 2/5 = 4/10.', hidden: true }],
        ...countUp(0, 4, 420),
        [500, { 1: { hidden: false } }]),
      // The same amount.
      play([
        { kind: 'bar', parts: ones(5), cut: true, shaded: [0, 1], label: '2/5', hidden: true },
        { kind: 'bar', parts: ones(10), cut: true, shaded: range(4), label: '4/10', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
    ],
    // Why: dividing works the same way.
    why: play([{ kind: 'bar', parts: ones(10), cut: true, shaded: range(4), label: '4/10' }, { kind: 'text', text: 'Divide both by 2: 4/10 = 2/5.', hidden: true }],
      [800, { 0: { group: 2, label: '2/5' } }],
      [400, { 1: { hidden: false } }]),
  },

  'compare-unlike-fractions': {
    steps: [
      // A common denominator: thirds and fourths both fit twelfths.
      play([
        { kind: 'bar', parts: ones(12), group: 4, cut: true, shaded: range(8), label: '2/3' },
        { kind: 'bar', parts: ones(12), group: 3, cut: true, shaded: range(9), label: '3/4' },
        { kind: 'text', text: '3 × 4 = 12: both can be twelfths.', hidden: true },
      ],
      [600, { 2: { hidden: false } }]),
      // Rename both.
      play([
        { kind: 'bar', parts: ones(12), group: 4, cut: true, shaded: range(8), label: '2/3' },
        { kind: 'bar', parts: ones(12), group: 3, cut: true, shaded: range(9), label: '3/4' },
      ],
      [800, { 0: { group: 1, label: '8/12' }, 1: { group: 1, label: '9/12' } }]),
      // Compare the numerators.
      play([
        { kind: 'bar', parts: ones(12), cut: true, shaded: range(8), label: '8/12' },
        { kind: 'bar', parts: ones(12), cut: true, shaded: range(9), label: '9/12' },
        { kind: 'text', text: '9 > 8, so 3/4 > 2/3.', hidden: true },
      ],
      [500, { 1: { glow: [8] } }],
      [600, { 1: { glow: [] }, 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'text', text: 'Same-size parts: more parts means more.', hidden: true }, { kind: 'bar', parts: ones(12), cut: true, shaded: range(9), label: '9/12' }],
      [400, { 0: { hidden: false } }]),
  },

  'order-unlike-fractions': {
    steps: [
      // Compare each with 1/2.
      play([
        { kind: 'bar', parts: ones(3), cut: true, shaded: [0], label: '1/3: less than half', hidden: true },
        { kind: 'bar', parts: ones(8), cut: true, shaded: range(5), label: '5/8: more than half', hidden: true },
        { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2: exactly half', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }],
      [400, { 2: { hidden: false } }]),
      // If that is not enough, rename.
      play([
        { kind: 'bar', parts: ones(8), group: 2, cut: true, shaded: range(6), label: '3/4' },
        { kind: 'bar', parts: ones(8), cut: true, shaded: range(5), label: '5/8' },
        { kind: 'text', text: 'Both more than half? Rename: 3/4 = 6/8.', hidden: true },
      ],
      [800, { 0: { group: 1, label: '6/8' } }],
      [500, { 2: { hidden: false } }]),
      // Then compare and order.
      play([
        { kind: 'bar', parts: ones(3), cut: true, shaded: [0], label: '1/3', hidden: true },
        { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2', hidden: true },
        { kind: 'bar', parts: ones(8), cut: true, shaded: range(5), label: '5/8', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }],
      [400, { 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 24, marks: [{ at: 8, label: '1/3' }, { at: 12, label: '1/2' }, { at: 15, label: '5/8' }], hidden: true }, { kind: 'text', text: 'In order on the line: 1/3, 1/2, 5/8.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'plot-in-eighths': {
    steps: [
      // Find each length: 3/8, 5/8, 5/8 and 7/8 inch.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [], marks: eighthMarks }, { kind: 'text', text: 'Pebbles: 3/8, 5/8, 5/8 and 7/8 inch.', hidden: true }],
        [400, { 1: { hidden: false } }],
        [500, { 0: { point: 3 } }],
        [500, { 0: { point: 5 } }],
        [500, { 0: { point: 7 } }]),
      // One X above each.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [], marks: eighthMarks }],
        [500, { 0: { xs: [[3, 1]] } }],
        [500, { 0: { xs: [[3, 1], [5, 1]] } }],
        [500, { 0: { xs: [[3, 1], [5, 1], [7, 1]] } }]),
      // Stack matching lengths.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[3, 1], [5, 1], [7, 1]], marks: eighthMarks }, { kind: 'text', text: 'Two pebbles are 5/8 inch: two Xs.', hidden: true }],
        [600, { 0: { xs: [[3, 1], [5, 2], [7, 1]] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[3, 1], [5, 2], [7, 1]], marks: eighthMarks }, { kind: 'text', text: '4 Xs for 4 pebbles: count them at a glance.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },

  'read-line-plots': {
    steps: [
      // Read the label under each stack.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[2, 1], [3, 3], [5, 2]], marks: eighthMarks }, { kind: 'text', text: 'Stacks at 2/8, 3/8 and 5/8 inch.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Count the Xs in a stack.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[2, 1], [3, 3], [5, 2]], marks: eighthMarks, point: null }, { kind: 'text', text: '3 crayons are 3/8 inch long.', hidden: true }],
        [600, { 0: { point: 3 } }],
        [500, { 1: { hidden: false } }]),
      // Compare or subtract.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[2, 1], [3, 3], [5, 2]], marks: eighthMarks }, { kind: 'text', text: 'Longest − shortest: 5/8 − 2/8 = 3/8 inch.', hidden: true }],
        [600, { 0: { stretchFrom: 2, stretch: 5 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[2, 1], [3, 3], [5, 2]], marks: eighthMarks }, { kind: 'text', text: 'Each X is one crayon; its place is its length.', hidden: true }],
      [500, { 1: { hidden: false } }]),
  },

  'measurement-word-problems': {
    steps: [
      // The amounts and their unit.
      play([{ kind: 'line', max: 1, spaces: 4, unit: 'hour' }, { kind: 'text', text: '1 hour is 60 minutes.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Split it equally: 60 ÷ 4 = 15.
      play([{ kind: 'line', max: 1, spaces: 4, unit: 'hour', marks: [{ at: 1, label: '15 min' }, { at: 2, label: '30 min' }, { at: 3, label: '45 min' }] }, { kind: 'text', text: '4 equal parts: 60 ÷ 4 = 15 minutes each.', hidden: true }],
        [600, { 0: { cut: true } }],
        [500, { 1: { hidden: false } }]),
      // Solve and keep the unit.
      play([{ kind: 'line', max: 1, spaces: 4, unit: 'hour', cut: true, marks: [{ at: 1, label: '15 min' }] }, { kind: 'text', text: '1/4 hour = 15 minutes.', hidden: true }],
        [600, { 0: { stretch: 1 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'text', text: 'Change to the same unit before you add or compare: 1/4 hour + 10 minutes = 25 minutes.', hidden: true }, { kind: 'line', max: 1, spaces: 12, unit: 'hour', cut: true, group: 3, marks: [{ at: 3, label: '15' }, { at: 5, label: '25 min' }] }],
      [400, { 0: { hidden: false } }],
      [500, { 1: { stretch: 3 } }],
      [500, { 1: { stretch: 5 } }]),
  },

  'fraction-recipes': {
    steps: [
      // The amount: 2/3 cup.
      play([{ kind: 'bar', parts: ones(3), cut: true, label: '1 batch: 2/3 cup' }],
        [600, { 0: { shaded: [0, 1] } }]),
      // Numerator times batches: 3 batches.
      play([
        { kind: 'bar', parts: ones(3), cut: true, shaded: [0, 1] },
        { kind: 'bar', parts: ones(3), cut: true, shaded: [0, 1], countFrom: 3 },
        { kind: 'bar', parts: ones(3), cut: true, shaded: [0, 1], countFrom: 5 },
        { kind: 'text', text: '2 × 3 = 6 thirds.', hidden: true },
      ],
      [450, { 0: { counted: [0, 1] } }],
      [450, { 1: { counted: [0, 1] } }],
      [450, { 2: { counted: [0, 1] } }],
      [500, { 3: { hidden: false } }]),
      // Keep the denominator.
      play([{ kind: 'bar', parts: ones(3), cut: true, shaded: range(3) }, { kind: 'bar', parts: ones(3), cut: true, shaded: range(3) }, { kind: 'text', text: '6/3 cups = 2 cups.', hidden: true }],
        [600, { 2: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 2, spaces: 3, cut: true, hidden: true }, { kind: 'text', text: 'Add 2/3 once for every batch.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [450, { 0: { jumps: 2 } }],
      [450, { 0: { jumps: 4 } }],
      [450, { 0: { jumps: 6, point: 6, pointLabel: '6/3' } }],
      [400, { 1: { hidden: false } }]),
  },

  'party-portions': {
    steps: [
      // Numerator times people: 5 guests eat 3/8 pound each.
      play([{ kind: 'bar', parts: ones(8), cut: true, label: '5 guests × 3/8 pound' }, { kind: 'bar', parts: ones(8), cut: true, countFrom: 9 }, { kind: 'text', text: '3 × 5 = 15 eighths.', hidden: true }],
        ...countUp(0, 8, 260, true),
        ...countUp(1, 7, 260, true),
        [500, { 2: { hidden: false } }]),
      // Keep the denominator.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(8) }, { kind: 'bar', parts: ones(8), cut: true, shaded: range(7) }, { kind: 'text', text: '15/8 pounds.', hidden: true }],
        [600, { 2: { hidden: false } }]),
      // Between which whole numbers?
      play([{ kind: 'line', max: 2, spaces: 8, cut: true, group: 1, pointLabel: '15/8' }, { kind: 'text', text: '15/8 is between 1 and 2 pounds.', hidden: true }],
        [600, { 0: { point: 15 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(3), shaded2: [3, 4, 5], label: 'Each guest gets the same 3/8.', hidden: true }],
      [400, { 0: { hidden: false } }]),
  },
  // Unit 10 · Unlike fractions
  'add-related-fractions': {
    steps: [
      // Rename halves into fourths.
      play([
        { kind: 'bar', parts: four, group: 2, cut: true, shaded: [0, 1], label: '1/2' },
        { kind: 'bar', parts: four, cut: true, shaded2: [0], label: '1/4' },
        { kind: 'text', text: 'Cut each half in two: 1/2 = 2/4.', hidden: true },
      ],
      [800, { 0: { group: 1, label: '2/4' } }],
      [500, { 2: { hidden: false } }]),
      // Add the numerators.
      play([{ kind: 'bar', parts: four, cut: true, label: '2/4 + 1/4' }, { kind: 'text', text: '2 + 1 = 3.', hidden: true }],
        [500, { 0: { shaded: [0, 1] } }],
        [600, { 0: { shaded2: [2] } }],
        [500, { 0: { counted: range(3) } }],
        [500, { 1: { hidden: false } }]),
      // Keep the shared denominator.
      play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1], shaded2: [2], label: '3/4' }, { kind: 'text', text: 'Still fourths: 1/2 + 1/4 = 3/4.', hidden: true }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([
      { kind: 'bar', parts: [2, 1, 1], cut: true, shaded: [0], shaded2: [1], label: 'A half and a fourth: different sizes', tone: 'unfair', hidden: true },
      { kind: 'bar', parts: four, cut: true, shaded: [0, 1], shaded2: [2], label: '2 fourths and 1 fourth: count them', tone: 'fair', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [500, { 1: { hidden: false } }]),
  },

  'add-unlike-fractions': {
    steps: [
      // A common denominator: 3 × 4 = 12.
      play([
        { kind: 'bar', parts: ones(12), group: 4, cut: true, shaded: range(4), label: '1/3' },
        { kind: 'bar', parts: ones(12), group: 3, cut: true, shaded2: range(3), label: '1/4' },
        { kind: 'text', text: '3 × 4 = 12: both can be twelfths.', hidden: true },
      ],
      [600, { 2: { hidden: false } }]),
      // Rename both.
      play([
        { kind: 'bar', parts: ones(12), group: 4, cut: true, shaded: range(4), label: '1/3' },
        { kind: 'bar', parts: ones(12), group: 3, cut: true, shaded2: range(3), label: '1/4' },
      ],
      [800, { 0: { group: 1, label: '4/12' } }],
      [800, { 1: { group: 1, label: '3/12' } }]),
      // Add the numerators, keep the denominator.
      play([{ kind: 'bar', parts: ones(12), cut: true, shaded: range(4), label: '4/12 + 3/12' }, { kind: 'text', text: '4 + 3 = 7: 7/12.', hidden: true }],
        [600, { 0: { shaded2: [4, 5, 6] } }],
        [500, { 0: { counted: range(7) } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(12), group: 4, cut: true, shaded: range(4), label: '1/3' }, { kind: 'text', text: 'Finer cuts, same amount: 1/3 = 4/12.', hidden: true }],
      [800, { 0: { group: 1, label: '4/12' } }],
      [400, { 1: { hidden: false } }]),
  },

  'subtract-unlike-fractions': {
    steps: [
      // A common denominator: halves fit into fourths.
      play([
        { kind: 'bar', parts: four, cut: true, shaded: range(3), label: '3/4' },
        { kind: 'bar', parts: four, group: 2, cut: true, shaded: [0, 1], label: '1/2' },
      ],
      [600, { 1: { label: '1/2: halves fit into fourths' } }]),
      // Rename: 1/2 = 2/4 (3/4 already is fourths).
      play([
        { kind: 'bar', parts: four, cut: true, shaded: range(3), label: '3/4' },
        { kind: 'bar', parts: four, group: 2, cut: true, shaded: [0, 1], label: '1/2' },
        { kind: 'text', text: '3/4 stays. 1/2 = 2/4.', hidden: true },
      ],
      [800, { 1: { group: 1, label: '2/4' } }],
      [500, { 2: { hidden: false } }]),
      // Take the parts away.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(3), label: '3/4 − 2/4' }, { kind: 'text', text: '3 − 2 = 1: 1/4.', hidden: true }],
        [600, { 0: { glow: [1, 2] } }],
        [700, { 0: { glow: [], shaded: [0] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([
      { kind: 'bar', parts: four, group: 2, cut: true, shaded: [0, 1], label: '1/2: not the same size as fourths', tone: 'unfair' },
      { kind: 'text', text: 'Now the parts match, so you can take 2 fourths away.', hidden: true },
    ],
    [800, { 0: { group: 1, label: '2/4: the same size as fourths', tone: 'fair' } }],
    [500, { 1: { hidden: false } }]),
  },

  'mixed-unlike-operations': {
    steps: [
      // Rename the fraction parts: 2 1/2 + 1 3/4.
      play([
        { kind: 'bar', parts: four, group: 2, cut: true, shaded: [0, 1], label: '2 1/2: the 1/2' },
        { kind: 'bar', parts: four, cut: true, shaded2: range(3), label: '1 3/4: the 3/4' },
      ],
      [800, { 0: { group: 1, label: '2 1/2 = 2 2/4' } }]),
      // Add the parts: 5 fourths make a whole and 1/4.
      play([
        { kind: 'bar', parts: four, cut: true, shaded: [0, 1] },
        { kind: 'bar', parts: four, cut: true },
        { kind: 'text', text: '2/4 + 3/4 = 5/4: 1 whole and 1/4.', hidden: true },
      ],
      [600, { 0: { shaded2: [2, 3] }, 1: { shaded2: [0], countFrom: 5 } }],
      [500, { 0: { counted: range(4) }, 1: { counted: [0] } }],
      [500, { 0: { bracket: '1 whole' }, 2: { hidden: false } }]),
      // Then add the wholes.
      play([{ kind: 'line', max: 5, spaces: 4, pointLabel: '4 1/4' }, { kind: 'text', text: '2 + 1 + 1 = 4 wholes, and 1/4: 4 1/4.', hidden: true }],
        [500, { 0: { stretch: 8 } }],
        [500, { 0: { stretch: 12 } }],
        [500, { 0: { stretch: 16 } }],
        [500, { 0: { cut: true, stretch: 17, point: 17 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: range(4) }, { kind: 'text', text: 'A full set of 4 fourths is 1 whole, so you can trade either way.', hidden: true }],
      [600, { 0: { bracket: '4/4 = 1 whole' } }],
      [400, { 1: { hidden: false } }]),
  },

  'estimate-fraction-operations': {
    steps: [
      // Compare each with 0, 1/2 or 1.
      play([
        { kind: 'line', max: 1, spaces: 8, cut: true, marks: halfMarks(8), pointLabel: '7/8', hidden: true },
        { kind: 'line', max: 1, spaces: 18, group: 2, cut: true, marks: halfMarks(18), pointLabel: '4/9', hidden: true },
        { kind: 'text', text: 'Close to 1, and close to 1/2.', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [500, { 0: { point: 7 } }],
      [400, { 1: { hidden: false } }],
      [500, { 1: { point: 8 } }],
      [500, { 2: { hidden: false } }]),
      // Add the easy amounts.
      play([{ kind: 'line', max: 2, spaces: 2, marks: [{ at: 3, label: '1 1/2' }] }, { kind: 'text', text: '1 + 1/2 = 1 1/2.', hidden: true }],
        [500, { 0: { jumps: 2 } }],
        [500, { 0: { jumps: 3, stretch: 3 } }],
        [500, { 1: { hidden: false } }]),
      // Is the answer close?
      play([{ kind: 'line', max: 2, spaces: 2, marks: [{ at: 3, label: '1 1/2' }], pointLabel: '11/17' }, { kind: 'text', text: 'Did someone get 11/17? That is less than 1: far from 1 1/2, so check again.', hidden: true }],
        [600, { 0: { point: 1.3 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 2, cut: true, marks: halfMarks(2), hidden: true }, { kind: 'text', text: '0, 1/2 and 1 are easy to add, so a wrong answer stands out.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },
  // Unit 11 · Multiply and divide
  'sets-unit-fractions': {
    steps: [
      // The denominator says how many equal groups.
      play([{ kind: 'set', count: 12 }, { kind: 'text', text: '1/3 of 12: 3 equal groups.', hidden: true }],
        [700, { 0: { groups: 3, dealt: 0 } }],
        [500, { 1: { hidden: false } }]),
      // Share them out evenly.
      play([{ kind: 'set', count: 12, groups: 3, dealt: 0 }, { kind: 'text', text: 'One to each group, again and again.', hidden: true }],
        ...dealRounds(0, 12, 3, 520),
        [500, { 1: { hidden: false } }]),
      // Count one group.
      play([{ kind: 'set', count: 12, groups: 3 }, { kind: 'text', text: '4 in one group: 1/3 of 12 is 4.', hidden: true }],
        [600, { 0: { shaded: [0] } }],
        [600, { 0: { shaded: [0], counted: [0] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'set', count: 12, groups: 3, shaded: [0], label: '1 of 3 equal groups', hidden: true }, { kind: 'text', text: 'One group is one part: 1/3.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'sets-nonunit': {
    steps: [
      // The denominator makes 5 equal groups.
      play([{ kind: 'set', count: 15 }, { kind: 'text', text: '2/5 of 15: 5 equal groups.', hidden: true }],
        [600, { 0: { groups: 5, dealt: 0 } }],
        ...dealRounds(0, 15, 5),
        [500, { 1: { hidden: false } }]),
      // Count one group.
      play([{ kind: 'set', count: 15, groups: 5 }, { kind: 'text', text: '3 in one group.', hidden: true }],
        [600, { 0: { counted: [0] } }],
        [500, { 1: { hidden: false } }]),
      // Take as many groups as the numerator.
      play([{ kind: 'set', count: 15, groups: 5, countOn: true }, { kind: 'text', text: '2 groups: 2/5 of 15 is 6.', hidden: true }],
        [600, { 0: { shaded: [0], counted: [0] } }],
        [600, { 0: { shaded: [0, 1], counted: [0, 1] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'set', count: 15, groups: 5, shaded: [0, 1], label: '2 of 5 groups', hidden: true }, { kind: 'text', text: 'Each group is 1/5. The numerator counts 2 of them.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'fraction-of-quantity': {
    steps: [
      // Divide by the denominator.
      play([{ kind: 'bar', parts: ones(5), bracket: '20' }, { kind: 'text', text: '3/5 of 20: 20 ÷ 5 = 4.', hidden: true }],
        [700, { 0: { cut: true } }],
        [500, { 1: { hidden: false } }]),
      // That is one part.
      play([{ kind: 'bar', parts: ones(5), cut: true, bracket: '20' }, { kind: 'text', text: 'Each part is 4.', hidden: true }],
        [600, { 0: { glow: [0], label: 'One part: 4' } }],
        [500, { 1: { hidden: false } }]),
      // Multiply by the numerator.
      play([{ kind: 'bar', parts: ones(5), cut: true, bracket: '20' }, { kind: 'text', text: '3 × 4 = 12: 3/5 of 20 is 12.', hidden: true }],
        ...countUp(0, 3, 450, true),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(5), cut: true, shaded: range(3), bracket: '20', label: '3/5', hidden: true }, { kind: 'text', text: 'Divide to find one part. The numerator says how many parts.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'multiply-fractions': {
    steps: [
      // Cut each part into smaller equal parts.
      play([{ kind: 'area', cut: 'grid-4x2', edges: true, shaded: [0, 1, 2, 4, 5, 6], label: '3/4' }, { kind: 'text', text: '1/2 of 3/4: cut each fourth in half.', hidden: true }],
        [600, { 0: { label: 'Each fourth cut in 2' } }],
        [500, { 1: { hidden: false } }]),
      // Multiply the denominators.
      play([{ kind: 'area', cut: 'grid-4x2', edges: true, shaded: [0, 1, 2, 4, 5, 6] }, { kind: 'text', text: '4 × 2 = 8 small parts: eighths.', hidden: true }],
        [700, { 0: { counted: range(8) } }],
        [500, { 1: { hidden: false } }]),
      // Multiply the numerators.
      play([{ kind: 'area', cut: 'grid-4x2', edges: true, shaded: [0, 1, 2, 4, 5, 6] }, { kind: 'text', text: 'Take half: 1 × 3 = 3. 1/2 of 3/4 is 3/8.', hidden: true }],
        [700, { 0: { shaded2: [0, 1, 2, 3] } }],
        [600, { 0: { counted: [0, 1, 2] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-4x2', edges: true, shaded: [0, 1, 2, 4, 5, 6], shaded2: [0, 1, 2, 3], hidden: true }, { kind: 'text', text: 'Cutting again makes eighths. Half of each fourth takes 3 of them.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'fraction-times-fraction': {
    steps: [
      // Rows for one fraction, columns for the other.
      play([{ kind: 'area', cut: 'grid-5x3', label: '2/3 × 4/5' }, { kind: 'text', text: '3 rows for thirds, 5 columns for fifths.', hidden: true }],
        [700, { 0: { edges: true } }],
        [500, { 1: { hidden: false } }]),
      // Shade where they overlap.
      play([{ kind: 'area', cut: 'grid-5x3', edges: true }, { kind: 'text', text: '2 rows, and 4 columns: the dark part is both.', hidden: true }],
        [700, { 0: { shaded2: range(10) } }],
        [700, { 0: { shaded: gridOverlap(5, 3, 4) } }],
        [500, { 1: { hidden: false } }]),
      // Count the overlap over all the boxes.
      play([{ kind: 'area', cut: 'grid-5x3', edges: true, shaded2: range(10), shaded: gridOverlap(5, 3, 4) }, { kind: 'text', text: '8 of 15 boxes: 2/3 × 4/5 = 8/15.', hidden: true }],
        [800, { 0: { counted: gridOverlap(5, 2, 4) } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-5x3', edges: true, shaded2: range(10), shaded: gridOverlap(5, 3, 4), hidden: true }, { kind: 'text', text: '3 × 5 = 15 boxes in all. 2 × 4 = 8 in the overlap.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'fraction-of-collection': {
    steps: [
      // As many equal groups as the denominator.
      play([{ kind: 'set', count: 16 }, { kind: 'text', text: '3/4 of 16 cards: 4 equal groups.', hidden: true }],
        [600, { 0: { groups: 4, dealt: 0 } }],
        ...dealRounds(0, 16, 4, 380),
        [500, { 1: { hidden: false } }]),
      // Count one group.
      play([{ kind: 'set', count: 16, groups: 4 }, { kind: 'text', text: '4 cards in one group.', hidden: true }],
        [600, { 0: { counted: [0] } }],
        [500, { 1: { hidden: false } }]),
      // Take as many groups as the numerator.
      play([{ kind: 'set', count: 16, groups: 4, countOn: true }, { kind: 'text', text: '3 groups: 3/4 of 16 is 12 cards.', hidden: true }],
        [500, { 0: { shaded: [0], counted: [0] } }],
        [500, { 0: { shaded: [0, 1], counted: [0, 1] } }],
        [500, { 0: { shaded: [0, 1, 2], counted: [0, 1, 2] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'set', count: 16, groups: 4, shaded: [0, 1, 2], label: '3 of 4 fair groups', hidden: true }, { kind: 'text', text: 'Equal groups make fair parts. The numerator counts them.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'multiplication-scaling': {
    steps: [
      // Compare the fraction with 1.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true, marks: [{ at: 3, label: '3/4' }, { at: 5, label: '5/4' }] }, { kind: 'text', text: '3/4 is less than 1. 5/4 is more than 1.', hidden: true }],
        [600, { 0: { point: 3 } }],
        [600, { 0: { point: 5 } }],
        [500, { 1: { hidden: false } }]),
      // Less than 1: smaller.
      play([
        { kind: 'line', max: 2, spaces: 4, cut: true, stretch: 4, label: '1 × 8 = 8: one whole copy' },
        { kind: 'line', max: 2, spaces: 4, cut: true, label: '3/4 × 8 = 6: part of a copy' },
      ],
      [700, { 1: { stretch: 3 } }]),
      // More than 1: bigger.
      play([
        { kind: 'line', max: 2, spaces: 4, cut: true, stretch: 4, label: '1 × 8 = 8: one whole copy' },
        { kind: 'line', max: 2, spaces: 4, cut: true, label: '5/4 × 8 = 10: more than a copy' },
      ],
      [700, { 1: { stretch: 5 } }]),
    ],
    why: play([{ kind: 'line', max: 2, spaces: 4, cut: true, stretch: 4, label: '1 × 8: the same 8', hidden: true }, { kind: 'text', text: 'Times 1 keeps the amount. Less than 1 copy is less; more is more.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'bigger-or-smaller': {
    steps: [
      // Look at the factor.
      play([{ kind: 'text', text: '2/3 × 9' }, { kind: 'line', max: 2, spaces: 3, cut: true, pointLabel: '2/3' }],
        [700, { 1: { point: 2 } }]),
      // Compare it with 1.
      play([{ kind: 'line', max: 2, spaces: 3, cut: true, pointLabel: '2/3' }, { kind: 'text', text: '2/3 is less than 1.', hidden: true }],
        [600, { 0: { point: 2 } }],
        [500, { 1: { hidden: false } }]),
      // Less, more or the same.
      play([
        { kind: 'line', max: 2, spaces: 3, cut: true, label: '2/3 × 9 = 6: less than 9', hidden: true },
        { kind: 'line', max: 2, spaces: 3, cut: true, label: '4/3 × 9 = 12: more than 9', hidden: true },
        { kind: 'text', text: 'And 3/3 is 1, so 3/3 × 9 = 9.', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [500, { 0: { stretch: 2 } }],
      [400, { 1: { hidden: false } }],
      [500, { 1: { stretch: 4 } }],
      [500, { 2: { hidden: false } }]),
    ],
    why: play([
      { kind: 'line', max: 2, spaces: 3, cut: true, stretch: 3, label: 'One copy of 9', marks: [{ at: 2, label: '2/3' }, { at: 4, label: '4/3' }], hidden: true },
      { kind: 'text', text: 'Part of a copy is less. More than a copy is more.', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }]),
  },
  // Unit 12 · Measure and share
  'fraction-of-length': {
    steps: [
      // Split the length into equal parts.
      play([{ kind: 'bar', parts: four, bracket: '12 meters' }, { kind: 'text', text: '3/4 of 12 meters: 4 equal parts.', hidden: true }],
        [700, { 0: { cut: true } }],
        [500, { 1: { hidden: false } }]),
      // Find one part.
      play([{ kind: 'bar', parts: four, cut: true, bracket: '12 meters' }, { kind: 'text', text: '12 ÷ 4 = 3 meters in one part.', hidden: true }],
        [600, { 0: { glow: [0], label: 'One part: 3 meters' } }],
        [500, { 1: { hidden: false } }]),
      // Count parts using the numerator.
      play([{ kind: 'bar', parts: four, cut: true, bracket: '12 meters' }, { kind: 'text', text: '3 parts: 3 × 3 = 9 meters.', hidden: true }],
        ...countUp(0, 3, 450, true),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: range(3), bracket: '12 meters', label: '3/4' }, { kind: 'text', text: 'Each equal part is one piece of the 12 meters.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'fractional-measure-addition': {
    steps: [
      // Rename as same-size parts.
      play([
        { kind: 'bar', parts: four, group: 2, cut: true, shaded: [0, 1], label: '1/2 meter' },
        { kind: 'bar', parts: four, cut: true, shaded2: [0], label: '1/4 meter' },
        { kind: 'text', text: 'Fourths fit both: 1/2 meter = 2/4 meter.', hidden: true },
      ],
      [800, { 0: { group: 1, label: '2/4 meter' } }],
      [500, { 2: { hidden: false } }]),
      // Add the numerators.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, unit: 'm', pointLabel: '3/4' }, { kind: 'text', text: '2/4 + 1/4: 2 + 1 = 3.', hidden: true }],
        ...jumpUp(0, 2, 450),
        [500, { 0: { jumps: 3, point: 3 } }],
        [500, { 1: { hidden: false } }]),
      // Keep the unit.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, unit: 'm', jumps: 3, pointLabel: '3/4 meter' }, { kind: 'text', text: 'The answer is 3/4 meter, not just 3/4.', hidden: true }],
        [600, { 0: { point: 3 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 4, cut: true, unit: 'm', jumps: 3 }, { kind: 'text', text: 'Same unit, same-size parts: just count them.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'line-plot-leveling': {
    steps: [
      // Add every amount.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[2, 1], [3, 1], [7, 1]], marks: eighthMarks }, { kind: 'text', text: '2/8 + 3/8 + 7/8 = 12/8 liter.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Divide by the number of cups.
      play([{ kind: 'bar', parts: ones(12), cut: true, shaded: range(12), label: '12/8 liter shared by 3 cups' }, { kind: 'text', text: '12 eighths ÷ 3 cups = 4 eighths each.', hidden: true }],
        [800, { 0: { group: 4 } }],
        [500, { 1: { hidden: false } }]),
      // Each cup's share.
      play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[2, 1], [3, 1], [7, 1]], marks: eighthMarks }, { kind: 'text', text: 'Level them: every cup gets 4/8 liter.', hidden: true }],
        [800, { 0: { xs: [[4, 3]] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 8, cut: true, xs: [[4, 3]], marks: eighthMarks }, { kind: 'text', text: 'The total stays 12/8; now every share is equal.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'line-plot-totals': {
    steps: [
      // Read the amount under each stack.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, xs: [[1, 2], [3, 3]], marks: fourthMarks }, { kind: 'text', text: 'Stacks at 1/4 and 3/4 cup.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Add it once for every X.
      play([{ kind: 'line', max: 1, spaces: 4, cut: true, xs: [[1, 2], [3, 3]], marks: fourthMarks }, { kind: 'text', text: '1/4 + 1/4, and 3/4 + 3/4 + 3/4.', hidden: true }],
        [600, { 0: { point: 1 } }],
        [600, { 0: { point: 3 } }],
        [500, { 1: { hidden: false } }]),
      // Add the numerators.
      play([{ kind: 'text', text: '1 + 1 + 3 + 3 + 3 = 11: 11/4 cups.', hidden: true }, { kind: 'bar', parts: four, cut: true, countFrom: 1 }, { kind: 'bar', parts: four, cut: true, countFrom: 5 }, { kind: 'bar', parts: four, cut: true, countFrom: 9 }],
        ...countUp(1, 4, 220, true),
        ...countUp(2, 4, 220, true),
        ...countUp(3, 3, 220, true),
        [500, { 0: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 4, cut: true, xs: [[1, 2], [3, 3]], marks: fourthMarks }, { kind: 'text', text: '5 Xs, so 5 amounts are added.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'fractional-unit-conversions': {
    steps: [
      // Small units in one big unit.
      play([{ kind: 'line', max: 1, spaces: 4, unit: 'hour', marks: [] }, { kind: 'text', text: '3/4 of an hour: 1 hour is 60 minutes.', hidden: true }],
        [600, { 0: { stretch: 4 } }],
        [500, { 1: { hidden: false } }]),
      // Divide by the denominator.
      play([{ kind: 'line', max: 1, spaces: 4, unit: 'hour', marks: [{ at: 1, label: '15 min' }] }, { kind: 'text', text: '60 ÷ 4 = 15 minutes in one part.', hidden: true }],
        [600, { 0: { cut: true } }],
        [500, { 0: { stretch: 1 } }],
        [500, { 1: { hidden: false } }]),
      // Multiply by the numerator.
      play([{ kind: 'line', max: 1, spaces: 4, unit: 'hour', cut: true, marks: [{ at: 1, label: '15' }, { at: 2, label: '30' }, { at: 3, label: '45 min' }] }, { kind: 'text', text: '3 × 15 = 45: 3/4 of an hour is 45 minutes.', hidden: true }],
        ...jumpUp(0, 3, 450),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 4, unit: 'hour', cut: true, stretch: 3, marks: [{ at: 3, label: '45 min' }] }, { kind: 'text', text: 'It is 3/4 of a number: the 60 minutes in an hour.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'two-step-conversions': {
    steps: [
      // Change to the smaller unit.
      play([{ kind: 'line', max: 1, spaces: 4, unit: 'foot', cut: true, marks: [{ at: 1, label: '3 in' }, { at: 2, label: '6 in' }, { at: 3, label: '9 in' }] }, { kind: 'text', text: '1 foot = 12 inches, so 1/4 foot = 3 inches.', hidden: true }],
        [600, { 0: { stretch: 1 } }],
        [500, { 1: { hidden: false } }]),
      // Then add or take away.
      play([{ kind: 'line', max: 1, spaces: 12, unit: 'foot', group: 3, cut: true, stretch: 3, marks: [{ at: 3, label: '3 in' }, { at: 8, label: '8 in' }] }, { kind: 'text', text: '3 inches + 5 inches = 8 inches.', hidden: true }],
        [800, { 0: { stretch: 8 } }],
        [500, { 1: { hidden: false } }]),
      // Keep the small unit.
      play([{ kind: 'line', max: 1, spaces: 12, unit: 'foot', group: 3, cut: true, pointLabel: '8 inches' }, { kind: 'text', text: 'The answer is in inches: 8 inches.', hidden: true }],
        [600, { 0: { point: 8 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'line', max: 1, spaces: 12, unit: 'foot', group: 3, cut: true, stretch: 8, marks: [{ at: 3, label: '3 in' }] }, { kind: 'text', text: 'Feet and inches only add once both are inches.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'fractional-sharing': {
    steps: [
      // Cut each thing into as many parts as friends: 3 pizzas, 4 friends.
      play([
        { kind: 'bar', parts: four, label: 'Pizza 1' },
        { kind: 'bar', parts: four, label: 'Pizza 2' },
        { kind: 'bar', parts: four, label: 'Pizza 3' },
        { kind: 'text', text: '4 friends: cut each one into 4.', hidden: true },
      ],
      [700, { 0: { cut: true }, 1: { cut: true }, 2: { cut: true } }],
      [500, { 3: { hidden: false } }]),
      // Give each friend one part of each thing.
      play([
        { kind: 'bar', parts: four, cut: true, label: 'Pizza 1' },
        { kind: 'bar', parts: four, cut: true, label: 'Pizza 2' },
        { kind: 'bar', parts: four, cut: true, label: 'Pizza 3' },
        { kind: 'text', text: 'One friend gets a piece of each.', hidden: true },
      ],
      [500, { 0: { shaded: [0] } }],
      [500, { 1: { shaded: [0] } }],
      [500, { 2: { shaded: [0] } }],
      [500, { 3: { hidden: false } }]),
      // Count one friend's parts.
      play([{ kind: 'bar', parts: four, cut: true, label: 'One friend’s pieces' }, { kind: 'text', text: '3 pieces of 1/4: 3/4 of a pizza each.', hidden: true }],
        ...countUp(0, 3, 450, true),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: range(3), label: '3/4' }, { kind: 'text', text: '3 pizzas, so 3 pieces each: 3 ÷ 4 = 3/4.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'fraction-as-division': {
    steps: [
      // The number shared goes on top.
      play([{ kind: 'set', count: 5, label: '5 ÷ 4: 5 cookies, 4 friends', hidden: true }, { kind: 'text', text: '5 things are shared: 5 goes on top.', hidden: true }],
        [500, { 0: { hidden: false } }],
        [600, { 1: { hidden: false } }]),
      // The number of shares on the bottom.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(4) }, { kind: 'bar', parts: four, cut: true, shaded: [0] }, { kind: 'text', text: '4 shares: each share is 5 fourths, 5/4.', hidden: true }],
        [500, { 0: { counted: range(4) } }],
        [500, { 1: { counted: [0], countFrom: 5 } }],
        [500, { 2: { hidden: false } }]),
      // A mixed number too.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true, pointLabel: '5/4' }, { kind: 'text', text: '5/4 is 1 whole and 1/4 more.', hidden: true }],
        ...jumpUp(0, 5, 300),
        [500, { 0: { point: 5 } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'text', text: 'The fraction bar means divide: 5/4 = 5 ÷ 4.', hidden: true }, { kind: 'bar', parts: four, cut: true, shaded: range(4), bracket: '4 shares of one whole' }],
      [400, { 0: { hidden: false } }]),
  },

  'unit-fraction-divided-whole': {
    steps: [
      // Cut the unit fraction into pieces.
      play([{ kind: 'bar', parts: ones(12), group: 4, cut: true, shaded: range(4), label: '1/3' }, { kind: 'text', text: '1/3 ÷ 4: cut the third into 4 pieces.', hidden: true }],
        [800, { 0: { group: 1, counted: range(4), label: '1/3 cut into 4' } }],
        [500, { 1: { hidden: false } }]),
      // What part of the whole one piece is.
      play([{ kind: 'bar', parts: ones(12), cut: true, shaded: [0], label: 'One piece' }, { kind: 'text', text: 'Pieces that size fill the whole 12 times: 1/12.', hidden: true }],
        [700, { 0: { counted: range(12) } }],
        [500, { 1: { hidden: false } }]),
      // Multiply the denominator.
      play([{ kind: 'bar', parts: ones(12), cut: true, shaded: [0], label: '1/12' }, { kind: 'text', text: '3 × 4 = 12: 1/3 ÷ 4 = 1/12.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([
      { kind: 'bar', parts: ones(12), group: 4, cut: true, shaded: range(4), label: '1/3', hidden: true },
      { kind: 'bar', parts: ones(12), cut: true, shaded: [0], label: '1/12: a smaller share', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }]),
  },

  'divide-whole-by-unit-fraction': {
    steps: [
      // How many parts fit in one whole.
      play([{ kind: 'bar', parts: four, cut: true, bracket: '1 whole' }, { kind: 'text', text: '2 ÷ 1/4: four 1/4s fit in 1 whole.', hidden: true }],
        ...countUp(0, 4, 380),
        [500, { 1: { hidden: false } }]),
      // Multiply by the number of wholes.
      play([{ kind: 'bar', parts: four, cut: true, counted: range(4) }, { kind: 'bar', parts: four, cut: true, countFrom: 5 }, { kind: 'text', text: '2 wholes: 2 × 4.', hidden: true }],
        ...countUp(1, 4, 380),
        [500, { 2: { hidden: false } }]),
      // That is how many fit.
      play([{ kind: 'line', max: 2, spaces: 4, cut: true }, { kind: 'text', text: '8 fourths fit: 2 ÷ 1/4 = 8.', hidden: true }],
        ...jumpUp(0, 8, 260),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, counted: range(4) }, { kind: 'text', text: 'The denominator says how many parts fill one whole.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'share-or-fit': {
    steps: [
      // Shares or pieces?
      play([
        { kind: 'bar', parts: [1, 1], cut: true, label: 'Share 1/2 pizza with 2: shares', hidden: true },
        { kind: 'bar', parts: four, cut: true, label: 'How many 1/4s in 1? Pieces', hidden: true },
      ],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
      // Sharing makes each share smaller.
      play([{ kind: 'bar', parts: four, group: 2, cut: true, shaded: [0, 1], label: '1/2 ÷ 2' }, { kind: 'text', text: 'Each share is 1/4: smaller than 1/2.', hidden: true }],
        [800, { 0: { group: 1, shaded: [0], label: 'One share: 1/4' } }],
        [500, { 1: { hidden: false } }]),
      // Fitting counts pieces; check with ×.
      play([{ kind: 'bar', parts: four, cut: true, label: '1 ÷ 1/4' }, { kind: 'text', text: '4 pieces fit. Check: 4 × 1/4 = 1.', hidden: true }],
        ...countUp(0, 4, 400),
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'text', text: 'Both are division. Multiply the answer back to check.', hidden: true }, { kind: 'bar', parts: four, cut: true, shaded: range(4), bracket: '4 × 1/4 = 1' }],
      [400, { 0: { hidden: false } }]),
  },
  // Unit 13 · Chance and area
  'fraction-probability': {
    steps: [
      // Count all the equally likely outcomes.
      play([{ kind: 'area', cut: 'circle-eighths', edges: true, shaded: [0, 1, 2], label: 'A spinner with 8 equal parts' }, { kind: 'text', text: '8 outcomes, all equally likely: 8 on the bottom.', hidden: true }],
        [800, { 0: { counted: range(8) } }],
        [500, { 1: { hidden: false } }]),
      // Count the ones you want.
      play([{ kind: 'area', cut: 'circle-eighths', edges: true, shaded: [0, 1, 2], label: 'Landing on purple' }, { kind: 'text', text: '3 purple parts: 3 on top.', hidden: true }],
        [700, { 0: { counted: [0, 1, 2] } }],
        [500, { 1: { hidden: false } }]),
      // Wanted over all.
      play([{ kind: 'area', cut: 'circle-eighths', edges: true, shaded: [0, 1, 2], counted: [0, 1, 2] }, { kind: 'text', text: 'The chance of purple is 3/8.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'circle-eighths', edges: true, shaded: [0, 1, 2], label: '3/8 of the spinner', hidden: true }, { kind: 'text', text: 'A chance is a part of all the outcomes.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'fractional-side-area': {
    steps: [
      // Multiply the side lengths: 2/3 m by 3/4 m in a 1-meter square.
      play([{ kind: 'area', cut: 'grid-4x3', label: 'A 1-meter square' }, { kind: 'text', text: 'Sides 2/3 m and 3/4 m: 2/3 × 3/4.', hidden: true }],
        [700, { 0: { edges: true } }],
        [600, { 0: { shaded2: range(8) } }],
        [600, { 0: { shaded: gridOverlap(4, 3, 3) } }],
        [500, { 1: { hidden: false } }]),
      // Multiply the numerators.
      play([{ kind: 'area', cut: 'grid-4x3', edges: true, shaded2: range(8), shaded: gridOverlap(4, 3, 3) }, { kind: 'text', text: '2 rows × 3 columns = 6 boxes in the rectangle.', hidden: true }],
        [800, { 0: { counted: gridOverlap(4, 2, 3) } }],
        [500, { 1: { hidden: false } }]),
      // Multiply the denominators.
      play([{ kind: 'area', cut: 'grid-4x3', edges: true, shaded2: range(8), shaded: gridOverlap(4, 3, 3) }, { kind: 'text', text: '3 × 4 = 12 boxes in the square: 6/12 square meter.', hidden: true }],
        [800, { 0: { counted: range(12) } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-4x3', edges: true, shaded2: range(8), shaded: gridOverlap(4, 3, 3), hidden: true }, { kind: 'text', text: 'Area is rows times columns, even in parts of a meter.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'multiply-mixed-numbers': {
    steps: [
      // Split each side into wholes and parts: 2 1/2 by 1 1/3, in boxes of 1/6.
      play([{ kind: 'area', cut: 'grid-5x4', edges: true, label: '2 1/2 by 1 1/3' }, { kind: 'text', text: '2 1/2 = 2 + 1/2, and 1 1/3 = 1 + 1/3.', hidden: true }],
        [700, { 0: { shaded: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13] } }],
        [500, { 1: { hidden: false } }]),
      // Every part by every part.
      play([{ kind: 'area', cut: 'grid-5x4', edges: true, shaded: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13] }, { kind: 'text', text: '2 × 1 = 2, 2 × 1/3 = 2/3, 1/2 × 1 = 1/2, 1/2 × 1/3 = 1/6.', hidden: true }],
        [600, { 0: { shaded2: [15, 16, 17, 18] } }],
        [600, { 0: { glow: [4, 9, 14] } }],
        [600, { 0: { counted: [19] } }],
        [500, { 1: { hidden: false } }]),
      // Add all the areas.
      play([{ kind: 'area', cut: 'grid-5x4', edges: true, shaded: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13], shaded2: [15, 16, 17, 18], glow: [4, 9, 14] }, { kind: 'text', text: '2 + 2/3 + 1/2 + 1/6 = 3 1/3.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-5x4', edges: true, shaded: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13], shaded2: [15, 16, 17, 18], glow: [4, 9, 14], hidden: true }, { kind: 'text', text: 'Four smaller rectangles add up to the whole area.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  // Unit 14 · Percent and stories
  'fractions-to-percent': {
    steps: [
      // Rename in hundredths.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '3/4 of 100 squares' }, { kind: 'text', text: '100 ÷ 4 = 25, and 3 × 25 = 75: 3/4 = 75/100.', hidden: true }],
        [800, { 0: { shaded: gridFill(75) } }],
        [500, { 1: { hidden: false } }]),
      // The numerator is the percent.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(75), label: '75 out of 100' }, { kind: 'text', text: '75 of the 100 squares.', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // Add the % sign.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(75), label: '75%' }, { kind: 'text', text: '3/4 = 75%.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(75), hidden: true }, { kind: 'text', text: 'Percent means out of 100.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'percent-to-fraction': {
    steps: [
      // The percent on top.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '40%' }, { kind: 'text', text: '40% is 40 out of 100: 40 on top.', hidden: true }],
        [800, { 0: { shaded: gridFill(40) } }],
        [500, { 1: { hidden: false } }]),
      // 100 on the bottom.
      play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(40), label: '40/100' }, { kind: 'text', text: '100 squares in all: 40% = 40/100.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(40), hidden: true }, { kind: 'text', text: 'Out of 100 means the denominator is 100.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'multi-step-fraction-stories': {
    steps: [
      // What the story asks.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(3), label: 'A 3/4 meter ribbon' }, { kind: 'text', text: 'Cut off 1/4 meter, twice. How much is left?', hidden: true }],
        [600, { 1: { hidden: false } }]),
      // The first step.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(3), label: 'First cut' }, { kind: 'text', text: '3/4 − 1/4 = 2/4.', hidden: true }],
        [600, { 0: { glow: [2] } }],
        [700, { 0: { glow: [], shaded: [0, 1] } }],
        [500, { 1: { hidden: false } }]),
      // Use that answer for the second step.
      play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1], label: 'Second cut' }, { kind: 'text', text: '2/4 − 1/4 = 1/4 meter left.', hidden: true }],
        [600, { 0: { glow: [1] } }],
        [700, { 0: { glow: [], shaded: [0] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: [0, 1], label: '2/4: the end of step 1, the start of step 2' }, { kind: 'text', text: 'The first answer starts the second step.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  // Unit 15 · Problem solving
  'find-the-whole': {
    steps: [
      // Divide the known amount by the numerator.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(3), label: '3/4 of the pack is 6' }, { kind: 'text', text: '6 ÷ 3 = 2 in one part.', hidden: true }],
        [600, { 0: { glow: [0] } }],
        [500, { 1: { hidden: false } }]),
      // Multiply one part by the denominator.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(3), label: 'One part is 2' }, { kind: 'text', text: '4 parts: 2 × 4 = 8.', hidden: true }],
        ...countUp(0, 4, 400),
        [500, { 1: { hidden: false } }]),
      // That is the whole.
      play([{ kind: 'bar', parts: four, cut: true, shaded: range(3) }, { kind: 'text', text: 'The whole pack is 8.', hidden: true }],
        [700, { 0: { bracket: '8 in the pack' } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: four, cut: true, shaded: range(3), bracket: '4 equal parts make the whole' }, { kind: 'text', text: 'The denominator says how many equal parts.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },

  'spot-the-mistake': {
    steps: [
      // Check each step against the rule.
      play([{ kind: 'text', text: 'Sam wrote 1/4 + 2/4 = 3/8.' }, { kind: 'text', text: 'Rule: add the numerators, keep the denominator.', hidden: true }, { kind: 'bar', parts: four, cut: true, shaded: [0], shaded2: [1, 2], label: '1/4 + 2/4' }],
        [600, { 1: { hidden: false } }]),
      // The first wrong step.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(3), label: '3/8: the denominator changed', tone: 'unfair' }, { kind: 'text', text: 'Adding 4 + 4 made the parts smaller: wrong.', hidden: true }],
        [600, { 0: { glow: range(3) } }],
        [500, { 1: { hidden: false } }]),
      // Fix it.
      play([{ kind: 'bar', parts: four, cut: true, label: 'Fixed: 1/4 + 2/4 = 3/4', tone: 'fair' }, { kind: 'text', text: 'Still fourths: 3/4.', hidden: true }],
        [600, { 0: { shaded: [0], shaded2: [1, 2] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([
      { kind: 'bar', parts: ones(8), cut: true, shaded: range(3), label: '3/8', tone: 'unfair', hidden: true },
      { kind: 'bar', parts: four, cut: true, shaded: range(3), label: '3/4', tone: 'fair', hidden: true },
    ],
    [400, { 0: { hidden: false } }],
    [400, { 1: { hidden: false } }]),
  },

  'fraction-of-remainder': {
    steps: [
      // What is left after the first part.
      play([{ kind: 'set', count: 12, groups: 3 }, { kind: 'text', text: '12 stickers: give 1/3 away. 4 go, 8 are left.', hidden: true }],
        [700, { 0: { glow: [0], label: '1/3 given away' } }],
        [500, { 1: { hidden: false } }]),
      // The second fraction of that amount.
      play([{ kind: 'set', count: 8, groups: 2, label: 'The 8 left' }, { kind: 'text', text: 'Then give 1/2 of the rest: 1/2 of 8 is 4.', hidden: true }],
        [700, { 0: { glow: [0] } }],
        [500, { 1: { hidden: false } }]),
      // What is left at the end.
      play([{ kind: 'set', count: 8, groups: 2, glow: [0] }, { kind: 'text', text: '8 − 4 = 4 stickers left at the end.', hidden: true }],
        [600, { 0: { shaded: [1], counted: [1] } }],
        [500, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'set', count: 8, groups: 2, glow: [0], label: '1/2 of what is left, not of 12', hidden: true }, { kind: 'text', text: 'The second fraction is of the rest.', hidden: true }],
      [400, { 0: { hidden: false } }],
      [400, { 1: { hidden: false } }]),
  },

  'divide-fractions': {
    steps: [
      // Rename with the same denominator.
      play([{ kind: 'bar', parts: ones(8), group: 2, cut: true, shaded: range(6), label: '3/4 ÷ 1/8' }, { kind: 'text', text: '3/4 = 6/8.', hidden: true }],
        [800, { 0: { group: 1, label: '6/8' } }],
        [500, { 1: { hidden: false } }]),
      // Count the small parts that fit.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: 'How many 1/8s?' }, { kind: 'text', text: 'Six 1/8s fit.', hidden: true }],
        ...countUp(0, 6, 380),
        [500, { 1: { hidden: false } }]),
      // That count is the answer.
      play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(6), counted: range(6) }, { kind: 'text', text: '3/4 ÷ 1/8 = 6.', hidden: true }],
        [600, { 1: { hidden: false } }]),
    ],
    why: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(6), counted: range(6) }, { kind: 'text', text: 'Same-size parts make the counting easy.', hidden: true }],
      [400, { 1: { hidden: false } }]),
  },
};
