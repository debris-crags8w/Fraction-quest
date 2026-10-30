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

test('the first suspect boards open after chapters 4 and 7, nudge kindly, and never hand over the answer', () => {
  assert.equal(BOARD_AFTER[1], 4);
  assert.equal(BOARD_AFTER[2], 7);
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

test('the detective play goes on to the end: a suspect board every 2 or 3 chapters, through chapter 14', async () => {
  const { SUSPECT_BOARDS, SUSPECTS, BOARD_CASES } = await import('./story');
  const after = SUSPECT_BOARDS.map((board) => BOARD_AFTER[board]);
  assert.ok(SUSPECT_BOARDS.length >= 5, `${SUSPECT_BOARDS.length} boards`);
  assert.deepEqual(after, [...after].sort((a, b) => a - b), 'boards come in story order');
  for (let i = 1; i < after.length; i++) assert.ok(after[i]! - after[i - 1]! >= 2 && after[i]! - after[i - 1]! <= 3, `boards after chapters ${after[i - 1]} and ${after[i]}`);
  assert.ok(after[after.length - 1]! >= 13, 'the last board comes near the end');
  for (const board of SUSPECT_BOARDS) assert.ok(chapterFor(BOARD_AFTER[board]), `board ${board} opens after a real chapter`);
  // Boards 3 on: a question of their own, clues from that chapter, and a fair deduction (one suspect fits every clue).
  for (const board of SUSPECT_BOARDS.filter((id) => id > 2)) {
    const story = BOARD_CASES[board as 3]!;
    assert.match(story.question, /^Who .*\?$/);
    assert.ok(story.clues.length >= 2 && story.clues.length <= 4);
    const fitsAll = SUSPECTS[board].filter((suspect) => story.clues.every((clue) => clue.fits.includes(suspect)));
    assert.deepEqual(fitsAll, [story.culprit], `board ${board}: exactly one suspect fits every clue`);
    for (const clue of story.clues) {
      assert.doesNotMatch(clue.text, /\d/, 'no numbers, so no math answer');
      assert.ok(clue.text.split(' ').length <= 12, clue.text);
      for (const suspect of clue.fits) assert.ok(SUSPECTS[board].includes(suspect));
    }
    assert.equal(suspectReply(board, story.culprit).good, true);
    for (const suspect of SUSPECTS[board].filter((id) => id !== story.culprit)) {
      assert.equal(suspectReply(board, suspect).good, false);
      assert.doesNotMatch(suspectReply(board, suspect).text, new RegExp(CHARACTERS_NAME(story.culprit)), 'a wrong guess is nudged, not told');
    }
    // No spoilers: nothing from a later chapter (the confession in 11, the last piece's hiding place in 15).
    const words = [story.question, ...story.clues.map((clue) => clue.text), ...SUSPECTS[board].map((suspect) => suspectReply(board, suspect).text)].join(' ');
    if (BOARD_AFTER[board] < 11) assert.doesNotMatch(words, /cracked|owns? up|confess/i);
    assert.doesNotMatch(words, /under the stage/i);
    // Each clue is something the chapter shows: its key words appear in that chapter's lines.
    const chapter = chapterFor(BOARD_AFTER[board])!;
    const told = [chapter.cliff, chapter.clue, ...chapter.cliffs, ...chapter.scenes, ...chapter.intro.map((panel) => panel.text)].join(' ').toLowerCase();
    for (const clue of story.clues) assert.ok((clue.text.toLowerCase().match(/[a-z]{5,}/g) ?? []).some((word) => told.includes(word)), `board ${board}: "${clue.text}" is not in chapter ${chapter.unit}`);
  }
});
const CHARACTERS_NAME = (id: string) => `${id.charAt(0).toUpperCase()}${id.slice(1)}`;

test('guesses on the later boards are saved too', () => {
  const next = recordStory({ story: { prologueSeen: true } } as unknown as FunState, { board: 5, suspect: 'chomp' });
  assert.deepEqual(next.story?.guesses, { '5': 'chomp' });
});
