/* The ideas of lessons 31–40 (see lesson-ideas.ts): each lesson's ideas in order, each with its Learn pages and 3
   practices. Lesson 1 (ideas/lessons-01.ts) is the model. */
import { example, scenes, type LessonIdea } from './helpers';

export const IDEAS: Record<string, LessonIdea[]> = {
  // Lesson 31: hundredths on a grid, then as decimals, then what each place counts.
  'hundredths-decimals': [
    {
      title: 'Count the small squares to name hundredths',
      learn: [
        example('hundredths-decimals', 'One square is one hundredth'),
        { text: 'Count the shaded squares out of 100.', scene: scenes('hundredths-decimals').steps[0]! },
      ],
      practice: [{ question: 'hundredths-decimals-p1' }, { question: 'hundredths-decimals-p2' }, { question: 'hundredths-decimals-p3' }],
    },
    {
      title: 'Write hundredths with two places after the point',
      terms: [{ term: 'decimals with two places', pattern: /\b0\.\d\d\b/ }],
      learn: [
        { text: 'Less than one whole: write 0 and the decimal point.', scene: scenes('hundredths-decimals').steps[1]! },
        { text: 'Hundredths use two places after the point.', scene: scenes('hundredths-decimals').steps[2]! },
      ],
      practice: [{ question: 'hundredths-decimals-q2' }, { question: 'hundredths-decimals-p4' }, { question: 'hundredths-decimals-p5' }],
    },
    {
      title: 'Columns are tenths, single squares are hundredths',
      terms: [
        { term: 'columns as tenths', pattern: /\bcolumns?\b/i },
        { term: 'a 0 holding the tenths place', pattern: /\b0\.0\d\b/ },
      ],
      learn: [
        { text: 'Each column is one tenth. Each single square is one hundredth.', scene: scenes('hundredths-decimals').why },
        example('hundredths-decimals', 'A 0 holds the tenths place'),
      ],
      practice: [{ question: 'hundredths-decimals-q1' }, { question: 'hundredths-decimals-q3' }, { question: 'hundredths-decimals-q4' }],
    },
  ],
  // Lesson 32: tenths and hundredths first, then fractions renamed in tenths, then in hundredths.
  'decimal-fraction-equivalence': [
    {
      title: 'Tenths and hundredths are ready to write as decimals',
      learn: [
        { text: 'A decimal is a fraction out of 10 or 100.', scene: scenes('decimal-fraction-equivalence').why },
        { text: 'Tenths use one place after the point.', scene: scenes('decimal-fraction-equivalence').steps[1]! },
      ],
      practice: [{ question: 'decimal-fraction-equivalence-q4' }, { question: 'decimal-fraction-equivalence-p1' }, { question: 'decimal-fraction-equivalence-p2' }],
    },
    {
      title: 'Rename fifths and halves in tenths first',
      terms: [{ term: 'multiplying to make 10', pattern: /\bmultiply\b|×/i }],
      learn: [
        { text: 'Rename the fraction in tenths.', scene: scenes('decimal-fraction-equivalence').steps[0]! },
        example('decimal-fraction-equivalence', 'What times the bottom makes 10?'),
      ],
      practice: [{ question: 'decimal-fraction-equivalence-q2' }, { question: 'decimal-fraction-equivalence-q3' }, { question: 'decimal-fraction-equivalence-p3' }],
    },
    {
      title: 'Rename fourths in hundredths first',
      terms: [{ term: 'fourths', pattern: /\bfourths?\b|\d\/4\b/i }],
      learn: [example('decimal-fraction-equivalence', 'Fourths: make 100 on the bottom')],
      practice: [{ question: 'decimal-fraction-equivalence-p4' }, { question: 'decimal-fraction-equivalence-q1' }, { question: 'decimal-fraction-equivalence-p5' }],
    },
  ],
  // Lesson 33: the same number of places, then tenths first, then hundredths when the tenths match.
  'compare-decimals': [
    {
      title: 'Give both decimals the same number of places',
      learn: [
        { text: '4 tenths is the same amount as 40 hundredths.', scene: scenes('compare-decimals').why },
        { text: 'Write 0.4 as 0.40, so both decimals have two places.', scene: scenes('compare-decimals').steps[0]! },
      ],
      practice: [{ question: 'compare-decimals-p1' }, { question: 'compare-decimals-p2' }, { question: 'compare-decimals-p3' }],
    },
    {
      title: 'Compare the tenths first',
      terms: [{ term: 'comparing', pattern: /\s[<>]\s|\bmore than\b|\bbigger\b/i }],
      learn: [
        { text: 'Compare the tenths first.', scene: scenes('compare-decimals').steps[1]! },
        { text: 'More digits does not mean bigger.', scene: scenes('compare-decimals').steps[2]! },
      ],
      practice: [{ question: 'compare-decimals-q1' }, { question: 'compare-decimals-q2' }, { question: 'compare-decimals-q3' }],
    },
    {
      title: 'If the tenths match, compare the hundredths',
      terms: [{ term: 'matching tenths', pattern: /\bmatch(es)?\b/i }],
      learn: [example('compare-decimals', 'When the tenths match')],
      practice: [{ question: 'compare-decimals-q4' }, { question: 'compare-decimals-p4' }, { question: 'compare-decimals-p5' }],
    },
  ],
  // Lesson 34: hundredths on a grid, then more squares is more, then only the same whole.
  'compare-decimals-grid': [
    {
      title: 'Write each decimal in hundredths and shade it',
      learn: [
        { text: 'Each small square is one hundredth of the grid.', scene: scenes('compare-decimals-grid').why },
        { text: 'Write each decimal in hundredths.', scene: scenes('compare-decimals-grid').steps[0]! },
        { text: 'Shade that many small squares.', scene: scenes('compare-decimals-grid').steps[1]! },
      ],
      practice: [{ question: 'compare-decimals-grid-p1' }, { question: 'compare-decimals-grid-p2' }, { question: 'compare-decimals-grid-p3' }],
    },
    {
      title: 'More shaded squares is the bigger decimal',
      terms: [{ term: 'comparing and ordering', pattern: /\s[<>]\s|\b(more|bigger|smallest|biggest)\b/i }],
      learn: [
        { text: 'More shaded squares is the bigger decimal.', scene: scenes('compare-decimals-grid').steps[2]! },
        example('compare-decimals-grid', 'Put three in order'),
      ],
      practice: [{ question: 'compare-decimals-grid-q3' }, { question: 'compare-decimals-grid-q1' }, { question: 'compare-decimals-grid-q4' }],
    },
    {
      title: 'Only compare parts of the same whole',
      terms: [
        { term: 'same-size wholes', pattern: /\bpizzas?\b|\bsame size\b|\bdifferent wholes\b/i },
        // "You can't tell" is the answer for different wholes, so no earlier idea offers it, even as a wrong choice.
        { term: 'you can’t tell', pattern: /\bcan['’]t tell\b/i },
      ],
      learn: [example('compare-decimals-grid', 'The same whole'), example('compare-decimals-grid', 'Different wholes')],
      practice: [{ question: 'compare-decimals-grid-p4' }, { question: 'compare-decimals-grid-q2' }, { question: 'compare-decimals-grid-p5' }],
    },
  ],
  // Lesson 35: a tenth is ten hundredths, then add hundredths, then both together.
  'add-tenths-hundredths': [
    {
      title: 'One tenth is ten hundredths',
      learn: [
        { text: 'One tenth is ten hundredths.', scene: scenes('add-tenths-hundredths').why },
        { text: 'Rename the tenths as hundredths.', scene: scenes('add-tenths-hundredths').steps[0]! },
      ],
      practice: [{ question: 'add-tenths-hundredths-q1' }, { question: 'add-tenths-hundredths-p1' }, { question: 'add-tenths-hundredths-p2' }],
    },
    {
      title: 'Add hundredths to hundredths',
      terms: [{ term: 'adding', pattern: /\+/ }],
      learn: [{ text: 'The parts match, so add them: 30/100 + 25/100 = 55/100.', scene: scenes('add-tenths-hundredths').steps[1]! }],
      practice: [{ question: 'add-tenths-hundredths-p3' }, { question: 'add-tenths-hundredths-p4' }, { question: 'add-tenths-hundredths-p5' }],
    },
    {
      title: 'Rename the tenths, then add',
      terms: [{ term: 'tenths plus hundredths', pattern: /\d\/10 \+|\+ \d+\/10\b/ }],
      learn: [{ text: 'Rename the tenths as hundredths, then add the hundredths.', scene: scenes('add-tenths-hundredths').steps[2]! }],
      practice: [{ question: 'add-tenths-hundredths-q2' }, { question: 'add-tenths-hundredths-q3' }, { question: 'add-tenths-hundredths-q4' }],
    },
  ],
  // Lesson 36: pennies, then dimes, then both.
  'dimes-and-pennies': [
    {
      title: 'A penny is one hundredth of a dollar',
      learn: [example('dimes-and-pennies', 'A dollar is 100 pennies'), example('dimes-and-pennies', 'Count the pennies')],
      practice: [{ question: 'dimes-and-pennies-p1' }, { question: 'dimes-and-pennies-p2' }, { question: 'dimes-and-pennies-p3' }],
    },
    {
      title: 'A dime is ten hundredths of a dollar',
      terms: [{ term: 'dimes', pattern: /\bdimes?\b/i }],
      learn: [
        { text: 'A dime is 10 pennies: one column of the grid.', scene: scenes('dimes-and-pennies').steps[0]! },
        { text: 'So a dime is 1/10 of a dollar.', scene: scenes('dimes-and-pennies').why },
      ],
      practice: [{ question: 'dimes-and-pennies-q1' }, { question: 'dimes-and-pennies-q3' }, { question: 'dimes-and-pennies-p4' }],
    },
    {
      title: 'Add the dimes and the pennies',
      terms: [{ term: 'dimes and pennies together', pattern: /\bdimes? and \d+ penn(y|ies)\b|\/10 \+ \d+\/100\b/i }],
      learn: [
        { text: 'Each penny adds 1 hundredth.', scene: scenes('dimes-and-pennies').steps[1]! },
        { text: 'Add them to get hundredths of a dollar.', scene: scenes('dimes-and-pennies').steps[2]! },
      ],
      practice: [{ question: 'dimes-and-pennies-q2' }, { question: 'dimes-and-pennies-q4' }, { question: 'dimes-and-pennies-p5' }],
    },
  ],
  // Lesson 37: × counts copies, then the count goes on top, then past one whole.
  'unit-fraction-multiples': [
    {
      title: 'Count copies of one part with ×',
      learn: [
        example('unit-fraction-multiples', '× means copies of'),
        { text: 'Count how many copies.', scene: scenes('unit-fraction-multiples').steps[0]! },
      ],
      practice: [{ question: 'unit-fraction-multiples-p1' }, { question: 'unit-fraction-multiples-p2' }, { question: 'unit-fraction-multiples-p3' }],
    },
    {
      title: 'Write the count on top and keep the denominator',
      terms: [{ term: 'one fraction', pattern: /\bon top\b|\bone fraction\b|\bdenominator\b/i }],
      learn: [
        { text: 'Write the number of copies on top.', scene: scenes('unit-fraction-multiples').steps[1]! },
        { text: 'Keep the denominator.', scene: scenes('unit-fraction-multiples').steps[2]! },
        { text: 'Each copy adds one more same-size part.', scene: scenes('unit-fraction-multiples').why },
      ],
      practice: [{ question: 'unit-fraction-multiples-q4' }, { question: 'unit-fraction-multiples-q3' }, { question: 'unit-fraction-multiples-p4' }],
    },
    {
      title: 'Copies can go past one whole',
      terms: [{ term: 'past one whole', pattern: /\bpast one whole\b/i }],
      learn: [example('unit-fraction-multiples', 'Past one whole')],
      practice: [{ question: 'unit-fraction-multiples-q1' }, { question: 'unit-fraction-multiples-q2' }, { question: 'unit-fraction-multiples-p5' }],
    },
  ],
  // Lesson 38: count the parts in each group, then multiply, then see it as copies of one part.
  'multiply-whole-by-fraction': [
    {
      title: 'Count the parts in every group',
      learn: [
        { text: 'Make the groups. Each group is the same fraction.', scene: scenes('multiply-whole-by-fraction').steps[0]! },
        { text: 'Count the parts in all the groups. The part size stays the same.', scene: scenes('multiply-whole-by-fraction').steps[1]! },
      ],
      practice: [{ question: 'multiply-whole-by-fraction-p1' }, { question: 'multiply-whole-by-fraction-p2' }, { question: 'multiply-whole-by-fraction-p3' }],
    },
    {
      title: 'Multiply the groups by the numerator',
      terms: [
        { term: 'multiplying the numerator', pattern: /\bmultiply\b/i },
        // Idea 1 counts the parts (2 + 2 + 2); a whole number times a whole number first comes here.
        { term: 'a number times a number', pattern: /\b\d+ × \d+\b(?!\/)/ },
      ],
      learn: [example('multiply-whole-by-fraction', 'Multiply, keep the denominator')],
      practice: [{ question: 'multiply-whole-by-fraction-q1' }, { question: 'multiply-whole-by-fraction-q2' }, { question: 'multiply-whole-by-fraction-q3' }],
    },
    {
      title: 'It is the same as copies of one part',
      terms: [{ term: 'copies of the unit fraction, or jumps', pattern: /\bjumps?\b|= \d+ × 1\/\d+/i }],
      learn: [
        { text: '6/5 is six fifths: 6 copies of 1/5.', scene: scenes('multiply-whole-by-fraction').steps[2]! },
        { text: 'On a number line, each group is one jump.', scene: scenes('multiply-whole-by-fraction').why },
      ],
      practice: [{ question: 'multiply-whole-by-fraction-p4' }, { question: 'multiply-whole-by-fraction-p5' }, { question: 'multiply-whole-by-fraction-q4' }],
    },
  ],
  // Lesson 39: a number that divides both, then divide both, then again until simplest form.
  'simplify-fractions': [
    {
      title: 'Find a number that divides the top and the bottom',
      learn: [
        example('simplify-fractions', 'Count by 2s'),
        { text: 'Find a number that divides both top and bottom.', scene: scenes('simplify-fractions').steps[0]! },
      ],
      practice: [{ question: 'simplify-fractions-p1' }, { question: 'simplify-fractions-p2' }, { question: 'simplify-fractions-p3' }],
    },
    {
      title: 'Divide both by it: fewer, bigger parts',
      terms: [{ term: 'dividing top and bottom', pattern: /÷|\bdivide (the|both by)\b/i }],
      learn: [
        { text: 'Divide both by it. The parts join into bigger parts.', scene: scenes('simplify-fractions').steps[1]! },
        { text: 'Fewer, bigger parts: the amount stays the same.', scene: scenes('simplify-fractions').why },
      ],
      practice: [{ question: 'simplify-fractions-p4' }, { question: 'simplify-fractions-p5' }, { question: 'simplify-fractions-p6' }],
    },
    {
      title: 'Keep going until only 1 divides both',
      terms: [{ term: 'simplest form', pattern: /\bsimplest form\b/i }],
      learn: [
        { text: 'When only 1 divides both, the fraction is in simplest form.', scene: scenes('simplify-fractions').steps[2]! },
        example('simplify-fractions', 'Divide again'),
      ],
      // The story problem retells question 4 (2/12), so it is practised here first.
      practice: [{ question: 'simplify-fractions-q4' }, { question: 'simplify-fractions-q2' }, { question: 'simplify-fractions-q1' }],
    },
  ],
  // Lesson 40: what the denominator was multiplied by, then the same to the numerator, then dividing.
  'equivalent-missing-both': [
    {
      title: 'Find what the denominator was multiplied by',
      learn: [{ text: 'Find what the denominator was multiplied by.', scene: scenes('equivalent-missing-both').steps[0]! }],
      practice: [{ question: 'equivalent-missing-both-p1' }, { question: 'equivalent-missing-both-p2' }, { question: 'equivalent-missing-both-p3' }],
    },
    {
      title: 'Do the same to the numerator',
      terms: [{ term: 'the numerator', pattern: /\bnumerator\b/i }],
      learn: [
        { text: 'Multiply the numerator by the same number.', scene: scenes('equivalent-missing-both').steps[1]! },
        { text: 'Check that the amount is the same.', scene: scenes('equivalent-missing-both').steps[2]! },
      ],
      // The story problem retells question 4 (1/2 = ?/6), so it is practised here first.
      practice: [{ question: 'equivalent-missing-both-q2' }, { question: 'equivalent-missing-both-q4' }, { question: 'equivalent-missing-both-q1' }],
    },
    {
      title: 'Dividing works the same way',
      terms: [{ term: 'dividing', pattern: /\bdivid/i }],
      learn: [{ text: 'For a smaller denominator, divide top and bottom by the same number.', scene: scenes('equivalent-missing-both').why }],
      practice: [{ question: 'equivalent-missing-both-p4' }, { question: 'equivalent-missing-both-p5' }, { question: 'equivalent-missing-both-p6' }],
    },
  ],
};
