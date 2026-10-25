/* The ideas of lessons 2–10 (see lesson-ideas.ts): each lesson's ideas in order, each with its Learn pages and 3
   practices. Lesson 1 (ideas/lessons-01.ts) is the model. */
import { example, scenes, wordsToKnow, type LessonIdea } from './helpers';

export const IDEAS: Record<string, LessonIdea[]> = {
  // Lesson 2: equal parts can be different shapes (with its cake round), then sharing fairly (its two cake rounds).
  // It was lesson 1 until reading a fraction moved in front of it, so fraction names are taught by now.
  'equal-parts': [
    {
      title: 'Equal parts can be different shapes',
      learn: [
        { text: 'Equal parts have a name: 4 equal parts are fourths.', scene: scenes('equal-parts').steps[2]! },
        example('equal-parts', 'Same space, different shape'),
      ],
      practice: [{ question: 'equal-parts-p1' }, { handsOn: 'match' }, { question: 'equal-parts-p2' }],
    },
    {
      title: 'Share fairly',
      terms: [{ term: 'sharing among friends', pattern: /\bfriends?\b/i }],
      learn: [example('equal-parts', 'Share fairly')],
      practice: [{ handsOn: 'sort' }, { handsOn: 'sort-cake' }, { question: 'equal-parts-p3' }],
    },
  ],

  // Lesson 3: one part is a unit fraction; unit parts fill the whole; a fair share is one unit part.
  'unit-fractions': [
    {
      title: 'One equal part is a unit fraction',
      learn: [
        { text: 'Count the equal parts. That number is the denominator.', scene: scenes('unit-fractions').steps[1]! },
        { text: 'A unit fraction is one equal part. Write 1 on top.', scene: scenes('unit-fractions').steps[2]! },
        { text: 'Every unit fraction has 1 on top. It is one part, big or small.', scene: scenes('unit-fractions').why },
      ],
      practice: [{ question: 'unit-fractions-q2' }, { question: 'unit-fractions-q4' }, { question: 'unit-fractions-q1' }],
    },
    {
      title: 'Unit parts fill the whole',
      terms: [{ term: 'unit parts that fill the whole', pattern: /\b(make|makes|fill|fills|cover|covers) (one|the) whole\b/i }],
      learn: [example('unit-fractions', '3 thirds make one whole'), example('unit-fractions', '2 triangles make 1/4')],
      practice: [{ question: 'unit-fractions-p1' }, { handsOn: 'tile' }, { question: 'unit-fractions-p2' }],
    },
    {
      title: 'A fair share is one unit part',
      terms: [{ term: 'fair shares', pattern: /\b(friends?|share[sd]?)\b/i }],
      learn: [example('unit-fractions', 'A fair share')],
      practice: [{ question: 'unit-fractions-p3' }, { question: 'unit-fractions-p4' }, { question: 'unit-fractions-p5' }],
    },
  ],

  // Lesson 4: equal parts cover the same area; count the parts to name the shaded part; a hexagon in 6 equal parts.
  'fraction-of-area': [
    {
      title: 'Equal parts cover the same area',
      learn: [
        wordsToKnow('fraction-of-area'),
        { text: 'These parts are different shapes, but each covers the same area.', scene: scenes('fraction-of-area').steps[0]! },
        example('fraction-of-area', 'Move it on top'),
      ],
      practice: [{ question: 'fraction-of-area-p1' }, { question: 'fraction-of-area-p2' }, { question: 'fraction-of-area-p3' }],
    },
    {
      title: 'Count the equal parts, then the shaded parts',
      terms: [
        { term: 'naming the shaded part', pattern: /\b(colou?red|shaded)\b/i },
        { term: 'numerator and denominator', pattern: /\b(numerator|denominator)s?\b/i },
      ],
      learn: [
        { text: 'Count all the equal parts for the denominator.', scene: scenes('fraction-of-area').steps[1]! },
        { text: 'Count the shaded parts for the numerator.', scene: scenes('fraction-of-area').steps[2]! },
      ],
      practice: [{ question: 'fraction-of-area-q2' }, { question: 'fraction-of-area-q3' }, { question: 'fraction-of-area-q4' }],
    },
    {
      title: 'A hexagon cut into 6 equal parts',
      terms: [{ term: 'hexagon', pattern: /\bhexagons?\b/i }],
      learn: [example('fraction-of-area', 'A hexagon')],
      practice: [{ question: 'fraction-of-area-q1' }, { question: 'fraction-of-area-p4' }, { question: 'fraction-of-area-p5' }],
    },
  ],

  // Lesson 5: more parts make smaller parts; read it from the denominators; the bigger part is closer to the whole.
  'unit-size': [
    {
      title: 'More parts in the same whole means smaller parts',
      learn: [
        { text: 'Cut the same whole into 3 parts, and into 6 parts.', scene: scenes('unit-size').steps[0]! },
        { text: 'More parts in the same whole means smaller parts.', scene: scenes('unit-size').steps[1]! },
        { text: 'Cut the same bar into more and more parts. Each part gets smaller.', scene: scenes('unit-size').why },
      ],
      practice: [{ question: 'unit-size-q1' }, { question: 'unit-size-q2' }, { question: 'unit-size-p6' }],
    },
    {
      title: 'The smaller denominator is the bigger part',
      terms: [{ term: 'denominator', pattern: /\bdenominators?\b/i }],
      learn: [{ text: 'Look at the denominators. The smaller denominator is the bigger part.', scene: scenes('unit-size').steps[2]! }],
      practice: [{ question: 'unit-size-p1' }, { question: 'unit-size-p2' }, { question: 'unit-size-p3' }],
    },
    {
      title: 'The bigger part is closer to the whole',
      terms: [{ term: 'closer to the whole', pattern: /\b(closer|closest|farther)\b/i }],
      learn: [example('unit-size', 'Closer to the whole')],
      practice: [{ question: 'unit-size-q3' }, { question: 'unit-size-p4' }, { question: 'unit-size-p5' }],
    },
  ],

  // Lesson 6: the same count of bigger parts is more; then write it with >, < or =.
  'compare-same-numerator': [
    {
      title: 'Same top number: bigger parts make more',
      learn: [
        { text: 'Both fractions count 3 parts.', scene: scenes('compare-same-numerator').steps[0]! },
        { text: 'Fourths are bigger parts than eighths, so 3/4 is more than 3/8.', scene: scenes('compare-same-numerator').steps[1]! },
      ],
      practice: [{ question: 'compare-same-numerator-q1' }, { question: 'compare-same-numerator-q2' }, { question: 'compare-same-numerator-q4' }],
    },
    {
      title: 'Write it with a sign: >, < or =',
      terms: [{ term: 'the signs >, < and =', pattern: /\s[<>=]\s/ }],
      learn: [
        wordsToKnow('compare-same-numerator'),
        { text: '> means “is more than”. Read it: 3/4 is more than 3/8.', scene: scenes('compare-same-numerator').steps[2]! },
        { ...example('compare-same-numerator', 'Read a < answer'), text: '< means “is less than”. The point faces the smaller amount.' },
      ],
      practice: [{ question: 'compare-same-numerator-q3' }, { question: 'compare-same-numerator-p1' }, { question: 'compare-same-numerator-p2' }],
    },
  ],

  // Lesson 7: half of the parts is 1/2; compare the top number with half; half of an odd number; closest to half.
  'benchmark-half': [
    {
      title: 'Half of the parts make one half',
      learn: [
        example('benchmark-half', 'Half is the middle'),
        { text: 'Find half of the denominator. Half of 8 parts is 4 parts.', scene: scenes('benchmark-half').steps[0]! },
      ],
      practice: [{ question: 'benchmark-half-p1' }, { question: 'benchmark-half-p2' }, { question: 'benchmark-half-p3' }],
    },
    {
      title: 'Compare the top number with half',
      terms: [{ term: 'more or less than half', pattern: /\b(more|less) than (1\/2|half|one half)\b/i }],
      learn: [
        { text: 'Compare the numerator with half. 5 is more than 4, so 5/8 is more than half.', scene: scenes('benchmark-half').steps[1]! },
        { text: 'On a number line, 5/8 is past the middle.', scene: scenes('benchmark-half').steps[2]! },
      ],
      practice: [{ question: 'benchmark-half-q4' }, { question: 'benchmark-half-q1' }, { question: 'benchmark-half-p4' }],
    },
    {
      title: 'Half of an odd number of parts',
      terms: [{ term: 'half of an odd number', pattern: /\band a half\b|\bbetween 1 part and 2 parts\b/i }],
      learn: [example('benchmark-half', 'Half of 3 parts')],
      practice: [{ question: 'benchmark-half-q2' }, { question: 'benchmark-half-p5' }, { question: 'benchmark-half-p6' }],
    },
    {
      title: 'Count the parts away from half',
      terms: [{ term: 'closest to half', pattern: /\b(closest|closer|nearest)\b|\baway\b/i }],
      learn: [example('benchmark-half', 'Closest to half'), example('benchmark-half', '1 part less than half')],
      practice: [{ question: 'benchmark-half-q3' }, { question: 'benchmark-half-p7' }, { question: 'benchmark-half-p8' }],
    },
  ],

  // Lesson 8: benchmarks and near 0; near 1 when little is missing; nearer half or nearer one.
  'benchmarks-zero-one': [
    {
      title: 'Benchmarks: 0, 1/2 and 1',
      learn: [
        wordsToKnow('benchmarks-zero-one'),
        { text: 'Find half of the denominator. Half of 8 is 4.', scene: scenes('benchmarks-zero-one').steps[0]! },
        { text: 'Far below half is near 0. Close to half is near 1/2.', scene: scenes('benchmarks-zero-one').steps[1]! },
      ],
      practice: [{ question: 'benchmarks-zero-one-q1' }, { question: 'benchmarks-zero-one-p1' }, { question: 'benchmarks-zero-one-p2' }],
    },
    {
      title: 'Near 1: just a little is missing',
      terms: [{ term: 'near one whole', pattern: /\bmissing\b|\bnear 1(?!\/)\b|\b(close|closest) to (one|1(?!\/))\b|\bone whole\b/i }],
      learn: [
        { text: 'A numerator close to the denominator is near 1.', scene: scenes('benchmarks-zero-one').steps[2]! },
        example('benchmarks-zero-one', 'What is missing?'),
      ],
      practice: [{ question: 'benchmarks-zero-one-q2' }, { question: 'benchmarks-zero-one-p6' }, { question: 'benchmarks-zero-one-p3' }],
    },
    {
      title: 'Nearer half or nearer one?',
      terms: [{ term: 'nearer half or one', pattern: /\b(nearer|between)\b/i }],
      learn: [example('benchmarks-zero-one', 'Nearer half or one?')],
      practice: [{ question: 'benchmarks-zero-one-q3' }, { question: 'benchmarks-zero-one-p4' }, { question: 'benchmarks-zero-one-p5' }],
    },
  ],

  // Lesson 9: find the nearest benchmark, then say if it is a little more or a little less.
  'fraction-magnitude': [
    {
      title: 'Find the nearest benchmark',
      learn: [
        wordsToKnow('fraction-magnitude'),
        { text: 'Picture the fraction on a line from 0 to 1.', scene: scenes('fraction-magnitude').steps[0]! },
        { text: 'Find the nearest benchmark: 0, 1/2 or 1.', scene: scenes('fraction-magnitude').steps[1]! },
      ],
      practice: [{ question: 'fraction-magnitude-q3' }, { question: 'fraction-magnitude-p1' }, { question: 'fraction-magnitude-q4' }],
    },
    {
      title: 'A little more or a little less',
      terms: [{ term: 'a little more or less', pattern: /\ba (little|bit) (more|less)\b|\bjust (under|over)\b/i }],
      learn: [
        { text: 'Then say if it is a little more or a little less.', scene: scenes('fraction-magnitude').steps[2]! },
        { text: 'Near 1/2 works the same way.', scene: scenes('fraction-magnitude').why },
      ],
      practice: [{ question: 'fraction-magnitude-q1' }, { question: 'fraction-magnitude-q2' }, { question: 'fraction-magnitude-p2' }],
    },
  ],

  // Lesson 10: split 0 to 1 into equal spaces; each space is one jump; count jumps from 0 to a point.
  'number-line-basics': [
    {
      title: 'Split 0 to 1 into equal spaces',
      learn: [
        { text: 'One whole goes from 0 to 1.', scene: scenes('number-line-basics').steps[0]! },
        wordsToKnow('number-line-basics'),
        { text: 'The denominator tells how many equal spaces.', scene: scenes('number-line-basics').steps[1]! },
      ],
      practice: [{ question: 'number-line-basics-q2' }, { question: 'number-line-basics-p1' }, { question: 'number-line-basics-p2' }],
    },
    {
      title: 'Each space is one jump',
      terms: [{ term: 'jumps', pattern: /\bjumps?\b/i }],
      learn: [
        { text: 'Each equal space is one jump: one part of the whole.', scene: scenes('number-line-basics').steps[2]! },
        { text: 'A space on the line is like a part of a bar.', scene: scenes('number-line-basics').why },
      ],
      practice: [{ question: 'number-line-basics-q1' }, { question: 'number-line-basics-p3' }, { question: 'number-line-basics-p4' }],
    },
    {
      title: 'Count the jumps from 0',
      terms: [{ term: 'counting jumps to a point', pattern: /\b(dot|lands?|where)\b|\bjumps? from 0\b/i }],
      learn: [example('number-line-basics', 'Name the dot'), example('number-line-basics', 'A frog’s jumps')],
      practice: [{ question: 'number-line-basics-q3' }, { question: 'number-line-basics-q4' }, { question: 'number-line-basics-p5' }],
    },
  ],
};
