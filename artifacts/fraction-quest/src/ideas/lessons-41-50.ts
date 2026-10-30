/* The ideas of lessons 41–50 (see lesson-ideas.ts): each lesson's ideas in order, each with its Learn pages and 3
   practices. Lesson 1 (ideas/lessons-01.ts) is the model. */
import { example, newWord, scenes, wordsToKnow, type LessonIdea } from './helpers';

export const IDEAS: Record<string, LessonIdea[]> = {
  'compare-unlike-fractions': [
    {
      title: 'Rename one fraction so the parts match',
      learn: [
        example('compare-unlike-fractions', 'Rename one fraction to match'),
        { text: 'Once the parts are the same size, count them.', scene: scenes('compare-unlike-fractions').why },
      ],
      practice: [{ question: 'compare-unlike-fractions-q3' }, { question: 'compare-unlike-fractions-p1' }, { question: 'compare-unlike-fractions-p2' }],
    },
    {
      title: 'No fit? Find a common denominator',
      terms: [{ term: 'common denominator', pattern: /\bcommon denominators?\b/i }],
      learn: [
        { text: 'Thirds don’t fit into fourths. Find a common denominator both can share.', scene: scenes('compare-unlike-fractions').steps[0]! },
        { text: 'Rename both fractions as twelfths.', scene: scenes('compare-unlike-fractions').steps[1]! },
        { text: 'Now compare the numerators.', scene: scenes('compare-unlike-fractions').steps[2]! },
      ],
      practice: [{ question: 'compare-unlike-fractions-p3' }, { question: 'compare-unlike-fractions-p4' }, { question: 'compare-unlike-fractions-p5' }],
    },
    {
      title: 'Same numerators: the bigger parts win',
      terms: [{ term: 'same numerators', pattern: /\bsame numerators?\b/i }],
      learn: [example('compare-unlike-fractions', 'Compare the part sizes')],
      practice: [{ question: 'compare-unlike-fractions-q2' }, { question: 'compare-unlike-fractions-p6' }, { question: 'compare-unlike-fractions-q4' }],
    },
  ],
  'order-unlike-fractions': [
    {
      title: 'Same denominators: order the numerators',
      learn: [example('order-unlike-fractions', 'Same parts: order the numerators'), example('order-unlike-fractions', 'Biggest first goes the other way')],
      practice: [{ sortRound: 'biggest-first' }, { question: 'order-unlike-fractions-p1' }, { question: 'order-unlike-fractions-p2' }],
    },
    {
      title: 'Compare each fraction to 1/2',
      terms: [{ term: 'half as a benchmark', pattern: /\bhalf\b|\bbenchmarks?\b/i }],
      learn: [
        { text: 'Compare each fraction to 1/2: is it less than half, or more?', scene: scenes('order-unlike-fractions').steps[0]! },
        { text: 'Less than half comes first, then 1/2, then more than half.', scene: scenes('order-unlike-fractions').steps[2]! },
        { text: 'The number line shows the same order.', scene: scenes('order-unlike-fractions').why },
      ],
      practice: [{ sortRound: 'smallest-first' }, { question: 'order-unlike-fractions-p3' }, { question: 'order-unlike-fractions-p4' }],
    },
    {
      title: 'Same side of 1/2? Rename, then compare',
      terms: [{ term: 'renaming', pattern: /\brenam/i }],
      learn: [
        { text: 'Two fractions on the same side of 1/2? Rename them with the same denominator.', scene: scenes('order-unlike-fractions').steps[1]! },
        example('order-unlike-fractions', 'Rename, then order'),
      ],
      practice: [{ question: 'order-unlike-fractions-q4' }, { question: 'order-unlike-fractions-p5' }, { question: 'order-unlike-fractions-q1' }],
    },
  ],
  'plot-in-eighths': [
    {
      title: 'Put one X above each length',
      learn: [
        example('plot-in-eighths', 'One X for each length'),
        { text: 'Each length gets one X above its spot on the line.', scene: scenes('plot-in-eighths').steps[1]! },
      ],
      practice: [{ question: 'plot-in-eighths-p1' }, { question: 'plot-in-eighths-p2' }, { question: 'plot-in-eighths-p3' }],
    },
    {
      title: 'Stack the Xs for matching lengths',
      terms: [{ term: 'stacking Xs', pattern: /\bstack/i }],
      learn: [
        { text: 'Some lengths match: two pebbles are 5/8 inch.', scene: scenes('plot-in-eighths').steps[0]! },
        { text: 'Stack the Xs for matching lengths.', scene: scenes('plot-in-eighths').steps[2]! },
        { text: 'One X for each pebble, stacks and all.', scene: scenes('plot-in-eighths').why },
      ],
      practice: [{ question: 'plot-in-eighths-p4' }, { question: 'plot-in-eighths-q4' }, { question: 'plot-in-eighths-q1' }],
    },
    {
      title: 'Read the plot to answer',
      terms: [{ term: 'longer, shorter, together', pattern: /\b(longer|shorter) than\b|\btogether\b/i }],
      learn: [
        example('plot-in-eighths', 'Longer than, shorter than'),
        example('plot-in-eighths', 'The two shortest together'),
      ],
      practice: [{ question: 'plot-in-eighths-q2' }, { question: 'plot-in-eighths-p5' }, { question: 'plot-in-eighths-q3' }],
    },
  ],
  'read-line-plots': [
    {
      title: 'Each X is one thing: count the Xs',
      learn: [
        { text: 'Read a line plot one X at a time.', scene: scenes('read-line-plots').why },
        { text: 'Read the label under each stack.', scene: scenes('read-line-plots').steps[0]! },
        { text: 'Count the Xs in a stack.', scene: scenes('read-line-plots').steps[1]! },
      ],
      practice: [{ question: 'read-line-plots-q1' }, { question: 'read-line-plots-p1' }, { question: 'read-line-plots-q4' }],
    },
    {
      title: 'Add the lengths in one stack',
      terms: [{ term: 'adding a stack', pattern: /\btogether\b|\+/ }],
      learn: [example('read-line-plots', 'Add one stack')],
      practice: [{ question: 'read-line-plots-q2' }, { question: 'read-line-plots-p2' }, { question: 'read-line-plots-p3' }],
    },
    {
      title: 'Longest minus shortest',
      terms: [{ term: 'difference', pattern: /−|\bdifference\b|\blongest\b/i }],
      learn: [{ text: 'Find the longest and the shortest. Take the shortest away from the longest.', scene: scenes('read-line-plots').steps[2]! }],
      practice: [{ question: 'read-line-plots-q3' }, { question: 'read-line-plots-p4' }, { question: 'read-line-plots-p5' }],
    },
  ],
  'measurement-word-problems': [
    {
      title: 'Split the unit into equal parts',
      learn: [
        { text: 'Find the amount and its unit.', scene: scenes('measurement-word-problems').steps[0]! },
        { text: 'For 1/4 hour, split the 60 minutes into 4 equal parts.', scene: scenes('measurement-word-problems').steps[1]! },
        { text: 'Keep the unit in your answer.', scene: scenes('measurement-word-problems').steps[2]! },
        example('measurement-word-problems', '1 day is 24 hours'),
      ],
      practice: [{ question: 'measurement-word-problems-q1' }, { question: 'measurement-word-problems-p1' }, { question: 'measurement-word-problems-p2' }],
    },
    {
      title: 'Other units split the same way',
      terms: [{ term: 'cents, grams and milliliters', pattern: /\b(cents?|grams?|kilograms?|liters?|milliliters?)\b/i }],
      learn: [wordsToKnow('measurement-word-problems'), example('measurement-word-problems', 'Other units split the same way')],
      practice: [{ question: 'measurement-word-problems-q2' }, { question: 'measurement-word-problems-q3' }, { question: 'measurement-word-problems-p3' }],
    },
    {
      title: 'Use the same unit before you add',
      terms: [{ term: 'adding', pattern: /\+|\badd/i }],
      learn: [{ text: 'Two amounts in different units? Make the units match.', scene: scenes('measurement-word-problems').why }],
      practice: [{ question: 'measurement-word-problems-p4' }, { question: 'measurement-word-problems-p5' }, { question: 'measurement-word-problems-p6' }],
    },
  ],
  'fraction-recipes': [
    {
      title: 'Add the amount once for each batch',
      learn: [
        { text: 'A batch is one time you make the recipe. 1 batch uses 2/3 cup.', scene: scenes('fraction-recipes').steps[0]! },
        { text: 'Each batch uses the same 2/3 cup. Make 3 batches.', scene: scenes('fraction-recipes').why },
      ],
      practice: [{ question: 'fraction-recipes-p1' }, { question: 'fraction-recipes-p2' }, { question: 'fraction-recipes-p3' }],
    },
    {
      title: 'Multiply the numerator, keep the denominator',
      terms: [{ term: 'multiplying', pattern: /×|\bmultipl/i }],
      learn: [
        { text: 'A quicker way: multiply the numerator by the number of batches.', scene: scenes('fraction-recipes').steps[1]! },
        { text: 'Keep the denominator: the parts are still thirds.', scene: scenes('fraction-recipes').steps[2]! },
      ],
      practice: [{ question: 'fraction-recipes-q1' }, { question: 'fraction-recipes-q2' }, { question: 'fraction-recipes-q3' }],
    },
  ],
  'party-portions': [
    {
      title: 'Count the parts in every portion',
      learn: [
        wordsToKnow('party-portions'),
        { text: 'Every guest gets the same amount: 3/8 pound.', scene: scenes('party-portions').why },
        { text: '5 guests each eat 3/8 pound. Count all the eighths.', scene: scenes('party-portions').steps[0]! },
        { text: 'Keep the part size: they are still eighths.', scene: scenes('party-portions').steps[1]! },
      ],
      practice: [{ question: 'party-portions-q2' }, { question: 'party-portions-p1' }, { question: 'party-portions-q4' }],
    },
    {
      title: 'Find the two whole numbers the total is between',
      terms: [{ term: 'between two whole numbers', pattern: /\bbetween\b/i }],
      learn: [
        { text: 'Find the two whole numbers the total is between.', scene: scenes('party-portions').steps[2]! },
        example('party-portions', 'Between which whole numbers?'),
      ],
      practice: [{ question: 'party-portions-q1' }, { question: 'party-portions-q3' }, { question: 'party-portions-p2' }],
    },
  ],
  'add-related-fractions': [
    {
      title: 'Rename the bigger parts into the smaller parts',
      learn: [
        { text: 'A half and a fourth are different sizes. Make the parts match first.', scene: scenes('add-related-fractions').why },
        { text: 'Halves fit into fourths: cut each half in two.', scene: scenes('add-related-fractions').steps[0]! },
      ],
      practice: [{ question: 'add-related-fractions-p1' }, { question: 'add-related-fractions-p2' }, { question: 'add-related-fractions-p3' }],
    },
    {
      title: 'Then add the numerators',
      terms: [{ term: 'adding', pattern: /\+|\badd/i }],
      learn: [
        { text: 'Now the parts match. Add the numerators.', scene: scenes('add-related-fractions').steps[1]! },
        { text: 'Keep the denominator.', scene: scenes('add-related-fractions').steps[2]! },
      ],
      practice: [{ question: 'add-related-fractions-q1' }, { question: 'add-related-fractions-q2' }, { question: 'add-related-fractions-q3' }],
    },
  ],
  'add-unlike-fractions': [
    {
      title: 'Rename both fractions, then add',
      learn: [
        { text: 'Renaming cuts the parts smaller. The amount stays the same.', scene: scenes('add-unlike-fractions').why },
        { text: 'Rename both fractions as twelfths.', scene: scenes('add-unlike-fractions').steps[1]! },
        { text: 'Add the numerators and keep the denominator.', scene: scenes('add-unlike-fractions').steps[2]! },
      ],
      practice: [{ question: 'add-unlike-fractions-p1' }, { question: 'add-unlike-fractions-p3' }, { question: 'add-unlike-fractions-p4' }],
    },
    {
      title: 'Find a common denominator with multiples',
      terms: [{ term: 'multiples and common denominators', pattern: /\bmultiples?\b|\bcommon denominators?\b/i }],
      learn: [
        { text: 'Find a common denominator both fractions can share.', scene: scenes('add-unlike-fractions').steps[0]! },
        wordsToKnow('add-unlike-fractions', ['multiples']),
        newWord(15),
        example('add-unlike-fractions', 'List multiples to find a common denominator'),
      ],
      practice: [{ question: 'add-unlike-fractions-p2' }, { question: 'add-unlike-fractions-q4' }, { question: 'add-unlike-fractions-q3' }],
    },
  ],
  'subtract-unlike-fractions': [
    {
      title: 'Make the parts match first',
      learn: [
        { text: 'You can only take away parts of the same size.', scene: scenes('subtract-unlike-fractions').why },
        { text: 'Halves fit into fourths.', scene: scenes('subtract-unlike-fractions').steps[0]! },
        { text: 'Rename the fraction with the bigger parts.', scene: scenes('subtract-unlike-fractions').steps[1]! },
      ],
      practice: [{ question: 'subtract-unlike-fractions-p1' }, { question: 'subtract-unlike-fractions-p2' }, { question: 'subtract-unlike-fractions-p3' }],
    },
    {
      title: 'Then take away the numerators',
      terms: [{ term: 'taking away the numerators', pattern: /(^|[^/\d])\d+ − \d+(?![\d/])|\btake away the numerators\b/i }],
      learn: [{ text: 'Take away the numerators and keep the denominator.', scene: scenes('subtract-unlike-fractions').steps[2]! }],
      practice: [{ question: 'subtract-unlike-fractions-q1' }, { question: 'subtract-unlike-fractions-q2' }, { question: 'subtract-unlike-fractions-q3' }],
    },
  ],
};
