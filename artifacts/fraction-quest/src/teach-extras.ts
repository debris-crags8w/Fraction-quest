/* Teach before practice: what a lesson's Teach first adds to its steps so nothing in the practice is new when it comes.
   "Words to know" (a first page) defines each new word or symbol with a picture; extra worked examples (after "Why it
   works") show each way the practice asks. Pure data, so every card is checked by tests (pictures match their words,
   nothing is used before it is taught). Fractions are written with a slash here and shown stacked. */
import { gridOverlap } from './area-shapes';
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
/** The first `n` small squares of a hundredths grid, column by column (whole columns are tenths). */
const gridFill = (n: number, from = 0) => range(n).map((k) => ((from + k) % 10) * 10 + Math.floor((from + k) / 10));

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
          { kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], label: '2/6' },
          say('2 out of 6 equal parts are colored. All the parts, 6, go on the bottom. The colored parts, 2, go on top: 2/6.'),
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
    }, {
      // The first lesson to measure in meters (a worm 1/6 of a meter long): the unit is taught before it is used.
      term: 'meter', meaning: 'A meter is a way to measure length. One big step is about 1 meter long.',
      picture: still([{ kind: 'bar', parts: ones(1), shaded: [0], bracket: '1 meter' }]),
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
  'fraction-magnitude': {
    // The first lesson to measure in miles (a path 5/8 of a mile long).
    words: [{ term: 'mile', meaning: 'A mile is a way to measure a long way, like a walk across town. A mile is much longer than a meter.' }],
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
        // The first lesson to measure in inches. The ruler pictures write "in" under each whole inch.
        term: 'inch', meaning: 'An inch is a short length. A paper clip is about 1 inch long. On a ruler, “in” is short for inch.',
        picture: still([{ kind: 'line', max: 1, spaces: 1, ruler: true, stretch: 1 }]),
      },
      {
        term: '1 1/4', meaning: '1 1/4 is a short way to write 1 whole and 1/4 more.',
        picture: still([{ kind: 'line', max: 2, spaces: 4, cut: true, ruler: true, stretch: 5 }]),
      },
      {
        term: 'quarter', meaning: 'A quarter is another name for a fourth. A quarter-inch is 1/4 inch.',
        picture: still([{ kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' }]),
      },
    ],
    examples: [{
      title: 'Measure a crayon',
      picture: play([{ kind: 'line', max: 1, spaces: 4, cut: true, ruler: true }, { ...say('Start the crayon at 0. 4 spaces make 1 inch, so each space is 1/4 inch. Count 3 spaces: the crayon is 3/4 inch long.'), hidden: true }],
        [500, { 0: { stretch: 3 } }], ...range(3).map((i): [number, Record<number, Partial<SceneRow>>] => [420, { 0: { jumps: i + 1 } }]),
        [600, { 1: { hidden: false } }]),
    }],
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
  'compare-same-denominator': {
    examples: [
      {
        title: 'Which is bigger?',
        picture: reveal([
          { kind: 'bar', parts: ones(8), cut: true, shaded: range(3), label: '3/8' },
          { kind: 'bar', parts: ones(8), cut: true, shaded: range(5), label: '5/8' },
          say('Which is bigger, 3/8 or 5/8? Both are eighths. 5 parts is more than 3 parts, so 5/8 is bigger.'),
        ]),
      },
      {
        title: 'Read the sign',
        picture: reveal([
          { kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1], label: '2/6' },
          { kind: 'bar', parts: ones(6), cut: true, shaded: range(5), label: '5/6' },
          say('2/6 < 5/6. Say it: 2/6 is less than 5/6. The point of the sign faces the smaller amount.'),
        ]),
      },
    ],
  },
  'order-fractions': {
    examples: [
      {
        title: 'Same numerators: bigger parts win',
        picture: reveal([
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' },
          { kind: 'bar', parts: ones(8), cut: true, shaded: [0], label: '1/8' },
          say('1/4 and 1/8 both count 1 part. Fourths are bigger parts than eighths, so 1/4 is bigger.'),
        ]),
      },
      {
        title: 'Compare with half',
        picture: reveal([
          { kind: 'bar', parts: ones(8), cut: true, shaded: range(3), label: '3/8' },
          { kind: 'bar', parts: ones(2), cut: true, shaded: [0], label: '1/2' },
          say('Half of 8 is 4, so half is 4/8. 3 parts is less than 4 parts, so 3/8 is less than 1/2.'),
        ]),
      },
      {
        title: 'Read a chain of signs',
        // On a number line (one row, so it fits a phone): the smaller amount is always further left.
        picture: reveal([
          { kind: 'line', max: 1, spaces: 4, cut: true, marks: [{ at: 1, label: '1/4' }, { at: 2, label: '1/2' }, { at: 3, label: '3/4' }] },
          say('1/4 < 1/2 < 3/4. Read it: 1/4 is less than 1/2, and 1/2 is less than 3/4.'),
        ]),
      },
      {
        title: 'Biggest first',
        picture: reveal([
          { kind: 'line', max: 1, spaces: 4, cut: true, marks: [{ at: 1, label: '1/4' }, { at: 2, label: '1/2' }, { at: 3, label: '3/4' }] },
          say('Biggest first? Start from the right and flip the signs: 3/4 > 1/2 > 1/4.'),
        ]),
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
        title: 'Triangles make a fourth',
        picture: reveal([
          { kind: 'pair', items: [
            { kind: 'area', cut: 'fourths-squares', edges: true, shaded: [0], label: '1/4' },
            { kind: 'area', cut: 'eighths-triangles', edges: true, shaded: [0, 1], label: '2/8' },
          ] },
          say('Cut every fourth of the cake into 2 triangles. Join 2 triangles: they cover 1/4 of the cake. 2/8 = 1/4.'),
        ]),
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
    words: [{
      term: 'factor', meaning: 'A factor is the number you multiply or divide by. In 3/4 = 6/8, the factor is 2.',
      picture: still([{ kind: 'pair', items: [
        { kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2], label: '3/4' },
        { kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '6/8' },
      ] }]),
    }],
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
  // Lessons 21–30: each idea's Learn pages (ideas/lessons-21-30.ts) use these where Teach first has no picture for it.
  'compose-to-one': {
    words: [
      { term: '+', meaning: '+ means put together. 2/5 + 3/5 puts 2 fifths and 3 fifths together.' },
      { term: 'sum', meaning: 'The sum is the amount you get when you put the parts together. The sum of 2/5 + 3/5 is 5/5.' },
      // The first lesson to measure in cups (a recipe uses 3/6 cup, then 3/6 cup more).
      { term: 'cup', meaning: 'A cup is an amount for cooking, like a measuring cup full of milk. Recipes use parts of a cup, like 1/2 cup.' },
    ],
    examples: [
      {
        title: 'Count the parts to one whole',
        picture: play([{ kind: 'bar', parts: ones(6), cut: true, bracket: '1 whole' }, { ...say('Count the sixths: 1/6, 2/6, 3/6, 4/6, 5/6, 6/6. 6 sixths make one whole: 6/6 = 1.'), hidden: true }],
          ...range(6).map((i): [number, Record<number, Partial<SceneRow>>] => [420, { 0: { counted: range(i + 1), shaded: range(i + 1) } }]),
          [600, { 1: { hidden: false } }]),
      },
      {
        title: '+ means put together',
        picture: play([{ kind: 'bar', parts: ones(8), cut: true }, { ...say('3/8 + 4/8: 3 eighths and 4 more eighths. Add the numerators: 3 + 4 = 7. They are still eighths, so the sum is 7/8.'), hidden: true }],
          [500, { 0: { shaded: [0, 1, 2] } }], [600, { 0: { shaded2: [3, 4, 5, 6] } }], [500, { 0: { counted: range(7) } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Find the missing part',
        picture: play([{ kind: 'bar', parts: ones(3), cut: true, shaded: [0], bracket: '1 whole' }, { ...say('1/3 + ? = 1. The ? is the missing part. One whole is 3/3, so 2 more thirds fill it: 1/3 + 2/3 = 3/3.'), hidden: true }],
          [700, { 0: { shaded2: [1, 2] } }], [600, { 1: { hidden: false } }]),
      },
    ],
  },
  'decompose-fractions': {
    examples: [
      {
        title: 'Break it into unit fractions',
        picture: play([{ kind: 'bar', parts: ones(5), cut: true, shaded: range(3), label: '3/5' }, { ...say('A unit fraction is one part, like 1/5. 3/5 is 3 unit fractions: 1/5 + 1/5 + 1/5.'), hidden: true }],
          ...range(3).map((i): [number, Record<number, Partial<SceneRow>>] => [450, { 0: { counted: range(i + 1) } }]),
          [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Find the missing number',
        picture: play([{ kind: 'bar', parts: ones(6), cut: true, shaded: [0] }, { ...say('5/6 = 1/6 + ?/6. The ? is the missing number. 5 take away 1 is 4, so 5/6 = 1/6 + 4/6.'), hidden: true }],
          [700, { 0: { shaded2: [1, 2, 3, 4] } }], [600, { 1: { hidden: false } }]),
      },
    ],
  },
  'whole-numbers-as-fractions': {
    words: [{ term: 'whole number', meaning: 'A whole number is a counting number, like 1, 2 or 3.' }],
    examples: [{
      title: 'Wholes with a denominator of 1',
      picture: reveal([
        { kind: 'bar', parts: [1], shaded: [0], label: '1/1' },
        { kind: 'bar', parts: [1], shaded: [0], label: '1/1' },
        say('A bar that is not cut is 1 part: 1/1. So 2 whole bars are 2/1, and the whole number 2 = 2/1.'),
      ], 450),
    }],
  },
  'improper-fractions': {
    examples: [{
      title: 'Less than, equal to or more than one whole',
      picture: reveal([
        { kind: 'line', max: 2, spaces: 4, cut: true, marks: [{ at: 3, label: '3/4' }, { at: 4, label: '4/4' }, { at: 5, label: '5/4' }] },
        say('3/4: 3 parts is less than 4, so it is less than one whole. 4/4 is exactly one whole. 5/4: 5 parts is more than 4, so it is more than one whole.'),
      ]),
    }, {
      title: 'Count to 2 wholes',
      picture: play([{ kind: 'line', max: 2, spaces: 3, cut: true }, { ...say('3/3 is 1 whole. Count 3 more thirds: 6/3 is 2 wholes. Every 3 thirds fill one more whole.'), hidden: true }],
        ...range(6).map((i): [number, Record<number, Partial<SceneRow>>] => [380, { 0: { jumps: i + 1, point: i + 1 } }]),
        [600, { 1: { hidden: false } }]),
    }],
  },
  'mixed-improper': {
    words: [{
      term: 'mixed number', meaning: 'A mixed number, like 1 3/4, has a whole number and a fraction. 1 3/4 means 1 and 3/4.',
      picture: still([{ kind: 'bar', parts: ones(4), cut: true, shaded: range(4), bracket: '1 whole' }, { kind: 'bar', parts: ones(4), cut: true, shaded: range(3), label: '3/4' }]),
    }],
    examples: [
      {
        title: 'Turn parts back into wholes',
        picture: play([
          { kind: 'bar', parts: ones(3), cut: true, shaded: range(3) },
          { kind: 'bar', parts: ones(3), cut: true, shaded: range(3) },
          { kind: 'bar', parts: ones(3), cut: true, shaded: [0] },
          { ...say('7/3: every 3/3 makes one whole. 6/3 is 2 wholes, and 1/3 is left. So 7/3 = 2 1/3, 2 and 1/3.'), hidden: true },
        ], [600, { 0: { bracket: '1 whole' } }], [500, { 1: { bracket: '1 whole' } }], [500, { 2: { glow: [0] } }], [600, { 3: { hidden: false } }]),
      },
    ],
  },
  'add-like-denominators': {
    examples: [{
      title: 'Add in a story',
      picture: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: [0, 1, 2] }, { ...say('A ribbon is 3/8 meter long. Add 2/8 meter more. 3 + 2 = 5, and they are still eighths. It is 5/8 meter long now.'), hidden: true }],
        [700, { 0: { shaded2: [3, 4] } }], [600, { 1: { hidden: false } }]),
    }],
  },
  'subtract-like-denominators': {
    examples: [{
      title: 'Take away in a story',
      picture: play([{ kind: 'bar', parts: ones(10), cut: true, shaded: range(8) }, { ...say('A jar is 8/10 full. Pour out 3/10. 8 − 3 = 5, and they are still tenths. 5/10 is left.'), hidden: true }],
        [700, { 0: { glow: [5, 6, 7] } }], [700, { 0: { glow: [], shaded: range(5) } }], [600, { 1: { hidden: false } }]),
    }],
  },
  'add-mixed-numbers': {
    examples: [{
      title: 'Wholes, then parts',
      picture: play([{ kind: 'bar', parts: ones(4), cut: true, shaded: [0] }, { ...say('1 1/4 + 1 2/4. Add the wholes: 1 + 1 = 2. Add the fraction parts: 1/4 + 2/4 = 3/4. So the answer is 2 3/4.'), hidden: true }],
        [700, { 0: { shaded2: [1, 2] } }], [600, { 1: { hidden: false } }]),
    }, {
      title: 'Parts that make a new whole',
      picture: play([{ kind: 'bar', parts: ones(3), cut: true, shaded: [0, 1] }, { kind: 'bar', parts: ones(3), cut: true }, { ...say('2 2/3 + 2/3. Add the parts: 2/3 + 2/3 = 4/3. 3/3 is a new whole, and 1/3 is left. So 2 + 1 = 3 wholes and 1/3: 3 1/3.'), hidden: true }],
        [700, { 0: { shaded2: [2] }, 1: { shaded2: [0] } }], [600, { 0: { bracket: '1 new whole' } }], [600, { 2: { hidden: false } }]),
    }],
  },
  'subtract-mixed-numbers': {
    examples: [{
      title: 'Parts, then wholes',
      picture: play([{ kind: 'bar', parts: ones(4), cut: true, shaded: [0, 1, 2] }, { ...say('3 3/4 − 1 1/4. Take away the parts: 3/4 − 1/4 = 2/4. Then the wholes: 3 − 1 = 2. The answer is 2 2/4.'), hidden: true }],
        [700, { 0: { glow: [2] } }], [700, { 0: { glow: [], shaded: [0, 1] } }], [600, { 1: { hidden: false } }]),
    }],
  },
  'tenths-decimals': {
    words: [
      {
        term: 'decimal', meaning: 'A decimal is another way to write tenths: 7/10 is the decimal 0.7.',
        picture: still([{ kind: 'bar', parts: ones(10), cut: true, shaded: range(7), label: '7/10' }]),
      },
      { term: 'decimal point', meaning: 'The dot in 0.7 is the decimal point. The tenths go right after it.' },
      { term: 'digit', meaning: 'A digit is one of the numbers 0 to 9 that we write numbers with. 0.7 has the digits 0 and 7.' },
    ],
    examples: [
      {
        title: 'Read a decimal as tenths',
        picture: reveal([{ kind: 'bar', parts: ones(10), cut: true, shaded: [0, 1], label: '0.2' }, say('0.2: the digit 2 is right after the decimal point, so it counts tenths. 0.2 = 2/10.')]),
      },
    ],
  },
  // Lessons 31–40: worked examples for the Learn pages of their ideas.
  'hundredths-decimals': {
    examples: [
      {
        title: 'One square is one hundredth',
        picture: play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '1/100' }, { ...say('100 equal squares make one whole. Each small square is one hundredth: 1/100.'), hidden: true }],
          [600, { 0: { glow: [0] } }], [600, { 0: { glow: [], shaded: [0] } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'A 0 holds the tenths place',
        picture: reveal([
          { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(5), label: '0.05' },
          say('5 single squares and no full column: 0 tenths and 5 hundredths. Write 0.05. The 0 holds the tenths place.'),
        ]),
      },
    ],
  },
  'decimal-fraction-equivalence': {
    examples: [
      {
        title: 'What times the bottom makes 10?',
        picture: play([{ kind: 'bar', parts: ones(10), group: 2, cut: true, shaded: range(4), label: '2/5' }, { ...say('5 × 2 = 10, so multiply top and bottom by 2: 2/5 = 4/10 = 0.4.'), hidden: true }],
          [800, { 0: { group: 1, label: '4/10' } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Fourths: make 100 on the bottom',
        picture: play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '1/4' }, { ...say('No whole number times 4 makes 10, so use 100. 4 × 25 = 100, so 1/4 = 25/100 = 0.25.'), hidden: true }],
          [800, { 0: { shaded: gridFill(25), label: '25/100' } }], [500, { 1: { hidden: false } }]),
      },
    ],
  },
  'compare-decimals': {
    examples: [{
      title: 'When the tenths match',
      picture: reveal([
        { kind: 'pair', items: [
          { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(32), label: '0.32' },
          { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(38), label: '0.38' },
        ] },
        say('Both have 3 tenths, so the tenths match. Compare the hundredths: 2 < 8, so 0.32 < 0.38.'),
      ]),
    }],
  },
  'compare-decimals-grid': {
    examples: [
      {
        title: 'Put three in order',
        picture: reveal([
          { kind: 'bar', parts: [70, 30], shaded: [0], label: '0.7 = 70 hundredths' },
          { kind: 'bar', parts: [7, 93], shaded: [0], label: '0.07 = 7 hundredths' },
          { kind: 'bar', parts: [25, 75], shaded: [0], label: '0.25 = 25 hundredths' },
          say('7 < 25 < 70, so smallest first: 0.07, 0.25, 0.7.'),
        ], 500),
      },
      {
        title: 'The same whole',
        picture: reveal([
          { kind: 'pair', items: [
            { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(45), label: '0.45', tone: 'fair' },
            { kind: 'area', cut: 'grid-10x10', edges: true, shaded: gridFill(5), label: '0.05', tone: 'fair' },
          ] },
          say('Two grids of the same size: 45 hundredths is more than 5 hundredths, so 0.45 > 0.05.'),
        ]),
      },
      {
        title: 'Different wholes',
        picture: reveal([
          { kind: 'pair', items: [
            { kind: 'area', cut: 'circle-halves', edges: true, shaded: [0], label: 'Small pizza: 0.5', tone: 'unfair' },
            { kind: 'area', cut: 'circle-tenths', edges: true, shaded: range(4), label: 'Big pizza: 0.4', tone: 'unfair' },
          ] },
          say('A small pizza and a big pizza are different wholes. 0.5 of one and 0.4 of the other: you can’t tell which is more.'),
        ]),
      },
    ],
  },
  'dimes-and-pennies': {
    examples: [
      {
        title: 'A dollar is 100 pennies',
        picture: play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '1 dollar = 100 pennies' }, { ...say('A dollar is 100 pennies. Each penny is 1 of the 100 equal squares: 1/100 of a dollar.'), hidden: true }],
          [600, { 0: { glow: [0] } }], [600, { 0: { glow: [], shaded: [0] } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Count the pennies',
        picture: play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '4 pennies' }, { ...say('4 pennies are 4 hundredths: 4/100 of a dollar.'), hidden: true }],
          ...range(4).map((i): [number, Record<number, Partial<SceneRow>>] => [450, { 0: { shaded: gridFill(i + 1) } }]), [500, { 1: { hidden: false } }]),
      },
    ],
  },
  'unit-fraction-multiples': {
    examples: [
      {
        title: '× means copies of',
        picture: play([{ kind: 'bar', parts: ones(4), cut: true, label: '3 × 1/4' }, { ...say('3 × 1/4 means 3 copies of 1/4: 1/4 + 1/4 + 1/4.'), hidden: true }],
          ...range(3).map((i): [number, Record<number, Partial<SceneRow>>] => [500, { 0: { shaded: range(i + 1), counted: range(i + 1) } }]), [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Past one whole',
        picture: reveal([
          { kind: 'bar', parts: ones(4), cut: true, shaded: range(4), label: '4/4' },
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: '1/4' },
          say('5 × 1/4: 4 copies fill one whole, and 1 more goes past one whole. 5 × 1/4 = 5/4.'),
        ]),
      },
    ],
  },
  'multiply-whole-by-fraction': {
    examples: [{
      title: 'Multiply, keep the denominator',
      picture: reveal([
        ...range(2).map((): SceneRow => ({ kind: 'bar', parts: ones(3), cut: true, shaded: [0, 1] })),
        say('Multiply the groups by the numerator: 2 × 2 = 4. Keep the denominator: 2 × 2/3 = 4/3.'),
      ], 450),
    }],
  },
  'simplify-fractions': {
    examples: [
      {
        title: 'Count by 2s',
        picture: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: '6/8' }, { ...say('Count by 2s: 2, 4, 6, 8. You land on 6 and on 8, so 2 divides both 6 and 8.'), hidden: true }],
          ...range(4).map((i): [number, Record<number, Partial<SceneRow>>] => [450, { 0: { ticks: range(i + 1).map((k) => 2 * k + 1) } }]),
          [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Divide again',
        picture: reveal([
          { kind: 'bar', parts: ones(12), cut: true, shaded: range(4), label: '4/12' },
          { kind: 'bar', parts: ones(3), cut: true, shaded: [0], label: '1/3' },
          say('Divide both by 2: 4/12 = 2/6. Divide again: 2/6 = 1/3. Only 1 divides 1 and 3: simplest form.'),
        ], 500),
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
    // The units the lesson's stories measure in, each taught before its first question (idea 2).
    words: [
      { term: 'cent', meaning: 'A cent is the value of 1 penny. 100 cents make 1 dollar.' },
      { term: 'gram', meaning: 'A gram is a tiny weight: a paper clip weighs about 1 gram. 1000 grams make 1 kilogram, about a bag of rice.' },
      { term: 'liter', meaning: 'A big water bottle holds about 1 liter. A milliliter is tiny: 1000 milliliters make 1 liter.' },
    ],
    examples: [
      {
        // Idea 1: hours in a day, the other time fact the lesson's stories use.
        title: '1 day is 24 hours',
        picture: play([
          { kind: 'bar', parts: ones(4), bracket: '1 day = 24 hours' },
          { ...say('1 day is 24 hours. For 1/4 day, split the 24 hours into 4 equal parts: 24 ÷ 4 = 6 hours.'), hidden: true },
        ], [600, { 0: { cut: true, shaded: [0] } }], [500, { 1: { hidden: false } }]),
      },
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
    // The first lesson to weigh in pounds (3/8 pound for each guest).
    words: [{ term: 'pound', meaning: 'A pound is a way to measure how heavy something is. A loaf of bread weighs about 1 pound.' }],
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
  // Lessons 61–71: worked examples for the ideas the Teach first steps don't picture.
  'line-plot-totals': {
    examples: [
      {
        title: 'How much more?',
        picture: play([
          { kind: 'line', max: 1, spaces: 4, cut: true, xs: [[1, 3], [3, 2]], marks: [{ at: 1, label: '1/4' }, { at: 2, label: '2/4' }, { at: 3, label: '3/4' }] },
          { ...say('Add each stack first. Three 1/4 cups hold 3/4. Two 3/4 cups hold 6/4. Take away: 6/4 − 3/4 = 3/4 liter more.'), hidden: true },
        ], [600, { 0: { point: 1 } }], [600, { 0: { point: 3 } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'Rename the halves first',
        picture: play([
          { kind: 'line', max: 1, spaces: 4, cut: true, xs: [[1, 2], [2, 1], [3, 1]], marks: [{ at: 1, label: '1/4' }, { at: 2, label: '1/2' }, { at: 3, label: '3/4' }] },
          { ...say('Rain: 1/4, 1/4, 1/2 and 3/4 inch. 1/2 = 2/4, so count it as 2 fourths. 1 + 1 + 2 + 3 = 7 fourths: 7/4 inches.'), hidden: true },
        ], [900, { 0: { marks: [{ at: 1, label: '1/4' }, { at: 2, label: '2/4' }, { at: 3, label: '3/4' }] } }], [600, { 1: { hidden: false } }]),
      },
    ],
  },
  'fractional-unit-conversions': {
    // The new units in the unit facts, each with what it measures (inches, pounds, meters and the rest are taught earlier).
    words: [
      {
        term: 'foot', meaning: 'A foot is a length of 12 inches. A school ruler is about 1 foot long. Two or more are feet.',
        picture: still([{ kind: 'bar', parts: ones(12), cut: true, bracket: '1 foot = 12 inches' }]),
      },
      { term: 'ounce', meaning: 'An ounce is a small weight. A slice of bread weighs about 1 ounce. 16 ounces make 1 pound.' },
      { term: 'centimeter', meaning: 'A centimeter is a tiny length, about as wide as your fingernail. 100 centimeters make 1 meter.' },
    ],
    examples: [{
      title: 'Unit facts',
      picture: reveal([
        { kind: 'bar', parts: ones(12), cut: true, bracket: '1 foot = 12 inches' },
        say('1 foot = 12 inches. 1 hour = 60 minutes. 1 day = 24 hours. 1 pound = 16 ounces.'),
        say('1 minute = 60 seconds. 1 meter = 100 centimeters. 1 liter = 1000 milliliters. 1 kilogram = 1000 grams.'),
      ]),
    }],
  },
  'two-step-conversions': {
    examples: [
      {
        title: 'Feet and part of a foot',
        picture: play([
          { kind: 'line', max: 2, spaces: 4, cut: true, unit: 'foot', marks: [{ at: 4, label: '12 in' }, { at: 7, label: '21 in' }] },
          { ...say('1 3/4 feet: 1 foot is 12 inches, and 3/4 foot is 9 inches. 12 + 9 = 21 inches.'), hidden: true },
        ], [700, { 0: { stretch: 4 } }], [700, { 0: { stretch: 7 } }], [500, { 1: { hidden: false } }]),
      },
      {
        title: 'Cut some off',
        picture: play([
          { kind: 'line', max: 2, spaces: 12, group: 3, cut: true, unit: 'foot', stretch: 18, marks: [{ at: 18, label: '18 in' }] },
          { ...say('1 1/2 feet = 18 inches. Cut off 4 inches: 18 − 4 = 14 inches are left.'), hidden: true },
        ], [900, { 0: { stretch: 14, marks: [{ at: 14, label: '14 in' }] } }], [500, { 1: { hidden: false } }]),
      },
    ],
  },
  'fraction-as-division': {
    examples: [{
      title: 'Between two whole numbers',
      picture: play([
        { kind: 'line', max: 3, spaces: 4, cut: true, pointLabel: '11/4' },
        { ...say('11/4 = 11 ÷ 4: 2 wholes (8 fourths) and 3/4 more. So 11/4 is between 2 and 3.'), hidden: true },
      ], ...range(11).map((i): [number, Record<number, Partial<SceneRow>>] => [260, { 0: { jumps: i + 1 } }]), [500, { 0: { point: 11 } }], [500, { 1: { hidden: false } }]),
    }],
  },
  'share-or-fit': {
    examples: [{
      title: 'Sharing or fitting?',
      picture: reveal([
        { kind: 'bar', parts: ones(4), cut: true, shaded: [0], label: 'Sharing: 1 cake for 4 friends. How much each?' },
        { kind: 'bar', parts: ones(2), cut: true, counted: [0, 1], label: 'Fitting: how many 1/2 cups fill 1 cup?' },
        say('Sharing splits an amount among people. Fitting counts how many pieces fit.'),
      ]),
    }],
  },
  // Lessons 72–81: pictures for the ideas their Teach first scenes don't show.
  'fraction-probability': {
    words: [
      // The marble example on the next Learn page pictures it.
      { term: 'outcome', meaning: 'An outcome is one way something can turn out.' },
      {
        term: 'equally likely', meaning: 'Equally likely outcomes come up just as often. A bigger part comes up more often.',
        picture: still([{ kind: 'pair', items: [
          { kind: 'area', cut: 'circle-fourths', edges: true, label: 'Equally likely', tone: 'fair' },
          { kind: 'area', cut: 'circle-unequal', edges: true, glow: [0], label: 'Not equally likely', tone: 'unfair' },
        ] }]),
      },
    ],
    examples: [
      {
        title: 'Each marble is an outcome',
        picture: play([{ kind: 'set', count: 6, groups: 6 }, { ...say('Pick 1 marble without looking. Each marble is one outcome. 6 marbles: 6 outcomes.'), hidden: true }],
          [700, { 0: { counted: range(6), countOn: true } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'A bag of marbles',
        picture: reveal([{ kind: 'set', count: 4, groups: 4, shaded: [0, 1, 2] }, say('4 marbles: 4 outcomes. 3 are green: the outcomes we want. The chance of green is 3/4.')]),
      },
    ],
  },
  'fractional-side-area': {
    words: [{
      term: 'square unit', meaning: 'A square unit is a square 1 unit long and 1 unit wide. Area is counted in square units.',
      picture: still([{ kind: 'area', cut: 'grid-3x3', edges: true, shaded: [0] }]),
    }],
    examples: [
      {
        title: 'Rows times columns',
        picture: play([{ kind: 'area', cut: 'grid-4x4', edges: true }, { ...say('Each small square is 1 square unit. A rectangle 3 units long and 2 units wide covers 2 rows of 3: 2 × 3 = 6 square units.'), hidden: true }],
          [700, { 0: { shaded: gridOverlap(4, 2, 3) } }], [700, { 0: { counted: gridOverlap(4, 2, 3) } }], [600, { 1: { hidden: false } }]),
      },
      {
        title: 'A side of 1 unit',
        picture: play([{ kind: 'area', cut: 'grid-2x3', edges: true, label: '1 square unit: 2 columns, 3 rows' }, { ...say('1 unit across covers both columns. 2/3 unit down covers 2 of the 3 rows. They overlap on 4 of the 6 boxes: 4/6 square unit.'), hidden: true }],
          [700, { 0: { shaded2: range(6) } }], [700, { 0: { shaded: range(4) } }], [600, { 1: { hidden: false } }]),
      },
    ],
  },
  'multiply-mixed-numbers': {
    words: [{
      term: 'square meter', meaning: 'A square meter is a square unit 1 meter long and 1 meter wide. Garden areas are counted in square meters.',
      picture: still([{ kind: 'area', cut: 'grid-3x3', edges: true, shaded: [0] }]),
    }],
    examples: [{
      title: 'Add the four areas',
      // 1 1/2 meters across (3 halves) by 1 1/3 meters down (4 thirds): each box is 1/6 square meter.
      picture: reveal([
        { kind: 'area', cut: 'grid-3x4', edges: true, shaded: [0, 1, 3, 4, 6, 7], shaded2: [2, 5, 8], glow: [9, 10], counted: [11], label: '1 1/2 meters by 1 1/3 meters' },
        say('1 + 1/2 + 1/3 + 1/6. In sixths: 6/6 + 3/6 + 2/6 + 1/6 = 12/6 = 2 square meters.'),
      ]),
    }],
  },
  'fractions-to-percent': {
    words: [
      { term: 'percent', meaning: 'Percent means out of 100. 75 percent is 75 out of 100.' },
      { term: '%', meaning: '% is the percent sign. 75% means 75 percent: 75 out of 100.' },
    ],
    examples: [{
      title: 'Rename 7/10 in hundredths',
      picture: play([{ kind: 'area', cut: 'grid-10x10', edges: true, label: '7/10 of 100 squares' }, { ...say('100 ÷ 10 = 10, and 7 × 10 = 70: 7/10 = 70/100.'), hidden: true }],
        [800, { 0: { shaded: range(70).map((k) => (k % 10) * 10 + Math.floor(k / 10)) } }], [500, { 1: { hidden: false } }]),
    }],
  },
  'find-the-whole': {
    examples: [{
      title: 'One part is known: make all the parts',
      picture: play([{ kind: 'set', count: 12, groups: 4, shaded: [0], label: '3 stickers are 1/4 of the pack' }, { ...say('1/4 is 1 of 4 equal parts, so each part is 3. 4 parts of 3: 4 × 3 = 12 stickers.'), hidden: true }],
        [700, { 0: { counted: range(4), countOn: true } }], [600, { 1: { hidden: false } }]),
    }],
  },
  'spot-the-mistake': {
    examples: [
      {
        title: 'Rules to check',
        picture: reveal([
          { kind: 'bar', parts: ones(4), cut: true, shaded: [0], shaded2: [1, 2], label: '1/4 + 2/4 = 3/4', tone: 'fair' },
          say('Add or take away same-size parts: keep the denominator. A whole number times a fraction: multiply only the numerator. Equal fractions: multiply the top and bottom by the same number.'),
        ]),
      },
      {
        title: 'Sometimes the work is right',
        picture: reveal([
          { kind: 'bar', parts: ones(6), cut: true, shaded: [0, 1, 2], shaded2: [3, 4], label: 'Lee: 3/6 + 2/6 = 5/6', tone: 'fair' },
          say('Lee added the numerators and kept sixths. That follows the rule, so Lee is right.'),
        ]),
      },
      {
        title: 'The first wrong step',
        picture: reveal([
          { kind: 'bar', parts: ones(6), cut: true, shaded: range(3), label: 'Step 1: 1/6 + 2/6 = 3/6', tone: 'fair' },
          { kind: 'bar', parts: ones(12), cut: true, shaded: range(5), label: 'Step 2: 3/6 + 2/6 = 5/12', tone: 'unfair' },
          say('Step 1 keeps sixths: right. Step 2 changes sixths to twelfths: wrong. Step 2 is the first wrong step.'),
        ]),
      },
    ],
  },
  'fraction-of-remainder': {
    examples: [{
      title: 'A part of what is left',
      picture: play([{ kind: 'bar', parts: ones(6), cut: true, shaded: range(6), label: 'One pizza' }, { ...say('Max eats 2/6: 4/6 is left. Then he eats 1/4 of what is left: 1/4 of 4 sixths is 1 sixth. 3/6 is left now.'), hidden: true }],
        [700, { 0: { shaded: [2, 3, 4, 5] } }], [700, { 0: { glow: [2] } }], [700, { 0: { glow: [], shaded: [3, 4, 5] } }], [600, { 1: { hidden: false } }]),
    }],
  },
  'divide-fractions': {
    examples: [{
      title: 'Count groups',
      picture: play([{ kind: 'bar', parts: ones(8), cut: true, shaded: range(6), label: 'How many 2/8s fit in 3/4?' }, { ...say('3/4 = 6/8. Count groups of 2 eighths: 3 groups fit. 3/4 ÷ 2/8 = 3.'), hidden: true }],
        [600, { 0: { glow: [0, 1] } }], [600, { 0: { glow: range(4) } }], [600, { 0: { glow: range(6) } }], [600, { 1: { hidden: false } }]),
    }],
  },
};

/** The pages a lesson's Teach first adds: Words to know first (if any), then the extra examples after Why. */
export const teachExtras = (missionId: string | undefined): TeachExtras => (missionId ? TEACH_EXTRAS[missionId] ?? {} : {});

/** What Listen reads on the Words to know page. */
export const wordsScript = (words: WordCard[]) => ['Words to know.', ...words.map((word) => word.meaning)].join(' ');

/** Terms and symbols a lesson teaches (in its Words to know), and the lesson that teaches each one. Practice in an
    earlier lesson may not use them (checked by teach-extras.test.ts). Each unit's PR adds its own. */
export const TAUGHT_IN: { term: string; pattern: RegExp; lesson: string;
  /** A unit of measure or a unit fact: checked on every screen of the earlier lessons and ideas, not only practice. */
  unit?: true }[] = [
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
  // Lessons 21–30 (compose-to-one … tenths-decimals). (+ is used in lesson 12 before lesson 21 defines it, so it is not listed.)
  { term: 'sum', pattern: /\bsums?\b/i, lesson: 'compose-to-one' },
  { term: 'whole number', pattern: /\bwhole numbers?\b/i, lesson: 'whole-numbers-as-fractions' },
  { term: 'mixed number', pattern: /\bmixed numbers?\b/i, lesson: 'mixed-improper' },
  { term: 'decimal', pattern: /\bdecimals?\b/i, lesson: 'tenths-decimals' },
  { term: 'digit', pattern: /\bdigits?\b/i, lesson: 'tenths-decimals' },
  // Lessons 31–40.
  { term: 'hundredths', pattern: /\bhundredths?\b/i, lesson: 'hundredths-decimals' },
  { term: 'dime / penny', pattern: /\b(dimes?|penn(y|ies))\b/i, lesson: 'dimes-and-pennies' },
  { term: 'simplest form', pattern: /\bsimplest form\b/i, lesson: 'simplify-fractions' },
  // Lessons 41–50 (compare-unlike-fractions … subtract-unlike-fractions).
  { term: 'common denominator', pattern: /\bcommon denominators?\b/i, lesson: 'compare-unlike-fractions' },
  { term: 'batch', pattern: /\bbatch(es)?\b/i, lesson: 'fraction-recipes' },
  { term: 'multiples of a number', pattern: /\bmultiples of\b/i, lesson: 'add-unlike-fractions' },
  // Lessons 51–60.
  { term: 'a fraction × a number', pattern: /\b\d+\/\d+ × \d+\b(?!\/)/, lesson: 'fraction-of-quantity' },
  { term: 'rows', pattern: /\brows?\b/i, lesson: 'fraction-times-fraction' },
  { term: 'overlap', pattern: /\boverlap/i, lesson: 'fraction-times-fraction' },
  { term: 'product', pattern: /\bproducts?\b/i, lesson: 'bigger-or-smaller' },
  // Lessons 61–71.
  { term: 'leveling', pattern: /\blevel(s|ed|ing)?\b/i, lesson: 'line-plot-leveling' },
  { term: 'fraction bar', pattern: /\bfraction bar\b/i, lesson: 'fraction-as-division' },
  { term: 'a unit fraction shared (1/3 ÷ 4)', pattern: /\d+\/\d+ ÷ \d/, lesson: 'unit-fraction-divided-whole' },
  { term: '÷ by a fraction (how many fit)', pattern: /÷\s*\d+\/\d+/, lesson: 'divide-whole-by-unit-fraction' },
  { term: 'checking an answer with ×', pattern: /\bcheck\b[^.]*×/i, lesson: 'unit-fraction-divided-whole' },
  { term: 'sharing or fitting', pattern: /\bfitting\b/i, lesson: 'share-or-fit' },
  // Lessons 72–81.
  { term: 'chance, outcome, equally likely', pattern: /\b(chance|outcomes?|equally likely)\b/i, lesson: 'fraction-probability' },
  { term: 'square unit', pattern: /\bsquare units?\b/i, lesson: 'fractional-side-area' },
  { term: 'percent, %', pattern: /%|\bpercent\b/i, lesson: 'fractions-to-percent' },
  // Units of measure and unit facts, each taught where a child first meets it (Words to know, or a worked example).
  { term: 'meter', pattern: /\bmeters?\b/i, lesson: 'benchmarks-zero-one', unit: true },
  { term: 'mile', pattern: /\bmiles?\b/i, lesson: 'fraction-magnitude', unit: true },
  { term: 'inch (in)', pattern: /\binch(es)?\b/i, lesson: 'ruler-measurement', unit: true },
  { term: 'cup', pattern: /\bcups?\b/i, lesson: 'compose-to-one', unit: true },
  { term: 'dollar', pattern: /\bdollars?\b/i, lesson: 'dimes-and-pennies', unit: true },
  { term: 'hour and minute: 1 hour is 60 minutes', pattern: /\b(hours?|minutes?)\b/i, lesson: 'measurement-word-problems', unit: true },
  { term: '1 day is 24 hours', pattern: /\b24 hours\b|\bhours? (are )?in (a |\d+\/\d+ (of a )?)?days?\b|\bdays? (is|=) 24\b/i, lesson: 'measurement-word-problems', unit: true },
  { term: 'cent: 100 cents make 1 dollar', pattern: /\bcents?\b/i, lesson: 'measurement-word-problems', unit: true },
  { term: 'kilogram and gram', pattern: /\b(kilo)?grams?\b/i, lesson: 'measurement-word-problems', unit: true },
  { term: 'liter and milliliter', pattern: /\b(milli)?liters?\b/i, lesson: 'measurement-word-problems', unit: true },
  { term: 'pound', pattern: /\bpounds?\b/i, lesson: 'party-portions', unit: true },
  { term: 'foot: 1 foot is 12 inches', pattern: /\b(foot|feet)\b/i, lesson: 'fractional-unit-conversions', unit: true },
  { term: 'ounce: 16 ounces make 1 pound', pattern: /\bounces?\b/i, lesson: 'fractional-unit-conversions', unit: true },
  { term: 'centimeter: 100 centimeters make 1 meter', pattern: /\bcentimeters?\b/i, lesson: 'fractional-unit-conversions', unit: true },
  { term: '1 minute is 60 seconds', pattern: /\bseconds\b/i, lesson: 'fractional-unit-conversions', unit: true },
  { term: 'square meter', pattern: /\bsquare meters?\b/i, lesson: 'multiply-mixed-numbers', unit: true },
];
