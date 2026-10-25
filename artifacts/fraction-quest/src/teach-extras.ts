/* Teach before practice: what a lesson's Teach first adds to its steps so nothing in the practice is new when it comes.
   "Words to know" (a first page) defines each new word or symbol with a picture; extra worked examples (after "Why it
   works") show each way the practice asks. Pure data, so every card is checked by tests (pictures match their words,
   nothing is used before it is taught). Fractions are written with a slash here and shown stacked. */
import { play, type SceneRow, type StepScene } from './teach-scenes';

/** A word or symbol, what it means, and (often) a picture of it. */
export type WordCard = { term: string; meaning: string; picture?: StepScene };
/** One more worked example: a short title and a picture whose sentences say the worked numbers. */
export type ExtraExample = { title: string; picture: StepScene };
export type TeachExtras = { words?: WordCard[]; examples?: ExtraExample[] };

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const ones = (n: number) => Array.from({ length: n }, () => 1);
/** A still picture (no animation): the rows as they are. */
const still = (rows: SceneRow[]): StepScene => [{ rows, ms: 0 }];
/** Rows that appear one after another, `ms` apart. */
const reveal = (rows: SceneRow[], ms = 600): StepScene =>
  play(rows.map((row) => ({ ...row, hidden: true }) as SceneRow), ...rows.map((_, i): [number, Record<number, Partial<SceneRow>>] => [ms, { [i]: { hidden: false } }]));
const say = (text: string): SceneRow => ({ kind: 'text', text });
const eighthMarks = [1, 2, 3, 4, 5, 6, 7].map((at) => ({ at, label: `${at}/8` }));

