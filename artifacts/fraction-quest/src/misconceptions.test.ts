import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { answerValue } from './learning-content';
import { misconceptionWrongs, preferMisconceptions } from './misconceptions';
import { allProofItems } from './proof-items';

describe('wrong answers from real mistakes', () => {
  it('names the slip behind each wrong answer', () => {
    assert.deepEqual(misconceptionWrongs('What is 2/3 of 9 pencils?', '6 pencils'), ['3 pencils', '9 pencils', '18 pencils']); // one group / the whole / × numerator
    assert.deepEqual(misconceptionWrongs('A 2-liter jug is 1/4 full. How many milliliters are inside?', '500'), ['250', '1500', '2000', '8000']);
    assert.deepEqual(misconceptionWrongs('Ana has 12 stickers. She gives away 1/4 of them. Then she gives away 1/3 of the rest. How many are left?', '6'), ['9', '5', '3']);
    assert.deepEqual(misconceptionWrongs('15 stickers are 5/6 of a pack. How many stickers are in the pack?', '18'), ['15', '90', '3', '33']);
    assert.deepEqual(misconceptionWrongs('Fill the blank: 1/2 = ?/8', '4'), ['7', '8', '1']);
  });

  it('leaves a question alone when its own working disagrees with the app, or the answer is not a whole number', () => {
    assert.deepEqual(misconceptionWrongs('What is 2/3 of 9 pencils?', '7 pencils'), []);
    assert.deepEqual(misconceptionWrongs('What is 1/2 of 3/4?', '3/8'), []);
    assert.deepEqual(misconceptionWrongs('How many equal spaces do you need for thirds?', '3'), [], 'off by one is the real mistake there');
  });

  it('swaps only near misses, keeps the right answer in place, and never repeats a choice', () => {
    const question = { prompt: 'How many minutes are in 3/4 hour?', choices: ['44', '45', '46', '60'], correctChoice: 1 };
    const better = preferMisconceptions(question);
    assert.equal(better.choices[1], '45');
    assert.equal(better.choices[3], '60', 'a choice that is already a real slip stays');
    assert.ok(!better.choices.includes('44') && !better.choices.includes('46'));
    assert.equal(new Set(better.choices).size, 4);
  });

  it('never makes a second right answer anywhere in lessons or practice', () => {
    for (const item of allProofItems({ sheets: 0, seeds: 3, checkInSeeds: [] })) {
      if (!item.choices || item.correct === undefined) continue;
      const right = answerValue(item.choices[item.correct]);
      if (!Number.isFinite(right)) continue;
      assert.ok(!item.choices.some((choice, index) => index !== item.correct && Math.abs(answerValue(choice) - right) < 1e-9),
        `${item.lesson}: ${item.prompt} | ${item.choices.join(' / ')}`);
    }
  });
});
