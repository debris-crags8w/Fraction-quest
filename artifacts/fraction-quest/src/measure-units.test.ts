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
