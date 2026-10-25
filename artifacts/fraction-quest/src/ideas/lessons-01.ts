/* Lesson 1's ideas (see lesson-ideas.ts): equal parts are the same size, then the bottom number (counts only, no
   fraction yet), then the top number (the first fraction a child picks as an answer), then saying and writing it. */
import { example, scenes, type LessonIdea } from './helpers';

export const IDEAS: Record<string, LessonIdea[]> = {
  'fraction-names': [
    {
      title: 'Equal parts are the same size',
      learn: [
        { text: 'Look at one whole.', scene: scenes('equal-parts').steps[0]! },
        { text: 'Check that every part is the same size.', scene: scenes('equal-parts').steps[1]! },
        { text: 'If one part is bigger, the parts are not fair shares.', scene: scenes('equal-parts').why },
      ],
      practice: [{ question: 'fraction-names-p6' }, { question: 'fraction-names-p7' }, { question: 'fraction-names-p8' }],
    },
    {
      title: 'The bottom number counts all the equal parts',
      terms: [{ term: 'denominator, the bottom number', pattern: /\b(denominators?|bottom numbers?)\b/i }],
      learn: [
        { text: 'The denominator is the bottom number. Count the equal parts in one whole.', scene: scenes('fraction-names').steps[0]! },
        example('fraction-names', 'Count the parts, not the cuts'),
      ],
      practice: [{ question: 'fraction-names-p1' }, { question: 'fraction-names-p2' }, { question: 'fraction-names-p3' }],
    },
    {
      title: 'The top number counts the parts we take',
      terms: [
        { term: 'numerator, the top number', pattern: /\b(numerators?|top numbers?)\b/i },
        // The first fraction written anywhere in the lesson: ideas 1 and 2 use counts only.
        { term: 'a fraction written with both numbers', pattern: /\d+\/\d+/ },
        { term: 'more than 1 part on top', pattern: /\b([2-9]|\d{2,})\/\d+/ },
      ],
      learn: [
        example('fraction-names', 'Write one part'),
        { text: 'The numerator is the top number. It counts the parts we take.', scene: scenes('fraction-names').steps[1]! },
        example('fraction-names', 'Read the top number'),
      ],
      practice: [{ question: 'fraction-names-p9' }, { question: 'fraction-names-p4' }, { question: 'fraction-names-q3' }],
    },
    {
      title: 'Say it and write it: 3 out of 4 equal parts',
      terms: [{ term: 'out of', pattern: /\bout of\b/i }],
      learn: [
        { text: 'Say it like this: 3 out of 4 equal parts.', scene: scenes('fraction-names').steps[2]! },
        example('fraction-names', 'Write the fraction'),
      ],
      practice: [{ question: 'fraction-names-q2' }, { question: 'fraction-names-p5' }, { question: 'fraction-names-q4' }],
    },
  ],
};
