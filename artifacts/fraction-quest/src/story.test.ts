import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './game';
import { CHAPTERS, CHARACTERS, chapterFor, lessonComic, storyAsk } from './story';

test('every unit has exactly one chapter with a full script and a card', () => {
  const units = [...new Set(MISSIONS.map((mission) => mission.unit))].sort((a, b) => a - b);
  assert.deepEqual(CHAPTERS.map((chapter) => chapter.unit), units);
  for (const chapter of CHAPTERS) {
    assert.equal(chapter.intro.length, 3);
    assert.equal(chapter.intro[0].speaker, chapter.character, `${chapter.title}: the friend opens the comic`);
    assert.ok(chapter.asks.length >= 2);
    for (const text of [chapter.title, chapter.again, chapter.thanks, chapter.done, chapter.card.title, chapter.card.blurb, ...chapter.asks, ...chapter.intro.map((panel) => panel.text)]) {
      assert.ok(text.length > 0 && text.length <= 90, `${chapter.title}: "${text}" is short`);
      assert.doesNotMatch(text, /\s{2}/);
    }
    assert.ok(CHARACTERS[chapter.character]);
  }
});

test('question lines set the scene without numbers, so they cannot hint at an answer', () => {
  for (const chapter of CHAPTERS) for (const line of chapter.asks) assert.doesNotMatch(line, /\d/, `${chapter.title}: ${line}`);
  const chapter = chapterFor(1)!;
  assert.equal(storyAsk(chapter, 'q-7'), storyAsk(chapter, 'q-7'));
});

test('the first lesson of a chapter gets the intro comic; later lessons get the friend, the lesson and its idea', () => {
  const chapter = chapterFor(1)!;
  const [first, second] = MISSIONS.filter((mission) => mission.unit === 1);
  assert.equal(lessonComic(chapter, first, true), chapter.intro);
  const panels = lessonComic(chapter, second, false);
  assert.deepEqual(panels.map((panel) => panel.speaker), ['chomp', 'numi', 'hoot']);
  assert.equal(panels[0].text, chapter.again);
  assert.match(panels[1].text, new RegExp(second.title.slice(1)));
  assert.equal(panels[2].text, second.skill);
});
