/* "2/5 and 4/5" is two fractions, not the mixed number "5 and 4/5": the 5 that ends the first fraction is not a whole
   number. A real mixed number ("1 and 3/4", "12 and 3/4", "1 3/4") must still be read as one. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { amountsIn } from './auto-picture';
import { problemPicture, type ModelSpec } from './game';
import { lessonIdeas } from './lesson-ideas';
import { TAUGHT_IN } from './teach-extras';
import type { WorksheetProblem } from './learning-content';

const taught = (term: string) => TAUGHT_IN.find((entry) => entry.term === term)!.pattern;
const ideaTerm = (lessonId: string, term: string) => lessonIdeas(lessonId)!.flatMap((idea) => idea.terms ?? []).find((item) => item.term === term)!.pattern;

test('auto-picture: "2/5 and 4/5" names two fractions, "1 and 3/4" one mixed number', () => {
  assert.deepEqual(amountsIn('Put 2/5 and 4/5 in order.').map(({ numerator, denominator }) => [numerator, denominator]), [[2, 5], [4, 5]]);
  assert.deepEqual(amountsIn('Add 3/8 and 7/8.').map(({ numerator, denominator }) => [numerator, denominator]), [[3, 8], [7, 8]]);
  assert.deepEqual(amountsIn('What is 1 and 3/4 as a fraction?').map(({ numerator, denominator }) => [numerator, denominator]), [[7, 4]]);
  assert.deepEqual(amountsIn('What is 2 and 3/4 as a fraction?').map(({ numerator, denominator }) => [numerator, denominator]), [[11, 4]]);
  assert.deepEqual(amountsIn('Mark 1 3/4 inches.').map(({ numerator, denominator }) => [numerator, denominator]), [[7, 4]]);
});

test('"taught before used": "2/5 and 4/5" is not a mixed number used before it is taught', () => {
  const pattern = taught('mixed number with "and"');
  assert.equal(pattern.test('Put 2/5 and 4/5 in order.'), false);
  assert.equal(pattern.test('Which is more, 11/12 and 5/12?'), false);
  assert.equal(pattern.test('Write 1 and 3/4 as a fraction.'), true);
  assert.equal(pattern.test('Write 12 and 3/4 as a fraction.'), true);
  assert.equal(pattern.test('3 and 1/2'), true);
});

test('the lesson idea check for "a mixed number with and" does not flag "2/5 and 4/5" either', () => {
  const pattern = ideaTerm('number-line-beyond-one', 'a mixed number with "and"');
  assert.equal(pattern.test('Put 2/5 and 4/5 in order.'), false);
  assert.equal(pattern.test('1 and 3/4'), true);
  assert.equal(pattern.test('12 and 3/4'), true);
});

test('a worksheet picture for "2/5 and 4/5" is not drawn from the mixed number "5 and 4/5"', () => {
  const picture = (prompt: string): ModelSpec => problemPicture({ prompt } as WorksheetProblem);
  const first = (model: ModelSpec) => (model.kind === 'bars' ? [model.bars[0]!.numerator, model.bars[0]!.denominator] : null);
  assert.deepEqual(first(picture('Which is more, 2/5 and 4/5?')), [2, 5]);
  assert.deepEqual(first(picture('What is 1 and 3/4 as a fraction?')), [7, 4]);
  assert.deepEqual(first(picture('Write 12 and 3/4 as a fraction.')), [51, 4]);
});
