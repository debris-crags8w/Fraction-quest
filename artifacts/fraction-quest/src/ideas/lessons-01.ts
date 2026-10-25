/* Lesson 1's ideas (see lesson-ideas.ts). */
import { example, scenes, type LessonIdea } from './helpers';

export const IDEAS: Record<string, LessonIdea[]> = {
  'equal-parts': [
    {
      title: 'Equal parts are the same size',
      learn: [
        { text: 'Look at one whole.', scene: scenes('equal-parts').steps[0]! },
        { text: 'Check that every part is the same size.', scene: scenes('equal-parts').steps[1]! },
        { text: 'If one part is bigger, the parts are not fair shares.', scene: scenes('equal-parts').why },
      ],
      practice: [{ question: 'equal-parts-q3' }, { question: 'equal-parts-q1' }, { question: 'equal-parts-p1' }],
    },
    {
      title: 'Count the equal parts to name one part',
      terms: [{ term: 'fraction names', pattern: /\d+\/\d+|\b(halves|half|thirds?|fourths?|quarters?|fifths?|sixths?|sevenths?|eighths?)\b/i }],
      learn: [
        { text: 'Count the equal parts to name them.', scene: scenes('equal-parts').steps[2]! },
        example('equal-parts', 'Name the parts, not the cuts'),
      ],
      practice: [{ question: 'equal-parts-q2' }, { question: 'equal-parts-q4' }, { question: 'equal-parts-p2' }],
    },
    {
      title: 'Equal parts can be different shapes',
      terms: [{ term: 'parts of different shapes', pattern: /\b(triangles?|shapes?)\b/i }],
      learn: [example('equal-parts', 'Same space, different shape')],
      practice: [{ question: 'equal-parts-p3' }, { handsOn: 'match' }, { question: 'equal-parts-p4' }],
    },
    {
      title: 'Share fairly',
      terms: [{ term: 'sharing among friends', pattern: /\bfriends?\b/i }],
      learn: [example('equal-parts', 'Share fairly')],
      practice: [{ handsOn: 'sort' }, { handsOn: 'sort-cake' }, { question: 'equal-parts-p5' }],
    },
  ],
};
