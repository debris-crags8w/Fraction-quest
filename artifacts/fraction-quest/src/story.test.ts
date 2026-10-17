import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './game';
import { recordStory, type FunState } from './lib/fun';
import { CHAPTERS, CHARACTERS, PROLOGUE, STONE_PIECES, chapterFor, lessonCliff, lessonComic, storyAsk, withName } from './story';

const lessonsIn = (unit: number) => MISSIONS.filter((mission) => mission.unit === unit);

test('one chapter per unit, one stone piece per chapter', () => {
  const units = [...new Set(MISSIONS.map((mission) => mission.unit))].sort((a, b) => a - b);
  assert.deepEqual(CHAPTERS.map((chapter) => chapter.unit), units);
  assert.equal(CHAPTERS.length, STONE_PIECES);
});

test('every lesson has a scene and a cliffhanger, and every chapter a full script', () => {
  for (const chapter of CHAPTERS) {
    const lessons = lessonsIn(chapter.unit).length;
    assert.equal(chapter.scenes.length, lessons - 1, `${chapter.title}: a scene for each lesson after the first`);
    assert.equal(chapter.cliffs.length, lessons - 1, `${chapter.title}: a cliffhanger for each lesson before the last`);
    assert.equal(chapter.intro[0].speaker, chapter.character, `${chapter.title}: the friend opens the comic`);
    assert.equal(chapter.choice.length, 2);
    const lines = [chapter.title, chapter.cliff, chapter.clue, chapter.thanks, chapter.done, chapter.card.title, chapter.card.blurb,
      ...chapter.scenes, ...chapter.cliffs, ...chapter.intro.map((panel) => panel.text),
      ...chapter.choice.flatMap((option) => [option.label, option.detail, option.reply.text])];
    for (const text of lines) {
      assert.ok(text.length > 0 && text.length <= 120, `${chapter.title}: "${text}" is short`);
      assert.doesNotMatch(text, /\s{2}/);
    }
    for (const option of chapter.choice) assert.ok(option.label.split(' ').length <= 6, `${option.label}: 6 words or fewer`);
    assert.ok(CHARACTERS[chapter.character]);
  }
});

test('question lines set the scene without numbers, so they cannot hint at an answer', () => {
  for (const chapter of CHAPTERS) for (const line of chapter.asks) {
    assert.doesNotMatch(line, /\d/, `${chapter.title}: ${line}`);
    assert.ok(line.length <= 90);
  }
  assert.equal(storyAsk(chapterFor(1)!, 'q-7'), storyAsk(chapterFor(1)!, 'q-7'));
});

test('the mystery: clues point at Chomp, chapter 8 reveals Bolt, chapter 11 Bolt owns up', () => {
  assert.match(CHAPTERS.slice(0, 5).map((chapter) => chapter.clue).join(' '), /footprints|teeth|boots/i);
  assert.match(chapterFor(8)!.intro.map((panel) => panel.text).join(' '), /boots.*Bolt|Bolt.*boots/);
  assert.match(chapterFor(11)!.intro[0].text, /sorry/i);
  assert.match(chapterFor(15)!.done, /whole again/i);
});

test('comics: the intro opens a chapter; later lessons get the friend, the lesson and its idea', () => {
  const chapter = chapterFor(1)!;
  const [first, second, third] = lessonsIn(1);
  assert.equal(lessonComic(chapter, first, 0), chapter.intro);
  const panels = lessonComic(chapter, second, 1);
  assert.deepEqual(panels.map((panel) => panel.speaker), ['chomp', 'numi', 'hoot']);
  assert.equal(panels[0].text, chapter.scenes[0]);
  assert.equal(panels[2].text, second.skill);
  assert.equal(lessonComic(chapter, third, 2)[0].text, chapter.scenes[1]);
});

test('cliffhangers: each lesson’s own, then the chapter’s at the end', () => {
  const chapter = chapterFor(1)!;
  assert.equal(lessonCliff(chapter, 0, 3), chapter.cliffs[0]);
  assert.equal(lessonCliff(chapter, 1, 3), chapter.cliffs[1]);
  assert.equal(lessonCliff(chapter, 2, 3), chapter.cliff);
});

test('the child’s name goes into the story, with a kind fallback', () => {
  assert.equal(withName(PROLOGUE[2].text, 'Sam').startsWith('Sam, we need you!'), true);
  assert.equal(withName(PROLOGUE[2].text, '  ').startsWith('Friend, we need you!'), true);
  assert.equal(withName('No name here.', 'Sam'), 'No name here.');
});

test('story progress saves the prologue and each chapter’s choice, and drops bad data', () => {
  let fun = { story: { choices: { '1': 1, x: 0, '2': 5 } } } as unknown as FunState;
  fun = recordStory(fun, { prologueSeen: true });
  fun = recordStory(fun, { unit: 3, choice: 0 });
  assert.deepEqual(fun.story, { prologueSeen: true, choices: { '1': 1, '3': 0 } });
});
