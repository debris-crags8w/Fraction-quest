import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerUnit, withUnits } from './measure-units';

test('measurement answers keep their unit', () => {
  assert.deepEqual(withUnits('How many minutes are in 1/4 hour?', ['15', '60']), ['15 minutes', '60 minutes']);
  assert.deepEqual(withUnits('Twigs: 3/8, 4/8 inch. How long are the two shortest together?', ['7/8', '12/8']), ['7/8 inch', '12/8 inches']);
  assert.deepEqual(withUnits('A recipe uses 1/3 cup. You make 3 batches. How much flour do you need?', ['4/3', '1 1/3']), ['4/3 cups', '1 1/3 cups']);
});

test('counts and choices that already say something are left alone', () => {
  assert.equal(answerUnit('How many crayons are 4/8 inch long?'), null);
  assert.equal(answerUnit('What is the bigger one?'), null);
  assert.deepEqual(withUnits('How many inches are left?', ['17 inches', '22 inches']), ['17 inches', '22 inches']);
});

test('a container word is not the answer unit when the story measures in another unit', () => {
  const prompt = 'Plot these cups in eighths of a liter: 1/8, 2/8, 7/8 liter. How much more do all the 7/8 cups hold together than all the 1/8 cups together?';
  assert.equal(answerUnit(prompt), 'liter');
  assert.deepEqual(withUnits(prompt, ['10/8', '4/8']), ['10/8 liters', '4/8 liter']);
});
