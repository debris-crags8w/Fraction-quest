import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { chapterFor, lessonComic } from './story';

// A film caption longer than this runs past five lines on a phone and covers the chapter friend.
const MAX_CAPTION = 150;

describe('lesson film captions', () => {
  it(`keeps every line at ${MAX_CAPTION} characters or fewer`, () => {
    const long: string[] = [];
    for (const mission of MISSIONS) {
      const chapter = chapterFor(mission.unit);
      if (!chapter) continue;
      const index = MISSIONS.filter((item) => item.unit === mission.unit).indexOf(mission);
      lessonComic(chapter, mission, index).forEach((beat, at) => {
        if (beat.text.length > MAX_CAPTION) long.push(`${mission.id} shot ${at + 1}: ${beat.text.length} characters`);
      });
    }
    assert.deepEqual(long, []);
  });
});

/* Rescore 5: the caption shows lesson text in the season's words (LearningText applies seasonalWords), so in October a
   caption said "the pumpkin loaves" while the voice said "the loaves". The voice reads the same words as the caption. */
describe('film captions and voice', () => {
  it('say the same words on every film line in every month', async () => {
    const { CHAPTERS, PROLOGUE, EPILOGUE, chapterEnd, filmLine, propTheme } = await import('./story');
    const { seasonalWords } = await import('./seasonal-words');
    const { seasonOn } = await import('./seasons');
    const all: [string, string][] = [];
    PROLOGUE.forEach((panel, i) => all.push([`prologue ${i + 1}`, panel.text]));
    EPILOGUE.forEach((panel, i) => all.push([`finale ${i + 1}`, panel.text]));
    for (const chapter of CHAPTERS) {
      chapter.intro.forEach((panel, i) => all.push([`ch ${chapter.unit} opening ${i + 1}`, panel.text]));
      chapterEnd(chapter).forEach((panel, i) => all.push([`ch ${chapter.unit} ending ${i + 1}`, panel.text]));
    }
    for (const mission of MISSIONS) {
      const chapter = chapterFor(mission.unit);
      if (!chapter) continue;
      const index = MISSIONS.filter((item) => item.unit === mission.unit).indexOf(mission);
      if (index > 0) lessonComic(chapter, mission, index).forEach((panel, i) => all.push([`${mission.id} ${i + 1}`, panel.text]));
    }
    const differ: string[] = [];
    for (let month = 0; month < 12; month++) {
      const season = seasonOn(new Date(2026, month, 15, 10))!;
      const theme = propTheme(season.id);
      for (const [where, text] of all) {
        const voice = filmLine(text, null, theme);
        const caption = seasonalWords(filmLine(text, null, theme), season.id);
        if (voice !== caption) differ.push(`${season.id} ${where}: caption "${caption}", voice "${voice}"`);
      }
    }
    assert.ok(all.length > 300, `every film line was found (${all.length})`);
    assert.deepEqual(differ, []);
  });
});
