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
  'fraction-names': {
    examples: [
      {
        title: 'Read the bottom number',
        picture: play([{ kind: 'bar', parts: ones(6), cut: true, shaded: [0], label: '1/6' }, { ...say('1/6: count the equal parts. 6 equal parts make one whole, so the bottom number is 6. The denominator is 6.'), hidden: true }],
          ...range(6).map((i): [number, Record<number, Partial<SceneRow>>] => [380, { 0: { counted: range(i + 1) } }]), [600, { 1: { hidden: false } }]),
      },
      {
        // Lesson 1, idea 2: counts only (no fraction is written until idea 3).
        title: 'Count the parts, not the cuts',
        picture: play([{ kind: 'bar', parts: ones(4) }, { ...say('3 cuts make 4 parts. Count the parts, not the cuts: 4 equal parts make one whole, so the bottom number is 4.'), hidden: true }],
          [600, { 0: { cut: true } }], ...range(4).map((i): [number, Record<number, Partial<SceneRow>>] => [420, { 0: { counted: range(i + 1) } }]),
          [600, { 1: { hidden: false } }]),
      },
      {
        // Lesson 1, idea 3: both numbers, the first time a fraction is written.
        title: 'Write one part',
        picture: play([{ kind: 'bar', parts: ones(4), cut: true }, { ...say('1 of 4 equal parts is colored. The bottom number, 4, counts all the equal parts. The top number, 1, counts the part we take. We write 1/4.'), hidden: true }],
          [500, { 0: { shaded: [0] } }], [600, { 0: { label: '1/4' } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Read the top number',
        picture: play([{ kind: 'bar', parts: ones(3), cut: true, label: '2/3' }, { ...say('In 2/3, the top number counts the colored parts. 2 parts are colored, so the numerator is 2.'), hidden: true }],
          [500, { 0: { shaded: [0], counted: [0] } }], [500, { 0: { shaded: [0, 1], counted: [0, 1] } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Write the fraction',
        picture: reveal([
          { kind: 'bar', parts: ones(5), cut: true, shaded: [0, 1], label: '2/5' },
          say('2 out of 5 equal parts are colored. All the parts, 5, go on the bottom. The colored parts, 2, go on top: 2/5.'),
        ]),
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
        term: '=', meaning: '= means “the same amount as”. These bars are shaded to the same place, so 3/4 = 3/4.',
        picture: still([{ kind: 'pair', items: [
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], label: '3/4' },
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], label: '3/4' },
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
        picture: reveal([{ kind: 'bar', parts: ones(3), cut: true, shaded: [0, 1], label: '2/3' }, say('3 parts. Half is between 1 part and 2 parts. 2 parts is more than half, so 2/3 is more than half.')]),
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
  'number-line-beyond-one': {
    words: [{
      term: '1 and 3/4', meaning: '1 and 3/4 means 1 whole and 3/4 more.',
      picture: still([{ kind: 'line', max: 2, spaces: 4, cut: true, stretch: 4, point: 7, pointLabel: '1 and 3/4' }]),
    }],
    examples: [{
      title: '4 fourths make one whole',
      picture: play([{ kind: 'line', max: 2, spaces: 4, cut: true }, { ...say('4 jumps of 1/4 is 4/4. 4/4 is one whole. 7 jumps = 4 jumps + 3 jumps = 1 and 3/4.'), hidden: true }],
        ...range(4).map((i): [number, Record<number, Partial<SceneRow>>] => [380, { 0: { jumps: i + 1 } }]),
        [600, { 0: { stretch: 4 } }],
        ...range(3).map((i): [number, Record<number, Partial<SceneRow>>] => [380, { 0: { jumps: 5 + i } }]),
        [400, { 0: { point: 7 } }], [600, { 1: { hidden: false } }]),
    }],
  },
  'ruler-measurement': {
    words: [
      {
        term: '1 1/4', meaning: '1 1/4 is a short way to write 1 whole and 1/4 more.',
        picture: still([{ kind: 'line', max: 2, spaces: 4, cut: true, ruler: true, stretch: 5 }]),
      },
      {
        term: 'quarter', meaning: 'A quarter is another name for a fourth. A quarter-inch is 1/4 inch.',
        picture: still([{ kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' }]),
      },
    ],
  },
  'build-line-plots': {
    examples: [{
      title: '4/4 inch is 1 inch',
      picture: reveal([
        { kind: 'line', max: 1, spaces: 4, cut: true, unit: 'inch', marks: [{ at: 4, label: '4/4' }] },
        say('The tick at 1 inch is also 4/4. 4/4 inch is the same as 1 inch.'),
      ]),
    }],
  },
  'order-fractions': {
    examples: [
      {
        title: 'Read a chain of signs',
        picture: reveal([
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' },
          { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], label: '3/4' },
          say('1/4 < 1/2 < 3/4. Read it: 1/4 is less than 1/2, and 1/2 is less than 3/4.'),
        ], 450),
      },
      {
        title: 'Biggest first',
        picture: reveal([
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], label: '3/4' },
          { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' },
          say('Biggest first? Flip the order: 3/4 > 1/2 > 1/4.'),
        ], 450),
      },
    ],
  },
  'equivalent-models': {
    words: [{
      term: '?', meaning: 'A ? box stands for the missing number. 1/2 = ?/4 asks: what goes on top so both are the same amount?',
      picture: still([{ kind: 'pair', items: [
        { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
        { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1], label: '2/4' },
      ] }]),
    }],
    examples: [
      {
        title: 'More than one whole bar',
        picture: reveal([{ kind: 'pair', items: [
          { kind: 'bar', parts: ones(2), cut: true, shaded: [0, 1], label: '1 whole' },
          { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
        ] }, say('3/2 is 1 whole bar and 1 half of the next bar.')]),
      },
      {
        title: 'Join parts together',
        picture: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: [0, 1] }, { ...say('Join every 2 eighths into 1 fourth: 2/8 = 1/4.'), hidden: true }],
          [900, { 0: { group: 2, label: '1/4' } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Fold it again',
        picture: play([{ kind: 'bar', parts: ones(2), cut: true }, { ...say('Fold a strip in half, then in half again. Every part is cut into 2: halves become fourths.'), hidden: true }],
          [900, { 0: { parts: ones(4) } }], [600, { 1: { hidden: false } }]),
      },
    ],
  },
  'equivalent-number-line': {
    examples: [{
      title: 'Halves to sixths',
      picture: play([{ kind: 'line', max: 1, spaces: 6, cut: true, group: 3, point: 3, pointLabel: '1/2' }, { ...say('Halves to sixths: cut every space into 3. 1/2 lands on 3/6.'), hidden: true }],
        [900, { 0: { group: 1, pointLabel: '3/6' } }], [600, { 1: { hidden: false } }]),
    }],
  },
  'build-equivalents': {
    examples: [
      {
        title: 'Divide both numbers',
        picture: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(4) }, { ...say('4/8: join every 4 eighths into 1 half. Divide the top and the bottom by 4: 1/2.'), hidden: true }],
          [900, { 0: { group: 4, label: '1/2' } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Find the number to multiply by',
        picture: reveal([
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], label: '3/4' },
          { kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '6/8' },
          say('To get a new bottom number, ask: 4 times what is 8? That is 2, so multiply the top by 2 too: 3/4 = 6/8.'),
        ]),
      },
    ],
  },
  'missing-equivalent': {
    words: [{ term: 'factor', meaning: 'A factor is the number you multiply or divide by. In 3/4 = 6/8, the factor is 2.' }],
    examples: [
      {
        title: 'A missing bottom number',
        picture: reveal([
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], label: '3/4' },
          { kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '6/8' },
          say('3/4 = 6/?. Top: 3 to 6 is times 2. Bottom: 4 times 2 is 8. So ? = 8.'),
        ]),
      },
      {
        title: 'The blank on the left',
        picture: reveal([
          { kind: 'bar', parts: ones(6), cut: true, shaded: [0], label: '1/6' },
          { kind: 'bar', parts: ones(12), cut: true, shaded: [0, 1], label: '2/12' },
          say('?/6 = 2/12. Start with the pair that has both numbers: 12 to 6 is divide by 2. Top: 2 divided by 2 is 1. So ? = 1.'),
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
  { term: 'mixed number with "and"', pattern: /\b\d+ and \d+\/\d+/, lesson: 'number-line-beyond-one' },
  { term: 'mixed number like 1 1/4', pattern: /\b\d+ \d+\/\d+/, lesson: 'ruler-measurement' },
  { term: 'quarter', pattern: /\bquarters?\b/i, lesson: 'ruler-measurement' },
  { term: 'the ? box', pattern: /\?\/\d|\d\/\?/, lesson: 'equivalent-models' },
  { term: 'factor', pattern: /\bfactors?\b/i, lesson: 'missing-equivalent' },
  // Lessons 2–10 (learn one idea, practise it three times).
  { term: 'unit fraction', pattern: /\bunit fractions?\b/i, lesson: 'unit-fractions' },
];
