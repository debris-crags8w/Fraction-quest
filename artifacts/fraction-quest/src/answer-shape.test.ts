import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { answerShape, canBuild, namedChoices, slotAnswer } from './answer-shape';
import { answerMatches, getWorksheet } from './learning-content';
import { MISSIONS } from './game';
import { buildAssessmentItems, getAssessmentDefinitions } from './assessments';

describe('answers are built with tiles, never typed', () => {
  it('every worksheet answer in every lesson can be built from its tiles', () => {
    const misses: string[] = [];
    for (const mission of MISSIONS) for (const seed of [undefined, 1, 2, 3, 7]) for (const problem of getWorksheet(mission.id, seed)) {
      const shape = answerShape(problem);
      if (!canBuild(shape, problem.answer) || !answerMatches(problem, problem.answer)) misses.push(`${mission.id} ${shape.kind}: ${problem.prompt} => ${problem.answer}`);
    }
    assert.deepEqual(misses.slice(0, 10), []);
  });

  it('every check-in question can be answered with tiles', () => {
    for (const definition of getAssessmentDefinitions()) for (const item of buildAssessmentItems(definition, 5)) {
      assert.ok(canBuild(answerShape(item.problem), item.answer), `${definition.id}: ${item.prompt} => ${item.answer}`);
    }
  });

  it('no question asks a child to type or to use commas', () => {
    for (const mission of MISSIONS) for (const problem of getWorksheet(mission.id)) {
      assert.doesNotMatch(problem.prompt, /\bType\b|commas/, problem.prompt);
    }
  });

  it('ordering cards keep the order the question lists them', () => {
    const shape = answerShape({ id: 'w1', prompt: 'Put 3/3, 1/3, 2/3 in order, smallest first.', answer: '1/3, 2/3, 3/3', hint: '', form: 'ordered' });
    assert.deepEqual(shape, { kind: 'ordered', items: ['3/3', '1/3', '2/3'], first: 'smallest' });
  });

  it('a question that names its choices offers them as cards', () => {
    assert.deepEqual(namedChoices('Which is bigger, 3/4 or 3/8?'), ['3/4', '3/8']);
    assert.deepEqual(namedChoices('Is 1/8 closest to 0, 1/2 or 1?'), ['0', '1/2', '1']);
  });

  it('a fraction answer needs both numbers, unless a whole number answers it', () => {
    assert.equal(slotAnswer({ kind: 'fraction', allowWhole: false }, { num: '3' }), '');
    assert.equal(slotAnswer({ kind: 'fraction', allowWhole: true }, { num: '3' }), '3');
    assert.equal(slotAnswer({ kind: 'mixed' }, { whole: '1', num: '2', den: '4' }), '1 2/4');
    assert.equal(slotAnswer({ kind: 'number', suffix: '%' }, { n: '50' }), '50%');
  });
});
