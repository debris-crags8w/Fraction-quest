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
  // Lessons 51–60: worked examples for the ideas the Teach first scenes don't picture.
  'mixed-unlike-operations': {
    examples: [{
      title: 'Trade a whole to take away',
      picture: play([
        { kind: 'bar', parts: ones(4), shaded: range(4), label: '1 whole' },
        { kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' },
        { ...say('2 1/4 − 1/2, and 1/2 = 2/4. 1/4 is too few, so trade 1 whole for 4/4. Take 2/4 away: 1 3/4 is left.'), hidden: true },
      ], [800, { 0: { cut: true, label: 'Traded for 4/4' } }], [700, { 0: { shaded: [0, 1], glow: [2, 3], label: 'Take 2/4 away' } }], [600, { 2: { hidden: false } }]),
    }],
  },
  'estimate-fraction-operations': {
    examples: [
      {
        title: 'Is the sum less than 1?',
        picture: reveal([
          { kind: 'bar', parts: ones(5), cut: true, shaded: [0, 1], label: '2/5' },
          { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
          say('2/5 is a little less than 1/2, and 1/2 + 1/2 = 1. So 2/5 + 1/2 is a little less than 1: 2/5 + 1/2 < 1.'),
        ]),
      },
      {
        title: 'Estimate a difference',
        picture: reveal([
          { kind: 'bar', parts: ones(6), cut: true, shaded: range(5), label: '5/6' },
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' },
          say('5/6 − 1/4: 5/6 is less than 1, and taking some away leaves even less. So 5/6 − 1/4 < 1.'),
        ]),
      },
      {
        title: 'Does it make sense?',
        picture: reveal([
          { kind: 'line', max: 1, spaces: 6, cut: true, marks: [{ at: 3, label: '1/2' }], point: 2, pointLabel: '2/6', label: 'Mo’s answer is less than 1/2', tone: 'unfair' },
          say('Mo says 1/4 + 1/2 makes 2/6. But 1/4 + 1/2 is more than 1/2, and 2/6 is less than 1/2. So Mo’s answer does not make sense.'),
        ]),
      },
    ],
  },
  'fraction-of-quantity': {
    words: [{ term: '×', meaning: 'When a fraction comes first, × means “of”. 3/4 × 8 means 3/4 of 8.' }],
    examples: [
      {
        title: 'Times means of',
        picture: play([{ kind: 'bar', parts: ones(4), bracket: '8' }, { ...say('3/4 × 8 means 3/4 of 8. 8 ÷ 4 = 2 in each part, and 3 × 2 = 6. So 3/4 × 8 = 6.'), hidden: true }],
          [600, { 0: { cut: true } }], [600, { 0: { shaded: [0, 1, 2] } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Or multiply first',
        picture: reveal([
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], bracket: '8', label: '3/4' },
          say('You can also multiply first: 3 × 8 = 24, then 24 ÷ 4 = 6. Both ways give 6.'),
        ]),
      },
    ],
  },
  'fraction-times-fraction': {
    examples: [{
      title: 'Rows and columns',
      picture: reveal([
        { kind: 'pair', items: [
          { kind: 'area', cut: 'grid-4x3', edges: true, shaded: [0, 1, 2, 3], label: 'A row goes across' },
          { kind: 'area', cut: 'grid-4x3', edges: true, shaded: [0, 4, 8], label: 'A column goes down' },
        ] },
        say('Rows go across. Columns go up and down. This square has 3 rows and 4 columns.'),
      ]),
    }],
  },
  'fraction-of-collection': {
    examples: [{
      title: 'Write it with ×',
      picture: reveal([
        { kind: 'set', count: 16, groups: 4, shaded: [0, 1, 2], label: '3 of 4 groups' },
        say('3/4 of 16 cards is 3/4 × 16. 16 ÷ 4 = 4 in each group, and 3 groups is 12. So 3/4 × 16 = 12.'),
      ]),
    }],
  },
  'multiplication-scaling': {
    words: [{ term: 'factor', meaning: 'A factor is a number you multiply. In 3/4 × 8, the factors are 3/4 and 8.' }],
    examples: [
      {
        title: 'Equal to 1',
        picture: reveal([
          { kind: 'line', max: 2, spaces: 4, cut: true, point: 4, pointLabel: '4/4' },
          say('4/4 is all 4 parts, so 4/4 = 1. A smaller top number is less than 1. A larger top number is more than 1.'),
        ]),
      },
      {
        title: 'Factors',
        picture: reveal([
          { kind: 'line', max: 2, spaces: 4, cut: true, point: 3, pointLabel: '3/4' },
          say('In 3/4 × 8, the numbers you multiply are factors: 3/4 and 8. Compare the factor 3/4 with 1: it is less than 1.'),
        ]),
      },
    ],
  },
  'bigger-or-smaller': {
    examples: [
      {
        title: 'The product',
        picture: reveal([
          { kind: 'line', max: 2, spaces: 3, cut: true, stretch: 2, label: 'The product: 6' },
          say('The answer to a multiplication is the product. In 2/3 × 9 = 6, the product 6 is less than 9.'),
        ]),
      },
      {
        title: 'A fraction or mixed amount',
        picture: reveal([
          { kind: 'line', max: 3, spaces: 8, stretch: 20, label: '2 1/2: one copy' },
          { kind: 'line', max: 3, spaces: 8, stretch: 15, label: '3/4 × 2 1/2: part of a copy' },
          say('The factor 3/4 is less than 1, so 3/4 × 2 1/2 is less than 2 1/2.'),
        ]),
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
  // Lessons 51–60.
  { term: 'a fraction × a number', pattern: /\b\d+\/\d+ × \d+\b(?!\/)/, lesson: 'fraction-of-quantity' },
  { term: 'rows', pattern: /\brows?\b/i, lesson: 'fraction-times-fraction' },
  { term: 'overlap', pattern: /\boverlap/i, lesson: 'fraction-times-fraction' },
  { term: 'factor', pattern: /\bfactors?\b/i, lesson: 'multiplication-scaling' },
  { term: 'product', pattern: /\bproducts?\b/i, lesson: 'bigger-or-smaller' },
];
