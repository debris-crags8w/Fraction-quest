import assert from 'node:assert/strict';
import test from 'node:test';
import { sentences, spokenText } from './lib/voice';

test('decimals and money are not split into separate sentences', () => {
  assert.deepEqual(sentences(spokenText('Is 0.5 the same as 1/2? Yes.')), ['Is zero point five the same as one half?', 'Yes.']);
  assert.deepEqual(sentences(spokenText('Use $1.50 now.')), ['Use 1 dollar and 50 cents now.']);
  assert.equal(spokenText('0.75 = 75%'), 'zero point seven five equals 75 percent');
});

test('fractions with other denominators are read as words', () => {
  assert.equal(spokenText('3/20'), 'three twentieths');
  assert.equal(spokenText('2/1'), '2');
  assert.equal(spokenText('1/2s'), 'one half');
  assert.equal(spokenText('3/4s'), 'three fourths');
  assert.equal(spokenText('6/3 =2'), 'six thirds equals 2');
});

test('multi-digit decimals keep their whole part', () => {
  assert.equal(spokenText('12.5 is more than 12.'), 'twelve point five is more than 12.');
  assert.equal(spokenText('Pay $12.50'), 'Pay 12 dollars and 50 cents');
});
