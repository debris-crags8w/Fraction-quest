/* The ideas of lessons 11–20 (see lesson-ideas.ts): each lesson's ideas in order, each with its Learn pages and 3
   practices. Lesson 1 (ideas/lessons-01.ts) is the model. */
import { example, scenes, wordsToKnow, type LessonIdea } from './helpers';

export const IDEAS: Record<string, LessonIdea[]> = {
  'number-line-points': [
    {
      title: 'Count the spaces from 0 to 1 for the denominator',
      learn: [{ text: 'Count the equal spaces from 0 to 1. That is the denominator.', scene: scenes('number-line-points').steps[0]! }],
      practice: [{ question: 'number-line-points-p1' }, { question: 'number-line-points-p2' }, { question: 'number-line-points-p3' }],
    },
    {
      title: 'Count the jumps to the point for the numerator',
      terms: [{ term: 'the point to name', pattern: /\b(point|dot)s?\b/i }],
      learn: [{ text: 'Count the jumps from 0 to the point. That is the numerator.', scene: scenes('number-line-points').steps[1]! }],
      practice: [{ question: 'number-line-points-p4' }, { question: 'number-line-points-p5' }, { question: 'number-line-points-p6' }],
    },
    {
      title: 'Write the jumps over the spaces',
      terms: [{ term: 'jumps over spaces', pattern: /\bover\b/i }],
      learn: [
        { text: 'Write the jumps over the spaces.', scene: scenes('number-line-points').steps[2]! },
        { text: 'Each space is one equal part of the whole, like a part of a bar. Each jump from 0 adds one more part.', scene: scenes('number-line-points').why },
      ],
      practice: [{ question: 'number-line-points-q1' }, { question: 'number-line-points-q3' }, { question: 'number-line-points-q4' }],
    },
  ],

  'number-line-beyond-one': [
    {
      title: 'Keep jumping past 1 with the same jumps',
      learn: [
        { text: 'Find the size of one jump.', scene: scenes('number-line-beyond-one').steps[0]! },
        { text: 'Keep jumping past 1 with the same size.', scene: scenes('number-line-beyond-one').steps[1]! },
        { text: 'Count every jump from 0.', scene: scenes('number-line-beyond-one').steps[2]! },
      ],
      practice: [{ question: 'number-line-beyond-one-q1' }, { question: 'number-line-beyond-one-q2' }, { question: 'number-line-beyond-one-p1' }],
    },
    {
      title: 'Say it as 1 whole and the part left over',
      terms: [{ term: 'a mixed number with "and"', pattern: /\b\d+ and \d+\/\d+/ }],
      learn: [wordsToKnow('number-line-beyond-one'), example('number-line-beyond-one', '4 fourths make one whole')],
      practice: [{ question: 'number-line-beyond-one-q3' }, { question: 'number-line-beyond-one-p2' }, { question: 'number-line-beyond-one-q4' }],
    },
  ],

  'ruler-measurement': [
    {
      title: 'A ruler is a number line: start at 0 and count the spaces',
      learn: [
        wordsToKnow('ruler-measurement', ['quarter']),
        { text: 'Each small space on a ruler is an equal part of an inch.', scene: scenes('ruler-measurement').why },
        example('ruler-measurement', 'Measure a crayon'),
      ],
      practice: [{ question: 'ruler-measurement-q3' }, { question: 'ruler-measurement-p1' }, { question: 'ruler-measurement-q2' }],
    },
    {
      title: 'Past 1 inch, say the whole inches and the extra part',
      terms: [{ term: 'a mixed number like 1 1/4', pattern: /\b\d+ \d+\/\d+/ }],
      learn: [
        wordsToKnow('ruler-measurement', ['1 1/4']),
        { text: 'Count the spaces past 1 inch too.', scene: scenes('ruler-measurement').steps[1]! },
        { text: 'Say the whole inches and the extra part.', scene: scenes('ruler-measurement').steps[2]! },
      ],
      practice: [{ question: 'ruler-measurement-q1' }, { question: 'ruler-measurement-q4' }, { question: 'ruler-measurement-p2' }],
    },
  ],

  'build-line-plots': [
    {
      title: 'Find each length on the line',
      learn: [
        { text: 'Find each measurement on the line.', scene: scenes('build-line-plots').steps[0]! },
        example('build-line-plots', '4/4 inch is 1 inch'),
      ],
      practice: [{ question: 'build-line-plots-p1' }, { question: 'build-line-plots-p2' }, { question: 'build-line-plots-p3' }],
    },
    {
      title: 'Put one X above each measurement',
      terms: [{ term: 'an X for each measurement', pattern: /\bXs?\b/ }],
      learn: [{ text: 'Put one X above each measurement.', scene: scenes('build-line-plots').steps[1]! }],
      practice: [{ question: 'build-line-plots-p4' }, { question: 'build-line-plots-p5' }, { question: 'build-line-plots-p6' }],
    },
    {
      title: 'Stack the Xs when lengths match',
      terms: [{ term: 'stacks of Xs', pattern: /\b(stack|stacks|stacked|tallest)\b/i }],
      learn: [
        { text: 'Stack the Xs when measurements match.', scene: scenes('build-line-plots').steps[2]! },
        { text: 'Every X stands for one measurement.', scene: scenes('build-line-plots').why },
      ],
      practice: [{ question: 'build-line-plots-q1' }, { question: 'build-line-plots-q3' }, { question: 'build-line-plots-q4' }],
    },
  ],

  'compare-same-denominator': [
    {
      title: 'The same denominator means same-size parts',
      learn: [
        { text: 'Check that the denominators match.', scene: scenes('compare-same-denominator').steps[0]! },
        { text: 'Both are sixths: every part is the same size.', scene: scenes('compare-same-denominator').why },
      ],
      practice: [{ question: 'compare-same-denominator-p1' }, { question: 'compare-same-denominator-p2' }, { question: 'compare-same-denominator-p3' }],
    },
    {
      title: 'More same-size parts is the bigger fraction',
      terms: [{ term: 'comparing two fractions', pattern: /\bwhich is (bigger|smaller)\b/i }],
      learn: [
        { text: 'Compare the numerators: count the parts.', scene: scenes('compare-same-denominator').steps[1]! },
        example('compare-same-denominator', 'Which is bigger?'),
      ],
      practice: [{ question: 'compare-same-denominator-q1' }, { question: 'compare-same-denominator-q2' }, { question: 'compare-same-denominator-q4' }],
    },
    {
      title: 'Write it with a sign',
      terms: [{ term: 'a < or > sign', pattern: /\s[<>]\s/ }],
      learn: [
        { text: 'More parts is the bigger fraction. Write it with a sign.', scene: scenes('compare-same-denominator').steps[2]! },
        example('compare-same-denominator', 'Read the sign'),
      ],
      practice: [{ question: 'compare-same-denominator-q3' }, { question: 'compare-same-denominator-p4' }, { question: 'compare-same-denominator-p5' }],
    },
  ],

  'order-fractions': [
    {
      title: 'Compare two fractions at a time',
      learn: [
        { text: 'Compare two at a time. Same denominators: count the parts.', scene: scenes('order-fractions').steps[0]! },
        example('order-fractions', 'Same numerators: bigger parts win'),
        example('order-fractions', 'Compare with half'),
      ],
      practice: [{ question: 'order-fractions-p1' }, { question: 'order-fractions-p2' }, { question: 'order-fractions-p3' }],
    },
    {
      title: 'Put the smallest first, then keep going',
      terms: [
        { term: 'putting in order', pattern: /\border\b|\bfirst\b/i },
        { term: 'a chain of < signs', pattern: /\d+\/\d+ < \d+\/\d+ < \d+\/\d+/ },
      ],
      learn: [
        { text: 'Find the smallest and put it first.', scene: scenes('order-fractions').steps[1]! },
        { text: 'Keep going until all are in order.', scene: scenes('order-fractions').steps[2]! },
        example('order-fractions', 'Read a chain of signs'),
      ],
      practice: [{ question: 'order-fractions-q1' }, { question: 'order-fractions-q3' }, { question: 'order-fractions-q4' }],
    },
    {
      title: 'Biggest first: flip the order',
      terms: [
        { term: 'biggest first', pattern: /\bbiggest (first|to smallest)\b/i },
        { term: 'a chain of > signs', pattern: /\d+\/\d+ > \d+\/\d+ > \d+\/\d+/ },
      ],
      learn: [example('order-fractions', 'Biggest first')],
      practice: [{ question: 'order-fractions-q2' }, { question: 'order-fractions-p4' }, { question: 'order-fractions-p5' }],
    },
  ],

  'equivalent-models': [
    {
      title: 'Split every part the same way',
      learn: [
        { text: 'Start with one fraction on a bar: 2/3.', scene: scenes('equivalent-models').steps[0]! },
        { text: 'Split every part into the same number of smaller parts.', scene: scenes('equivalent-models').steps[1]! },
        example('equivalent-models', 'Fold it again'),
      ],
      practice: [{ question: 'equivalent-models-p1' }, { question: 'equivalent-models-p2' }, { question: 'equivalent-models-q4' }],
    },
    {
      title: 'Count the new parts: same amount, new name',
      terms: [{ term: 'the same amount', pattern: /\bsame (amount|as)\b|\s=\s/i }],
      learn: [
        { text: 'Count the new parts. The shaded amount has not changed.', scene: scenes('equivalent-models').steps[2]! },
        { text: 'Splitting every part changes the name, not the amount.', scene: scenes('equivalent-models').why },
      ],
      practice: [{ question: 'equivalent-models-q1' }, { question: 'equivalent-models-q2' }, { question: 'equivalent-models-q3' }],
    },
    {
      title: 'Join small parts into bigger parts',
      terms: [{ term: 'joining parts', pattern: /\bjoin(s|ed|ing)?\b/i }],
      learn: [example('equivalent-models', 'Join parts together'), example('equivalent-models', 'Triangles make a fourth')],
      practice: [{ question: 'equivalent-models-p3' }, { handsOn: 'match' }, { question: 'equivalent-models-p4' }],
    },
    {
      title: 'A ? box stands for a missing number',
      terms: [{ term: 'the ? box', pattern: /\?\/\d|\d\/\?/ }],
      learn: [wordsToKnow('equivalent-models'), example('equivalent-models', 'More than one whole bar')],
      practice: [{ question: 'equivalent-models-p5' }, { question: 'equivalent-models-p6' }, { question: 'equivalent-models-p7' }],
    },
  ],

  'equivalent-number-line': [
    {
      title: 'Split every space the same way',
      learn: [
        { text: 'Mark the first fraction: 2/4.', scene: scenes('equivalent-number-line').steps[0]! },
        { text: 'Split every space into the same number of smaller spaces.', scene: scenes('equivalent-number-line').steps[1]! },
      ],
      practice: [{ question: 'equivalent-number-line-p1' }, { question: 'equivalent-number-line-p2' }, { question: 'equivalent-number-line-p3' }],
    },
    {
      title: 'Count the jumps again: same spot, new name',
      terms: [{ term: 'the same spot', pattern: /\bsame (spot|point)\b|\bdid not move\b/i }],
      learn: [
        { text: 'Count the jumps to the same point again.', scene: scenes('equivalent-number-line').steps[2]! },
        { text: 'Only the number of spaces and jumps changed.', scene: scenes('equivalent-number-line').why },
        example('equivalent-number-line', 'Halves to sixths'),
      ],
      practice: [{ question: 'equivalent-number-line-q1' }, { question: 'equivalent-number-line-q2' }, { question: 'equivalent-number-line-p4' }],
    },
  ],

  'build-equivalents': [
    {
      title: 'Multiply the top and bottom by the same number',
      learn: [
        { text: 'Multiply the numerator and the denominator by the same number.', scene: scenes('build-equivalents').steps[0]! },
        { text: 'The amount stays the same.', scene: scenes('build-equivalents').why },
      ],
      practice: [{ question: 'build-equivalents-q1' }, { question: 'build-equivalents-q2' }, { question: 'build-equivalents-p1' }],
    },
    {
      title: 'Or divide both by the same number',
      terms: [{ term: 'dividing both', pattern: /÷|\bdivid(e|es|ed|ing)\b/i }],
      learn: [
        { text: 'Or divide both by the same number. That joins parts into bigger parts.', scene: scenes('build-equivalents').steps[1]! },
        example('build-equivalents', 'Divide both numbers'),
      ],
      practice: [{ question: 'build-equivalents-q3' }, { question: 'build-equivalents-p2' }, { question: 'build-equivalents-q4' }],
    },
    {
      title: 'Find the number to multiply by',
      terms: [{ term: 'a new denominator to reach', pattern: /\btimes what\b|\bwith a denominator of\b/i }],
      learn: [
        example('build-equivalents', 'Find the number to multiply by'),
        { text: 'Check that both fractions show the same amount.', scene: scenes('build-equivalents').steps[2]! },
      ],
      practice: [{ question: 'build-equivalents-p3' }, { question: 'build-equivalents-p4' }, { question: 'build-equivalents-p5' }],
    },
  ],

  'missing-equivalent': [
    {
      title: 'Find the factor, then do the same to the top',
      learn: [
        wordsToKnow('missing-equivalent'),
        { text: 'Find what the bottom number was multiplied by.', scene: scenes('missing-equivalent').steps[0]! },
        { text: 'Do the same to the top number.', scene: scenes('missing-equivalent').steps[1]! },
      ],
      practice: [{ question: 'missing-equivalent-q1' }, { question: 'missing-equivalent-p1' }, { question: 'missing-equivalent-p2' }],
    },
    {
      title: 'A missing bottom number works the same way',
      terms: [{ term: 'a blank on the bottom', pattern: /\d\/\?/ }],
      learn: [
        example('missing-equivalent', 'A missing bottom number'),
        { text: 'Check that both fractions show the same amount.', scene: scenes('missing-equivalent').steps[2]! },
      ],
      practice: [{ question: 'missing-equivalent-q2' }, { question: 'missing-equivalent-p3' }, { question: 'missing-equivalent-p4' }],
    },
    {
      title: 'Start with the pair that has both numbers',
      terms: [{ term: 'a blank on the left', pattern: /\?\/\d+ = \d/ }],
      learn: [example('missing-equivalent', 'The blank on the left')],
      practice: [{ question: 'missing-equivalent-q3' }, { question: 'missing-equivalent-p5' }, { question: 'missing-equivalent-q4' }],
    },
  ],
};
