/* The ideas of lessons 51–60 (see lesson-ideas.ts): each lesson's ideas in order, each with its Learn pages and 3
   practices. Lesson 1 (ideas/lessons-01.ts) is the model. */
import { example, scenes, type LessonIdea } from './helpers';

export const IDEAS: Record<string, LessonIdea[]> = {
  'mixed-unlike-operations': [
    {
      title: 'Rename the fraction parts so they match',
      learn: [
        { text: 'Rename the fraction parts so they are the same size. The wholes stay the same.', scene: scenes('mixed-unlike-operations').steps[0]! },
      ],
      practice: [{ question: 'mixed-unlike-operations-p1' }, { question: 'mixed-unlike-operations-p2' }, { question: 'mixed-unlike-operations-p3' }],
    },
    {
      title: 'Add the parts, then add the wholes',
      terms: [{ term: 'adding', pattern: /\+/ }],
      learn: [
        { text: '2 1/2 + 1 3/4: add the parts first. 4 fourths make 1 whole.', scene: scenes('mixed-unlike-operations').steps[1]! },
        { text: 'Then add the wholes.', scene: scenes('mixed-unlike-operations').steps[2]! },
      ],
      practice: [{ question: 'mixed-unlike-operations-p4' }, { question: 'mixed-unlike-operations-q1' }, { question: 'mixed-unlike-operations-q3' }],
    },
    {
      title: 'Trade a whole when the parts run short',
      terms: [{ term: 'taking away', pattern: /−/ }],
      learn: [
        { text: '4 fourths make 1 whole, so you can trade a whole for 4 fourths.', scene: scenes('mixed-unlike-operations').why },
        example('mixed-unlike-operations', 'Trade a whole to take away'),
      ],
      practice: [{ question: 'mixed-unlike-operations-q2' }, { question: 'mixed-unlike-operations-p5' }, { question: 'mixed-unlike-operations-q4' }],
    },
  ],
  'estimate-fraction-operations': [
    {
      title: 'Compare each fraction with 0, 1/2 or 1',
      learn: [
        { text: 'Is each fraction close to 0, 1/2 or 1?', scene: scenes('estimate-fraction-operations').steps[0]! },
      ],
      practice: [{ question: 'estimate-fraction-operations-p1' }, { question: 'estimate-fraction-operations-p2' }, { question: 'estimate-fraction-operations-p3' }],
    },
    {
      title: 'Add or take away the easy amounts',
      terms: [{ term: 'adding or taking away', pattern: /[+−]/ }],
      learn: [
        { text: 'Add the easy amounts: 7/8 is about 1, and 4/9 is about 1/2.', scene: scenes('estimate-fraction-operations').steps[1]! },
        example('estimate-fraction-operations', 'Is the sum less than 1?'),
        example('estimate-fraction-operations', 'Estimate a difference'),
      ],
      practice: [{ question: 'estimate-fraction-operations-q3' }, { question: 'estimate-fraction-operations-q2' }, { question: 'estimate-fraction-operations-q4' }],
    },
    {
      title: 'Check if an answer makes sense',
      terms: [{ term: "checking someone's answer", pattern: /\bsays\b|make sense|check again/i }],
      learn: [
        { text: 'See if the answer is close to your estimate.', scene: scenes('estimate-fraction-operations').steps[2]! },
        example('estimate-fraction-operations', 'Does it make sense?'),
      ],
      practice: [{ question: 'estimate-fraction-operations-p4' }, { question: 'estimate-fraction-operations-p5' }, { question: 'estimate-fraction-operations-p6' }],
    },
  ],
  'sets-unit-fractions': [
    {
      title: 'Share into as many equal groups as the denominator',
      learn: [
        { text: 'Use the denominator to make equal groups.', scene: scenes('sets-unit-fractions').steps[0]! },
        { text: 'Share the things out evenly.', scene: scenes('sets-unit-fractions').steps[1]! },
      ],
      practice: [{ question: 'sets-unit-fractions-p1' }, { question: 'sets-unit-fractions-p2' }, { question: 'sets-unit-fractions-p3' }],
    },
    {
      title: 'One group is one part of the set',
      terms: [{ term: 'one group is the unit fraction', pattern: /\bone group\b|\bone part\b|\b1 group\b/i }],
      learn: [
        { text: 'Count the things in one group.', scene: scenes('sets-unit-fractions').steps[2]! },
        { text: 'One group is one part of the whole set.', scene: scenes('sets-unit-fractions').why },
      ],
      practice: [{ question: 'sets-unit-fractions-q1' }, { question: 'sets-unit-fractions-q2' }, { question: 'sets-unit-fractions-q4' }],
    },
  ],
  'sets-nonunit': [
    {
      title: 'Make equal groups and count one group',
      learn: [
        { text: 'Use the denominator to make equal groups.', scene: scenes('sets-nonunit').steps[0]! },
        { text: 'Count the things in one group.', scene: scenes('sets-nonunit').steps[1]! },
      ],
      practice: [{ question: 'sets-nonunit-p1' }, { question: 'sets-nonunit-p2' }, { question: 'sets-nonunit-p3' }],
    },
    {
      title: 'Take as many groups as the numerator',
      terms: [{ term: 'numerator', pattern: /\bnumerator\b/i }],
      learn: [
        { text: 'Take as many groups as the numerator says.', scene: scenes('sets-nonunit').steps[2]! },
        { text: 'Each group is one part of the set.', scene: scenes('sets-nonunit').why },
      ],
      practice: [{ question: 'sets-nonunit-q1' }, { question: 'sets-nonunit-q2' }, { question: 'sets-nonunit-q4' }],
    },
  ],
  'fraction-of-quantity': [
    {
      title: 'Divide by the denominator to find one part',
      learn: [
        { text: 'Divide the number by the denominator.', scene: scenes('fraction-of-quantity').steps[0]! },
        { text: 'That is one part.', scene: scenes('fraction-of-quantity').steps[1]! },
      ],
      practice: [{ question: 'fraction-of-quantity-p1' }, { question: 'fraction-of-quantity-p2' }, { question: 'fraction-of-quantity-p3' }],
    },
    {
      title: 'Multiply one part by the numerator',
      terms: [{ term: 'multiplying by the numerator', pattern: /×|\bnumerator\b/i }],
      learn: [
        { text: 'Multiply one part by the numerator.', scene: scenes('fraction-of-quantity').steps[2]! },
        { text: 'Divide to find one part. The numerator says how many parts to take.', scene: scenes('fraction-of-quantity').why },
      ],
      practice: [{ question: 'fraction-of-quantity-q1' }, { question: 'fraction-of-quantity-q3' }, { question: 'fraction-of-quantity-p4' }],
    },
    {
      title: 'A fraction times a number is a fraction of it',
      terms: [{ term: 'a fraction × a number', pattern: /\d+\/\d+ × \d+/ }],
      learn: [example('fraction-of-quantity', 'Times means of'), example('fraction-of-quantity', 'Or multiply first')],
      practice: [{ question: 'fraction-of-quantity-p5' }, { question: 'fraction-of-quantity-q2' }, { question: 'fraction-of-quantity-q4' }],
    },
  ],
  'multiply-fractions': [
    {
      title: 'Cut every part again to make smaller parts',
      learn: [
        { text: 'To find a part of a part, cut each part into smaller equal parts.', scene: scenes('multiply-fractions').steps[0]! },
        { text: 'Multiply the denominators to name the new parts.', scene: scenes('multiply-fractions').steps[1]! },
      ],
      practice: [{ question: 'multiply-fractions-p1' }, { question: 'multiply-fractions-p2' }, { question: 'multiply-fractions-p3' }],
    },
    {
      title: 'Multiply the numerators to count the parts you take',
      terms: [{ term: 'numerators', pattern: /\bnumerators?\b/i }],
      learn: [
        { text: 'Multiply the numerators to count the parts you take.', scene: scenes('multiply-fractions').steps[2]! },
        { text: 'Cutting again makes eighths. Half of each fourth takes 3 of them.', scene: scenes('multiply-fractions').why },
      ],
      practice: [{ question: 'multiply-fractions-q2' }, { question: 'multiply-fractions-q3' }, { question: 'multiply-fractions-q4' }],
    },
  ],
  'fraction-times-fraction': [
    {
      title: 'Cut rows for one fraction and columns for the other',
      learn: [
        example('fraction-times-fraction', 'Rows and columns'),
        { text: '2/3 × 4/5 means 2/3 of 4/5. Cut rows for one fraction and columns for the other.', scene: scenes('fraction-times-fraction').steps[0]! },
      ],
      practice: [{ question: 'fraction-times-fraction-p1' }, { question: 'fraction-times-fraction-p2' }, { question: 'fraction-times-fraction-p3' }],
    },
    {
      title: 'Shade where the rows and columns overlap',
      terms: [{ term: 'overlap', pattern: /\boverlap\b/i }],
      learn: [
        { text: 'Shade the rows and the columns. Where they overlap is the part of a part.', scene: scenes('fraction-times-fraction').steps[1]! },
      ],
      practice: [{ question: 'fraction-times-fraction-p4' }, { question: 'fraction-times-fraction-p5' }, { question: 'fraction-times-fraction-p6' }],
    },
    {
      title: 'The overlap out of all the boxes is the answer',
      terms: [{ term: 'the overlap out of all the boxes', pattern: /\d+ of \d+ (?:small )?(?:boxes|squares)|boxes in all|multiply the tops/i }],
      learn: [
        { text: 'Count the overlap out of all the small boxes.', scene: scenes('fraction-times-fraction').steps[2]! },
        { text: 'Rows times columns give all the boxes. Multiply the tops, then multiply the bottoms.', scene: scenes('fraction-times-fraction').why },
      ],
      practice: [{ question: 'fraction-times-fraction-q1' }, { question: 'fraction-times-fraction-q2' }, { question: 'fraction-times-fraction-q4' }],
    },
  ],
  'fraction-of-collection': [
    {
      title: 'Make equal groups and count one group',
      learn: [
        { text: 'Make as many equal groups as the denominator.', scene: scenes('fraction-of-collection').steps[0]! },
        { text: 'Count the things in one group.', scene: scenes('fraction-of-collection').steps[1]! },
      ],
      practice: [{ question: 'fraction-of-collection-p1' }, { question: 'fraction-of-collection-p2' }, { question: 'fraction-of-collection-p3' }],
    },
    {
      title: 'Take as many groups as the numerator',
      terms: [{ term: 'numerator', pattern: /\bnumerator\b/i }],
      learn: [
        { text: 'Take as many groups as the numerator.', scene: scenes('fraction-of-collection').steps[2]! },
        { text: 'Equal groups make fair parts.', scene: scenes('fraction-of-collection').why },
      ],
      practice: [{ question: 'fraction-of-collection-p4' }, { question: 'fraction-of-collection-p5' }, { question: 'fraction-of-collection-p6' }],
    },
    {
      title: 'A fraction of a group is the fraction times the number',
      terms: [{ term: 'times', pattern: /×/ }],
      learn: [example('fraction-of-collection', 'Write it with ×')],
      practice: [{ question: 'fraction-of-collection-q1' }, { question: 'fraction-of-collection-q3' }, { question: 'fraction-of-collection-q4' }],
    },
  ],
  'multiplication-scaling': [
    {
      title: 'Compare the fraction with 1',
      learn: [
        { text: 'Compare the fraction with 1.', scene: scenes('multiplication-scaling').steps[0]! },
        example('multiplication-scaling', 'Equal to 1'),
      ],
      practice: [{ question: 'multiplication-scaling-p1' }, { question: 'multiplication-scaling-p2' }, { question: 'multiplication-scaling-p3' }],
    },
    {
      title: 'Times less than 1 makes it smaller',
      terms: [{ term: 'times', pattern: /×/ }, { term: 'factor', pattern: /\bfactors?\b/i }],
      learn: [
        example('multiplication-scaling', 'Factors'),
        { text: 'A factor less than 1 takes only part of the amount, so the amount gets smaller.', scene: scenes('multiplication-scaling').steps[1]! },
      ],
      practice: [{ question: 'multiplication-scaling-p4' }, { question: 'multiplication-scaling-p5' }, { question: 'multiplication-scaling-p6' }],
    },
    {
      title: 'More than 1 makes it bigger, and 1 keeps it the same',
      terms: [{ term: 'bigger or the same', pattern: /\bbigger\b|\bgrows?\b|more than a copy|\bkeeps?\b/i }],
      learn: [
        { text: 'A factor more than 1 makes more than one copy, so the amount gets bigger.', scene: scenes('multiplication-scaling').steps[2]! },
        { text: 'Times 1 keeps the amount the same.', scene: scenes('multiplication-scaling').why },
      ],
      practice: [{ question: 'multiplication-scaling-q1' }, { question: 'multiplication-scaling-q2' }, { question: 'multiplication-scaling-q4' }],
    },
  ],
  'bigger-or-smaller': [
    {
      title: 'Find the factor and compare it with 1',
      learn: [
        { text: 'Look at the factor you multiply by.', scene: scenes('bigger-or-smaller').steps[0]! },
        { text: 'Compare it with 1.', scene: scenes('bigger-or-smaller').steps[1]! },
      ],
      practice: [{ question: 'bigger-or-smaller-p1' }, { question: 'bigger-or-smaller-p2' }, { question: 'bigger-or-smaller-p3' }],
    },
    {
      title: 'Less than 1 gives less, more than 1 gives more',
      terms: [{ term: 'the product against the amount', pattern: /\bproducts?\b|(?:more|less) than (?:[2-9]|\d{2,})(?![\d/])/i }],
      learn: [
        example('bigger-or-smaller', 'The product'),
        { text: 'Less than 1 means less. More than 1 means more. Equal to 1 stays the same.', scene: scenes('bigger-or-smaller').steps[2]! },
        { text: 'Part of a copy is less. More than a copy is more.', scene: scenes('bigger-or-smaller').why },
      ],
      practice: [{ question: 'bigger-or-smaller-q2' }, { question: 'bigger-or-smaller-q1' }, { question: 'bigger-or-smaller-q4' }],
    },
    {
      title: 'It works for fraction and mixed-number amounts too',
      terms: [{ term: 'fraction or mixed-number amounts', pattern: /× \d+\/\d+|× \d+ \d+\/\d+/ }],
      learn: [example('bigger-or-smaller', 'A fraction or mixed amount')],
      practice: [{ question: 'bigger-or-smaller-q3' }, { question: 'bigger-or-smaller-p4' }, { question: 'bigger-or-smaller-p5' }],
    },
  ],
};
