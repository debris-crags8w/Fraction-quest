/* The ideas of lessons 72–81 (see lesson-ideas.ts): each lesson's ideas in order, each with its Learn pages and 3
   practices. Lesson 1 (ideas/lessons-01.ts) is the model. */
import { example, scenes, wordsToKnow, type LessonIdea } from './helpers';

export const IDEAS: Record<string, LessonIdea[]> = {
  'fraction-probability': [
    {
      title: 'Count all the equally likely outcomes',
      learn: [
        wordsToKnow('fraction-probability'),
        example('fraction-probability', 'Each marble is an outcome'),
        { text: 'Count all the equally likely outcomes. That is the bottom number.', scene: scenes('fraction-probability').steps[0]! },
      ],
      practice: [{ question: 'fraction-probability-p1' }, { question: 'fraction-probability-p2' }, { question: 'fraction-probability-p3' }],
    },
    {
      title: 'The chance is the wanted outcomes over all of them',
      terms: [{ term: 'a chance written as a fraction', pattern: /\bchance\b|\d+\/\d+/i }],
      learn: [
        { text: 'Count the outcomes you want. That is the top number.', scene: scenes('fraction-probability').steps[1]! },
        { text: 'Write wanted over all. That is the chance.', scene: scenes('fraction-probability').steps[2]! },
        example('fraction-probability', 'A bag of marbles'),
      ],
      practice: [{ question: 'fraction-probability-q1' }, { question: 'fraction-probability-q2' }, { question: 'fraction-probability-q3' }],
    },
  ],
  'fractional-side-area': [
    {
      title: 'Area is rows times columns of square units',
      learn: [wordsToKnow('fractional-side-area'), example('fractional-side-area', 'Rows times columns')],
      practice: [{ question: 'fractional-side-area-p1' }, { question: 'fractional-side-area-p2' }, { question: 'fractional-side-area-p3' }],
    },
    {
      title: 'A side can be part of a unit',
      terms: [{ term: 'fraction side lengths and their overlap', pattern: /\d+\/\d+|\boverlap/i }],
      learn: [example('fractional-side-area', 'A side of 1 unit')],
      practice: [{ question: 'fractional-side-area-q2' }, { question: 'fractional-side-area-q3' }, { question: 'fractional-side-area-q4' }],
    },
    {
      title: 'Multiply the numerators and the denominators',
      terms: [{ term: 'a fraction times a fraction', pattern: /\d+\/\d+ × \d+\/\d+|\b(numerators?|denominators?)\b/i }],
      learn: [
        { text: 'Both sides are parts of a unit. Multiply the side lengths.', scene: scenes('fractional-side-area').steps[0]! },
        { text: 'Multiply the numerators: the boxes in the rectangle.', scene: scenes('fractional-side-area').steps[1]! },
        { text: 'Multiply the denominators: the boxes in the whole square.', scene: scenes('fractional-side-area').steps[2]! },
      ],
      practice: [{ question: 'fractional-side-area-q1' }, { question: 'fractional-side-area-p4' }, { question: 'fractional-side-area-p5' }],
    },
  ],
  'multiply-mixed-numbers': [
    {
      title: 'Split the sides and find the area of each part',
      learn: [
        wordsToKnow('multiply-mixed-numbers'),
        { text: 'Split each side into wholes and parts.', scene: scenes('multiply-mixed-numbers').steps[0]! },
        { text: 'Multiply every part of one side by every part of the other.', scene: scenes('multiply-mixed-numbers').steps[1]! },
      ],
      practice: [{ question: 'multiply-mixed-numbers-p1' }, { question: 'multiply-mixed-numbers-p2' }, { question: 'multiply-mixed-numbers-p3' }],
    },
    {
      title: 'Add the four areas',
      terms: [{ term: 'adding the parts', pattern: /\badd/i }],
      learn: [
        { text: 'Add all the areas.', scene: scenes('multiply-mixed-numbers').steps[2]! },
        example('multiply-mixed-numbers', 'Add the four areas'),
        { text: 'The smaller rectangles make the whole garden.', scene: scenes('multiply-mixed-numbers').why },
      ],
      practice: [{ question: 'multiply-mixed-numbers-q1' }, { question: 'multiply-mixed-numbers-q2' }, { question: 'multiply-mixed-numbers-q3' }],
    },
  ],
  'fractions-to-percent': [
    {
      title: 'Rename the fraction in hundredths',
      learn: [
        { text: 'Rename the fraction in hundredths.', scene: scenes('fractions-to-percent').steps[0]! },
        example('fractions-to-percent', 'Rename 7/10 in hundredths'),
      ],
      practice: [{ question: 'fractions-to-percent-p1' }, { question: 'fractions-to-percent-p2' }, { question: 'fractions-to-percent-p3' }],
    },
    {
      title: 'Percent means out of 100',
      terms: [{ term: 'percent and the % sign', pattern: /%|\bpercent\b/i }],
      learn: [
        wordsToKnow('fractions-to-percent'),
        { text: 'The numerator is the percent.', scene: scenes('fractions-to-percent').steps[1]! },
        { text: 'Add the % sign.', scene: scenes('fractions-to-percent').steps[2]! },
      ],
      practice: [{ question: 'fractions-to-percent-q1' }, { question: 'fractions-to-percent-q2' }, { question: 'fractions-to-percent-q3' }],
    },
  ],
  'percent-to-fraction': [
    {
      title: 'A percent is a number out of 100',
      learn: [{ text: 'A percent tells how many out of 100.', scene: scenes('percent-to-fraction').steps[0]! }],
      practice: [{ question: 'percent-to-fraction-p1' }, { question: 'percent-to-fraction-p2' }, { question: 'percent-to-fraction-p3' }],
    },
    {
      title: 'Write the percent over 100',
      terms: [{ term: 'a fraction out of 100', pattern: /\d+\/100\b/ }],
      learn: [
        { text: 'Write the percent on top and 100 on the bottom.', scene: scenes('percent-to-fraction').steps[1]! },
        { text: 'Percent means out of 100, so the denominator is 100.', scene: scenes('percent-to-fraction').why },
      ],
      practice: [{ question: 'percent-to-fraction-q1' }, { question: 'percent-to-fraction-q2' }, { question: 'percent-to-fraction-q3' }],
    },
  ],
  'multi-step-fraction-stories': [
    {
      title: 'Find what the story asks, then solve the first step',
      learn: [
        { text: 'Find what the story asks.', scene: scenes('multi-step-fraction-stories').steps[0]! },
        { text: 'Solve the first step.', scene: scenes('multi-step-fraction-stories').steps[1]! },
      ],
      practice: [{ question: 'multi-step-fraction-stories-p1' }, { question: 'multi-step-fraction-stories-p2' }, { question: 'multi-step-fraction-stories-p3' }],
    },
    {
      title: 'Use the first answer to solve the second step',
      terms: [{ term: 'the second step', pattern: /\bsecond\b/i }],
      learn: [
        { text: 'Use that answer to solve the second step.', scene: scenes('multi-step-fraction-stories').steps[2]! },
        { text: 'The answer to the first step is the start of the second.', scene: scenes('multi-step-fraction-stories').why },
      ],
      practice: [{ question: 'multi-step-fraction-stories-q1' }, { question: 'multi-step-fraction-stories-q2' }, { question: 'multi-step-fraction-stories-q3' }],
    },
  ],
  'find-the-whole': [
    {
      title: 'One part is known: make all the parts',
      learn: [
        example('find-the-whole', 'One part is known: make all the parts'),
        { text: 'The denominator says how many equal parts make the whole.', scene: scenes('find-the-whole').why },
      ],
      practice: [{ question: 'find-the-whole-q1' }, { question: 'find-the-whole-q2' }, { question: 'find-the-whole-q3' }],
    },
    {
      title: 'More parts are known: find one part first',
      terms: [
        { term: 'more than one part known', pattern: /\b[2-9]\/\d+/ },
        { term: 'dividing to find one part', pattern: /÷/ },
      ],
      learn: [
        { text: 'Divide the known amount by the numerator. That is one part.', scene: scenes('find-the-whole').steps[0]! },
        { text: 'Multiply one part by the denominator.', scene: scenes('find-the-whole').steps[1]! },
        { text: 'That is the whole.', scene: scenes('find-the-whole').steps[2]! },
      ],
      practice: [{ question: 'find-the-whole-p1' }, { question: 'find-the-whole-p2' }, { question: 'find-the-whole-p3' }],
    },
  ],
  'spot-the-mistake': [
    {
      title: 'Check the work against its rule',
      learn: [
        example('spot-the-mistake', 'Rules to check'),
        { text: 'Check each step against the rule.', scene: scenes('spot-the-mistake').steps[0]! },
        example('spot-the-mistake', 'Sometimes the work is right'),
      ],
      practice: [{ question: 'spot-the-mistake-p1' }, { question: 'spot-the-mistake-p2' }, { question: 'spot-the-mistake-p3' }],
    },
    {
      title: 'Find the first wrong step',
      terms: [{ term: 'the steps of the work', pattern: /\bstep [12]\b|\bwrong step\b/i }],
      learn: [
        { text: 'Find the first wrong step.', scene: scenes('spot-the-mistake').steps[1]! },
        example('spot-the-mistake', 'The first wrong step'),
      ],
      practice: [{ question: 'spot-the-mistake-p4' }, { question: 'spot-the-mistake-p5' }, { question: 'spot-the-mistake-p6' }],
    },
    {
      title: 'Fix it and work out the right answer',
      terms: [{ term: 'fixing the work', pattern: /\bright answer\b|\bfix/i }],
      learn: [
        { text: 'Fix it and work out the right answer.', scene: scenes('spot-the-mistake').steps[2]! },
        { text: 'One wrong step changes the answer.', scene: scenes('spot-the-mistake').why },
      ],
      practice: [{ question: 'spot-the-mistake-q1' }, { question: 'spot-the-mistake-q2' }, { question: 'spot-the-mistake-q3' }],
    },
  ],
  'fraction-of-remainder': [
    {
      title: 'Find what is left after the first part',
      learn: [{ text: 'Find what is left after the first part.', scene: scenes('fraction-of-remainder').steps[0]! }],
      practice: [{ question: 'fraction-of-remainder-p1' }, { question: 'fraction-of-remainder-p2' }, { question: 'fraction-of-remainder-p3' }],
    },
    {
      title: 'Take the second fraction of what is left',
      terms: [{ term: 'a fraction of the rest', pattern: /\bof the rest\b|\bof what is left\b/i }],
      learn: [
        { text: 'Take the second fraction of what is left.', scene: scenes('fraction-of-remainder').steps[1]! },
        { text: 'Find what is left at the end.', scene: scenes('fraction-of-remainder').steps[2]! },
        example('fraction-of-remainder', 'A part of what is left'),
      ],
      practice: [{ question: 'fraction-of-remainder-q1' }, { question: 'fraction-of-remainder-q2' }, { question: 'fraction-of-remainder-q3' }],
    },
  ],
  'divide-fractions': [
    {
      title: 'Rename, then count how many parts fit',
      learn: [
        { text: 'Rename both fractions with the same denominator.', scene: scenes('divide-fractions').steps[0]! },
        { text: 'Count how many of the small parts fit.', scene: scenes('divide-fractions').steps[1]! },
      ],
      practice: [{ question: 'divide-fractions-q2' }, { question: 'divide-fractions-p1' }, { question: 'divide-fractions-p2' }],
    },
    {
      title: 'Write it with ÷: the count is the answer',
      terms: [{ term: 'the ÷ sign', pattern: /÷/ }],
      learn: [
        { text: 'That count is the answer to the division.', scene: scenes('divide-fractions').steps[2]! },
        { text: 'Same-size parts make the counting easy.', scene: scenes('divide-fractions').why },
      ],
      practice: [{ question: 'divide-fractions-q1' }, { question: 'divide-fractions-q3' }, { question: 'divide-fractions-p3' }],
    },
    {
      title: 'Bigger pieces: count groups of small parts',
      terms: [{ term: 'groups of small parts', pattern: /\bgroups? of \d/i }],
      learn: [example('divide-fractions', 'Count groups')],
      practice: [{ question: 'divide-fractions-q4' }, { question: 'divide-fractions-p4' }, { question: 'divide-fractions-p5' }],
    },
  ],
};
