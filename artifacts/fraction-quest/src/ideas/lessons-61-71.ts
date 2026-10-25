/* The ideas of lessons 61–71 (see lesson-ideas.ts): each lesson's ideas in order, each with its Learn pages and 3
   practices. Lesson 1 (ideas/lessons-01.ts) is the model. */
import { example, scenes, type LessonIdea } from './helpers';

/** A fraction with a top number of 2 or more: counting more than one part. */
const moreThanOnePart = /\b([2-9]|1\d)\/\d+\b/;

export const IDEAS: Record<string, LessonIdea[]> = {
  'fraction-of-length': [
    {
      title: 'Cut the length into equal parts to find one part',
      learn: [
        { text: 'The bottom number says how many equal parts to cut the length into.', scene: scenes('fraction-of-length').steps[0]! },
        { text: '1/4 of the length is one part. 12 ÷ 4 means 12 split into 4 equal parts.', scene: scenes('fraction-of-length').steps[1]! },
      ],
      practice: [{ question: 'fraction-of-length-q1' }, { question: 'fraction-of-length-p1' }, { question: 'fraction-of-length-p2' }],
    },
    {
      title: 'Count the parts the top number says',
      terms: [{ term: 'counting more than one part', pattern: moreThanOnePart }],
      learn: [
        { text: 'For 3/4 of 12 meters, count 3 of the parts.', scene: scenes('fraction-of-length').steps[2]! },
        { text: 'Each equal part is a piece of the whole length.', scene: scenes('fraction-of-length').why },
      ],
      practice: [{ question: 'fraction-of-length-q2' }, { question: 'fraction-of-length-q3' }, { question: 'fraction-of-length-p3' }],
    },
  ],
  'fractional-measure-addition': [
    {
      title: 'Rename a length in same-size parts',
      learn: [
        { text: 'Make the parts the same size: 1/2 meter is the same length as 2/4 meter.', scene: scenes('fractional-measure-addition').steps[0]! },
      ],
      practice: [{ question: 'fractional-measure-addition-p1' }, { question: 'fractional-measure-addition-p2' }, { question: 'fractional-measure-addition-p3' }],
    },
    {
      title: 'Add the same-size parts and keep the unit',
      terms: [{ term: 'adding lengths', pattern: /\+|\btogether\b/i }],
      learn: [
        { text: 'Now the parts match. Add the top numbers: 2/4 + 1/4.', scene: scenes('fractional-measure-addition').steps[1]! },
        { text: 'Keep the unit in your answer.', scene: scenes('fractional-measure-addition').steps[2]! },
        { text: 'Same unit and same-size parts: just count them.', scene: scenes('fractional-measure-addition').why },
      ],
      practice: [{ question: 'fractional-measure-addition-q1' }, { question: 'fractional-measure-addition-q2' }, { question: 'fractional-measure-addition-q3' }],
    },
  ],
  'line-plot-leveling': [
    {
      title: 'Add every amount on the line plot',
      learn: [
        { text: 'Each X is one cup. Add the amount for every X to find the total.', scene: scenes('line-plot-leveling').steps[0]! },
      ],
      practice: [{ question: 'line-plot-leveling-p1' }, { question: 'line-plot-leveling-p2' }, { question: 'line-plot-leveling-p3' }],
    },
    {
      title: 'Share a total equally',
      terms: [{ term: 'sharing a total', pattern: /÷|\bshar(e|ed|es|ing)\b/i }],
      learn: [
        { text: 'To share the total, give every cup the same number of parts. ÷ means split into equal groups.', scene: scenes('line-plot-leveling').steps[1]! },
      ],
      practice: [{ question: 'line-plot-leveling-p4' }, { question: 'line-plot-leveling-p5' }, { question: 'line-plot-leveling-p6' }],
    },
    {
      title: 'Level the cups: add, then share',
      terms: [{ term: 'leveling', pattern: /\blevel/i }],
      learn: [
        { text: 'To level the cups, add every amount, then share the total equally.', scene: scenes('line-plot-leveling').steps[2]! },
        { text: 'Leveling keeps the total the same. Now every cup holds the same amount.', scene: scenes('line-plot-leveling').why },
      ],
      practice: [{ question: 'line-plot-leveling-q1' }, { question: 'line-plot-leveling-q2' }, { question: 'line-plot-leveling-q3' }],
    },
  ],
  'line-plot-totals': [
    {
      title: 'Add the amount for every X',
      learn: [
        { text: 'Read the amount under each stack.', scene: scenes('line-plot-totals').steps[0]! },
        { text: 'Each X is one amount, so add it once for every X.', scene: scenes('line-plot-totals').steps[1]! },
        { text: 'The parts are all fourths, so add the top numbers.', scene: scenes('line-plot-totals').steps[2]! },
      ],
      practice: [{ question: 'line-plot-totals-q1' }, { question: 'line-plot-totals-q2' }, { question: 'line-plot-totals-p1' }],
    },
    {
      title: 'Find how much more one stack holds',
      terms: [{ term: 'comparing two stacks', pattern: /how much more|\bmore than\b|−/i }],
      learn: [example('line-plot-totals', 'How much more?')],
      practice: [{ question: 'line-plot-totals-q3' }, { question: 'line-plot-totals-p2' }, { question: 'line-plot-totals-p3' }],
    },
    {
      title: 'Rename halves as fourths, then add',
      terms: [{ term: 'halves on a plot in fourths', pattern: /\b1\/2\b|\bhalf\b|\bhalves\b/i }],
      learn: [example('line-plot-totals', 'Rename the halves first')],
      practice: [{ question: 'line-plot-totals-p4' }, { question: 'line-plot-totals-p5' }, { question: 'line-plot-totals-p6' }],
    },
  ],
  'fractional-unit-conversions': [
    {
      title: 'Know how many small units make one big unit',
      learn: [
        { text: 'First find how many small units are in one big unit.', scene: scenes('fractional-unit-conversions').steps[0]! },
        example('fractional-unit-conversions', 'Unit facts'),
      ],
      practice: [{ question: 'fractional-unit-conversions-p1' }, { question: 'fractional-unit-conversions-p2' }, { question: 'fractional-unit-conversions-p3' }],
    },
    {
      title: 'Divide by the bottom number to find one part',
      terms: [{ term: 'dividing by the denominator', pattern: /÷/ }],
      learn: [
        { text: '1/4 of an hour is one of 4 equal parts. 60 ÷ 4 splits 60 minutes into 4 equal parts.', scene: scenes('fractional-unit-conversions').steps[1]! },
      ],
      practice: [{ question: 'fractional-unit-conversions-q1' }, { question: 'fractional-unit-conversions-q2' }, { question: 'fractional-unit-conversions-q3' }],
    },
    {
      title: 'Multiply by the top number for more parts',
      terms: [{ term: 'more than one part', pattern: moreThanOnePart }],
      learn: [
        { text: '3/4 of an hour is 3 of those parts: 3 × 15 minutes.', scene: scenes('fractional-unit-conversions').steps[2]! },
        { text: 'It is a fraction of a number: the 60 minutes in one hour.', scene: scenes('fractional-unit-conversions').why },
      ],
      practice: [{ question: 'fractional-unit-conversions-p4' }, { question: 'fractional-unit-conversions-p5' }, { question: 'fractional-unit-conversions-p6' }],
    },
  ],
  'two-step-conversions': [
    {
      title: 'Change big units to small units first',
      learn: [
        { text: 'Change to the smaller unit first. 1 foot is 12 inches.', scene: scenes('two-step-conversions').steps[0]! },
        example('two-step-conversions', 'Feet and part of a foot'),
      ],
      practice: [{ question: 'two-step-conversions-p1' }, { question: 'two-step-conversions-p2' }, { question: 'two-step-conversions-p3' }],
    },
    {
      title: 'Then add or take away in the small unit',
      terms: [{ term: 'taking away', pattern: /−|\bleft\b|\bcuts? off\b/i }],
      learn: [
        { text: 'Once both amounts are inches, add them.', scene: scenes('two-step-conversions').steps[1]! },
        { text: 'Keep the small unit in your answer.', scene: scenes('two-step-conversions').steps[2]! },
        example('two-step-conversions', 'Cut some off'),
      ],
      practice: [{ question: 'two-step-conversions-q1' }, { question: 'two-step-conversions-q2' }, { question: 'two-step-conversions-q3' }],
    },
  ],
  'fractional-sharing': [
    {
      title: 'Cut each thing into one part for each friend',
      learn: [
        { text: 'Cut each pizza into 4 parts, one for each friend.', scene: scenes('fractional-sharing').steps[0]! },
        { text: 'Each friend gets one part, 1/4, of every pizza.', scene: scenes('fractional-sharing').steps[1]! },
      ],
      practice: [{ question: 'fractional-sharing-p1' }, { question: 'fractional-sharing-p2' }, { question: 'fractional-sharing-p3' }],
    },
    {
      title: 'Count one friend’s parts to name the share',
      terms: [{ term: 'a share of more than one part', pattern: moreThanOnePart }],
      learn: [
        { text: 'Count one friend’s parts: 3 parts of 1/4 is 3/4.', scene: scenes('fractional-sharing').steps[2]! },
        { text: '3 pizzas, so 3 parts each. 3 shared by 4 is 3/4.', scene: scenes('fractional-sharing').why },
      ],
      practice: [{ question: 'fractional-sharing-q1' }, { question: 'fractional-sharing-q2' }, { question: 'fractional-sharing-q3' }],
    },
  ],
  'fraction-as-division': [
    {
      title: 'A division can be written as a fraction',
      learn: [
        { text: '5 ÷ 4 shares 5 things among 4. The number shared goes on top.', scene: scenes('fraction-as-division').steps[0]! },
        { text: 'The number of shares goes on the bottom: 5 ÷ 4 = 5/4.', scene: scenes('fraction-as-division').steps[1]! },
        { text: 'The fraction bar is the line in a fraction. It means divide.', scene: scenes('fraction-as-division').why },
      ],
      practice: [{ question: 'fraction-as-division-q1' }, { question: 'fraction-as-division-q3' }, { question: 'fraction-as-division-p1' }],
    },
    {
      title: 'Find the two whole numbers a fraction is between',
      terms: [{ term: 'between whole numbers', pattern: /\bbetween\b/i }],
      learn: [
        { text: '5/4 is 1 whole and 1/4 more, so it is between 1 and 2.', scene: scenes('fraction-as-division').steps[2]! },
        example('fraction-as-division', 'Between two whole numbers'),
      ],
      practice: [{ question: 'fraction-as-division-q2' }, { question: 'fraction-as-division-p2' }, { question: 'fraction-as-division-p3' }],
    },
  ],
  'unit-fraction-divided-whole': [
    {
      title: 'Cut the part into equal shares and name one share',
      learn: [
        { text: '1/3 ÷ 4 means 1/3 shared into 4 equal shares. Cut the third into 4 pieces.', scene: scenes('unit-fraction-divided-whole').steps[0]! },
        { text: 'How many pieces that size fill the whole? 12, so one piece is 1/12.', scene: scenes('unit-fraction-divided-whole').steps[1]! },
      ],
      practice: [{ question: 'unit-fraction-divided-whole-p1' }, { question: 'unit-fraction-divided-whole-p2' }, { question: 'unit-fraction-divided-whole-p3' }],
    },
    {
      title: 'Multiply the bottom number by the number of shares',
      terms: [{ term: 'multiplying the denominator', pattern: /\b\d+ × \d+ = \d+\b/ }],
      learn: [
        { text: 'A quick way: 3 thirds, each cut into 4, make 3 × 4 = 12 pieces.', scene: scenes('unit-fraction-divided-whole').steps[2]! },
        { text: 'Each share is smaller than the part you started with. Check: 4 shares of 1/12 make 4/12, the same as 1/3.', scene: scenes('unit-fraction-divided-whole').why },
      ],
      practice: [{ question: 'unit-fraction-divided-whole-q1' }, { question: 'unit-fraction-divided-whole-q2' }, { question: 'unit-fraction-divided-whole-q3' }],
    },
  ],
  'divide-whole-by-unit-fraction': [
    {
      title: 'Count how many unit parts fit in one whole',
      learn: [
        { text: 'Here ÷ asks how many fit. 2 ÷ 1/4 means: how many 1/4s fit in 2? Start with 1 whole: four 1/4s fit.', scene: scenes('divide-whole-by-unit-fraction').steps[0]! },
        { text: 'The bottom number says how many parts fill one whole.', scene: scenes('divide-whole-by-unit-fraction').why },
      ],
      practice: [{ question: 'divide-whole-by-unit-fraction-q2' }, { question: 'divide-whole-by-unit-fraction-p1' }, { question: 'divide-whole-by-unit-fraction-p2' }],
    },
    {
      title: 'Multiply by the number of wholes',
      terms: [{ term: 'more than one whole', pattern: /\b\d+ × \d+\b(?!\/)/ }],
      learn: [
        { text: '2 ÷ 1/4: 4 fit in each whole, and there are 2 wholes. 2 × 4.', scene: scenes('divide-whole-by-unit-fraction').steps[1]! },
        { text: 'That is how many fit: 2 ÷ 1/4 = 8.', scene: scenes('divide-whole-by-unit-fraction').steps[2]! },
      ],
      practice: [{ question: 'divide-whole-by-unit-fraction-q1' }, { question: 'divide-whole-by-unit-fraction-q3' }, { question: 'divide-whole-by-unit-fraction-p3' }],
    },
  ],
  'share-or-fit': [
    {
      title: 'Tell sharing from fitting',
      learn: [
        { text: 'Ask: is an amount split into shares, or do you count pieces?', scene: scenes('share-or-fit').steps[0]! },
        example('share-or-fit', 'Sharing or fitting?'),
      ],
      practice: [{ question: 'share-or-fit-q1' }, { question: 'share-or-fit-q3' }, { question: 'share-or-fit-p1' }],
    },
    {
      title: 'Sharing splits the amount into equal shares',
      terms: [{ term: 'a sharing division', pattern: /÷ \d+\b(?!\/)/ }],
      learn: [
        { text: 'Sharing: 1/2 ÷ 2 splits 1/2 into 2 equal shares. Each share is smaller.', scene: scenes('share-or-fit').steps[1]! },
      ],
      practice: [{ question: 'share-or-fit-q2' }, { question: 'share-or-fit-p2' }, { question: 'share-or-fit-p3' }],
    },
    {
      title: 'Fitting counts the pieces, then check with ×',
      terms: [{ term: 'a fitting division', pattern: /÷ \d+\/\d+/ }],
      learn: [
        { text: 'Fitting: 1 ÷ 1/4 counts how many 1/4s fit. Multiply back to check.', scene: scenes('share-or-fit').steps[2]! },
        { text: 'Both are division. Multiply the answer back to check it.', scene: scenes('share-or-fit').why },
      ],
      practice: [{ question: 'share-or-fit-p4' }, { question: 'share-or-fit-p5' }, { question: 'share-or-fit-p6' }],
    },
  ],
};
