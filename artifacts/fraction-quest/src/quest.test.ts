import assert from 'node:assert/strict';
import test from 'node:test';
import { BOARD_AFTER, bonusClue, earnsThanks, lessonSticker, suspectReply, thanksSticker } from './quest';
import { CHAPTERS, chapterFor } from './story';
import { recordStory, type FunState } from './lib/fun';

test('looking closely gives a bonus clue in chapters 1 to 7 only, and every bonus clue is the reply the child saw', () => {
  const withBonus = CHAPTERS.filter((chapter) => bonusClue(chapter)).map((chapter) => chapter.unit);
  assert.deepEqual(withBonus, [1, 2, 3, 4, 5, 6, 7]);
  for (const unit of withBonus) assert.equal(bonusClue(chapterFor(unit)!), chapterFor(unit)!.choice[1].reply.text);
});

test('the thank-you sticker can always be earned: straight away for helping, at the chapter end after looking for the clue', () => {
  const one = chapterFor(1)!;
  const eight = chapterFor(8)!;
  assert.equal(earnsThanks(one, { '1': 0 }), true);
  assert.equal(earnsThanks(one, { '1': 1 }), false);
  assert.equal(earnsThanks(one, { '1': 1 }, true), true);
  assert.equal(earnsThanks(one, {}, true), false, 'no choice made yet');
  assert.equal(earnsThanks(eight, { '8': 1 }), true, 'no bonus clue in chapter 8, so either choice helps');
  assert.equal(thanksSticker(one).label, 'Chomp says thank you');
  assert.notEqual(lessonSticker(one, 0, 'A').color, lessonSticker(one, 1, 'B').color);
});

test('the suspect boards open after chapters 4 and 7, nudge kindly, and never hand over the answer', () => {
  assert.deepEqual(BOARD_AFTER, { 1: 4, 2: 7 });
  assert.equal(suspectReply(1, 'chomp').good, true);
  assert.match(suspectReply(1, 'chomp').text, /keep collecting clues/);
  assert.equal(suspectReply(1, 'pip').good, false);
  assert.match(suspectReply(1, 'tilly').text, /Look at your clues again/);
  assert.equal(suspectReply(2, 'bolt').good, true);
  assert.doesNotMatch(suspectReply(2, 'bolt').text, /cracked it/i, 'the confession stays in chapter 11');
  assert.match(suspectReply(2, 'chomp').text, /doesn’t add up/);
  assert.equal(suspectReply(2, 'bea').good, false);
});

test('guesses are saved with the story and bad saved values are dropped', () => {
  const base = { story: { prologueSeen: true, choices: { '1': 1 } } } as unknown as FunState;
  const next = recordStory(base, { board: 1, suspect: 'chomp' });
  assert.deepEqual(next.story, { prologueSeen: true, choices: { '1': 1 }, guesses: { '1': 'chomp' } });
  const cleaned = recordStory({ story: { guesses: { '1': 'nobody', '9': 'bolt' } } } as unknown as FunState, {});
  assert.equal(cleaned.story?.guesses, undefined);
});