export const TEACH_EXTRAS: Record<string, TeachExtras> = {
  'equal-parts': {
    examples: [
      {
        title: 'Share fairly',
        picture: play([{ kind: 'set', count: 8, groups: 4, dealt: 0 }, { ...say('8 equal pieces, 4 friends. Give one piece to each friend, then go around again. Each friend gets 2 pieces.'), hidden: true }],
          [500, { 0: { dealt: 4 } }], [700, { 0: { dealt: 8 } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Same space, different shape',
        picture: reveal([
          { kind: 'pair', items: [
            { kind: 'area', cut: 'quarter-and-triangles', edges: true, shaded: [0], label: '1 small square', tone: 'fair' },
            { kind: 'area', cut: 'quarter-and-triangles', edges: true, shaded: [1, 2], label: '2 triangles', tone: 'fair' },
          ] },
          say('Cut a small square corner to corner. The 2 triangles cover the same space as 1 small square.'),
        ]),
      },
      {
        title: 'Name the parts, not the cuts',
        picture: play([{ kind: 'bar', parts: ones(4) }, { ...say('3 cuts make 4 parts. We name the parts, not the cuts: 4 equal parts are fourths.'), hidden: true }],
          [600, { 0: { cut: true } }], [500, { 0: { counted: [0] } }], [420, { 0: { counted: [0, 1] } }], [420, { 0: { counted: [0, 1, 2] } }],
          [420, { 0: { counted: [0, 1, 2, 3] } }], [600, { 1: { hidden: false } }]),
      },
    ],
  },
  'unit-fractions': {
    examples: [
      {
        title: '3 thirds make one whole',
        picture: play([{ kind: 'bar', parts: ones(3), cut: true, bracket: '1 whole' }, { ...say('Count the unit parts: 1/3, 2/3, 3/3. 3 thirds make one whole.'), hidden: true }],
          ...range(3).map((i): [number, Record<number, Partial<SceneRow>>] => [500, { 0: { counted: range(i + 1), shaded: range(i + 1) } }]),
          [600, { 1: { hidden: false } }]),
      },
      {
        title: 'A fair share',
        picture: reveal([{ kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' }, say('4 friends share 1 bar fairly. Cut it into 4 equal parts. Each friend gets 1/4.')]),
      },
      {
        title: '2 triangles make 1/4',
        picture: reveal([
          { kind: 'area', cut: 'quarter-and-triangles', edges: true, shaded: [1, 2] },
          say('2 small triangles cover the same space as 1 small square. That is 1/4 of the big square.'),
        ]),
      },
    ],
  },
  'fraction-of-area': {
    words: [{
      term: 'area', meaning: 'Area means how much space a shape covers.',
      picture: still([{ kind: 'area', cut: 'fourths-squares', edges: true, shaded: [0, 1, 2, 3] }]),
    }],
    examples: [
      {
        title: 'Move it on top',
        picture: reveal([
          { kind: 'pair', items: [
            { kind: 'area', cut: 'fourths-squares', edges: true, shaded: [0], label: '1/4', tone: 'fair' },
            { kind: 'area', cut: 'fourths-triangles', edges: true, shaded: [0], label: '1/4', tone: 'fair' },
          ] },
          say('Move one piece on top of the other. If it covers the same space, the parts are equal.'),
        ]),
      },
      {
        title: 'Half of one half',
        picture: play([{ kind: 'area', cut: 'rect-halves', edges: true }, { ...say('Cut the square in half, then cut each half in half. Each piece is 1/4.'), hidden: true }],
          [900, { 0: { cut: 'fourths-squares' } }], [500, { 0: { shaded: [0] } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'A hexagon',
        picture: reveal([{ kind: 'area', cut: 'hexagon-sixths', edges: true, shaded: [0] }, say('A hexagon has 6 sides. These 6 triangles are equal, so each one is 1/6.')]),
      },
    ],
  },
  'unit-size': {
    examples: [{
      title: 'Closer to the whole',
      picture: reveal([
        { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
        { kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' },
        say('Both bars are the same size. 1/2 fills more of the bar, so it is closer to the whole bar.'),
      ]),
    }],
  },
  'compare-same-numerator': {
    words: [
      { term: '>', meaning: '> means “is more than”. The open side faces the bigger amount.' },
      { term: '<', meaning: '< means “is less than”. The point faces the smaller amount.' },
      {
        term: '=', meaning: '= means “the same amount as”. These bars are shaded to the same place, so 2/4 = 1/2.',
        picture: still([{ kind: 'pair', items: [
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1], label: '2/4' },
          { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
        ] }]),
      },
    ],
    examples: [{
      title: 'Read a < answer',
      picture: reveal([
        { kind: 'bar', parts: ones(8), cut: true, shaded: [0, 1, 2], label: '3/8' },
        { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], label: '3/4' },
        say('3/8 < 3/4. Say it: 3/8 is less than 3/4. Both have 3 parts, but eighths are smaller parts.'),
      ]),
    }],
  },
  'benchmark-half': {
    examples: [
      {
        title: 'Half is the middle',
        picture: reveal([
          { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
          { kind: 'line', max: 1, spaces: 2, cut: true, point: 1, pointLabel: '1/2' },
          say('Half is the middle of the whole, on a bar and on a number line.'),
        ]),
      },
      {
        title: 'Half of 3 parts',
        picture: reveal([{ kind: 'bar', parts: ones(3), cut: true, shaded: [0], label: '1/3' }, say('3 parts. Half is between 1 part and 2 parts. 1 part is less than half, so 1/3 is less than half.')]),
      },
      {
        title: 'Closest to half',
        picture: reveal([
          { kind: 'bar', parts: ones(8), cut: true, shaded: [0, 1, 2], label: '3/8' },
          { kind: 'bar', parts: ones(8), cut: true, shaded: [0], label: '1/8' },
          say('Half of 8 is 4. 3/8 is 1 part away from half. 1/8 is 3 parts away. So 3/8 is closer to half.'),
        ]),
      },
      {
        title: '1 part less than half',
        picture: play([{ kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1, 2] }, { ...say('Use sixths. Half of 6 is 3, so half is 3/6. Take away 1 part: 2/6.'), hidden: true }],
          [700, { 0: { glow: [2] } }], [700, { 0: { glow: [], shaded: [0, 1] } }], [600, { 1: { hidden: false } }]),
      },
    ],
  },
  'benchmarks-zero-one': {
    words: [{
      term: 'benchmark', meaning: 'A benchmark is an easy number we compare to, like 0, 1/2 or 1.',
      picture: still([{ kind: 'line', max: 1, spaces: 2, cut: true, marks: [{ at: 1, label: '1/2' }] }]),
    }],
    examples: [
      {
        title: 'What is missing?',
        picture: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(7), bracket: '8/8 is one whole' }, { ...say('One whole is all 8 parts, 8/8. 7/8 is missing 1 part, so 1/8 is missing.'), hidden: true }],
          [700, { 0: { glow: [7] } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Nearer half or one?',
        picture: reveal([{ kind: 'bar', parts: ones(3), cut: true, shaded: [0, 1], label: '2/3' }, say('2/3: half is 1 and a half parts. 2 parts is half a part from half, and 1 part from the whole. So 2/3 is nearer 1/2.')]),
      },
    ],
  },
  'number-line-basics': {
    words: [{
      term: 'tick marks', meaning: 'The little lines are tick marks. We count the spaces between them, not the marks.',
      picture: still([{ kind: 'line', max: 1, spaces: 4, cut: true }]),
    }],
    examples: [
      {
        title: 'Name the dot',
        picture: play([{ kind: 'line', max: 1, spaces: 6, cut: true, point: 4 }, { ...say('Count jumps from 0 to the dot. 4 jumps of 6 equal spaces: the dot is at 4/6.'), hidden: true }],
          ...range(4).map((i): [number, Record<number, Partial<SceneRow>>] => [420, { 0: { jumps: i + 1 } }]), [600, { 1: { hidden: false } }]),
      },
      {
        title: 'A frog’s jumps',
        picture: play([{ kind: 'line', max: 1, spaces: 6, cut: true, unit: 'meter' }, { ...say('A frog jumps 1/6, then 1/6 more. Count: 1/6, 2/6. It went 2/6 of a meter.'), hidden: true }],
          [600, { 0: { jumps: 1 } }], [600, { 0: { jumps: 2, point: 2 } }], [600, { 1: { hidden: false } }]),
      },
    ],
  },
  // Lessons 41–50: worked examples for the Learn pages of their ideas (ideas/lessons-41-50.ts).
  'compare-unlike-fractions': {
    examples: [
      {
        title: 'Rename one fraction to match',
        picture: play([
          { kind: 'bar', parts: ones(8), group: 2, cut: true, shaded: range(6), label: '3/4' },
          { kind: 'bar', parts: ones(8), cut: true, shaded: range(5), label: '5/8' },
          { ...say('Fourths fit into eighths, so rename 3/4: 3/4 = 6/8. Now both are eighths. 6 > 5, so 3/4 > 5/8.'), hidden: true },
        ], [800, { 0: { group: 1, label: '3/4 = 6/8' } }], [600, { 2: { hidden: false } }]),
      },
      {
        title: 'Compare the part sizes',
        picture: reveal([
          { kind: 'bar', parts: ones(8), cut: true, shaded: range(3), label: '3/8' },
          { kind: 'bar', parts: ones(4), cut: true, shaded: range(3), label: '3/4' },
          say('Same numerators: both count 3 parts. Eighths are smaller than fourths, so 3/8 < 3/4. No renaming needed.'),
        ]),
      },
    ],
  },
  'order-unlike-fractions': {
    examples: [
      {
        title: 'Same parts: order the numerators',
        picture: play([
          { kind: 'line', max: 1, spaces: 6, cut: true, marks: [{ at: 1, label: '1/6' }, { at: 4, label: '4/6' }, { at: 5, label: '5/6' }] },
          { ...say('All sixths: same-size parts. Count them: fewer sixths is smaller. Smallest first: 1/6, 4/6, 5/6.'), hidden: true },
        ], [500, { 0: { stretch: 1 } }], [500, { 0: { stretch: 4 } }], [500, { 0: { stretch: 5 } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Biggest first goes the other way',
        picture: play([
          { kind: 'line', max: 1, spaces: 6, cut: true, marks: [{ at: 1, label: '1/6' }, { at: 4, label: '4/6' }, { at: 5, label: '5/6' }] },
          { ...say('More sixths is bigger. Biggest first: 5/6, 4/6, 1/6.'), hidden: true },
        ], [500, { 0: { stretch: 5 } }], [500, { 0: { stretch: 4 } }], [500, { 0: { stretch: 1 } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Rename, then order',
        picture: play([
          { kind: 'bar', parts: ones(8), group: 2, cut: true, shaded: range(2), label: '1/4' },
          { kind: 'bar', parts: ones(8), cut: true, shaded: range(3), label: '3/8' },
          { ...say('1/4 and 3/8 are both less than half. 1/4 = 2/8, and 2/8 < 3/8. 5/8 is more than half. Smallest first: 1/4, 3/8, 5/8.'), hidden: true },
        ], [800, { 0: { group: 1, label: '1/4 = 2/8' } }], [600, { 2: { hidden: false } }]),
      },
    ],
  },
  'plot-in-eighths': {
    examples: [
      {
        title: 'One X for each length',
        picture: play([
          { kind: 'line', max: 1, spaces: 8, cut: true, xs: [], marks: eighthMarks },
          { ...say('Pins: 2/8, 4/8 and 7/8 inch. Count eighths from 0 to find each length, and put one X above it. 3 pins, 3 Xs.'), hidden: true },
        ], [500, { 0: { xs: [[2, 1]] } }], [500, { 0: { xs: [[2, 1], [4, 1]] } }], [500, { 0: { xs: [[2, 1], [4, 1], [7, 1]] } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Longer than, shorter than',
        picture: play([
          { kind: 'line', max: 1, spaces: 8, cut: true, xs: [[2, 1], [3, 1], [5, 1], [7, 1]], marks: eighthMarks },
          { ...say('Shells: 2/8, 3/8, 5/8 and 7/8 inch. Longer than 4/8 inch: the Xs to the right of 4/8, 2 shells. Shorter than 4/8 inch: the Xs to its left, 2 shells.'), hidden: true },
        ], [600, { 0: { point: 4 } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'The two shortest together',
        picture: play([
          { kind: 'line', max: 1, spaces: 8, cut: true, xs: [[1, 1], [3, 2], [6, 1]], marks: eighthMarks },
          { ...say('The two shortest are the two Xs farthest left: 1/8 and 3/8. Together: 1/8 + 3/8 = 4/8 inch.'), hidden: true },
        ], [600, { 0: { stretch: 1 } }], [500, { 1: { hidden: false } }]),
      },
    ],
  },
  'read-line-plots': {
    examples: [
      {
        title: 'Add one stack',
        picture: play([
          { kind: 'line', max: 1, spaces: 8, cut: true, xs: [[2, 3], [5, 1]], marks: eighthMarks },
          { ...say('3 Xs stack at 2/8: 3 twigs, each 2/8 inch long. All of them together: 2/8 + 2/8 + 2/8 = 6/8 inch.'), hidden: true },
        ], [600, { 0: { point: 2 } }], [500, { 1: { hidden: false } }]),
      },
    ],
  },
  'measurement-word-problems': {
    examples: [
      {
        title: 'Other units split the same way',
        picture: play([
          { kind: 'bar', parts: ones(2), bracket: '1 dollar = 100 cents' },
          { ...say('1 dollar is 100 cents. Split 100 into 2 equal parts: 1/2 dollar is 50 cents. 1 kilogram is 1000 grams, and 1 liter is 1000 milliliters.'), hidden: true },
        ], [600, { 0: { cut: true, shaded: [0] } }], [500, { 1: { hidden: false } }]),
      },
    ],
  },
  'party-portions': {
    examples: [
      {
        title: 'Between which whole numbers?',
        picture: play([
          { kind: 'line', max: 3, spaces: 4, cut: true, pointLabel: '9/4' },
          { ...say('9 fourths: 8 fourths make 2 wholes, and 12 fourths make 3. So 9/4 is between 2 and 3.'), hidden: true },
        ], [600, { 0: { point: 9 } }], [500, { 1: { hidden: false } }]),
      },
    ],
  },
  'add-unlike-fractions': {
    words: [{
      term: 'multiples', meaning: 'Multiples of a number are the numbers you say when you count by it. Multiples of 4 are 4, 8, 12, 16.',
      picture: still([{ kind: 'line', max: 1, spaces: 4, cut: true, jumps: 4 }]),
    }],
    examples: [
      {
        title: 'List multiples to find a common denominator',
        picture: play([
          { kind: 'bar', parts: ones(15), group: 3, cut: true, shaded: range(3), label: '1/5' },
          { kind: 'bar', parts: ones(15), group: 5, cut: true, shaded2: range(5), label: '1/3' },
          { ...say('Multiples of 5: 5, 10, 15. Multiples of 3: 3, 6, 9, 12, 15. 15 is in both lists, so use fifteenths: 1/5 + 1/3 = 3/15 + 5/15 = 8/15.'), hidden: true },
        ], [800, { 0: { group: 1, label: '1/5 = 3/15' } }], [800, { 1: { group: 1, label: '1/3 = 5/15' } }], [600, { 2: { hidden: false } }]),
      },
    ],
  },
};

/** The pages a lesson's Teach first adds: Words to know first (if any), then the extra examples after Why. */
export const teachExtras = (missionId: string | undefined): TeachExtras => (missionId ? TEACH_EXTRAS[missionId] ?? {} : {});

/** What Listen reads on the Words to know page. */
export const wordsScript = (words: WordCard[]) => ['Words to know.', ...words.map((word) => word.meaning)].join(' ');

/** Terms and symbols a lesson teaches (in its Words to know), and the lesson that teaches each one. Practice in an
    earlier lesson may not use them (checked by teach-extras.test.ts). Each unit's PR adds its own. */
export const TAUGHT_IN: { term: string; pattern: RegExp; lesson: string }[] = [
  { term: 'numerator / denominator', pattern: /\b(numerator|denominator)s?\b/i, lesson: 'fraction-names' },
  { term: 'area', pattern: /\barea\b/i, lesson: 'fraction-of-area' },
  { term: '=', pattern: /\s=\s/, lesson: 'compare-same-numerator' },
  { term: '< or >', pattern: /\s[<>]\s/, lesson: 'compare-same-numerator' },
  { term: 'benchmark', pattern: /\bbenchmarks?\b/i, lesson: 'benchmarks-zero-one' },
  { term: 'tick mark', pattern: /\btick( mark)?s?\b/i, lesson: 'number-line-basics' },
  // Lessons 41–50 (compare-unlike-fractions … subtract-unlike-fractions).
  { term: 'common denominator', pattern: /\bcommon denominators?\b/i, lesson: 'compare-unlike-fractions' },
  { term: 'batch', pattern: /\bbatch(es)?\b/i, lesson: 'fraction-recipes' },
  { term: 'multiples of a number', pattern: /\bmultiples of\b/i, lesson: 'add-unlike-fractions' },
];
